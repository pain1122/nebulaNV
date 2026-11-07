import { PrismaPg } from "@prisma/adapter-pg";
import { settingsPrismaOptions } from "../src/prisma-options";

jest.mock("@prisma/adapter-pg", () => ({ PrismaPg: jest.fn() }));

describe("Settings PostgreSQL driver configuration", () => {
  beforeEach(() => jest.clearAllMocks());

  it("keeps bounded pool/timeouts and error events", () => {
    const connectionString = "postgresql://user:password@localhost/demo";
    const options = settingsPrismaOptions(connectionString);
    expect(PrismaPg).toHaveBeenCalledWith(
      { connectionString, max: 10, connectionTimeoutMillis: 5000 },
      { schema: "public" },
    );
    expect(options.log).toEqual([{ emit: "event", level: "error" }]);
  });

  it("preserves explicit schema, connection limit and connect timeout", () => {
    const connectionString =
      "postgresql://user:password@localhost/demo?schema=owned&connection_limit=2&connect_timeout=3";
    settingsPrismaOptions(connectionString);
    expect(PrismaPg).toHaveBeenCalledWith(
      { connectionString, max: 2, connectionTimeoutMillis: 3000 },
      { schema: "owned" },
    );
  });

  it("preserves explicit zero connection timeout", () => {
    const connectionString =
      "postgresql://user:password@localhost/demo?connect_timeout=0";
    settingsPrismaOptions(connectionString);
    expect(PrismaPg).toHaveBeenCalledWith(
      { connectionString, max: 10, connectionTimeoutMillis: 0 },
      { schema: "public" },
    );
  });

  it.each([
    ["", "settings_database_url_required"],
    ["password-secret", "settings_database_url_invalid"],
    [
      "https://user:password-secret@localhost/demo",
      "settings_database_url_invalid",
    ],
    ["postgresql://localhost/demo?schema=", "settings_database_schema_invalid"],
    [
      "postgresql://localhost/demo?connection_limit=0",
      "settings_database_connection_limit_invalid",
    ],
    [
      "postgresql://localhost/demo?connection_limit=1.5",
      "settings_database_connection_limit_invalid",
    ],
    [
      "postgresql://localhost/demo?connect_timeout=-1",
      "settings_database_connect_timeout_invalid",
    ],
    [
      "postgresql://localhost/demo?connect_timeout=9999999999",
      "settings_database_connect_timeout_invalid",
    ],
  ])("rejects invalid owner configuration %s", (url, message) => {
    expect(() => settingsPrismaOptions(url)).toThrow(message);
    expect(PrismaPg).not.toHaveBeenCalled();
  });
});
