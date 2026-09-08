export const DEFAULT_DEVELOPMENT_AUTHORITY = Object.freeze({
  version: 1,
  tenant: {
    id: "a1000000-0000-4000-8000-000000000001",
    displayName: "Nebula Development Tenant",
  },
  site: {
    id: "a2000000-0000-4000-8000-000000000001",
    displayName: "Nebula Development Site",
  },
  channels: {
    web: "a3000000-0000-4000-8000-000000000001",
    android: "a3000000-0000-4000-8000-000000000002",
    ios: "a3000000-0000-4000-8000-000000000003",
  },
  applications: {
    storefrontWeb: {
      id: "a4000000-0000-4000-8000-000000000001",
      clientId: "a5000000-0000-4000-8000-000000000001",
      displayName: "Development Storefront Web",
      legacyHandle: "storefront-web-local",
      origin: "http://localhost:3008",
    },
    adminWeb: {
      id: "a4000000-0000-4000-8000-000000000002",
      clientId: "a5000000-0000-4000-8000-000000000002",
      displayName: "Development Admin Web",
      legacyHandle: "admin-web-local",
      origin: "http://localhost:3000",
    },
    android: {
      id: "a4000000-0000-4000-8000-000000000003",
      clientId: "a5000000-0000-4000-8000-000000000003",
      displayName: "Development Android",
      developmentHandle: "mobile-android-local",
      packageId: "dev.nebula.mobile",
      signingCertificateSha256:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    },
    ios: {
      id: "a4000000-0000-4000-8000-000000000004",
      clientId: "a5000000-0000-4000-8000-000000000004",
      displayName: "Development iOS",
      developmentHandle: "mobile-ios-local",
      teamId: "NEBULADEV1",
      bundleId: "dev.nebula.mobile",
    },
  },
  identityControlPlane: {
    version: 1,
    realms: {
      defaultConsumer: {
        id: "b1000000-0000-4000-8000-000000000001",
        authRouteRef: "b1100000-0000-4000-8000-000000000001",
      },
      platformOperator: {
        id: "b1000000-0000-4000-8000-000000000002",
        authRouteRef: "b1100000-0000-4000-8000-000000000002",
      },
    },
    providers: {
      defaultLocal: {
        id: "b2000000-0000-4000-8000-000000000001",
        issuerReference:
          "urn:nebula:local:b1000000-0000-4000-8000-000000000001",
      },
      operatorLocal: {
        id: "b2000000-0000-4000-8000-000000000002",
        issuerReference:
          "urn:nebula:local:b1000000-0000-4000-8000-000000000002",
      },
    },
    policies: {
      storefrontWeb: {
        id: "b3000000-0000-4000-8000-000000000001",
        audience: "urn:nebula:application:a4000000-0000-4000-8000-000000000001",
      },
      adminWeb: {
        id: "b3000000-0000-4000-8000-000000000002",
        audience: "urn:nebula:application:a4000000-0000-4000-8000-000000000002",
      },
      android: {
        id: "b3000000-0000-4000-8000-000000000003",
        audience: "urn:nebula:application:a4000000-0000-4000-8000-000000000003",
      },
      ios: {
        id: "b3000000-0000-4000-8000-000000000004",
        audience: "urn:nebula:application:a4000000-0000-4000-8000-000000000004",
      },
    },
    trusts: {
      storefrontDefaultLocal: "b4000000-0000-4000-8000-000000000001",
      adminDefaultLocal: "b4000000-0000-4000-8000-000000000002",
      androidDefaultLocal: "b4000000-0000-4000-8000-000000000003",
      iosDefaultLocal: "b4000000-0000-4000-8000-000000000004",
      adminOperatorLocal: "b4000000-0000-4000-8000-000000000005",
    },
  },
  evidenceReference: "repository:default-development-authority:v1",
  evidenceDigest:
    "1111111111111111111111111111111111111111111111111111111111111111",
});

export type DefaultDevelopmentAuthorityManifest =
  typeof DEFAULT_DEVELOPMENT_AUTHORITY;
