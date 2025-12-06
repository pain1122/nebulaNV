// apps/product-service/test/utils/settings.ts
import { loadClient, call, mdS2S } from "../grpc/helpers";

const SETTINGS_PROTO = require.resolve("@nebula/protos/settings.proto");
const URL = process.env.SETTINGS_GRPC_URL || "127.0.0.1:50054";

// Raw gRPC client for SettingsService
const settingsClient = loadClient<any>({
  url: URL,
  protoPath: SETTINGS_PROTO,
  pkg: ["settings"],
  svc: "SettingsService",
});

// Read default_product_category via SettingsService.GetString (gRPC)
export async function getDefaultProductCategoryGrpc(): Promise<string> {
  const env = "default"; // 🔒 must match the DB row’s environment

  const res = await call<any>(
    settingsClient,
    "GetString",
    {
      namespace: "product",
      key: "default_product_category",
      environment: env,
    },
    undefined, // @Public, no mdS2S / auth metadata needed
  );

  // Extra visibility while things are flaky
  if (!res || !res.found || !res.value) {
    // This will show up in Jest output
    // so we know if it's a transport issue vs. DB miss.
    // eslint-disable-next-line no-console
    console.error("GetString(product.default.default_product_category) =>", res);
    throw new Error("default_product_category missing in settings-service");
  }

  return res.value as string;
}
