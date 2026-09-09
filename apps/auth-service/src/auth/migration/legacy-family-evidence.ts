import type Redis from 'ioredis';

// All values are inspected in one owner-side Redis operation. No lazy version
// initializer, family mutation, token recovery, or authority decision occurs.
const READ_LEGACY_FAMILY_SCRIPT = `
local function quarantine(reason)
  return {'quarantined', reason}
end
local function version(value)
  if not value or not string.match(value, '^[1-9][0-9]*$') then return false end
  if #value > 16 or (#value == 16 and value > '9007199254740991') then return false end
  return true
end
local currentVersion = redis.call('GET', KEYS[2])
if not version(currentVersion) then return quarantine('current_version_missing_or_invalid') end
if redis.call('EXISTS', KEYS[3]) == 1 then return quarantine('subject_disabled') end
local now = redis.call('TIME')
local timeMs = tonumber(now[1]) * 1000 + math.floor(tonumber(now[2]) / 1000)
local ttl = redis.call('PTTL', KEYS[1])
if ttl <= 0 then return quarantine('family_missing_or_unbounded') end
if redis.call('SISMEMBER', KEYS[4], ARGV[1]) ~= 1 then return quarantine('family_unindexed') end
local fields = redis.call('HMGET', KEYS[1], 'issuedTokenVersion', 'tokenHash', 'tokenId')
if not version(fields[1]) then return quarantine('issued_version_missing_or_invalid') end
if fields[1] ~= currentVersion then return quarantine('version_mismatch') end
if not fields[2] or #fields[2] ~= 64 or not string.match(fields[2], '^[0-9a-f]+$') then
  return quarantine('token_evidence_invalid')
end
if not fields[3] or not string.match(fields[3],
  '^%x%x%x%x%x%x%x%x%-%x%x%x%x%-4%x%x%x%-[89ab]%x%x%x%-%x%x%x%x%x%x%x%x%x%x%x%x$')
  or fields[3] ~= string.lower(fields[3]) then return quarantine('token_evidence_invalid') end
return {'eligible', currentVersion, fields[2], fields[3], tostring(timeMs), tostring(timeMs + ttl)}
`;

export const LEGACY_FAMILY_QUARANTINE_REASONS = [
  'current_version_missing_or_invalid',
  'subject_disabled',
  'family_missing_or_unbounded',
  'family_unindexed',
  'issued_version_missing_or_invalid',
  'version_mismatch',
  'token_evidence_invalid',
] as const;

export type LegacyFamilyQuarantineReason =
  (typeof LEGACY_FAMILY_QUARANTINE_REASONS)[number];

// Sensitive migration input: consume only inside the source-owned encrypted
// export pipeline. Do not log/return it through an HTTP or gRPC endpoint.
export type LegacyFamilyEvidence =
  | { status: 'quarantined'; reason: LegacyFamilyQuarantineReason }
  | {
      status: 'eligible';
      tokenVersion: number;
      tokenHash: string;
      tokenId: string;
      sourceTimeMs: number;
      expiresAtMs: number;
    };

export async function readLegacyFamilyEvidence(
  redis: Redis,
  keys: [string, string, string, string],
  sessionId: string,
): Promise<LegacyFamilyEvidence> {
  const result: unknown = await redis.eval(
    READ_LEGACY_FAMILY_SCRIPT,
    keys.length,
    ...keys,
    sessionId,
  );
  if (
    !Array.isArray(result) ||
    !result.every((value: unknown) => typeof value === 'string')
  ) {
    throw new Error('legacy_family_evidence_invalid_response');
  }
  const values = result;
  if (
    values.length === 2 &&
    values[0] === 'quarantined' &&
    LEGACY_FAMILY_QUARANTINE_REASONS.some((reason) => reason === values[1])
  ) {
    return {
      status: 'quarantined',
      reason: values[1] as LegacyFamilyQuarantineReason,
    };
  }
  if (values.length !== 6 || values[0] !== 'eligible') {
    throw new Error('legacy_family_evidence_invalid_response');
  }
  const tokenVersion = Number(values[1]);
  const sourceTimeMs = Number(values[4]);
  const expiresAtMs = Number(values[5]);
  if (
    ![tokenVersion, sourceTimeMs, expiresAtMs].every(
      (value) => Number.isSafeInteger(value) && value > 0,
    ) ||
    expiresAtMs <= sourceTimeMs
  ) {
    throw new Error('legacy_family_evidence_invalid_response');
  }
  return {
    status: 'eligible',
    tokenVersion,
    tokenHash: values[2],
    tokenId: values[3],
    sourceTimeMs,
    expiresAtMs,
  };
}

