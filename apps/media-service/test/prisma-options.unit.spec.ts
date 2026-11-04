import { PrismaPg } from "@prisma/adapter-pg";
import { mediaPrismaOptions } from "../src/prisma-options";

jest.mock("@prisma/adapter-pg", () => ({ PrismaPg: jest.fn() }));

describe("Media PostgreSQL driver configuration", () => {
  beforeEach(() => jest.clearAllMocks());

  it("keeps bounded pool/timeouts and error events", () => {
    const connectionString = "postgresql://user:password@localhost/demo";
    const options = mediaPrismaOptions(connectionString);
    expect(PrismaPg).toHaveBeenCalledWith(
      { connectionString, max: 10, connectionTimeoutMillis: 5000 },
      { schema: "public" },
    );
    expect(options.log).toEqual([{ emit: "event", level: "error" }]);
  });

  it("preserves explicit schema, connection limit and connect timeout", () => {
    const connectionString =
      "postgresql://user:password@localhost/demo?schema=owned&connection_limit=2&connect_timeout=3";
    mediaPrismaOptions(connectionString);
    expect(PrismaPg).toHaveBeenCalledWith(
      { connectionString, max: 2, connectionTimeoutMillis: 3000 },
      { schema: "owned" },
    );
  });

  it("preserves explicit zero connection timeout", () => {
    const connectionString =
      "postgresql://user:password@localhost/demo?connect_timeout=0";
    mediaPrismaOptions(connectionString);
    expect(PrismaPg).toHaveBeenCalledWith(
      { connectionString, max: 10, connectionTimeoutMillis: 0 },
      { schema: "public" },
    );
  });

  it.each([
    ["", "media_database_url_required"],
    ["password-secret", "media_database_url_invalid"],
    [
      "https://user:password-secret@localhost/demo",
      "media_database_url_invalid",
    ],
    ["postgresql://localhost/demo?schema=", "media_database_schema_invalid"],
    [
      "postgresql://localhost/demo?connection_limit=0",
      "media_database_connection_limit_invalid",
    ],
    [
      "postgresql://localhost/demo?connection_limit=1.5",
      "media_database_connection_limit_invalid",
    ],
    [
      "postgresql://localhost/demo?connect_timeout=-1",
      "media_database_connect_timeout_invalid",
    ],
    [
      "postgresql://localhost/demo?connect_timeout=9999999999",
      "media_database_connect_timeout_invalid",
    ],
  ])("rejects invalid owner configuration %s", (url, message) => {
    expect(() => mediaPrismaOptions(url)).toThrow(message);
    expect(PrismaPg).not.toHaveBeenCalled();
  });
});
