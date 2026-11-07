import { Logger } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaService } from "../src/prisma.service";

const mockOptions = jest.fn<void, [unknown]>();
const mockHandlers = new Map<string, (event: unknown) => void>();
const mockDisconnect = jest
  .fn<Promise<void>, []>()
  .mockResolvedValue(undefined);

jest.mock("../src/generated/prisma/client", () => ({
  PrismaClient: class {
    constructor(options: unknown) {
      mockOptions(options);
    }
    $on(name: string, handler: (event: unknown) => void): void {
      mockHandlers.set(name, handler);
    }
    $disconnect = mockDisconnect;
  },
}));

describe("Prisma bounded logging", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  beforeEach(() => {
    process.env.DATABASE_URL = "postgresql://fixture:fixture@localhost/shadow";
  });
  afterEach(() => {
    jest.restoreAllMocks();
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it("emits only the bounded error marker and disconnects on shutdown", async () => {
    const error = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
    const service = new PrismaService();
    expect(mockOptions).toHaveBeenCalledWith({
      adapter: expect.any(PrismaPg) as unknown,
      log: [{ emit: "event", level: "error" }],
    });
    const onError = mockHandlers.get("error");
    expect(onError).toBeDefined();
    onError?.({
      message: "private-error",
      query: "private-query",
      params: "private-params",
    });
    expect(error.mock.calls).toEqual([["prisma_error"]]);
    await service.onModuleDestroy();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });
});
