import { type Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as Joi from "joi";
import {
  PUBLIC_APPLICATION_PROFILES,
  PUBLIC_CLIENT_ID_PATTERN,
  SIGNED_CONTEXT_ID_PATTERN,
  type ApplicationLookup,
  type ApplicationRecord,
  type ApplicationRegistry,
  type PublicApplicationProfile,
} from "./application.contracts";
import {
  normalizeLookupOrigin,
  validateRegistryOrigin,
} from "./application-origin";

export const APPLICATION_REGISTRY = Symbol("ApplicationRegistry");
export const DEFAULT_RATE_LIMIT_PROFILE = "default" as const;
export const GATEWAY_RATE_LIMIT_PROFILES = Object.freeze([
  DEFAULT_RATE_LIMIT_PROFILE,
]);

const MAX_APPLICATION_RECORDS = 32;
const MAX_ORIGINS_PER_RECORD = 8;

const registryRecordSchema = Joi.object({
  clientId: Joi.string().pattern(PUBLIC_CLIENT_ID_PATTERN).required(),
  applicationId: Joi.string().pattern(SIGNED_CONTEXT_ID_PATTERN).required(),
  profile: Joi.string()
    .valid(...PUBLIC_APPLICATION_PROFILES)
    .required(),
  tenantId: Joi.string().pattern(SIGNED_CONTEXT_ID_PATTERN).required(),
  siteId: Joi.string().pattern(SIGNED_CONTEXT_ID_PATTERN).required(),
  channelId: Joi.string().pattern(SIGNED_CONTEXT_ID_PATTERN).required(),
  enabled: Joi.boolean().strict().required(),
  origins: Joi.array()
    .items(Joi.string())
    .max(MAX_ORIGINS_PER_RECORD)
    .unique()
    .required(),
  rateLimitProfile: Joi.string().pattern(SIGNED_CONTEXT_ID_PATTERN).required(),
}).unknown(false);

const registrySchema = Joi.array()
  .items(registryRecordSchema)
  .min(1)
  .max(MAX_APPLICATION_RECORDS)
  .required();

export class ApplicationRegistryConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplicationRegistryConfigurationError";
  }
}

function configurationError(message: string): never {
  throw new ApplicationRegistryConfigurationError(message);
}

function deepFreezeRecord(record: ApplicationRecord): ApplicationRecord {
  return Object.freeze({
    ...record,
    origins: Object.freeze([...record.origins]),
  });
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return configurationError(
      "GATEWAY_APPLICATION_REGISTRY_JSON is invalid JSON",
    );
  }
}

export interface ParseApplicationRegistryOptions {
  nodeEnv: string;
  rateLimitProfiles?: readonly string[];
}

