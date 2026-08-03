import { Logger } from "@nestjs/common";
import type { ClientGrpc } from "@nestjs/microservices";
import { of, throwError } from "rxjs";
import {
  getSettings,
  getTaxonomy,
  type SettingsProxy,
  type TaxonomyProxy,
} from "@nebula/clients";
import { DefaultBlogTaxonomyInitializer } from "../src/default-blog-taxonomy.initializer";

jest.mock("@nebula/clients", () => ({
  getSettings: jest.fn(),
  getTaxonomy: jest.fn(),
}));

const mockedGetSettings = getSettings as jest.MockedFunction<
  typeof getSettings
>;
const mockedGetTaxonomy = getTaxonomy as jest.MockedFunction<
  typeof getTaxonomy
>;

type EnsureTaxonomyRequest = {
  scope: string;
  kind: string;
  slug: string;
  title: string;
  description: string;
};

describe("DefaultBlogTaxonomyInitializer", () => {
  let ensureSystemTaxonomy: jest.Mock;
  let ensureBootstrapString: jest.Mock;
  let initializer: DefaultBlogTaxonomyInitializer;
  let loggerError: jest.SpyInstance;

  beforeEach(() => {
    ensureSystemTaxonomy = jest.fn().mockReturnValue(
      of({
        data: { id: "blog-category-id" },
      }),
    );
    ensureBootstrapString = jest.fn().mockReturnValue(
      of({
        value: "blog-category-id",
      }),
    );

    mockedGetTaxonomy.mockReturnValue({
      EnsureSystemTaxonomy: ensureSystemTaxonomy,
    } as unknown as TaxonomyProxy);
    mockedGetSettings.mockReturnValue({
      EnsureBootstrapString: ensureBootstrapString,
    } as unknown as SettingsProxy);

    jest.spyOn(Logger.prototype, "log").mockImplementation();
    loggerError = jest.spyOn(Logger.prototype, "error").mockImplementation();

    const emptyClient = {} as ClientGrpc;
    initializer = new DefaultBlogTaxonomyInitializer(emptyClient, emptyClient);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("uses only the blog-owned taxonomy scope and setting key", async () => {
    await initializer.onModuleInit();

    expect(ensureSystemTaxonomy).toHaveBeenCalledTimes(1);
    const [taxonomyRequest] = ensureSystemTaxonomy.mock.calls[0] as [
      EnsureTaxonomyRequest,
    ];
    expect(taxonomyRequest).toMatchObject({
      scope: "blog",
      kind: "category.default",
      slug: "uncategorized",
    });
    expect(typeof taxonomyRequest.title).toBe("string");
    expect(typeof taxonomyRequest.description).toBe("string");

    expect(ensureBootstrapString).toHaveBeenCalledWith({
      namespace: "blog",
      environment: "default",
      key: "default_blog_category",
      value: "blog-category-id",
    });
    expect(ensureSystemTaxonomy.mock.invocationCallOrder[0]).toBeLessThan(
      ensureBootstrapString.mock.invocationCallOrder[0],
    );
    expect(loggerError).not.toHaveBeenCalled();
  });

  it("logs a dependency failure without failing startup", async () => {
    ensureBootstrapString.mockReturnValue(
      throwError(() => new Error("settings unavailable")),
    );

    await expect(initializer.onModuleInit()).resolves.toBeUndefined();

    expect(loggerError).toHaveBeenCalledWith(
      "Failed to initialize default blog taxonomy: settings unavailable",
    );
  });

  it("can safely invoke the service-owned operations again", async () => {
    await initializer.onModuleInit();
    await initializer.onModuleInit();

    expect(ensureSystemTaxonomy).toHaveBeenCalledTimes(2);
    expect(ensureBootstrapString).toHaveBeenCalledTimes(2);
    expect(loggerError).not.toHaveBeenCalled();
  });
});
