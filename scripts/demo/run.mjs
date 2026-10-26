import { fileURLToPath, URL } from "node:url";
import process from "node:process";
import console from "node:console";
import { buildD1Catalog } from "./catalog.mjs";
import { withJournal } from "./state.mjs";
import { createDemoRunner } from "./runner.mjs";

const [command = "plan", profile = "showcase", ...extra] =
  process.argv.slice(2);
if (
  !["plan", "seed", "verify", "reset"].includes(command) ||
  !["showcase", "limits"].includes(profile) ||
  extra.length
)
  throw new Error(
    "usage: node scripts/demo/run.mjs plan|seed|verify|reset [showcase|limits]",
  );
if (command === "plan") {
  const plan = buildD1Catalog(profile);
  console.log(
    JSON.stringify(
      {
        namespace: plan.namespace,
        schemaVersion: plan.schemaVersion,
        profile,
        counts: {
          products: plan.products.length,
          media: plan.media.length,
          taxonomies: plan.taxonomies.length,
        },
        products: plan.products.map(({ key, title, body, expectedPublic }) => ({
          key,
          title,
          status: body.status,
          selectionMode: body.selectionMode,
          expectedPublic,
        })),
      },
      null,
      2,
    ),
  );
} else {
  const { connectGateway } = await import("./gateway.mjs");
  const api = await connectGateway();
  let failure;
  try {
    await withJournal(
      fileURLToPath(new URL("../../.nebula-demo/", import.meta.url)),
      async ({ state, save }) =>
        createDemoRunner({ api, state, save, profile })[command](),
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