export function parseApplicationRegistryJson(
  value: string,
  options: ParseApplicationRegistryOptions,
): readonly ApplicationRecord[] {
  const validation = registrySchema.validate(parseJson(value), {
    abortEarly: false,
    allowUnknown: false,
    convert: false,
  });
  if (validation.error) {
    return configurationError(
      `Invalid application registry schema: ${validation.error.message}`,
    );
  }

  const configuredProfiles = new Set(
    options.rateLimitProfiles ?? GATEWAY_RATE_LIMIT_PROFILES,
  );
  if (configuredProfiles.size === 0) {
    return configurationError(
      "At least one gateway rate-limit profile is required",
    );
  }

  const records = validation.value as ApplicationRecord[];
  const clientIds = new Set<string>();
  const applicationIds = new Set<string>();
  const origins = new Set<string>();
  const enabledProfileCounts = new Map<PublicApplicationProfile, number>(
    PUBLIC_APPLICATION_PROFILES.map((profile) => [profile, 0]),
  );
  let singleSitePair: string | undefined;

  const parsedRecords = records.map((record, index) => {
    if (clientIds.has(record.clientId)) {
      return configurationError(
        `Duplicate clientId at registry record ${index}`,
      );
    }
    if (applicationIds.has(record.applicationId)) {
      return configurationError(
        `Duplicate applicationId at registry record ${index}`,
      );
    }
    clientIds.add(record.clientId);
    applicationIds.add(record.applicationId);

    const sitePair = JSON.stringify([record.tenantId, record.siteId]);
    singleSitePair ??= sitePair;
    if (sitePair !== singleSitePair) {
      return configurationError(
        "Static application registry records must share one tenant/site pair",
      );
    }

    if (!configuredProfiles.has(record.rateLimitProfile)) {
      return configurationError(
        `Unknown rate-limit profile at registry record ${index}`,
      );
    }

    const isWeb = record.profile !== "mobile";
    if (isWeb && record.origins.length === 0) {
      return configurationError(
        `Web registry record ${index} requires at least one origin`,
      );
    }
    if (!isWeb && record.origins.length > 0) {
      return configurationError(
        `Mobile registry record ${index} cannot define origins`,
      );
    }

    const canonicalOrigins = record.origins.map((origin) => {
      let canonical: string;
      try {
        canonical = validateRegistryOrigin(origin, options.nodeEnv);
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : "invalid origin";
        return configurationError(
          `Invalid origin at registry record ${index}: ${reason}`,
        );
      }

      if (origins.has(canonical)) {
        return configurationError(
          `Duplicate application origin at registry record ${index}`,
        );
      }
      origins.add(canonical);
      return canonical;
    });

    if (record.enabled) {
      enabledProfileCounts.set(
        record.profile,
        (enabledProfileCounts.get(record.profile) ?? 0) + 1,
      );
    }

    return deepFreezeRecord({ ...record, origins: canonicalOrigins });
  });

  for (const profile of PUBLIC_APPLICATION_PROFILES) {
    if (enabledProfileCounts.get(profile) !== 1) {
      return configurationError(
        `Static application registry requires exactly one enabled ${profile} record`,
      );
    }
  }

  return Object.freeze(parsedRecords);
}

export class StaticApplicationRegistry implements ApplicationRegistry {
  private readonly byClientId: ReadonlyMap<string, ApplicationRecord>;
  private readonly browserOrigins: readonly string[];

  private constructor(records: readonly ApplicationRecord[]) {
    this.byClientId = new Map(
      records.map((record) => [record.clientId, record]),
    );
    this.browserOrigins = Object.freeze(
      records
        .filter((record) => record.enabled && record.profile !== "mobile")
        .flatMap((record) => record.origins),
    );
  }

  static fromJson(
    value: string,
    options: ParseApplicationRegistryOptions,
  ): StaticApplicationRegistry {
    return new StaticApplicationRegistry(
      parseApplicationRegistryJson(value, options),
    );
  }

  async resolve(input: ApplicationLookup): Promise<ApplicationRecord | null> {
    if (!PUBLIC_CLIENT_ID_PATTERN.test(input.clientId)) return null;

    const record = this.byClientId.get(input.clientId);
    if (!record?.enabled) return null;

    if (record.profile === "mobile") {
      return input.origin === undefined ? record : null;
    }
    if (!input.origin) return null;

    let origin: string;
    try {
      origin = normalizeLookupOrigin(input.origin);
    } catch {
      return null;
    }

    return record.origins.includes(origin) ? record : null;
  }

  async allowedBrowserOrigins(): Promise<readonly string[]> {
    return this.browserOrigins;
  }

  async readiness(): Promise<void> {
    return Promise.resolve();
  }
}

export const applicationRegistryProvider: Provider = {
  provide: APPLICATION_REGISTRY,
  inject: [ConfigService],
  useFactory: (config: ConfigService): ApplicationRegistry =>
    StaticApplicationRegistry.fromJson(
      config.getOrThrow<string>("GATEWAY_APPLICATION_REGISTRY_JSON"),
      {
        nodeEnv: config.getOrThrow<string>("NODE_ENV"),
        rateLimitProfiles: GATEWAY_RATE_LIMIT_PROFILES,
      },
    ),
};
