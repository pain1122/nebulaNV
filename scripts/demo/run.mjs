import { fileURLToPath, URL } from "node:url";
import process from "node:process";
import console from "node:console";
import { buildD1Catalog } from "./catalog.mjs";
import { withJournal } from "./state.mjs";
import { createDemoRunner } from "./runner.mjs";
import { buildCommerceCatalog } from "./commerce-catalog.mjs";
import { withCommerceJournal } from "./commerce-state.mjs";
import { createCommerceRunner } from "./commerce-runner.mjs";

const arguments_ = process.argv.slice(2);
const commerce = arguments_.includes("--commerce");
const [command = "plan", profile = "showcase", ...extra] = arguments_.filter(
  (value) => value !== "--commerce",
);
if (
  !["plan", "seed", "verify", "reset"].includes(command) ||
  !["showcase", "limits"].includes(profile) ||
  extra.length ||
  arguments_.filter((value) => value === "--commerce").length > 1
)
  throw new Error(
    "usage: node scripts/demo/run.mjs plan|seed|verify|reset [showcase|limits] [--commerce]",
  );
if (command === "plan") {
  const plan = commerce
    ? buildCommerceCatalog(profile)
    : buildD1Catalog(profile);
  console.log(
    JSON.stringify(
      commerce
        ? {
            namespace: plan.namespace,
            schemaVersion: plan.schemaVersion,
            profile,
            counts: {
              products: plan.products.length,
              orders: plan.scenarios.length,
            },
            scenarios: plan.scenarios,
            cart: plan.cart,
            resetRetains: "Order/receipt history and customer",
          }
        : {
            namespace: plan.namespace,
            schemaVersion: plan.schemaVersion,
            profile,
            counts: {
              products: plan.products.length,
              media: plan.media.length,
              taxonomies: plan.taxonomies.length,
            },
            products: plan.products.map(
              ({ key, title, body, expectedPublic }) => ({
                key,
                title,
                status: body.status,
                selectionMode: body.selectionMode,
                expectedPublic,
              }),
            ),
          },
      null,
      2,
    ),
  );
} else {
  const { connectGateway } = await import("./gateway.mjs");
  const api = await connectGateway(
    process.env,
    commerce
      ? {
          customer: {
            email:
              process.env[`DEMO_D2_${profile.toUpperCase()}_EMAIL`] ??
              `demo-d2-${profile}@example.com`,
            password:
              process.env.DEMO_D2_CUSTOMER_PASS ??
              process.env.SEED_USER_PASS ??
              "User123!",
          },
        }
      : {},
  );
  let failure;
  try {
    const journal = commerce ? withCommerceJournal : withJournal;
    const runner = commerce ? createCommerceRunner : createDemoRunner;
    await journal(
      fileURLToPath(new URL("../../.nebula-demo/", import.meta.url)),
      async ({ state, save }) =>
        runner({ api, state, save, profile })[command](),
      profile,
    );
  } catch (error) {
    failure = error;
  }
  try {
    await api.close();
  } catch (error) {
    failure = failure
      ? new AggregateError([failure, error], "demo_run_and_logout_failed")
      : error;
  }
  if (failure) throw failure;
}