const READ_LEGACY_SUBJECT_SCRIPT = `
local function version(value)
  if not value or not string.match(value, '^[1-9][0-9]*$') then return false end
  if #value > 16 or (#value == 16 and value > '9007199254740991') then return false end
  return true
end
local sessions = redis.call('SMEMBERS', KEYS[2])
if #sessions > tonumber(ARGV[1]) then return {'quarantined', 'family_limit_exceeded'} end
table.sort(sessions)
local currentVersion = redis.call('GET', KEYS[1])
local generationSource = 'CURRENT_TOKEN_VERSION'
if not currentVersion then
  if #sessions > 0 then return {'quarantined', 'current_version_missing_with_families'} end
  currentVersion = '1'
  generationSource = 'EMPTY_LEGACY_STATE'
elseif not version(currentVersion) then
  return {'quarantined', 'current_version_invalid'}
end
local now = redis.call('TIME')
local timeMs = tonumber(now[1]) * 1000 + math.floor(tonumber(now[2]) / 1000)
local eligible = {}
local quarantine = {0, 0, 0, 0}
for _, sessionId in ipairs(sessions) do
  local key = KEYS[3] .. sessionId
  local ttl = redis.call('PTTL', key)
  if ttl <= 0 then
    quarantine[1] = quarantine[1] + 1
  else
    local fields = redis.call('HMGET', key, 'issuedTokenVersion', 'tokenHash', 'tokenId')
    if not version(fields[1]) then
      quarantine[2] = quarantine[2] + 1
    elseif fields[1] ~= currentVersion then
      quarantine[3] = quarantine[3] + 1
    elseif not fields[2] or #fields[2] ~= 64 or not string.match(fields[2], '^[0-9a-f]+$')
      or not fields[3] or not string.match(fields[3],
        '^%x%x%x%x%x%x%x%x%-%x%x%x%x%-4%x%x%x%-[89ab]%x%x%x%-%x%x%x%x%x%x%x%x%x%x%x%x$')
      or fields[3] ~= string.lower(fields[3]) then
      quarantine[4] = quarantine[4] + 1
    else
      table.insert(eligible, sessionId)
      table.insert(eligible, fields[2])
      table.insert(eligible, fields[3])
      table.insert(eligible, tostring(timeMs + ttl))
    end
  end
end
local result = {
  'eligible', currentVersion, generationSource,
  redis.call('EXISTS', KEYS[4]) == 1 and '1' or '0', tostring(timeMs),
  tostring(#eligible / 4), tostring(quarantine[1]), tostring(quarantine[2]),
  tostring(quarantine[3]), tostring(quarantine[4])
}
for _, value in ipairs(eligible) do table.insert(result, value) end
return result
`;

export const LEGACY_SUBJECT_QUARANTINE_REASONS = [
  'family_limit_exceeded',
  'current_version_missing_with_families',
  'current_version_invalid',
] as const;

export type LegacySubjectEvidence =
  | {
      status: 'quarantined';
      reason: (typeof LEGACY_SUBJECT_QUARANTINE_REASONS)[number];
    }
  | {
      status: 'eligible';
      tokenVersion: number;
      generationSource: 'CURRENT_TOKEN_VERSION' | 'EMPTY_LEGACY_STATE';
      disabled: boolean;
      sourceTimeMs: number;
      familyQuarantineCounts: {
        missingOrUnbounded: number;
        issuedVersionMissingOrInvalid: number;
        versionMismatch: number;
        tokenEvidenceInvalid: number;
      };
      families: Array<{
        sessionId: string;
        tokenHash: string;
        tokenId: string;
        expiresAtMs: number;
      }>;
    };

function positiveSafeInteger(value: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error('legacy_subject_evidence_invalid_response');
  }
  return parsed;
}

function nonnegativeSafeInteger(value: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error('legacy_subject_evidence_invalid_response');
  }
  return parsed;
}

export async function readLegacySubjectEvidence(
  redis: Redis,
  userId: string,
  maxFamilies = 100,
): Promise<LegacySubjectEvidence> {
  if (!Number.isSafeInteger(maxFamilies) || maxFamilies <= 0) {
    throw new Error('legacy_subject_evidence_family_limit_invalid');
  }
  const result: unknown = await redis.eval(
    READ_LEGACY_SUBJECT_SCRIPT,
    4,
    `auth:user:tokenVersion:${userId}`,
    `auth:user:${userId}:refreshSessions`,
    `auth:user:${userId}:refreshSession:`,
    `auth:user:disabled:${userId}`,
    String(maxFamilies),
  );
  if (
    !Array.isArray(result) ||
    !result.every((value: unknown) => typeof value === 'string')
  ) {
    throw new Error('legacy_subject_evidence_invalid_response');
  }
  const values = result;
  if (
    values.length === 2 &&
    values[0] === 'quarantined' &&
    LEGACY_SUBJECT_QUARANTINE_REASONS.some((reason) => reason === values[1])
  ) {
    return { status: 'quarantined', reason: values[1] as never };
  }
  if (
    values.length < 10 ||
    values[0] !== 'eligible' ||
    !['CURRENT_TOKEN_VERSION', 'EMPTY_LEGACY_STATE'].includes(values[2]) ||
    !['0', '1'].includes(values[3])
  ) {
    throw new Error('legacy_subject_evidence_invalid_response');
  }
  const familyCount = nonnegativeSafeInteger(values[5]);
  if (values.length !== 10 + familyCount * 4) {
    throw new Error('legacy_subject_evidence_invalid_response');
  }
  const sourceTimeMs = positiveSafeInteger(values[4]);
  const families = Array.from({ length: familyCount }, (_, index) => {
    const offset = 10 + index * 4;
    const expiresAtMs = positiveSafeInteger(values[offset + 3]);
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        values[offset],
      ) ||
      !/^[0-9a-f]{64}$/.test(values[offset + 1]) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        values[offset + 2],
      ) ||
      expiresAtMs <= sourceTimeMs
    ) {
      throw new Error('legacy_subject_evidence_invalid_response');
    }
    return {
      sessionId: values[offset],
      tokenHash: values[offset + 1],
      tokenId: values[offset + 2],
      expiresAtMs,
    };
  });
  return {
    status: 'eligible',
    tokenVersion: positiveSafeInteger(values[1]),
    generationSource: values[2] as
      | 'CURRENT_TOKEN_VERSION'
      | 'EMPTY_LEGACY_STATE',
    disabled: values[3] === '1',
    sourceTimeMs,
    familyQuarantineCounts: {
      missingOrUnbounded: nonnegativeSafeInteger(values[6]),
      issuedVersionMissingOrInvalid: nonnegativeSafeInteger(values[7]),
      versionMismatch: nonnegativeSafeInteger(values[8]),
      tokenEvidenceInvalid: nonnegativeSafeInteger(values[9]),
    },
    families,
  };
}
