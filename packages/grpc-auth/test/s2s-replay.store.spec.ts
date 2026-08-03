import { S2SReplayStore } from "../src/s2s-replay.store";

describe("S2S replay-store readiness", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousReplayStore = process.env.S2S_REPLAY_STORE;

  afterEach(() => {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;

    if (previousReplayStore === undefined) {
      delete process.env.S2S_REPLAY_STORE;
    } else {
      process.env.S2S_REPLAY_STORE = previousReplayStore;
    }
  });

  it("does not create a Redis dependency in explicit memory mode", async () => {
    process.env.NODE_ENV = "test";
    process.env.S2S_REPLAY_STORE = "memory";
    const store = new S2SReplayStore();

    await expect(store.checkReadiness()).resolves.toBeUndefined();
    await expect(store.onModuleDestroy()).resolves.toBeUndefined();
  });
});
