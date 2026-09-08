import {
  APPLICATION_LIFECYCLE_STATES,
  APPLICATION_PROFILES,
  CHANNEL_KINDS,
  ENTITLEMENT_SCOPE_KINDS,
  IDENTITY_VERIFICATION_STATES,
  PARENT_RELATIONSHIP_STATES,
  TENANT_SITE_LIFECYCLE_STATES,
  assertAuthorityUuidV4,
} from "../src/authority/authority-domain";

describe("authority domain foundation", () => {
  it("keeps the Batch 1 closed catalogs exact", () => {
    expect(TENANT_SITE_LIFECYCLE_STATES).toEqual([
      "PROVISIONING",
      "ACTIVE",
      "SUSPENDED",
      "ARCHIVED",
    ]);
    expect(APPLICATION_LIFECYCLE_STATES).toEqual([
      "PENDING_VERIFICATION",
      "ACTIVE",
      "DISABLED",
      "REVOKED",
    ]);
    expect(CHANNEL_KINDS).toEqual(["WEB", "ANDROID", "IOS"]);
    expect(APPLICATION_PROFILES).toEqual([
      "storefront-web",
      "admin-web",
      "mobile",
    ]);
    expect(IDENTITY_VERIFICATION_STATES).toEqual([
      "PENDING",
      "VERIFIED",
      "REVOKED",
    ]);
    expect(PARENT_RELATIONSHIP_STATES).toEqual([
      "PENDING",
      "ACTIVE",
      "SUSPENDED",
      "REVOKED",
    ]);
    expect(ENTITLEMENT_SCOPE_KINDS).toEqual(["TENANT", "SITE"]);
  });

  it("accepts only canonical lowercase UUIDv4 authority IDs", () => {
    expect(
      assertAuthorityUuidV4("9d28a733-9035-44a2-8177-e76dd40f69ec", "tenantId"),
    ).toBe("9d28a733-9035-44a2-8177-e76dd40f69ec");

    for (const invalid of [
      "9D28A733-9035-44A2-8177-E76DD40F69EC",
      "9d28a733-9035-74a2-8177-e76dd40f69ec",
      "single-site",
      "",
    ]) {
      expect(() => assertAuthorityUuidV4(invalid, "tenantId")).toThrow(
        "tenantId_must_be_canonical_uuid_v4",
      );
    }
  });
});
