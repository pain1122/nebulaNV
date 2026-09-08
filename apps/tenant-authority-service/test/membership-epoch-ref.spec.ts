import { createHash } from "node:crypto";
import { deriveMembershipEpochRef } from "../src/authority/membership-epoch-ref";

const membershipId = "9d28a733-9035-44a2-8177-e76dd40f69ec";
const integrityKey = "membership-epoch-test-secret-000000000001";

describe("membership epoch reference", () => {
  it("HMACs the stable membership ID and internal generation canonically", () => {
    expect(
      deriveMembershipEpochRef({ membershipId, generation: 1, integrityKey }),
    ).toBe("meg1_33QCSfBaZ7syXicjYhHa8aZQDW3KEeDsRSTdQqe7YWI");
  });

  it("changes when the generation, membership, or dedicated key changes", () => {
    const baseline = deriveMembershipEpochRef({
      membershipId,
      generation: 1,
      integrityKey,
    });
    const variants = [
      deriveMembershipEpochRef({
        membershipId,
        generation: 2,
        integrityKey,
      }),
      deriveMembershipEpochRef({
        membershipId: "9d28a733-9035-44a2-8177-e76dd40f69ed",
        generation: 1,
        integrityKey,
      }),
      deriveMembershipEpochRef({
        membershipId,
        generation: 1,
        integrityKey: "membership-epoch-test-secret-000000000002",
      }),
    ];

    expect(new Set([baseline, ...variants]).size).toBe(4);
    for (const reference of variants) {
      expect(reference).toMatch(/^meg1_[A-Za-z0-9_-]{43}$/);
    }
  });

  it("does not expose the small generation through a plain hash", () => {
    const plain = `meg1_${createHash("sha256")
      .update(JSON.stringify(["nebula-membership-epoch", "1", membershipId, 1]))
      .digest("base64url")}`;

    expect(
      deriveMembershipEpochRef({ membershipId, generation: 1, integrityKey }),
    ).not.toBe(plain);
  });

  it("rejects malformed IDs, generations, and undersized keys", () => {
    expect(() =>
      deriveMembershipEpochRef({
        membershipId: "not-a-membership",
        generation: 1,
        integrityKey,
      }),
    ).toThrow("membershipId_must_be_canonical_uuid_v4");
    expect(() =>
      deriveMembershipEpochRef({
        membershipId,
        generation: 0,
        integrityKey,
      }),
    ).toThrow("membershipGeneration_must_be_a_positive_safe_integer");
    expect(() =>
      deriveMembershipEpochRef({
        membershipId,
        generation: 1,
        integrityKey: "too-short",
      }),
    ).toThrow("membershipEpochIntegrityKey_must_be_at_least_32_bytes");
  });
});
