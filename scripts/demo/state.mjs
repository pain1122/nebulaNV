import assert from "node:assert/strict";
import {
  mkdir,
  readFile,
  writeFile,
  rename,
  open,
  unlink,
} from "node:fs/promises";
import { resolve } from "node:path";
import {
  DEMO_NAMESPACE,
  DEMO_SCHEMA_VERSION,
  buildD1Catalog,
} from "./catalog.mjs";

export function emptyState() {
  return {
    namespace: DEMO_NAMESPACE,
    schemaVersion: DEMO_SCHEMA_VERSION,
    currency: null,
    target: null,
    taxonomies: {},
    media: {},
    products: {},
    profiles: {},
  };
}

export function validateState(state) {
  assert.equal(
    state.namespace,
    DEMO_NAMESPACE,
    "demo_state_namespace_mismatch",
  );
  assert.equal(
    state.schemaVersion,
    DEMO_SCHEMA_VERSION,
    "demo_state_version_mismatch",
  );
  assert.ok(
    state.profiles &&
      typeof state.profiles === "object" &&
      !Array.isArray(state.profiles),
    "demo_state_invalid_profiles",
  );
  const catalogue = buildD1Catalog("limits");
  for (const kind of ["taxonomies", "media", "products"]) {
    assert.ok(
      state[kind] &&
        typeof state[kind] === "object" &&
        !Array.isArray(state[kind]),
      "demo_state_invalid",
    );
    const keys = new Set(catalogue[kind].map((item) => item.key));
    for (const [key, entry] of Object.entries(state[kind])) {
      assert.ok(keys.has(key), "demo_state_unknown_fixture");
      assert.match(
        entry.id,
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu,
        "demo_state_invalid_id",
      );
    }
  }
  return state;
}

export async function withJournal(directory, action) {
  const root = resolve(directory);
  await mkdir(root, { recursive: true });
  const lockPath = resolve(root, "d1.lock");
  let lock;
  try {
    lock = await open(lockPath, "wx");
  } catch (error) {
    if (error.code === "EEXIST")
      throw new Error(
        "demo_run_already_locked; if the previous process crashed, confirm it stopped before removing .nebula-demo/d1.lock",
      );
    throw error;
  }
  try {
    const file = resolve(root, "d1.json");
    let state;
    try {
      state = validateState(JSON.parse(await readFile(file, "utf8")));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      state = emptyState();
    }
    const save = async () => {
      validateState(state);
      const temporary = resolve(root, "d1.json.tmp");
      await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, {
        mode: 0o600,
      });
      await rename(temporary, file);
    };
    return await action({ state, save });
  } finally {
    await lock.close();
    await unlink(lockPath);
  }
}
