import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import type { Setting } from "../prisma/generated/client";
import { errorMessage, prismaErrorCode } from "./error.utils";
import { PrismaService } from "./prisma.service";

const SAFE = /^[a-z0-9][a-z0-9._-]*$/;
const norm = (s: string) => (s ?? "").trim().toLowerCase();
const assertSafe = (label: string, v: string) => {
  if (!SAFE.test(v))
    throw new BadRequestException(`${label} must match ${SAFE}`);
};

type SettingStringResult = {
  value: string;
  found: boolean;
};

@Injectable()
export class SettingsService {
  private readonly log = new Logger(SettingsService.name);
  constructor(private prisma: PrismaService) {}

  async getString(
    namespace: string,
    key: string,
    environment = "default",
  ): Promise<SettingStringResult> {
    const ns = norm(namespace),
      k = norm(key),
      env = norm(environment);
    assertSafe("namespace", ns);
    assertSafe("key", k);
    assertSafe("environment", env);

    const row = await this.prisma.setting.findUnique({
      where: {
        namespace_environment_key: { namespace: ns, environment: env, key: k },
      },
    });

    if (!row) return { value: "", found: false };

    return { value: row.valueString ?? "", found: true };
  }

  async debugInsert(): Promise<Setting> {
    return this.prisma.setting.create({
      data: {
        namespace: "test",
        environment: "default",
        key: "ping",
        valueString: "pong",
      },
    });
  }

  async setString(
    namespace: string,
    key: string,
    value: string,
    environment = "default",
  ): Promise<string> {
    const ns = norm(namespace),
      k = norm(key),
      env = norm(environment);
    assertSafe("namespace", ns);
    assertSafe("key", k);
    assertSafe("environment", env);

    try {
      await this.prisma.setting.upsert({
        where: {
          namespace_environment_key: {
            namespace: ns,
            environment: env,
            key: k,
          },
        },
        update: { valueString: value },
        create: {
          namespace: ns,
          environment: env,
          key: k,
          valueString: value,
        },
      });
      return value;
    } catch (e: unknown) {
      this.log.error(
        `setString failed ns=${ns} key=${k} env=${env}`,
        errorMessage(e),
      );
      throw e;
    }
  }

  async deleteString(
    namespace: string,
    key: string,
    environment = "default",
  ): Promise<boolean> {
    const ns = norm(namespace),
      k = norm(key),
      env = norm(environment);
    assertSafe("namespace", ns);
    assertSafe("key", k);
    assertSafe("environment", env);

    try {
      await this.prisma.setting.delete({
        where: {
          namespace_environment_key: {
            namespace: ns,
            environment: env,
            key: k,
          },
        },
      });
      return true;
    } catch (e: unknown) {
      if (prismaErrorCode(e) === "P2025") return false;
      throw e;
    }
  }
}
