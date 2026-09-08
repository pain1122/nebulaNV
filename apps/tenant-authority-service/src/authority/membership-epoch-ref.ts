import { createHmac } from "node:crypto";
import { assertAuthorityUuidV4 } from "./authority-domain";

const MEMBERSHIP_EPOCH_REF_PREFIX = "meg1_";
const MINIMUM_EPOCH_KEY_BYTES = 32;

export function deriveMembershipEpochRef(input: {
  membershipId: string;
  generation: number;
  integrityKey: string;
}): string {
  const membershipId = assertAuthorityUuidV4(
    input.membershipId,
    "membershipId",
  );
  if (!Number.isSafeInteger(input.generation) || input.generation < 1) {
    throw new Error("membershipGeneration_must_be_a_positive_safe_integer");
  }
  if (
    typeof input.integrityKey !== "string" ||
    Buffer.byteLength(input.integrityKey, "utf8") < MINIMUM_EPOCH_KEY_BYTES
  ) {
    throw new Error("membershipEpochIntegrityKey_must_be_at_least_32_bytes");
  }

  const canonical = JSON.stringify([
    "nebula-membership-epoch",
    "1",
    membershipId,
    input.generation,
  ]);
  const digest = createHmac("sha256", input.integrityKey)
    .update(canonical, "utf8")
    .digest("base64url");
  return `${MEMBERSHIP_EPOCH_REF_PREFIX}${digest}`;
}
