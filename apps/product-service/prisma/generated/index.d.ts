
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model ProductCategory
 * 
 */
export type ProductCategory = $Result.DefaultSelection<Prisma.$ProductCategoryPayload>
/**
 * Model Product
 * 
 */
export type Product = $Result.DefaultSelection<Prisma.$ProductPayload>
/**
 * Model ProductGalleryImage
 * 
 */
export type ProductGalleryImage = $Result.DefaultSelection<Prisma.$ProductGalleryImagePayload>
/**
 * Model ProductVrHotspot
 * 
 */
export type ProductVrHotspot = $Result.DefaultSelection<Prisma.$ProductVrHotspotPayload>
/**
 * Model ProductAttribute
 * 
 */
export type ProductAttribute = $Result.DefaultSelection<Prisma.$ProductAttributePayload>
/**
 * Model ProductComment
 * 
 */
export type ProductComment = $Result.DefaultSelection<Prisma.$ProductCommentPayload>
/**
 * Model ProductSet
 * 
 */
export type ProductSet = $Result.DefaultSelection<Prisma.$ProductSetPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const ProductStatus: {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED'
};

export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus]


export const DiscountType: {
  PERCENTAGE: 'PERCENTAGE',
  FIXED: 'FIXED'
};

export type DiscountType = (typeof DiscountType)[keyof typeof DiscountType]


export const AttributeValueType: {
  STRING: 'STRING',
  INT: 'INT',
  BOOL: 'BOOL'
};

export type AttributeValueType = (typeof AttributeValueType)[keyof typeof AttributeValueType]


export const CommentStatus: {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
};

export type CommentStatus = (typeof CommentStatus)[keyof typeof CommentStatus]

}

export type ProductStatus = $Enums.ProductStatus

export const ProductStatus: typeof $Enums.ProductStatus

export type DiscountType = $Enums.DiscountType

export const DiscountType: typeof $Enums.DiscountType

export type AttributeValueType = $Enums.AttributeValueType

export const AttributeValueType: typeof $Enums.AttributeValueType

export type CommentStatus = $Enums.CommentStatus

export const CommentStatus: typeof $Enums.CommentStatus

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more ProductCategories
 * const productCategories = await prisma.productCategory.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more ProductCategories
   * const productCategories = await prisma.productCategory.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.productCategory`: Exposes CRUD operations for the **ProductCategory** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ProductCategories
    * const productCategories = await prisma.productCategory.findMany()
    * ```
    */
  get productCategory(): Prisma.ProductCategoryDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.product`: Exposes CRUD operations for the **Product** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Products
    * const products = await prisma.product.findMany()
    * ```
    */
  get product(): Prisma.ProductDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.productGalleryImage`: Exposes CRUD operations for the **ProductGalleryImage** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ProductGalleryImages
    * const productGalleryImages = await prisma.productGalleryImage.findMany()
    * ```
    */
  get productGalleryImage(): Prisma.ProductGalleryImageDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.productVrHotspot`: Exposes CRUD operations for the **ProductVrHotspot** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ProductVrHotspots
    * const productVrHotspots = await prisma.productVrHotspot.findMany()
    * ```
    */
  get productVrHotspot(): Prisma.ProductVrHotspotDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.productAttribute`: Exposes CRUD operations for the **ProductAttribute** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ProductAttributes
    * const productAttributes = await prisma.productAttribute.findMany()
    * ```
    */
  get productAttribute(): Prisma.ProductAttributeDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.productComment`: Exposes CRUD operations for the **ProductComment** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ProductComments
    * const productComments = await prisma.productComment.findMany()
    * ```
    */
  get productComment(): Prisma.ProductCommentDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.productSet`: Exposes CRUD operations for the **ProductSet** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ProductSets
    * const productSets = await prisma.productSet.findMany()
    * ```
    */
  get productSet(): Prisma.ProductSetDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.11.1
   * Query Engine version: f40f79ec31188888a2e33acda0ecc8fd10a853a9
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    ProductCategory: 'ProductCategory',
    Product: 'Product',
    ProductGalleryImage: 'ProductGalleryImage',
    ProductVrHotspot: 'ProductVrHotspot',
    ProductAttribute: 'ProductAttribute',
    ProductComment: 'ProductComment',
    ProductSet: 'ProductSet'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "productCategory" | "product" | "productGalleryImage" | "productVrHotspot" | "productAttribute" | "productComment" | "productSet"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      ProductCategory: {
        payload: Prisma.$ProductCategoryPayload<ExtArgs>
        fields: Prisma.ProductCategoryFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ProductCategoryFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductCategoryPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ProductCategoryFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductCategoryPayload>
          }
          findFirst: {
            args: Prisma.ProductCategoryFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductCategoryPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ProductCategoryFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductCategoryPayload>
          }
          findMany: {
            args: Prisma.ProductCategoryFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductCategoryPayload>[]
          }
          create: {
            args: Prisma.ProductCategoryCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductCategoryPayload>
          }
          createMany: {
            args: Prisma.ProductCategoryCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ProductCategoryCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductCategoryPayload>[]
          }
          delete: {
            args: Prisma.ProductCategoryDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductCategoryPayload>
          }
          update: {
            args: Prisma.ProductCategoryUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductCategoryPayload>
          }
          deleteMany: {
            args: Prisma.ProductCategoryDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ProductCategoryUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ProductCategoryUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductCategoryPayload>[]
          }
          upsert: {
            args: Prisma.ProductCategoryUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductCategoryPayload>
          }
          aggregate: {
            args: Prisma.ProductCategoryAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateProductCategory>
          }
          groupBy: {
            args: Prisma.ProductCategoryGroupByArgs<ExtArgs>
            result: $Utils.Optional<ProductCategoryGroupByOutputType>[]
          }
          count: {
            args: Prisma.ProductCategoryCountArgs<ExtArgs>
            result: $Utils.Optional<ProductCategoryCountAggregateOutputType> | number
          }
        }
      }
      Product: {
        payload: Prisma.$ProductPayload<ExtArgs>
        fields: Prisma.ProductFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ProductFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ProductFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductPayload>
          }
          findFirst: {
            args: Prisma.ProductFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ProductFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductPayload>
          }
          findMany: {
            args: Prisma.ProductFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductPayload>[]
          }
          create: {
            args: Prisma.ProductCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductPayload>
          }
          createMany: {
            args: Prisma.ProductCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ProductCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductPayload>[]
          }
          delete: {
            args: Prisma.ProductDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductPayload>
          }
          update: {
            args: Prisma.ProductUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductPayload>
          }
          deleteMany: {
            args: Prisma.ProductDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ProductUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ProductUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductPayload>[]
          }
          upsert: {
            args: Prisma.ProductUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductPayload>
          }
          aggregate: {
            args: Prisma.ProductAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateProduct>
          }
          groupBy: {
            args: Prisma.ProductGroupByArgs<ExtArgs>
            result: $Utils.Optional<ProductGroupByOutputType>[]
          }
          count: {
            args: Prisma.ProductCountArgs<ExtArgs>
            result: $Utils.Optional<ProductCountAggregateOutputType> | number
          }
        }
      }
      ProductGalleryImage: {
        payload: Prisma.$ProductGalleryImagePayload<ExtArgs>
        fields: Prisma.ProductGalleryImageFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ProductGalleryImageFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductGalleryImagePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ProductGalleryImageFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductGalleryImagePayload>
          }
          findFirst: {
            args: Prisma.ProductGalleryImageFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductGalleryImagePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ProductGalleryImageFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductGalleryImagePayload>
          }
          findMany: {
            args: Prisma.ProductGalleryImageFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductGalleryImagePayload>[]
          }
          create: {
            args: Prisma.ProductGalleryImageCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductGalleryImagePayload>
          }
          createMany: {
            args: Prisma.ProductGalleryImageCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ProductGalleryImageCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductGalleryImagePayload>[]
          }
          delete: {
            args: Prisma.ProductGalleryImageDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductGalleryImagePayload>
          }
          update: {
            args: Prisma.ProductGalleryImageUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductGalleryImagePayload>
          }
          deleteMany: {
            args: Prisma.ProductGalleryImageDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ProductGalleryImageUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ProductGalleryImageUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductGalleryImagePayload>[]
          }
          upsert: {
            args: Prisma.ProductGalleryImageUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductGalleryImagePayload>
          }
          aggregate: {
            args: Prisma.ProductGalleryImageAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateProductGalleryImage>
          }
          groupBy: {
            args: Prisma.ProductGalleryImageGroupByArgs<ExtArgs>
            result: $Utils.Optional<ProductGalleryImageGroupByOutputType>[]
          }
          count: {
            args: Prisma.ProductGalleryImageCountArgs<ExtArgs>
            result: $Utils.Optional<ProductGalleryImageCountAggregateOutputType> | number
          }
        }
      }
      ProductVrHotspot: {
        payload: Prisma.$ProductVrHotspotPayload<ExtArgs>
        fields: Prisma.ProductVrHotspotFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ProductVrHotspotFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductVrHotspotPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ProductVrHotspotFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductVrHotspotPayload>
          }
          findFirst: {
            args: Prisma.ProductVrHotspotFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductVrHotspotPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ProductVrHotspotFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductVrHotspotPayload>
          }
          findMany: {
            args: Prisma.ProductVrHotspotFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductVrHotspotPayload>[]
          }
          create: {
            args: Prisma.ProductVrHotspotCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductVrHotspotPayload>
          }
          createMany: {
            args: Prisma.ProductVrHotspotCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ProductVrHotspotCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductVrHotspotPayload>[]
          }
          delete: {
            args: Prisma.ProductVrHotspotDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductVrHotspotPayload>
          }
          update: {
            args: Prisma.ProductVrHotspotUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductVrHotspotPayload>
          }
          deleteMany: {
            args: Prisma.ProductVrHotspotDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ProductVrHotspotUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ProductVrHotspotUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductVrHotspotPayload>[]
          }
          upsert: {
            args: Prisma.ProductVrHotspotUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductVrHotspotPayload>
          }
          aggregate: {
            args: Prisma.ProductVrHotspotAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateProductVrHotspot>
          }
          groupBy: {
            args: Prisma.ProductVrHotspotGroupByArgs<ExtArgs>
            result: $Utils.Optional<ProductVrHotspotGroupByOutputType>[]
          }
          count: {
            args: Prisma.ProductVrHotspotCountArgs<ExtArgs>
            result: $Utils.Optional<ProductVrHotspotCountAggregateOutputType> | number
          }
        }
      }
      ProductAttribute: {
        payload: Prisma.$ProductAttributePayload<ExtArgs>
        fields: Prisma.ProductAttributeFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ProductAttributeFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductAttributePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ProductAttributeFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductAttributePayload>
          }
          findFirst: {
            args: Prisma.ProductAttributeFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductAttributePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ProductAttributeFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductAttributePayload>
          }
          findMany: {
            args: Prisma.ProductAttributeFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductAttributePayload>[]
          }
          create: {
            args: Prisma.ProductAttributeCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductAttributePayload>
          }
          createMany: {
            args: Prisma.ProductAttributeCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ProductAttributeCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductAttributePayload>[]
          }
          delete: {
            args: Prisma.ProductAttributeDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductAttributePayload>
          }
          update: {
            args: Prisma.ProductAttributeUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductAttributePayload>
          }
          deleteMany: {
            args: Prisma.ProductAttributeDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ProductAttributeUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ProductAttributeUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductAttributePayload>[]
          }
          upsert: {
            args: Prisma.ProductAttributeUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductAttributePayload>
          }
          aggregate: {
            args: Prisma.ProductAttributeAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateProductAttribute>
          }
          groupBy: {
            args: Prisma.ProductAttributeGroupByArgs<ExtArgs>
            result: $Utils.Optional<ProductAttributeGroupByOutputType>[]
          }
          count: {
            args: Prisma.ProductAttributeCountArgs<ExtArgs>
            result: $Utils.Optional<ProductAttributeCountAggregateOutputType> | number
          }
        }
      }
      ProductComment: {
        payload: Prisma.$ProductCommentPayload<ExtArgs>
        fields: Prisma.ProductCommentFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ProductCommentFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductCommentPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ProductCommentFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductCommentPayload>
          }
          findFirst: {
            args: Prisma.ProductCommentFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductCommentPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ProductCommentFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductCommentPayload>
          }
          findMany: {
            args: Prisma.ProductCommentFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductCommentPayload>[]
          }
          create: {
            args: Prisma.ProductCommentCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductCommentPayload>
          }
          createMany: {
            args: Prisma.ProductCommentCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ProductCommentCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductCommentPayload>[]
          }
          delete: {
            args: Prisma.ProductCommentDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductCommentPayload>
          }
          update: {
            args: Prisma.ProductCommentUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductCommentPayload>
          }
          deleteMany: {
            args: Prisma.ProductCommentDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ProductCommentUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ProductCommentUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductCommentPayload>[]
          }
          upsert: {
            args: Prisma.ProductCommentUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductCommentPayload>
          }
          aggregate: {
            args: Prisma.ProductCommentAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateProductComment>
          }
          groupBy: {
            args: Prisma.ProductCommentGroupByArgs<ExtArgs>
            result: $Utils.Optional<ProductCommentGroupByOutputType>[]
          }
          count: {
            args: Prisma.ProductCommentCountArgs<ExtArgs>
            result: $Utils.Optional<ProductCommentCountAggregateOutputType> | number
          }
        }
      }
      ProductSet: {
        payload: Prisma.$ProductSetPayload<ExtArgs>
        fields: Prisma.ProductSetFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ProductSetFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductSetPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ProductSetFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductSetPayload>
          }
          findFirst: {
            args: Prisma.ProductSetFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductSetPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ProductSetFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductSetPayload>
          }
          findMany: {
            args: Prisma.ProductSetFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductSetPayload>[]
          }
          create: {
            args: Prisma.ProductSetCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductSetPayload>
          }
          createMany: {
            args: Prisma.ProductSetCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ProductSetCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductSetPayload>[]
          }
          delete: {
            args: Prisma.ProductSetDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductSetPayload>
          }
          update: {
            args: Prisma.ProductSetUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductSetPayload>
          }
          deleteMany: {
            args: Prisma.ProductSetDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ProductSetUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ProductSetUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductSetPayload>[]
          }
          upsert: {
            args: Prisma.ProductSetUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProductSetPayload>
          }
          aggregate: {
            args: Prisma.ProductSetAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateProductSet>
          }
          groupBy: {
            args: Prisma.ProductSetGroupByArgs<ExtArgs>
            result: $Utils.Optional<ProductSetGroupByOutputType>[]
          }
          count: {
            args: Prisma.ProductSetCountArgs<ExtArgs>
            result: $Utils.Optional<ProductSetCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    productCategory?: ProductCategoryOmit
    product?: ProductOmit
    productGalleryImage?: ProductGalleryImageOmit
    productVrHotspot?: ProductVrHotspotOmit
    productAttribute?: ProductAttributeOmit
    productComment?: ProductCommentOmit
    productSet?: ProductSetOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type ProductCategoryCountOutputType
   */

  export type ProductCategoryCountOutputType = {
    products: number
  }

  export type ProductCategoryCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    products?: boolean | ProductCategoryCountOutputTypeCountProductsArgs
  }

  // Custom InputTypes
  /**
   * ProductCategoryCountOutputType without action
   */
  export type ProductCategoryCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductCategoryCountOutputType
     */
    select?: ProductCategoryCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ProductCategoryCountOutputType without action
   */
  export type ProductCategoryCountOutputTypeCountProductsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProductWhereInput
  }


  /**
   * Count Type ProductCountOutputType
   */

  export type ProductCountOutputType = {
    gallery: number
    vrHotspots: number
    comments: number
    attributes: number
  }

  export type ProductCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    gallery?: boolean | ProductCountOutputTypeCountGalleryArgs
    vrHotspots?: boolean | ProductCountOutputTypeCountVrHotspotsArgs
    comments?: boolean | ProductCountOutputTypeCountCommentsArgs
    attributes?: boolean | ProductCountOutputTypeCountAttributesArgs
  }

  // Custom InputTypes
  /**
   * ProductCountOutputType without action
   */
  export type ProductCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductCountOutputType
     */
    select?: ProductCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ProductCountOutputType without action
   */
  export type ProductCountOutputTypeCountGalleryArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProductGalleryImageWhereInput
  }

  /**
   * ProductCountOutputType without action
   */
  export type ProductCountOutputTypeCountVrHotspotsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProductVrHotspotWhereInput
  }

  /**
   * ProductCountOutputType without action
   */
  export type ProductCountOutputTypeCountCommentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProductCommentWhereInput
  }

  /**
   * ProductCountOutputType without action
   */
  export type ProductCountOutputTypeCountAttributesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProductAttributeWhereInput
  }


  /**
   * Models
   */

  /**
   * Model ProductCategory
   */

  export type AggregateProductCategory = {
    _count: ProductCategoryCountAggregateOutputType | null
    _min: ProductCategoryMinAggregateOutputType | null
    _max: ProductCategoryMaxAggregateOutputType | null
  }

  export type ProductCategoryMinAggregateOutputType = {
    id: string | null
    slug: string | null
    title: string | null
    isHidden: boolean | null
    isSystem: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
  }

  export type ProductCategoryMaxAggregateOutputType = {
    id: string | null
    slug: string | null
    title: string | null
    isHidden: boolean | null
    isSystem: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
  }

  export type ProductCategoryCountAggregateOutputType = {
    id: number
    slug: number
    title: number
    isHidden: number
    isSystem: number
    createdAt: number
    updatedAt: number
    deletedAt: number
    _all: number
  }


  export type ProductCategoryMinAggregateInputType = {
    id?: true
    slug?: true
    title?: true
    isHidden?: true
    isSystem?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
  }

  export type ProductCategoryMaxAggregateInputType = {
    id?: true
    slug?: true
    title?: true
    isHidden?: true
    isSystem?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
  }

  export type ProductCategoryCountAggregateInputType = {
    id?: true
    slug?: true
    title?: true
    isHidden?: true
    isSystem?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
    _all?: true
  }

  export type ProductCategoryAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ProductCategory to aggregate.
     */
    where?: ProductCategoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProductCategories to fetch.
     */
    orderBy?: ProductCategoryOrderByWithRelationInput | ProductCategoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ProductCategoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProductCategories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProductCategories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ProductCategories
    **/
    _count?: true | ProductCategoryCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ProductCategoryMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ProductCategoryMaxAggregateInputType
  }

  export type GetProductCategoryAggregateType<T extends ProductCategoryAggregateArgs> = {
        [P in keyof T & keyof AggregateProductCategory]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateProductCategory[P]>
      : GetScalarType<T[P], AggregateProductCategory[P]>
  }




  export type ProductCategoryGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProductCategoryWhereInput
    orderBy?: ProductCategoryOrderByWithAggregationInput | ProductCategoryOrderByWithAggregationInput[]
    by: ProductCategoryScalarFieldEnum[] | ProductCategoryScalarFieldEnum
    having?: ProductCategoryScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ProductCategoryCountAggregateInputType | true
    _min?: ProductCategoryMinAggregateInputType
    _max?: ProductCategoryMaxAggregateInputType
  }

  export type ProductCategoryGroupByOutputType = {
    id: string
    slug: string
    title: string
    isHidden: boolean
    isSystem: boolean
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null
    _count: ProductCategoryCountAggregateOutputType | null
    _min: ProductCategoryMinAggregateOutputType | null
    _max: ProductCategoryMaxAggregateOutputType | null
  }

  type GetProductCategoryGroupByPayload<T extends ProductCategoryGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ProductCategoryGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ProductCategoryGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ProductCategoryGroupByOutputType[P]>
            : GetScalarType<T[P], ProductCategoryGroupByOutputType[P]>
        }
      >
    >


  export type ProductCategorySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    slug?: boolean
    title?: boolean
    isHidden?: boolean
    isSystem?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    products?: boolean | ProductCategory$productsArgs<ExtArgs>
    _count?: boolean | ProductCategoryCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["productCategory"]>

  export type ProductCategorySelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    slug?: boolean
    title?: boolean
    isHidden?: boolean
    isSystem?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
  }, ExtArgs["result"]["productCategory"]>

  export type ProductCategorySelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    slug?: boolean
    title?: boolean
    isHidden?: boolean
    isSystem?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
  }, ExtArgs["result"]["productCategory"]>

  export type ProductCategorySelectScalar = {
    id?: boolean
    slug?: boolean
    title?: boolean
    isHidden?: boolean
    isSystem?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
  }

  export type ProductCategoryOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "slug" | "title" | "isHidden" | "isSystem" | "createdAt" | "updatedAt" | "deletedAt", ExtArgs["result"]["productCategory"]>
  export type ProductCategoryInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    products?: boolean | ProductCategory$productsArgs<ExtArgs>
    _count?: boolean | ProductCategoryCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type ProductCategoryIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type ProductCategoryIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $ProductCategoryPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ProductCategory"
    objects: {
      products: Prisma.$ProductPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      slug: string
      title: string
      isHidden: boolean
      isSystem: boolean
      createdAt: Date
      updatedAt: Date
      deletedAt: Date | null
    }, ExtArgs["result"]["productCategory"]>
    composites: {}
  }

  type ProductCategoryGetPayload<S extends boolean | null | undefined | ProductCategoryDefaultArgs> = $Result.GetResult<Prisma.$ProductCategoryPayload, S>

  type ProductCategoryCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ProductCategoryFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ProductCategoryCountAggregateInputType | true
    }

  export interface ProductCategoryDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ProductCategory'], meta: { name: 'ProductCategory' } }
    /**
     * Find zero or one ProductCategory that matches the filter.
     * @param {ProductCategoryFindUniqueArgs} args - Arguments to find a ProductCategory
     * @example
     * // Get one ProductCategory
     * const productCategory = await prisma.productCategory.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ProductCategoryFindUniqueArgs>(args: SelectSubset<T, ProductCategoryFindUniqueArgs<ExtArgs>>): Prisma__ProductCategoryClient<$Result.GetResult<Prisma.$ProductCategoryPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ProductCategory that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ProductCategoryFindUniqueOrThrowArgs} args - Arguments to find a ProductCategory
     * @example
     * // Get one ProductCategory
     * const productCategory = await prisma.productCategory.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ProductCategoryFindUniqueOrThrowArgs>(args: SelectSubset<T, ProductCategoryFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ProductCategoryClient<$Result.GetResult<Prisma.$ProductCategoryPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ProductCategory that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductCategoryFindFirstArgs} args - Arguments to find a ProductCategory
     * @example
     * // Get one ProductCategory
     * const productCategory = await prisma.productCategory.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ProductCategoryFindFirstArgs>(args?: SelectSubset<T, ProductCategoryFindFirstArgs<ExtArgs>>): Prisma__ProductCategoryClient<$Result.GetResult<Prisma.$ProductCategoryPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ProductCategory that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductCategoryFindFirstOrThrowArgs} args - Arguments to find a ProductCategory
     * @example
     * // Get one ProductCategory
     * const productCategory = await prisma.productCategory.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ProductCategoryFindFirstOrThrowArgs>(args?: SelectSubset<T, ProductCategoryFindFirstOrThrowArgs<ExtArgs>>): Prisma__ProductCategoryClient<$Result.GetResult<Prisma.$ProductCategoryPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ProductCategories that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductCategoryFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ProductCategories
     * const productCategories = await prisma.productCategory.findMany()
     * 
     * // Get first 10 ProductCategories
     * const productCategories = await prisma.productCategory.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const productCategoryWithIdOnly = await prisma.productCategory.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ProductCategoryFindManyArgs>(args?: SelectSubset<T, ProductCategoryFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProductCategoryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ProductCategory.
     * @param {ProductCategoryCreateArgs} args - Arguments to create a ProductCategory.
     * @example
     * // Create one ProductCategory
     * const ProductCategory = await prisma.productCategory.create({
     *   data: {
     *     // ... data to create a ProductCategory
     *   }
     * })
     * 
     */
    create<T extends ProductCategoryCreateArgs>(args: SelectSubset<T, ProductCategoryCreateArgs<ExtArgs>>): Prisma__ProductCategoryClient<$Result.GetResult<Prisma.$ProductCategoryPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ProductCategories.
     * @param {ProductCategoryCreateManyArgs} args - Arguments to create many ProductCategories.
     * @example
     * // Create many ProductCategories
     * const productCategory = await prisma.productCategory.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ProductCategoryCreateManyArgs>(args?: SelectSubset<T, ProductCategoryCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ProductCategories and returns the data saved in the database.
     * @param {ProductCategoryCreateManyAndReturnArgs} args - Arguments to create many ProductCategories.
     * @example
     * // Create many ProductCategories
     * const productCategory = await prisma.productCategory.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ProductCategories and only return the `id`
     * const productCategoryWithIdOnly = await prisma.productCategory.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ProductCategoryCreateManyAndReturnArgs>(args?: SelectSubset<T, ProductCategoryCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProductCategoryPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ProductCategory.
     * @param {ProductCategoryDeleteArgs} args - Arguments to delete one ProductCategory.
     * @example
     * // Delete one ProductCategory
     * const ProductCategory = await prisma.productCategory.delete({
     *   where: {
     *     // ... filter to delete one ProductCategory
     *   }
     * })
     * 
     */
    delete<T extends ProductCategoryDeleteArgs>(args: SelectSubset<T, ProductCategoryDeleteArgs<ExtArgs>>): Prisma__ProductCategoryClient<$Result.GetResult<Prisma.$ProductCategoryPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ProductCategory.
     * @param {ProductCategoryUpdateArgs} args - Arguments to update one ProductCategory.
     * @example
     * // Update one ProductCategory
     * const productCategory = await prisma.productCategory.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ProductCategoryUpdateArgs>(args: SelectSubset<T, ProductCategoryUpdateArgs<ExtArgs>>): Prisma__ProductCategoryClient<$Result.GetResult<Prisma.$ProductCategoryPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ProductCategories.
     * @param {ProductCategoryDeleteManyArgs} args - Arguments to filter ProductCategories to delete.
     * @example
     * // Delete a few ProductCategories
     * const { count } = await prisma.productCategory.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ProductCategoryDeleteManyArgs>(args?: SelectSubset<T, ProductCategoryDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ProductCategories.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductCategoryUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ProductCategories
     * const productCategory = await prisma.productCategory.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ProductCategoryUpdateManyArgs>(args: SelectSubset<T, ProductCategoryUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ProductCategories and returns the data updated in the database.
     * @param {ProductCategoryUpdateManyAndReturnArgs} args - Arguments to update many ProductCategories.
     * @example
     * // Update many ProductCategories
     * const productCategory = await prisma.productCategory.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ProductCategories and only return the `id`
     * const productCategoryWithIdOnly = await prisma.productCategory.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ProductCategoryUpdateManyAndReturnArgs>(args: SelectSubset<T, ProductCategoryUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProductCategoryPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ProductCategory.
     * @param {ProductCategoryUpsertArgs} args - Arguments to update or create a ProductCategory.
     * @example
     * // Update or create a ProductCategory
     * const productCategory = await prisma.productCategory.upsert({
     *   create: {
     *     // ... data to create a ProductCategory
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ProductCategory we want to update
     *   }
     * })
     */
    upsert<T extends ProductCategoryUpsertArgs>(args: SelectSubset<T, ProductCategoryUpsertArgs<ExtArgs>>): Prisma__ProductCategoryClient<$Result.GetResult<Prisma.$ProductCategoryPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ProductCategories.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductCategoryCountArgs} args - Arguments to filter ProductCategories to count.
     * @example
     * // Count the number of ProductCategories
     * const count = await prisma.productCategory.count({
     *   where: {
     *     // ... the filter for the ProductCategories we want to count
     *   }
     * })
    **/
    count<T extends ProductCategoryCountArgs>(
      args?: Subset<T, ProductCategoryCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ProductCategoryCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ProductCategory.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductCategoryAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ProductCategoryAggregateArgs>(args: Subset<T, ProductCategoryAggregateArgs>): Prisma.PrismaPromise<GetProductCategoryAggregateType<T>>

    /**
     * Group by ProductCategory.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductCategoryGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ProductCategoryGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ProductCategoryGroupByArgs['orderBy'] }
        : { orderBy?: ProductCategoryGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ProductCategoryGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetProductCategoryGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ProductCategory model
   */
  readonly fields: ProductCategoryFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ProductCategory.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ProductCategoryClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    products<T extends ProductCategory$productsArgs<ExtArgs> = {}>(args?: Subset<T, ProductCategory$productsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProductPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ProductCategory model
   */
  interface ProductCategoryFieldRefs {
    readonly id: FieldRef<"ProductCategory", 'String'>
    readonly slug: FieldRef<"ProductCategory", 'String'>
    readonly title: FieldRef<"ProductCategory", 'String'>
    readonly isHidden: FieldRef<"ProductCategory", 'Boolean'>
    readonly isSystem: FieldRef<"ProductCategory", 'Boolean'>
    readonly createdAt: FieldRef<"ProductCategory", 'DateTime'>
    readonly updatedAt: FieldRef<"ProductCategory", 'DateTime'>
    readonly deletedAt: FieldRef<"ProductCategory", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ProductCategory findUnique
   */
  export type ProductCategoryFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductCategory
     */
    select?: ProductCategorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductCategory
     */
    omit?: ProductCategoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductCategoryInclude<ExtArgs> | null
    /**
     * Filter, which ProductCategory to fetch.
     */
    where: ProductCategoryWhereUniqueInput
  }

  /**
   * ProductCategory findUniqueOrThrow
   */
  export type ProductCategoryFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductCategory
     */
    select?: ProductCategorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductCategory
     */
    omit?: ProductCategoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductCategoryInclude<ExtArgs> | null
    /**
     * Filter, which ProductCategory to fetch.
     */
    where: ProductCategoryWhereUniqueInput
  }

  /**
   * ProductCategory findFirst
   */
  export type ProductCategoryFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductCategory
     */
    select?: ProductCategorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductCategory
     */
    omit?: ProductCategoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductCategoryInclude<ExtArgs> | null
    /**
     * Filter, which ProductCategory to fetch.
     */
    where?: ProductCategoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProductCategories to fetch.
     */
    orderBy?: ProductCategoryOrderByWithRelationInput | ProductCategoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ProductCategories.
     */
    cursor?: ProductCategoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProductCategories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProductCategories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ProductCategories.
     */
    distinct?: ProductCategoryScalarFieldEnum | ProductCategoryScalarFieldEnum[]
  }

  /**
   * ProductCategory findFirstOrThrow
   */
  export type ProductCategoryFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductCategory
     */
    select?: ProductCategorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductCategory
     */
    omit?: ProductCategoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductCategoryInclude<ExtArgs> | null
    /**
     * Filter, which ProductCategory to fetch.
     */
    where?: ProductCategoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProductCategories to fetch.
     */
    orderBy?: ProductCategoryOrderByWithRelationInput | ProductCategoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ProductCategories.
     */
    cursor?: ProductCategoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProductCategories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProductCategories.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ProductCategories.
     */
    distinct?: ProductCategoryScalarFieldEnum | ProductCategoryScalarFieldEnum[]
  }

  /**
   * ProductCategory findMany
   */
  export type ProductCategoryFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductCategory
     */
    select?: ProductCategorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductCategory
     */
    omit?: ProductCategoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductCategoryInclude<ExtArgs> | null
    /**
     * Filter, which ProductCategories to fetch.
     */
    where?: ProductCategoryWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProductCategories to fetch.
     */
    orderBy?: ProductCategoryOrderByWithRelationInput | ProductCategoryOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ProductCategories.
     */
    cursor?: ProductCategoryWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProductCategories from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProductCategories.
     */
    skip?: number
    distinct?: ProductCategoryScalarFieldEnum | ProductCategoryScalarFieldEnum[]
  }

  /**
   * ProductCategory create
   */
  export type ProductCategoryCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductCategory
     */
    select?: ProductCategorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductCategory
     */
    omit?: ProductCategoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductCategoryInclude<ExtArgs> | null
    /**
     * The data needed to create a ProductCategory.
     */
    data: XOR<ProductCategoryCreateInput, ProductCategoryUncheckedCreateInput>
  }

  /**
   * ProductCategory createMany
   */
  export type ProductCategoryCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ProductCategories.
     */
    data: ProductCategoryCreateManyInput | ProductCategoryCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ProductCategory createManyAndReturn
   */
  export type ProductCategoryCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductCategory
     */
    select?: ProductCategorySelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ProductCategory
     */
    omit?: ProductCategoryOmit<ExtArgs> | null
    /**
     * The data used to create many ProductCategories.
     */
    data: ProductCategoryCreateManyInput | ProductCategoryCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ProductCategory update
   */
  export type ProductCategoryUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductCategory
     */
    select?: ProductCategorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductCategory
     */
    omit?: ProductCategoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductCategoryInclude<ExtArgs> | null
    /**
     * The data needed to update a ProductCategory.
     */
    data: XOR<ProductCategoryUpdateInput, ProductCategoryUncheckedUpdateInput>
    /**
     * Choose, which ProductCategory to update.
     */
    where: ProductCategoryWhereUniqueInput
  }

  /**
   * ProductCategory updateMany
   */
  export type ProductCategoryUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ProductCategories.
     */
    data: XOR<ProductCategoryUpdateManyMutationInput, ProductCategoryUncheckedUpdateManyInput>
    /**
     * Filter which ProductCategories to update
     */
    where?: ProductCategoryWhereInput
    /**
     * Limit how many ProductCategories to update.
     */
    limit?: number
  }

  /**
   * ProductCategory updateManyAndReturn
   */
  export type ProductCategoryUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductCategory
     */
    select?: ProductCategorySelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ProductCategory
     */
    omit?: ProductCategoryOmit<ExtArgs> | null
    /**
     * The data used to update ProductCategories.
     */
    data: XOR<ProductCategoryUpdateManyMutationInput, ProductCategoryUncheckedUpdateManyInput>
    /**
     * Filter which ProductCategories to update
     */
    where?: ProductCategoryWhereInput
    /**
     * Limit how many ProductCategories to update.
     */
    limit?: number
  }

  /**
   * ProductCategory upsert
   */
  export type ProductCategoryUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductCategory
     */
    select?: ProductCategorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductCategory
     */
    omit?: ProductCategoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductCategoryInclude<ExtArgs> | null
    /**
     * The filter to search for the ProductCategory to update in case it exists.
     */
    where: ProductCategoryWhereUniqueInput
    /**
     * In case the ProductCategory found by the `where` argument doesn't exist, create a new ProductCategory with this data.
     */
    create: XOR<ProductCategoryCreateInput, ProductCategoryUncheckedCreateInput>
    /**
     * In case the ProductCategory was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ProductCategoryUpdateInput, ProductCategoryUncheckedUpdateInput>
  }

  /**
   * ProductCategory delete
   */
  export type ProductCategoryDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductCategory
     */
    select?: ProductCategorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductCategory
     */
    omit?: ProductCategoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductCategoryInclude<ExtArgs> | null
    /**
     * Filter which ProductCategory to delete.
     */
    where: ProductCategoryWhereUniqueInput
  }

  /**
   * ProductCategory deleteMany
   */
  export type ProductCategoryDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ProductCategories to delete
     */
    where?: ProductCategoryWhereInput
    /**
     * Limit how many ProductCategories to delete.
     */
    limit?: number
  }

  /**
   * ProductCategory.products
   */
  export type ProductCategory$productsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Product
     */
    select?: ProductSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Product
     */
    omit?: ProductOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductInclude<ExtArgs> | null
    where?: ProductWhereInput
    orderBy?: ProductOrderByWithRelationInput | ProductOrderByWithRelationInput[]
    cursor?: ProductWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ProductScalarFieldEnum | ProductScalarFieldEnum[]
  }

  /**
   * ProductCategory without action
   */
  export type ProductCategoryDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductCategory
     */
    select?: ProductCategorySelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductCategory
     */
    omit?: ProductCategoryOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductCategoryInclude<ExtArgs> | null
  }


  /**
   * Model Product
   */

  export type AggregateProduct = {
    _count: ProductCountAggregateOutputType | null
    _avg: ProductAvgAggregateOutputType | null
    _sum: ProductSumAggregateOutputType | null
    _min: ProductMinAggregateOutputType | null
    _max: ProductMaxAggregateOutputType | null
  }

  export type ProductAvgAggregateOutputType = {
    price: Decimal | null
    discountValue: Decimal | null
    featureSort: number | null
  }

  export type ProductSumAggregateOutputType = {
    price: Decimal | null
    discountValue: Decimal | null
    featureSort: number | null
  }

  export type ProductMinAggregateOutputType = {
    id: string | null
    slug: string | null
    title: string | null
    description: string | null
    excerpt: string | null
    sku: string | null
    status: $Enums.ProductStatus | null
    price: Decimal | null
    currency: string | null
    thumbnailUrl: string | null
    categoryId: string | null
    discountType: $Enums.DiscountType | null
    discountValue: Decimal | null
    discountActive: boolean | null
    discountStart: Date | null
    discountEnd: Date | null
    model3dUrl: string | null
    model3dFormat: string | null
    model3dLiveView: boolean | null
    model3dPosterUrl: string | null
    vrPlanImageUrl: string | null
    vrEnabled: boolean | null
    metaTitle: string | null
    metaDescription: string | null
    metaKeywords: string | null
    customSchema: string | null
    noindex: boolean | null
    isFeatured: boolean | null
    featureSort: number | null
    promoTitle: string | null
    promoBadge: string | null
    promoActive: boolean | null
    promoStart: Date | null
    promoEnd: Date | null
    deletedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ProductMaxAggregateOutputType = {
    id: string | null
    slug: string | null
    title: string | null
    description: string | null
    excerpt: string | null
    sku: string | null
    status: $Enums.ProductStatus | null
    price: Decimal | null
    currency: string | null
    thumbnailUrl: string | null
    categoryId: string | null
    discountType: $Enums.DiscountType | null
    discountValue: Decimal | null
    discountActive: boolean | null
    discountStart: Date | null
    discountEnd: Date | null
    model3dUrl: string | null
    model3dFormat: string | null
    model3dLiveView: boolean | null
    model3dPosterUrl: string | null
    vrPlanImageUrl: string | null
    vrEnabled: boolean | null
    metaTitle: string | null
    metaDescription: string | null
    metaKeywords: string | null
    customSchema: string | null
    noindex: boolean | null
    isFeatured: boolean | null
    featureSort: number | null
    promoTitle: string | null
    promoBadge: string | null
    promoActive: boolean | null
    promoStart: Date | null
    promoEnd: Date | null
    deletedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ProductCountAggregateOutputType = {
    id: number
    slug: number
    title: number
    description: number
    excerpt: number
    sku: number
    status: number
    price: number
    currency: number
    thumbnailUrl: number
    categoryId: number
    discountType: number
    discountValue: number
    discountActive: number
    discountStart: number
    discountEnd: number
    model3dUrl: number
    model3dFormat: number
    model3dLiveView: number
    model3dPosterUrl: number
    vrPlanImageUrl: number
    vrEnabled: number
    metaTitle: number
    metaDescription: number
    metaKeywords: number
    customSchema: number
    noindex: number
    isFeatured: number
    featureSort: number
    promoTitle: number
    promoBadge: number
    promoActive: number
    promoStart: number
    promoEnd: number
    tags: number
    complementaryIds: number
    deletedAt: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ProductAvgAggregateInputType = {
    price?: true
    discountValue?: true
    featureSort?: true
  }

  export type ProductSumAggregateInputType = {
    price?: true
    discountValue?: true
    featureSort?: true
  }

  export type ProductMinAggregateInputType = {
    id?: true
    slug?: true
    title?: true
    description?: true
    excerpt?: true
    sku?: true
    status?: true
    price?: true
    currency?: true
    thumbnailUrl?: true
    categoryId?: true
    discountType?: true
    discountValue?: true
    discountActive?: true
    discountStart?: true
    discountEnd?: true
    model3dUrl?: true
    model3dFormat?: true
    model3dLiveView?: true
    model3dPosterUrl?: true
    vrPlanImageUrl?: true
    vrEnabled?: true
    metaTitle?: true
    metaDescription?: true
    metaKeywords?: true
    customSchema?: true
    noindex?: true
    isFeatured?: true
    featureSort?: true
    promoTitle?: true
    promoBadge?: true
    promoActive?: true
    promoStart?: true
    promoEnd?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ProductMaxAggregateInputType = {
    id?: true
    slug?: true
    title?: true
    description?: true
    excerpt?: true
    sku?: true
    status?: true
    price?: true
    currency?: true
    thumbnailUrl?: true
    categoryId?: true
    discountType?: true
    discountValue?: true
    discountActive?: true
    discountStart?: true
    discountEnd?: true
    model3dUrl?: true
    model3dFormat?: true
    model3dLiveView?: true
    model3dPosterUrl?: true
    vrPlanImageUrl?: true
    vrEnabled?: true
    metaTitle?: true
    metaDescription?: true
    metaKeywords?: true
    customSchema?: true
    noindex?: true
    isFeatured?: true
    featureSort?: true
    promoTitle?: true
    promoBadge?: true
    promoActive?: true
    promoStart?: true
    promoEnd?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ProductCountAggregateInputType = {
    id?: true
    slug?: true
    title?: true
    description?: true
    excerpt?: true
    sku?: true
    status?: true
    price?: true
    currency?: true
    thumbnailUrl?: true
    categoryId?: true
    discountType?: true
    discountValue?: true
    discountActive?: true
    discountStart?: true
    discountEnd?: true
    model3dUrl?: true
    model3dFormat?: true
    model3dLiveView?: true
    model3dPosterUrl?: true
    vrPlanImageUrl?: true
    vrEnabled?: true
    metaTitle?: true
    metaDescription?: true
    metaKeywords?: true
    customSchema?: true
    noindex?: true
    isFeatured?: true
    featureSort?: true
    promoTitle?: true
    promoBadge?: true
    promoActive?: true
    promoStart?: true
    promoEnd?: true
    tags?: true
    complementaryIds?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ProductAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Product to aggregate.
     */
    where?: ProductWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Products to fetch.
     */
    orderBy?: ProductOrderByWithRelationInput | ProductOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ProductWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Products from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Products.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Products
    **/
    _count?: true | ProductCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ProductAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ProductSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ProductMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ProductMaxAggregateInputType
  }

  export type GetProductAggregateType<T extends ProductAggregateArgs> = {
        [P in keyof T & keyof AggregateProduct]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateProduct[P]>
      : GetScalarType<T[P], AggregateProduct[P]>
  }




  export type ProductGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProductWhereInput
    orderBy?: ProductOrderByWithAggregationInput | ProductOrderByWithAggregationInput[]
    by: ProductScalarFieldEnum[] | ProductScalarFieldEnum
    having?: ProductScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ProductCountAggregateInputType | true
    _avg?: ProductAvgAggregateInputType
    _sum?: ProductSumAggregateInputType
    _min?: ProductMinAggregateInputType
    _max?: ProductMaxAggregateInputType
  }

  export type ProductGroupByOutputType = {
    id: string
    slug: string
    title: string
    description: string
    excerpt: string | null
    sku: string
    status: $Enums.ProductStatus
    price: Decimal
    currency: string
    thumbnailUrl: string | null
    categoryId: string
    discountType: $Enums.DiscountType | null
    discountValue: Decimal | null
    discountActive: boolean
    discountStart: Date | null
    discountEnd: Date | null
    model3dUrl: string | null
    model3dFormat: string | null
    model3dLiveView: boolean
    model3dPosterUrl: string | null
    vrPlanImageUrl: string | null
    vrEnabled: boolean
    metaTitle: string | null
    metaDescription: string | null
    metaKeywords: string | null
    customSchema: string | null
    noindex: boolean
    isFeatured: boolean
    featureSort: number
    promoTitle: string | null
    promoBadge: string | null
    promoActive: boolean
    promoStart: Date | null
    promoEnd: Date | null
    tags: string[]
    complementaryIds: string[]
    deletedAt: Date | null
    createdAt: Date
    updatedAt: Date
    _count: ProductCountAggregateOutputType | null
    _avg: ProductAvgAggregateOutputType | null
    _sum: ProductSumAggregateOutputType | null
    _min: ProductMinAggregateOutputType | null
    _max: ProductMaxAggregateOutputType | null
  }

  type GetProductGroupByPayload<T extends ProductGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ProductGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ProductGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ProductGroupByOutputType[P]>
            : GetScalarType<T[P], ProductGroupByOutputType[P]>
        }
      >
    >


  export type ProductSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    slug?: boolean
    title?: boolean
    description?: boolean
    excerpt?: boolean
    sku?: boolean
    status?: boolean
    price?: boolean
    currency?: boolean
    thumbnailUrl?: boolean
    categoryId?: boolean
    discountType?: boolean
    discountValue?: boolean
    discountActive?: boolean
    discountStart?: boolean
    discountEnd?: boolean
    model3dUrl?: boolean
    model3dFormat?: boolean
    model3dLiveView?: boolean
    model3dPosterUrl?: boolean
    vrPlanImageUrl?: boolean
    vrEnabled?: boolean
    metaTitle?: boolean
    metaDescription?: boolean
    metaKeywords?: boolean
    customSchema?: boolean
    noindex?: boolean
    isFeatured?: boolean
    featureSort?: boolean
    promoTitle?: boolean
    promoBadge?: boolean
    promoActive?: boolean
    promoStart?: boolean
    promoEnd?: boolean
    tags?: boolean
    complementaryIds?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    category?: boolean | ProductCategoryDefaultArgs<ExtArgs>
    gallery?: boolean | Product$galleryArgs<ExtArgs>
    vrHotspots?: boolean | Product$vrHotspotsArgs<ExtArgs>
    comments?: boolean | Product$commentsArgs<ExtArgs>
    attributes?: boolean | Product$attributesArgs<ExtArgs>
    _count?: boolean | ProductCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["product"]>

  export type ProductSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    slug?: boolean
    title?: boolean
    description?: boolean
    excerpt?: boolean
    sku?: boolean
    status?: boolean
    price?: boolean
    currency?: boolean
    thumbnailUrl?: boolean
    categoryId?: boolean
    discountType?: boolean
    discountValue?: boolean
    discountActive?: boolean
    discountStart?: boolean
    discountEnd?: boolean
    model3dUrl?: boolean
    model3dFormat?: boolean
    model3dLiveView?: boolean
    model3dPosterUrl?: boolean
    vrPlanImageUrl?: boolean
    vrEnabled?: boolean
    metaTitle?: boolean
    metaDescription?: boolean
    metaKeywords?: boolean
    customSchema?: boolean
    noindex?: boolean
    isFeatured?: boolean
    featureSort?: boolean
    promoTitle?: boolean
    promoBadge?: boolean
    promoActive?: boolean
    promoStart?: boolean
    promoEnd?: boolean
    tags?: boolean
    complementaryIds?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    category?: boolean | ProductCategoryDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["product"]>

  export type ProductSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    slug?: boolean
    title?: boolean
    description?: boolean
    excerpt?: boolean
    sku?: boolean
    status?: boolean
    price?: boolean
    currency?: boolean
    thumbnailUrl?: boolean
    categoryId?: boolean
    discountType?: boolean
    discountValue?: boolean
    discountActive?: boolean
    discountStart?: boolean
    discountEnd?: boolean
    model3dUrl?: boolean
    model3dFormat?: boolean
    model3dLiveView?: boolean
    model3dPosterUrl?: boolean
    vrPlanImageUrl?: boolean
    vrEnabled?: boolean
    metaTitle?: boolean
    metaDescription?: boolean
    metaKeywords?: boolean
    customSchema?: boolean
    noindex?: boolean
    isFeatured?: boolean
    featureSort?: boolean
    promoTitle?: boolean
    promoBadge?: boolean
    promoActive?: boolean
    promoStart?: boolean
    promoEnd?: boolean
    tags?: boolean
    complementaryIds?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    category?: boolean | ProductCategoryDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["product"]>

  export type ProductSelectScalar = {
    id?: boolean
    slug?: boolean
    title?: boolean
    description?: boolean
    excerpt?: boolean
    sku?: boolean
    status?: boolean
    price?: boolean
    currency?: boolean
    thumbnailUrl?: boolean
    categoryId?: boolean
    discountType?: boolean
    discountValue?: boolean
    discountActive?: boolean
    discountStart?: boolean
    discountEnd?: boolean
    model3dUrl?: boolean
    model3dFormat?: boolean
    model3dLiveView?: boolean
    model3dPosterUrl?: boolean
    vrPlanImageUrl?: boolean
    vrEnabled?: boolean
    metaTitle?: boolean
    metaDescription?: boolean
    metaKeywords?: boolean
    customSchema?: boolean
    noindex?: boolean
    isFeatured?: boolean
    featureSort?: boolean
    promoTitle?: boolean
    promoBadge?: boolean
    promoActive?: boolean
    promoStart?: boolean
    promoEnd?: boolean
    tags?: boolean
    complementaryIds?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type ProductOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "slug" | "title" | "description" | "excerpt" | "sku" | "status" | "price" | "currency" | "thumbnailUrl" | "categoryId" | "discountType" | "discountValue" | "discountActive" | "discountStart" | "discountEnd" | "model3dUrl" | "model3dFormat" | "model3dLiveView" | "model3dPosterUrl" | "vrPlanImageUrl" | "vrEnabled" | "metaTitle" | "metaDescription" | "metaKeywords" | "customSchema" | "noindex" | "isFeatured" | "featureSort" | "promoTitle" | "promoBadge" | "promoActive" | "promoStart" | "promoEnd" | "tags" | "complementaryIds" | "deletedAt" | "createdAt" | "updatedAt", ExtArgs["result"]["product"]>
  export type ProductInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    category?: boolean | ProductCategoryDefaultArgs<ExtArgs>
    gallery?: boolean | Product$galleryArgs<ExtArgs>
    vrHotspots?: boolean | Product$vrHotspotsArgs<ExtArgs>
    comments?: boolean | Product$commentsArgs<ExtArgs>
    attributes?: boolean | Product$attributesArgs<ExtArgs>
    _count?: boolean | ProductCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type ProductIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    category?: boolean | ProductCategoryDefaultArgs<ExtArgs>
  }
  export type ProductIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    category?: boolean | ProductCategoryDefaultArgs<ExtArgs>
  }

  export type $ProductPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Product"
    objects: {
      category: Prisma.$ProductCategoryPayload<ExtArgs>
      gallery: Prisma.$ProductGalleryImagePayload<ExtArgs>[]
      vrHotspots: Prisma.$ProductVrHotspotPayload<ExtArgs>[]
      comments: Prisma.$ProductCommentPayload<ExtArgs>[]
      attributes: Prisma.$ProductAttributePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      slug: string
      title: string
      description: string
      excerpt: string | null
      sku: string
      status: $Enums.ProductStatus
      price: Prisma.Decimal
      currency: string
      thumbnailUrl: string | null
      categoryId: string
      discountType: $Enums.DiscountType | null
      discountValue: Prisma.Decimal | null
      discountActive: boolean
      discountStart: Date | null
      discountEnd: Date | null
      model3dUrl: string | null
      model3dFormat: string | null
      model3dLiveView: boolean
      model3dPosterUrl: string | null
      vrPlanImageUrl: string | null
      vrEnabled: boolean
      metaTitle: string | null
      metaDescription: string | null
      metaKeywords: string | null
      customSchema: string | null
      noindex: boolean
      isFeatured: boolean
      featureSort: number
      promoTitle: string | null
      promoBadge: string | null
      promoActive: boolean
      promoStart: Date | null
      promoEnd: Date | null
      tags: string[]
      complementaryIds: string[]
      deletedAt: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["product"]>
    composites: {}
  }

  type ProductGetPayload<S extends boolean | null | undefined | ProductDefaultArgs> = $Result.GetResult<Prisma.$ProductPayload, S>

  type ProductCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ProductFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ProductCountAggregateInputType | true
    }

  export interface ProductDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Product'], meta: { name: 'Product' } }
    /**
     * Find zero or one Product that matches the filter.
     * @param {ProductFindUniqueArgs} args - Arguments to find a Product
     * @example
     * // Get one Product
     * const product = await prisma.product.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ProductFindUniqueArgs>(args: SelectSubset<T, ProductFindUniqueArgs<ExtArgs>>): Prisma__ProductClient<$Result.GetResult<Prisma.$ProductPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Product that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ProductFindUniqueOrThrowArgs} args - Arguments to find a Product
     * @example
     * // Get one Product
     * const product = await prisma.product.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ProductFindUniqueOrThrowArgs>(args: SelectSubset<T, ProductFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ProductClient<$Result.GetResult<Prisma.$ProductPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Product that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductFindFirstArgs} args - Arguments to find a Product
     * @example
     * // Get one Product
     * const product = await prisma.product.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ProductFindFirstArgs>(args?: SelectSubset<T, ProductFindFirstArgs<ExtArgs>>): Prisma__ProductClient<$Result.GetResult<Prisma.$ProductPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Product that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductFindFirstOrThrowArgs} args - Arguments to find a Product
     * @example
     * // Get one Product
     * const product = await prisma.product.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ProductFindFirstOrThrowArgs>(args?: SelectSubset<T, ProductFindFirstOrThrowArgs<ExtArgs>>): Prisma__ProductClient<$Result.GetResult<Prisma.$ProductPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Products that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Products
     * const products = await prisma.product.findMany()
     * 
     * // Get first 10 Products
     * const products = await prisma.product.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const productWithIdOnly = await prisma.product.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ProductFindManyArgs>(args?: SelectSubset<T, ProductFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProductPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Product.
     * @param {ProductCreateArgs} args - Arguments to create a Product.
     * @example
     * // Create one Product
     * const Product = await prisma.product.create({
     *   data: {
     *     // ... data to create a Product
     *   }
     * })
     * 
     */
    create<T extends ProductCreateArgs>(args: SelectSubset<T, ProductCreateArgs<ExtArgs>>): Prisma__ProductClient<$Result.GetResult<Prisma.$ProductPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Products.
     * @param {ProductCreateManyArgs} args - Arguments to create many Products.
     * @example
     * // Create many Products
     * const product = await prisma.product.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ProductCreateManyArgs>(args?: SelectSubset<T, ProductCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Products and returns the data saved in the database.
     * @param {ProductCreateManyAndReturnArgs} args - Arguments to create many Products.
     * @example
     * // Create many Products
     * const product = await prisma.product.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Products and only return the `id`
     * const productWithIdOnly = await prisma.product.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ProductCreateManyAndReturnArgs>(args?: SelectSubset<T, ProductCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProductPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Product.
     * @param {ProductDeleteArgs} args - Arguments to delete one Product.
     * @example
     * // Delete one Product
     * const Product = await prisma.product.delete({
     *   where: {
     *     // ... filter to delete one Product
     *   }
     * })
     * 
     */
    delete<T extends ProductDeleteArgs>(args: SelectSubset<T, ProductDeleteArgs<ExtArgs>>): Prisma__ProductClient<$Result.GetResult<Prisma.$ProductPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Product.
     * @param {ProductUpdateArgs} args - Arguments to update one Product.
     * @example
     * // Update one Product
     * const product = await prisma.product.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ProductUpdateArgs>(args: SelectSubset<T, ProductUpdateArgs<ExtArgs>>): Prisma__ProductClient<$Result.GetResult<Prisma.$ProductPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Products.
     * @param {ProductDeleteManyArgs} args - Arguments to filter Products to delete.
     * @example
     * // Delete a few Products
     * const { count } = await prisma.product.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ProductDeleteManyArgs>(args?: SelectSubset<T, ProductDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Products.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Products
     * const product = await prisma.product.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ProductUpdateManyArgs>(args: SelectSubset<T, ProductUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Products and returns the data updated in the database.
     * @param {ProductUpdateManyAndReturnArgs} args - Arguments to update many Products.
     * @example
     * // Update many Products
     * const product = await prisma.product.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Products and only return the `id`
     * const productWithIdOnly = await prisma.product.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ProductUpdateManyAndReturnArgs>(args: SelectSubset<T, ProductUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProductPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Product.
     * @param {ProductUpsertArgs} args - Arguments to update or create a Product.
     * @example
     * // Update or create a Product
     * const product = await prisma.product.upsert({
     *   create: {
     *     // ... data to create a Product
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Product we want to update
     *   }
     * })
     */
    upsert<T extends ProductUpsertArgs>(args: SelectSubset<T, ProductUpsertArgs<ExtArgs>>): Prisma__ProductClient<$Result.GetResult<Prisma.$ProductPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Products.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductCountArgs} args - Arguments to filter Products to count.
     * @example
     * // Count the number of Products
     * const count = await prisma.product.count({
     *   where: {
     *     // ... the filter for the Products we want to count
     *   }
     * })
    **/
    count<T extends ProductCountArgs>(
      args?: Subset<T, ProductCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ProductCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Product.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ProductAggregateArgs>(args: Subset<T, ProductAggregateArgs>): Prisma.PrismaPromise<GetProductAggregateType<T>>

    /**
     * Group by Product.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ProductGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ProductGroupByArgs['orderBy'] }
        : { orderBy?: ProductGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ProductGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetProductGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Product model
   */
  readonly fields: ProductFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Product.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ProductClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    category<T extends ProductCategoryDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ProductCategoryDefaultArgs<ExtArgs>>): Prisma__ProductCategoryClient<$Result.GetResult<Prisma.$ProductCategoryPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    gallery<T extends Product$galleryArgs<ExtArgs> = {}>(args?: Subset<T, Product$galleryArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProductGalleryImagePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    vrHotspots<T extends Product$vrHotspotsArgs<ExtArgs> = {}>(args?: Subset<T, Product$vrHotspotsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProductVrHotspotPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    comments<T extends Product$commentsArgs<ExtArgs> = {}>(args?: Subset<T, Product$commentsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProductCommentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    attributes<T extends Product$attributesArgs<ExtArgs> = {}>(args?: Subset<T, Product$attributesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProductAttributePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Product model
   */
  interface ProductFieldRefs {
    readonly id: FieldRef<"Product", 'String'>
    readonly slug: FieldRef<"Product", 'String'>
    readonly title: FieldRef<"Product", 'String'>
    readonly description: FieldRef<"Product", 'String'>
    readonly excerpt: FieldRef<"Product", 'String'>
    readonly sku: FieldRef<"Product", 'String'>
    readonly status: FieldRef<"Product", 'ProductStatus'>
    readonly price: FieldRef<"Product", 'Decimal'>
    readonly currency: FieldRef<"Product", 'String'>
    readonly thumbnailUrl: FieldRef<"Product", 'String'>
    readonly categoryId: FieldRef<"Product", 'String'>
    readonly discountType: FieldRef<"Product", 'DiscountType'>
    readonly discountValue: FieldRef<"Product", 'Decimal'>
    readonly discountActive: FieldRef<"Product", 'Boolean'>
    readonly discountStart: FieldRef<"Product", 'DateTime'>
    readonly discountEnd: FieldRef<"Product", 'DateTime'>
    readonly model3dUrl: FieldRef<"Product", 'String'>
    readonly model3dFormat: FieldRef<"Product", 'String'>
    readonly model3dLiveView: FieldRef<"Product", 'Boolean'>
    readonly model3dPosterUrl: FieldRef<"Product", 'String'>
    readonly vrPlanImageUrl: FieldRef<"Product", 'String'>
    readonly vrEnabled: FieldRef<"Product", 'Boolean'>
    readonly metaTitle: FieldRef<"Product", 'String'>
    readonly metaDescription: FieldRef<"Product", 'String'>
    readonly metaKeywords: FieldRef<"Product", 'String'>
    readonly customSchema: FieldRef<"Product", 'String'>
    readonly noindex: FieldRef<"Product", 'Boolean'>
    readonly isFeatured: FieldRef<"Product", 'Boolean'>
    readonly featureSort: FieldRef<"Product", 'Int'>
    readonly promoTitle: FieldRef<"Product", 'String'>
    readonly promoBadge: FieldRef<"Product", 'String'>
    readonly promoActive: FieldRef<"Product", 'Boolean'>
    readonly promoStart: FieldRef<"Product", 'DateTime'>
    readonly promoEnd: FieldRef<"Product", 'DateTime'>
    readonly tags: FieldRef<"Product", 'String[]'>
    readonly complementaryIds: FieldRef<"Product", 'String[]'>
    readonly deletedAt: FieldRef<"Product", 'DateTime'>
    readonly createdAt: FieldRef<"Product", 'DateTime'>
    readonly updatedAt: FieldRef<"Product", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Product findUnique
   */
  export type ProductFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Product
     */
    select?: ProductSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Product
     */
    omit?: ProductOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductInclude<ExtArgs> | null
    /**
     * Filter, which Product to fetch.
     */
    where: ProductWhereUniqueInput
  }

  /**
   * Product findUniqueOrThrow
   */
  export type ProductFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Product
     */
    select?: ProductSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Product
     */
    omit?: ProductOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductInclude<ExtArgs> | null
    /**
     * Filter, which Product to fetch.
     */
    where: ProductWhereUniqueInput
  }

  /**
   * Product findFirst
   */
  export type ProductFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Product
     */
    select?: ProductSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Product
     */
    omit?: ProductOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductInclude<ExtArgs> | null
    /**
     * Filter, which Product to fetch.
     */
    where?: ProductWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Products to fetch.
     */
    orderBy?: ProductOrderByWithRelationInput | ProductOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Products.
     */
    cursor?: ProductWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Products from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Products.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Products.
     */
    distinct?: ProductScalarFieldEnum | ProductScalarFieldEnum[]
  }

  /**
   * Product findFirstOrThrow
   */
  export type ProductFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Product
     */
    select?: ProductSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Product
     */
    omit?: ProductOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductInclude<ExtArgs> | null
    /**
     * Filter, which Product to fetch.
     */
    where?: ProductWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Products to fetch.
     */
    orderBy?: ProductOrderByWithRelationInput | ProductOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Products.
     */
    cursor?: ProductWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Products from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Products.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Products.
     */
    distinct?: ProductScalarFieldEnum | ProductScalarFieldEnum[]
  }

  /**
   * Product findMany
   */
  export type ProductFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Product
     */
    select?: ProductSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Product
     */
    omit?: ProductOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductInclude<ExtArgs> | null
    /**
     * Filter, which Products to fetch.
     */
    where?: ProductWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Products to fetch.
     */
    orderBy?: ProductOrderByWithRelationInput | ProductOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Products.
     */
    cursor?: ProductWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Products from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Products.
     */
    skip?: number
    distinct?: ProductScalarFieldEnum | ProductScalarFieldEnum[]
  }

  /**
   * Product create
   */
  export type ProductCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Product
     */
    select?: ProductSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Product
     */
    omit?: ProductOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductInclude<ExtArgs> | null
    /**
     * The data needed to create a Product.
     */
    data: XOR<ProductCreateInput, ProductUncheckedCreateInput>
  }

  /**
   * Product createMany
   */
  export type ProductCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Products.
     */
    data: ProductCreateManyInput | ProductCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Product createManyAndReturn
   */
  export type ProductCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Product
     */
    select?: ProductSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Product
     */
    omit?: ProductOmit<ExtArgs> | null
    /**
     * The data used to create many Products.
     */
    data: ProductCreateManyInput | ProductCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Product update
   */
  export type ProductUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Product
     */
    select?: ProductSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Product
     */
    omit?: ProductOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductInclude<ExtArgs> | null
    /**
     * The data needed to update a Product.
     */
    data: XOR<ProductUpdateInput, ProductUncheckedUpdateInput>
    /**
     * Choose, which Product to update.
     */
    where: ProductWhereUniqueInput
  }

  /**
   * Product updateMany
   */
  export type ProductUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Products.
     */
    data: XOR<ProductUpdateManyMutationInput, ProductUncheckedUpdateManyInput>
    /**
     * Filter which Products to update
     */
    where?: ProductWhereInput
    /**
     * Limit how many Products to update.
     */
    limit?: number
  }

  /**
   * Product updateManyAndReturn
   */
  export type ProductUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Product
     */
    select?: ProductSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Product
     */
    omit?: ProductOmit<ExtArgs> | null
    /**
     * The data used to update Products.
     */
    data: XOR<ProductUpdateManyMutationInput, ProductUncheckedUpdateManyInput>
    /**
     * Filter which Products to update
     */
    where?: ProductWhereInput
    /**
     * Limit how many Products to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Product upsert
   */
  export type ProductUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Product
     */
    select?: ProductSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Product
     */
    omit?: ProductOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductInclude<ExtArgs> | null
    /**
     * The filter to search for the Product to update in case it exists.
     */
    where: ProductWhereUniqueInput
    /**
     * In case the Product found by the `where` argument doesn't exist, create a new Product with this data.
     */
    create: XOR<ProductCreateInput, ProductUncheckedCreateInput>
    /**
     * In case the Product was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ProductUpdateInput, ProductUncheckedUpdateInput>
  }

  /**
   * Product delete
   */
  export type ProductDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Product
     */
    select?: ProductSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Product
     */
    omit?: ProductOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductInclude<ExtArgs> | null
    /**
     * Filter which Product to delete.
     */
    where: ProductWhereUniqueInput
  }

  /**
   * Product deleteMany
   */
  export type ProductDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Products to delete
     */
    where?: ProductWhereInput
    /**
     * Limit how many Products to delete.
     */
    limit?: number
  }

  /**
   * Product.gallery
   */
  export type Product$galleryArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductGalleryImage
     */
    select?: ProductGalleryImageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductGalleryImage
     */
    omit?: ProductGalleryImageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductGalleryImageInclude<ExtArgs> | null
    where?: ProductGalleryImageWhereInput
    orderBy?: ProductGalleryImageOrderByWithRelationInput | ProductGalleryImageOrderByWithRelationInput[]
    cursor?: ProductGalleryImageWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ProductGalleryImageScalarFieldEnum | ProductGalleryImageScalarFieldEnum[]
  }

  /**
   * Product.vrHotspots
   */
  export type Product$vrHotspotsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductVrHotspot
     */
    select?: ProductVrHotspotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductVrHotspot
     */
    omit?: ProductVrHotspotOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductVrHotspotInclude<ExtArgs> | null
    where?: ProductVrHotspotWhereInput
    orderBy?: ProductVrHotspotOrderByWithRelationInput | ProductVrHotspotOrderByWithRelationInput[]
    cursor?: ProductVrHotspotWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ProductVrHotspotScalarFieldEnum | ProductVrHotspotScalarFieldEnum[]
  }

  /**
   * Product.comments
   */
  export type Product$commentsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductComment
     */
    select?: ProductCommentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductComment
     */
    omit?: ProductCommentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductCommentInclude<ExtArgs> | null
    where?: ProductCommentWhereInput
    orderBy?: ProductCommentOrderByWithRelationInput | ProductCommentOrderByWithRelationInput[]
    cursor?: ProductCommentWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ProductCommentScalarFieldEnum | ProductCommentScalarFieldEnum[]
  }

  /**
   * Product.attributes
   */
  export type Product$attributesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductAttribute
     */
    select?: ProductAttributeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductAttribute
     */
    omit?: ProductAttributeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductAttributeInclude<ExtArgs> | null
    where?: ProductAttributeWhereInput
    orderBy?: ProductAttributeOrderByWithRelationInput | ProductAttributeOrderByWithRelationInput[]
    cursor?: ProductAttributeWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ProductAttributeScalarFieldEnum | ProductAttributeScalarFieldEnum[]
  }

  /**
   * Product without action
   */
  export type ProductDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Product
     */
    select?: ProductSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Product
     */
    omit?: ProductOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductInclude<ExtArgs> | null
  }


  /**
   * Model ProductGalleryImage
   */

  export type AggregateProductGalleryImage = {
    _count: ProductGalleryImageCountAggregateOutputType | null
    _avg: ProductGalleryImageAvgAggregateOutputType | null
    _sum: ProductGalleryImageSumAggregateOutputType | null
    _min: ProductGalleryImageMinAggregateOutputType | null
    _max: ProductGalleryImageMaxAggregateOutputType | null
  }

  export type ProductGalleryImageAvgAggregateOutputType = {
    sortOrder: number | null
  }

  export type ProductGalleryImageSumAggregateOutputType = {
    sortOrder: number | null
  }

  export type ProductGalleryImageMinAggregateOutputType = {
    id: string | null
    productId: string | null
    url: string | null
    alt: string | null
    sortOrder: number | null
    deletedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ProductGalleryImageMaxAggregateOutputType = {
    id: string | null
    productId: string | null
    url: string | null
    alt: string | null
    sortOrder: number | null
    deletedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ProductGalleryImageCountAggregateOutputType = {
    id: number
    productId: number
    url: number
    alt: number
    sortOrder: number
    deletedAt: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ProductGalleryImageAvgAggregateInputType = {
    sortOrder?: true
  }

  export type ProductGalleryImageSumAggregateInputType = {
    sortOrder?: true
  }

  export type ProductGalleryImageMinAggregateInputType = {
    id?: true
    productId?: true
    url?: true
    alt?: true
    sortOrder?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ProductGalleryImageMaxAggregateInputType = {
    id?: true
    productId?: true
    url?: true
    alt?: true
    sortOrder?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ProductGalleryImageCountAggregateInputType = {
    id?: true
    productId?: true
    url?: true
    alt?: true
    sortOrder?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ProductGalleryImageAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ProductGalleryImage to aggregate.
     */
    where?: ProductGalleryImageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProductGalleryImages to fetch.
     */
    orderBy?: ProductGalleryImageOrderByWithRelationInput | ProductGalleryImageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ProductGalleryImageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProductGalleryImages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProductGalleryImages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ProductGalleryImages
    **/
    _count?: true | ProductGalleryImageCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ProductGalleryImageAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ProductGalleryImageSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ProductGalleryImageMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ProductGalleryImageMaxAggregateInputType
  }

  export type GetProductGalleryImageAggregateType<T extends ProductGalleryImageAggregateArgs> = {
        [P in keyof T & keyof AggregateProductGalleryImage]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateProductGalleryImage[P]>
      : GetScalarType<T[P], AggregateProductGalleryImage[P]>
  }




  export type ProductGalleryImageGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProductGalleryImageWhereInput
    orderBy?: ProductGalleryImageOrderByWithAggregationInput | ProductGalleryImageOrderByWithAggregationInput[]
    by: ProductGalleryImageScalarFieldEnum[] | ProductGalleryImageScalarFieldEnum
    having?: ProductGalleryImageScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ProductGalleryImageCountAggregateInputType | true
    _avg?: ProductGalleryImageAvgAggregateInputType
    _sum?: ProductGalleryImageSumAggregateInputType
    _min?: ProductGalleryImageMinAggregateInputType
    _max?: ProductGalleryImageMaxAggregateInputType
  }

  export type ProductGalleryImageGroupByOutputType = {
    id: string
    productId: string
    url: string
    alt: string | null
    sortOrder: number
    deletedAt: Date | null
    createdAt: Date
    updatedAt: Date
    _count: ProductGalleryImageCountAggregateOutputType | null
    _avg: ProductGalleryImageAvgAggregateOutputType | null
    _sum: ProductGalleryImageSumAggregateOutputType | null
    _min: ProductGalleryImageMinAggregateOutputType | null
    _max: ProductGalleryImageMaxAggregateOutputType | null
  }

  type GetProductGalleryImageGroupByPayload<T extends ProductGalleryImageGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ProductGalleryImageGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ProductGalleryImageGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ProductGalleryImageGroupByOutputType[P]>
            : GetScalarType<T[P], ProductGalleryImageGroupByOutputType[P]>
        }
      >
    >


  export type ProductGalleryImageSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    productId?: boolean
    url?: boolean
    alt?: boolean
    sortOrder?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    product?: boolean | ProductDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["productGalleryImage"]>

  export type ProductGalleryImageSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    productId?: boolean
    url?: boolean
    alt?: boolean
    sortOrder?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    product?: boolean | ProductDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["productGalleryImage"]>

  export type ProductGalleryImageSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    productId?: boolean
    url?: boolean
    alt?: boolean
    sortOrder?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    product?: boolean | ProductDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["productGalleryImage"]>

  export type ProductGalleryImageSelectScalar = {
    id?: boolean
    productId?: boolean
    url?: boolean
    alt?: boolean
    sortOrder?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type ProductGalleryImageOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "productId" | "url" | "alt" | "sortOrder" | "deletedAt" | "createdAt" | "updatedAt", ExtArgs["result"]["productGalleryImage"]>
  export type ProductGalleryImageInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    product?: boolean | ProductDefaultArgs<ExtArgs>
  }
  export type ProductGalleryImageIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    product?: boolean | ProductDefaultArgs<ExtArgs>
  }
  export type ProductGalleryImageIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    product?: boolean | ProductDefaultArgs<ExtArgs>
  }

  export type $ProductGalleryImagePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ProductGalleryImage"
    objects: {
      product: Prisma.$ProductPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      productId: string
      url: string
      alt: string | null
      sortOrder: number
      deletedAt: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["productGalleryImage"]>
    composites: {}
  }

  type ProductGalleryImageGetPayload<S extends boolean | null | undefined | ProductGalleryImageDefaultArgs> = $Result.GetResult<Prisma.$ProductGalleryImagePayload, S>

  type ProductGalleryImageCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ProductGalleryImageFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ProductGalleryImageCountAggregateInputType | true
    }

  export interface ProductGalleryImageDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ProductGalleryImage'], meta: { name: 'ProductGalleryImage' } }
    /**
     * Find zero or one ProductGalleryImage that matches the filter.
     * @param {ProductGalleryImageFindUniqueArgs} args - Arguments to find a ProductGalleryImage
     * @example
     * // Get one ProductGalleryImage
     * const productGalleryImage = await prisma.productGalleryImage.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ProductGalleryImageFindUniqueArgs>(args: SelectSubset<T, ProductGalleryImageFindUniqueArgs<ExtArgs>>): Prisma__ProductGalleryImageClient<$Result.GetResult<Prisma.$ProductGalleryImagePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ProductGalleryImage that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ProductGalleryImageFindUniqueOrThrowArgs} args - Arguments to find a ProductGalleryImage
     * @example
     * // Get one ProductGalleryImage
     * const productGalleryImage = await prisma.productGalleryImage.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ProductGalleryImageFindUniqueOrThrowArgs>(args: SelectSubset<T, ProductGalleryImageFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ProductGalleryImageClient<$Result.GetResult<Prisma.$ProductGalleryImagePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ProductGalleryImage that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductGalleryImageFindFirstArgs} args - Arguments to find a ProductGalleryImage
     * @example
     * // Get one ProductGalleryImage
     * const productGalleryImage = await prisma.productGalleryImage.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ProductGalleryImageFindFirstArgs>(args?: SelectSubset<T, ProductGalleryImageFindFirstArgs<ExtArgs>>): Prisma__ProductGalleryImageClient<$Result.GetResult<Prisma.$ProductGalleryImagePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ProductGalleryImage that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductGalleryImageFindFirstOrThrowArgs} args - Arguments to find a ProductGalleryImage
     * @example
     * // Get one ProductGalleryImage
     * const productGalleryImage = await prisma.productGalleryImage.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ProductGalleryImageFindFirstOrThrowArgs>(args?: SelectSubset<T, ProductGalleryImageFindFirstOrThrowArgs<ExtArgs>>): Prisma__ProductGalleryImageClient<$Result.GetResult<Prisma.$ProductGalleryImagePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ProductGalleryImages that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductGalleryImageFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ProductGalleryImages
     * const productGalleryImages = await prisma.productGalleryImage.findMany()
     * 
     * // Get first 10 ProductGalleryImages
     * const productGalleryImages = await prisma.productGalleryImage.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const productGalleryImageWithIdOnly = await prisma.productGalleryImage.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ProductGalleryImageFindManyArgs>(args?: SelectSubset<T, ProductGalleryImageFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProductGalleryImagePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ProductGalleryImage.
     * @param {ProductGalleryImageCreateArgs} args - Arguments to create a ProductGalleryImage.
     * @example
     * // Create one ProductGalleryImage
     * const ProductGalleryImage = await prisma.productGalleryImage.create({
     *   data: {
     *     // ... data to create a ProductGalleryImage
     *   }
     * })
     * 
     */
    create<T extends ProductGalleryImageCreateArgs>(args: SelectSubset<T, ProductGalleryImageCreateArgs<ExtArgs>>): Prisma__ProductGalleryImageClient<$Result.GetResult<Prisma.$ProductGalleryImagePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ProductGalleryImages.
     * @param {ProductGalleryImageCreateManyArgs} args - Arguments to create many ProductGalleryImages.
     * @example
     * // Create many ProductGalleryImages
     * const productGalleryImage = await prisma.productGalleryImage.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ProductGalleryImageCreateManyArgs>(args?: SelectSubset<T, ProductGalleryImageCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ProductGalleryImages and returns the data saved in the database.
     * @param {ProductGalleryImageCreateManyAndReturnArgs} args - Arguments to create many ProductGalleryImages.
     * @example
     * // Create many ProductGalleryImages
     * const productGalleryImage = await prisma.productGalleryImage.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ProductGalleryImages and only return the `id`
     * const productGalleryImageWithIdOnly = await prisma.productGalleryImage.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ProductGalleryImageCreateManyAndReturnArgs>(args?: SelectSubset<T, ProductGalleryImageCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProductGalleryImagePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ProductGalleryImage.
     * @param {ProductGalleryImageDeleteArgs} args - Arguments to delete one ProductGalleryImage.
     * @example
     * // Delete one ProductGalleryImage
     * const ProductGalleryImage = await prisma.productGalleryImage.delete({
     *   where: {
     *     // ... filter to delete one ProductGalleryImage
     *   }
     * })
     * 
     */
    delete<T extends ProductGalleryImageDeleteArgs>(args: SelectSubset<T, ProductGalleryImageDeleteArgs<ExtArgs>>): Prisma__ProductGalleryImageClient<$Result.GetResult<Prisma.$ProductGalleryImagePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ProductGalleryImage.
     * @param {ProductGalleryImageUpdateArgs} args - Arguments to update one ProductGalleryImage.
     * @example
     * // Update one ProductGalleryImage
     * const productGalleryImage = await prisma.productGalleryImage.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ProductGalleryImageUpdateArgs>(args: SelectSubset<T, ProductGalleryImageUpdateArgs<ExtArgs>>): Prisma__ProductGalleryImageClient<$Result.GetResult<Prisma.$ProductGalleryImagePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ProductGalleryImages.
     * @param {ProductGalleryImageDeleteManyArgs} args - Arguments to filter ProductGalleryImages to delete.
     * @example
     * // Delete a few ProductGalleryImages
     * const { count } = await prisma.productGalleryImage.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ProductGalleryImageDeleteManyArgs>(args?: SelectSubset<T, ProductGalleryImageDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ProductGalleryImages.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductGalleryImageUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ProductGalleryImages
     * const productGalleryImage = await prisma.productGalleryImage.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ProductGalleryImageUpdateManyArgs>(args: SelectSubset<T, ProductGalleryImageUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ProductGalleryImages and returns the data updated in the database.
     * @param {ProductGalleryImageUpdateManyAndReturnArgs} args - Arguments to update many ProductGalleryImages.
     * @example
     * // Update many ProductGalleryImages
     * const productGalleryImage = await prisma.productGalleryImage.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ProductGalleryImages and only return the `id`
     * const productGalleryImageWithIdOnly = await prisma.productGalleryImage.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ProductGalleryImageUpdateManyAndReturnArgs>(args: SelectSubset<T, ProductGalleryImageUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProductGalleryImagePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ProductGalleryImage.
     * @param {ProductGalleryImageUpsertArgs} args - Arguments to update or create a ProductGalleryImage.
     * @example
     * // Update or create a ProductGalleryImage
     * const productGalleryImage = await prisma.productGalleryImage.upsert({
     *   create: {
     *     // ... data to create a ProductGalleryImage
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ProductGalleryImage we want to update
     *   }
     * })
     */
    upsert<T extends ProductGalleryImageUpsertArgs>(args: SelectSubset<T, ProductGalleryImageUpsertArgs<ExtArgs>>): Prisma__ProductGalleryImageClient<$Result.GetResult<Prisma.$ProductGalleryImagePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ProductGalleryImages.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductGalleryImageCountArgs} args - Arguments to filter ProductGalleryImages to count.
     * @example
     * // Count the number of ProductGalleryImages
     * const count = await prisma.productGalleryImage.count({
     *   where: {
     *     // ... the filter for the ProductGalleryImages we want to count
     *   }
     * })
    **/
    count<T extends ProductGalleryImageCountArgs>(
      args?: Subset<T, ProductGalleryImageCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ProductGalleryImageCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ProductGalleryImage.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductGalleryImageAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ProductGalleryImageAggregateArgs>(args: Subset<T, ProductGalleryImageAggregateArgs>): Prisma.PrismaPromise<GetProductGalleryImageAggregateType<T>>

    /**
     * Group by ProductGalleryImage.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductGalleryImageGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ProductGalleryImageGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ProductGalleryImageGroupByArgs['orderBy'] }
        : { orderBy?: ProductGalleryImageGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ProductGalleryImageGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetProductGalleryImageGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ProductGalleryImage model
   */
  readonly fields: ProductGalleryImageFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ProductGalleryImage.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ProductGalleryImageClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    product<T extends ProductDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ProductDefaultArgs<ExtArgs>>): Prisma__ProductClient<$Result.GetResult<Prisma.$ProductPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ProductGalleryImage model
   */
  interface ProductGalleryImageFieldRefs {
    readonly id: FieldRef<"ProductGalleryImage", 'String'>
    readonly productId: FieldRef<"ProductGalleryImage", 'String'>
    readonly url: FieldRef<"ProductGalleryImage", 'String'>
    readonly alt: FieldRef<"ProductGalleryImage", 'String'>
    readonly sortOrder: FieldRef<"ProductGalleryImage", 'Int'>
    readonly deletedAt: FieldRef<"ProductGalleryImage", 'DateTime'>
    readonly createdAt: FieldRef<"ProductGalleryImage", 'DateTime'>
    readonly updatedAt: FieldRef<"ProductGalleryImage", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ProductGalleryImage findUnique
   */
  export type ProductGalleryImageFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductGalleryImage
     */
    select?: ProductGalleryImageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductGalleryImage
     */
    omit?: ProductGalleryImageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductGalleryImageInclude<ExtArgs> | null
    /**
     * Filter, which ProductGalleryImage to fetch.
     */
    where: ProductGalleryImageWhereUniqueInput
  }

  /**
   * ProductGalleryImage findUniqueOrThrow
   */
  export type ProductGalleryImageFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductGalleryImage
     */
    select?: ProductGalleryImageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductGalleryImage
     */
    omit?: ProductGalleryImageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductGalleryImageInclude<ExtArgs> | null
    /**
     * Filter, which ProductGalleryImage to fetch.
     */
    where: ProductGalleryImageWhereUniqueInput
  }

  /**
   * ProductGalleryImage findFirst
   */
  export type ProductGalleryImageFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductGalleryImage
     */
    select?: ProductGalleryImageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductGalleryImage
     */
    omit?: ProductGalleryImageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductGalleryImageInclude<ExtArgs> | null
    /**
     * Filter, which ProductGalleryImage to fetch.
     */
    where?: ProductGalleryImageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProductGalleryImages to fetch.
     */
    orderBy?: ProductGalleryImageOrderByWithRelationInput | ProductGalleryImageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ProductGalleryImages.
     */
    cursor?: ProductGalleryImageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProductGalleryImages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProductGalleryImages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ProductGalleryImages.
     */
    distinct?: ProductGalleryImageScalarFieldEnum | ProductGalleryImageScalarFieldEnum[]
  }

  /**
   * ProductGalleryImage findFirstOrThrow
   */
  export type ProductGalleryImageFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductGalleryImage
     */
    select?: ProductGalleryImageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductGalleryImage
     */
    omit?: ProductGalleryImageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductGalleryImageInclude<ExtArgs> | null
    /**
     * Filter, which ProductGalleryImage to fetch.
     */
    where?: ProductGalleryImageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProductGalleryImages to fetch.
     */
    orderBy?: ProductGalleryImageOrderByWithRelationInput | ProductGalleryImageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ProductGalleryImages.
     */
    cursor?: ProductGalleryImageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProductGalleryImages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProductGalleryImages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ProductGalleryImages.
     */
    distinct?: ProductGalleryImageScalarFieldEnum | ProductGalleryImageScalarFieldEnum[]
  }

  /**
   * ProductGalleryImage findMany
   */
  export type ProductGalleryImageFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductGalleryImage
     */
    select?: ProductGalleryImageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductGalleryImage
     */
    omit?: ProductGalleryImageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductGalleryImageInclude<ExtArgs> | null
    /**
     * Filter, which ProductGalleryImages to fetch.
     */
    where?: ProductGalleryImageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProductGalleryImages to fetch.
     */
    orderBy?: ProductGalleryImageOrderByWithRelationInput | ProductGalleryImageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ProductGalleryImages.
     */
    cursor?: ProductGalleryImageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProductGalleryImages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProductGalleryImages.
     */
    skip?: number
    distinct?: ProductGalleryImageScalarFieldEnum | ProductGalleryImageScalarFieldEnum[]
  }

  /**
   * ProductGalleryImage create
   */
  export type ProductGalleryImageCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductGalleryImage
     */
    select?: ProductGalleryImageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductGalleryImage
     */
    omit?: ProductGalleryImageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductGalleryImageInclude<ExtArgs> | null
    /**
     * The data needed to create a ProductGalleryImage.
     */
    data: XOR<ProductGalleryImageCreateInput, ProductGalleryImageUncheckedCreateInput>
  }

  /**
   * ProductGalleryImage createMany
   */
  export type ProductGalleryImageCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ProductGalleryImages.
     */
    data: ProductGalleryImageCreateManyInput | ProductGalleryImageCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ProductGalleryImage createManyAndReturn
   */
  export type ProductGalleryImageCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductGalleryImage
     */
    select?: ProductGalleryImageSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ProductGalleryImage
     */
    omit?: ProductGalleryImageOmit<ExtArgs> | null
    /**
     * The data used to create many ProductGalleryImages.
     */
    data: ProductGalleryImageCreateManyInput | ProductGalleryImageCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductGalleryImageIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ProductGalleryImage update
   */
  export type ProductGalleryImageUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductGalleryImage
     */
    select?: ProductGalleryImageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductGalleryImage
     */
    omit?: ProductGalleryImageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductGalleryImageInclude<ExtArgs> | null
    /**
     * The data needed to update a ProductGalleryImage.
     */
    data: XOR<ProductGalleryImageUpdateInput, ProductGalleryImageUncheckedUpdateInput>
    /**
     * Choose, which ProductGalleryImage to update.
     */
    where: ProductGalleryImageWhereUniqueInput
  }

  /**
   * ProductGalleryImage updateMany
   */
  export type ProductGalleryImageUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ProductGalleryImages.
     */
    data: XOR<ProductGalleryImageUpdateManyMutationInput, ProductGalleryImageUncheckedUpdateManyInput>
    /**
     * Filter which ProductGalleryImages to update
     */
    where?: ProductGalleryImageWhereInput
    /**
     * Limit how many ProductGalleryImages to update.
     */
    limit?: number
  }

  /**
   * ProductGalleryImage updateManyAndReturn
   */
  export type ProductGalleryImageUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductGalleryImage
     */
    select?: ProductGalleryImageSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ProductGalleryImage
     */
    omit?: ProductGalleryImageOmit<ExtArgs> | null
    /**
     * The data used to update ProductGalleryImages.
     */
    data: XOR<ProductGalleryImageUpdateManyMutationInput, ProductGalleryImageUncheckedUpdateManyInput>
    /**
     * Filter which ProductGalleryImages to update
     */
    where?: ProductGalleryImageWhereInput
    /**
     * Limit how many ProductGalleryImages to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductGalleryImageIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * ProductGalleryImage upsert
   */
  export type ProductGalleryImageUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductGalleryImage
     */
    select?: ProductGalleryImageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductGalleryImage
     */
    omit?: ProductGalleryImageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductGalleryImageInclude<ExtArgs> | null
    /**
     * The filter to search for the ProductGalleryImage to update in case it exists.
     */
    where: ProductGalleryImageWhereUniqueInput
    /**
     * In case the ProductGalleryImage found by the `where` argument doesn't exist, create a new ProductGalleryImage with this data.
     */
    create: XOR<ProductGalleryImageCreateInput, ProductGalleryImageUncheckedCreateInput>
    /**
     * In case the ProductGalleryImage was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ProductGalleryImageUpdateInput, ProductGalleryImageUncheckedUpdateInput>
  }

  /**
   * ProductGalleryImage delete
   */
  export type ProductGalleryImageDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductGalleryImage
     */
    select?: ProductGalleryImageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductGalleryImage
     */
    omit?: ProductGalleryImageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductGalleryImageInclude<ExtArgs> | null
    /**
     * Filter which ProductGalleryImage to delete.
     */
    where: ProductGalleryImageWhereUniqueInput
  }

  /**
   * ProductGalleryImage deleteMany
   */
  export type ProductGalleryImageDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ProductGalleryImages to delete
     */
    where?: ProductGalleryImageWhereInput
    /**
     * Limit how many ProductGalleryImages to delete.
     */
    limit?: number
  }

  /**
   * ProductGalleryImage without action
   */
  export type ProductGalleryImageDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductGalleryImage
     */
    select?: ProductGalleryImageSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductGalleryImage
     */
    omit?: ProductGalleryImageOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductGalleryImageInclude<ExtArgs> | null
  }


  /**
   * Model ProductVrHotspot
   */

  export type AggregateProductVrHotspot = {
    _count: ProductVrHotspotCountAggregateOutputType | null
    _avg: ProductVrHotspotAvgAggregateOutputType | null
    _sum: ProductVrHotspotSumAggregateOutputType | null
    _min: ProductVrHotspotMinAggregateOutputType | null
    _max: ProductVrHotspotMaxAggregateOutputType | null
  }

  export type ProductVrHotspotAvgAggregateOutputType = {
    x: number | null
    y: number | null
    yaw: number | null
    pitch: number | null
    fov: number | null
  }

  export type ProductVrHotspotSumAggregateOutputType = {
    x: number | null
    y: number | null
    yaw: number | null
    pitch: number | null
    fov: number | null
  }

  export type ProductVrHotspotMinAggregateOutputType = {
    id: string | null
    productId: string | null
    x: number | null
    y: number | null
    panoImageUrl: string | null
    title: string | null
    body: string | null
    yaw: number | null
    pitch: number | null
    fov: number | null
    deletedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ProductVrHotspotMaxAggregateOutputType = {
    id: string | null
    productId: string | null
    x: number | null
    y: number | null
    panoImageUrl: string | null
    title: string | null
    body: string | null
    yaw: number | null
    pitch: number | null
    fov: number | null
    deletedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ProductVrHotspotCountAggregateOutputType = {
    id: number
    productId: number
    x: number
    y: number
    panoImageUrl: number
    title: number
    body: number
    yaw: number
    pitch: number
    fov: number
    deletedAt: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ProductVrHotspotAvgAggregateInputType = {
    x?: true
    y?: true
    yaw?: true
    pitch?: true
    fov?: true
  }

  export type ProductVrHotspotSumAggregateInputType = {
    x?: true
    y?: true
    yaw?: true
    pitch?: true
    fov?: true
  }

  export type ProductVrHotspotMinAggregateInputType = {
    id?: true
    productId?: true
    x?: true
    y?: true
    panoImageUrl?: true
    title?: true
    body?: true
    yaw?: true
    pitch?: true
    fov?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ProductVrHotspotMaxAggregateInputType = {
    id?: true
    productId?: true
    x?: true
    y?: true
    panoImageUrl?: true
    title?: true
    body?: true
    yaw?: true
    pitch?: true
    fov?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ProductVrHotspotCountAggregateInputType = {
    id?: true
    productId?: true
    x?: true
    y?: true
    panoImageUrl?: true
    title?: true
    body?: true
    yaw?: true
    pitch?: true
    fov?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ProductVrHotspotAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ProductVrHotspot to aggregate.
     */
    where?: ProductVrHotspotWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProductVrHotspots to fetch.
     */
    orderBy?: ProductVrHotspotOrderByWithRelationInput | ProductVrHotspotOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ProductVrHotspotWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProductVrHotspots from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProductVrHotspots.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ProductVrHotspots
    **/
    _count?: true | ProductVrHotspotCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ProductVrHotspotAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ProductVrHotspotSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ProductVrHotspotMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ProductVrHotspotMaxAggregateInputType
  }

  export type GetProductVrHotspotAggregateType<T extends ProductVrHotspotAggregateArgs> = {
        [P in keyof T & keyof AggregateProductVrHotspot]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateProductVrHotspot[P]>
      : GetScalarType<T[P], AggregateProductVrHotspot[P]>
  }




  export type ProductVrHotspotGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProductVrHotspotWhereInput
    orderBy?: ProductVrHotspotOrderByWithAggregationInput | ProductVrHotspotOrderByWithAggregationInput[]
    by: ProductVrHotspotScalarFieldEnum[] | ProductVrHotspotScalarFieldEnum
    having?: ProductVrHotspotScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ProductVrHotspotCountAggregateInputType | true
    _avg?: ProductVrHotspotAvgAggregateInputType
    _sum?: ProductVrHotspotSumAggregateInputType
    _min?: ProductVrHotspotMinAggregateInputType
    _max?: ProductVrHotspotMaxAggregateInputType
  }

  export type ProductVrHotspotGroupByOutputType = {
    id: string
    productId: string
    x: number
    y: number
    panoImageUrl: string
    title: string | null
    body: string | null
    yaw: number | null
    pitch: number | null
    fov: number | null
    deletedAt: Date | null
    createdAt: Date
    updatedAt: Date
    _count: ProductVrHotspotCountAggregateOutputType | null
    _avg: ProductVrHotspotAvgAggregateOutputType | null
    _sum: ProductVrHotspotSumAggregateOutputType | null
    _min: ProductVrHotspotMinAggregateOutputType | null
    _max: ProductVrHotspotMaxAggregateOutputType | null
  }

  type GetProductVrHotspotGroupByPayload<T extends ProductVrHotspotGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ProductVrHotspotGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ProductVrHotspotGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ProductVrHotspotGroupByOutputType[P]>
            : GetScalarType<T[P], ProductVrHotspotGroupByOutputType[P]>
        }
      >
    >


  export type ProductVrHotspotSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    productId?: boolean
    x?: boolean
    y?: boolean
    panoImageUrl?: boolean
    title?: boolean
    body?: boolean
    yaw?: boolean
    pitch?: boolean
    fov?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    product?: boolean | ProductDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["productVrHotspot"]>

  export type ProductVrHotspotSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    productId?: boolean
    x?: boolean
    y?: boolean
    panoImageUrl?: boolean
    title?: boolean
    body?: boolean
    yaw?: boolean
    pitch?: boolean
    fov?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    product?: boolean | ProductDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["productVrHotspot"]>

  export type ProductVrHotspotSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    productId?: boolean
    x?: boolean
    y?: boolean
    panoImageUrl?: boolean
    title?: boolean
    body?: boolean
    yaw?: boolean
    pitch?: boolean
    fov?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    product?: boolean | ProductDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["productVrHotspot"]>

  export type ProductVrHotspotSelectScalar = {
    id?: boolean
    productId?: boolean
    x?: boolean
    y?: boolean
    panoImageUrl?: boolean
    title?: boolean
    body?: boolean
    yaw?: boolean
    pitch?: boolean
    fov?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type ProductVrHotspotOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "productId" | "x" | "y" | "panoImageUrl" | "title" | "body" | "yaw" | "pitch" | "fov" | "deletedAt" | "createdAt" | "updatedAt", ExtArgs["result"]["productVrHotspot"]>
  export type ProductVrHotspotInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    product?: boolean | ProductDefaultArgs<ExtArgs>
  }
  export type ProductVrHotspotIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    product?: boolean | ProductDefaultArgs<ExtArgs>
  }
  export type ProductVrHotspotIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    product?: boolean | ProductDefaultArgs<ExtArgs>
  }

  export type $ProductVrHotspotPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ProductVrHotspot"
    objects: {
      product: Prisma.$ProductPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      productId: string
      x: number
      y: number
      panoImageUrl: string
      title: string | null
      body: string | null
      yaw: number | null
      pitch: number | null
      fov: number | null
      deletedAt: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["productVrHotspot"]>
    composites: {}
  }

  type ProductVrHotspotGetPayload<S extends boolean | null | undefined | ProductVrHotspotDefaultArgs> = $Result.GetResult<Prisma.$ProductVrHotspotPayload, S>

  type ProductVrHotspotCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ProductVrHotspotFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ProductVrHotspotCountAggregateInputType | true
    }

  export interface ProductVrHotspotDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ProductVrHotspot'], meta: { name: 'ProductVrHotspot' } }
    /**
     * Find zero or one ProductVrHotspot that matches the filter.
     * @param {ProductVrHotspotFindUniqueArgs} args - Arguments to find a ProductVrHotspot
     * @example
     * // Get one ProductVrHotspot
     * const productVrHotspot = await prisma.productVrHotspot.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ProductVrHotspotFindUniqueArgs>(args: SelectSubset<T, ProductVrHotspotFindUniqueArgs<ExtArgs>>): Prisma__ProductVrHotspotClient<$Result.GetResult<Prisma.$ProductVrHotspotPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ProductVrHotspot that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ProductVrHotspotFindUniqueOrThrowArgs} args - Arguments to find a ProductVrHotspot
     * @example
     * // Get one ProductVrHotspot
     * const productVrHotspot = await prisma.productVrHotspot.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ProductVrHotspotFindUniqueOrThrowArgs>(args: SelectSubset<T, ProductVrHotspotFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ProductVrHotspotClient<$Result.GetResult<Prisma.$ProductVrHotspotPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ProductVrHotspot that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductVrHotspotFindFirstArgs} args - Arguments to find a ProductVrHotspot
     * @example
     * // Get one ProductVrHotspot
     * const productVrHotspot = await prisma.productVrHotspot.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ProductVrHotspotFindFirstArgs>(args?: SelectSubset<T, ProductVrHotspotFindFirstArgs<ExtArgs>>): Prisma__ProductVrHotspotClient<$Result.GetResult<Prisma.$ProductVrHotspotPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ProductVrHotspot that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductVrHotspotFindFirstOrThrowArgs} args - Arguments to find a ProductVrHotspot
     * @example
     * // Get one ProductVrHotspot
     * const productVrHotspot = await prisma.productVrHotspot.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ProductVrHotspotFindFirstOrThrowArgs>(args?: SelectSubset<T, ProductVrHotspotFindFirstOrThrowArgs<ExtArgs>>): Prisma__ProductVrHotspotClient<$Result.GetResult<Prisma.$ProductVrHotspotPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ProductVrHotspots that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductVrHotspotFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ProductVrHotspots
     * const productVrHotspots = await prisma.productVrHotspot.findMany()
     * 
     * // Get first 10 ProductVrHotspots
     * const productVrHotspots = await prisma.productVrHotspot.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const productVrHotspotWithIdOnly = await prisma.productVrHotspot.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ProductVrHotspotFindManyArgs>(args?: SelectSubset<T, ProductVrHotspotFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProductVrHotspotPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ProductVrHotspot.
     * @param {ProductVrHotspotCreateArgs} args - Arguments to create a ProductVrHotspot.
     * @example
     * // Create one ProductVrHotspot
     * const ProductVrHotspot = await prisma.productVrHotspot.create({
     *   data: {
     *     // ... data to create a ProductVrHotspot
     *   }
     * })
     * 
     */
    create<T extends ProductVrHotspotCreateArgs>(args: SelectSubset<T, ProductVrHotspotCreateArgs<ExtArgs>>): Prisma__ProductVrHotspotClient<$Result.GetResult<Prisma.$ProductVrHotspotPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ProductVrHotspots.
     * @param {ProductVrHotspotCreateManyArgs} args - Arguments to create many ProductVrHotspots.
     * @example
     * // Create many ProductVrHotspots
     * const productVrHotspot = await prisma.productVrHotspot.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ProductVrHotspotCreateManyArgs>(args?: SelectSubset<T, ProductVrHotspotCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ProductVrHotspots and returns the data saved in the database.
     * @param {ProductVrHotspotCreateManyAndReturnArgs} args - Arguments to create many ProductVrHotspots.
     * @example
     * // Create many ProductVrHotspots
     * const productVrHotspot = await prisma.productVrHotspot.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ProductVrHotspots and only return the `id`
     * const productVrHotspotWithIdOnly = await prisma.productVrHotspot.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ProductVrHotspotCreateManyAndReturnArgs>(args?: SelectSubset<T, ProductVrHotspotCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProductVrHotspotPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ProductVrHotspot.
     * @param {ProductVrHotspotDeleteArgs} args - Arguments to delete one ProductVrHotspot.
     * @example
     * // Delete one ProductVrHotspot
     * const ProductVrHotspot = await prisma.productVrHotspot.delete({
     *   where: {
     *     // ... filter to delete one ProductVrHotspot
     *   }
     * })
     * 
     */
    delete<T extends ProductVrHotspotDeleteArgs>(args: SelectSubset<T, ProductVrHotspotDeleteArgs<ExtArgs>>): Prisma__ProductVrHotspotClient<$Result.GetResult<Prisma.$ProductVrHotspotPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ProductVrHotspot.
     * @param {ProductVrHotspotUpdateArgs} args - Arguments to update one ProductVrHotspot.
     * @example
     * // Update one ProductVrHotspot
     * const productVrHotspot = await prisma.productVrHotspot.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ProductVrHotspotUpdateArgs>(args: SelectSubset<T, ProductVrHotspotUpdateArgs<ExtArgs>>): Prisma__ProductVrHotspotClient<$Result.GetResult<Prisma.$ProductVrHotspotPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ProductVrHotspots.
     * @param {ProductVrHotspotDeleteManyArgs} args - Arguments to filter ProductVrHotspots to delete.
     * @example
     * // Delete a few ProductVrHotspots
     * const { count } = await prisma.productVrHotspot.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ProductVrHotspotDeleteManyArgs>(args?: SelectSubset<T, ProductVrHotspotDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ProductVrHotspots.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductVrHotspotUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ProductVrHotspots
     * const productVrHotspot = await prisma.productVrHotspot.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ProductVrHotspotUpdateManyArgs>(args: SelectSubset<T, ProductVrHotspotUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ProductVrHotspots and returns the data updated in the database.
     * @param {ProductVrHotspotUpdateManyAndReturnArgs} args - Arguments to update many ProductVrHotspots.
     * @example
     * // Update many ProductVrHotspots
     * const productVrHotspot = await prisma.productVrHotspot.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ProductVrHotspots and only return the `id`
     * const productVrHotspotWithIdOnly = await prisma.productVrHotspot.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ProductVrHotspotUpdateManyAndReturnArgs>(args: SelectSubset<T, ProductVrHotspotUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProductVrHotspotPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ProductVrHotspot.
     * @param {ProductVrHotspotUpsertArgs} args - Arguments to update or create a ProductVrHotspot.
     * @example
     * // Update or create a ProductVrHotspot
     * const productVrHotspot = await prisma.productVrHotspot.upsert({
     *   create: {
     *     // ... data to create a ProductVrHotspot
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ProductVrHotspot we want to update
     *   }
     * })
     */
    upsert<T extends ProductVrHotspotUpsertArgs>(args: SelectSubset<T, ProductVrHotspotUpsertArgs<ExtArgs>>): Prisma__ProductVrHotspotClient<$Result.GetResult<Prisma.$ProductVrHotspotPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ProductVrHotspots.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductVrHotspotCountArgs} args - Arguments to filter ProductVrHotspots to count.
     * @example
     * // Count the number of ProductVrHotspots
     * const count = await prisma.productVrHotspot.count({
     *   where: {
     *     // ... the filter for the ProductVrHotspots we want to count
     *   }
     * })
    **/
    count<T extends ProductVrHotspotCountArgs>(
      args?: Subset<T, ProductVrHotspotCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ProductVrHotspotCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ProductVrHotspot.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductVrHotspotAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ProductVrHotspotAggregateArgs>(args: Subset<T, ProductVrHotspotAggregateArgs>): Prisma.PrismaPromise<GetProductVrHotspotAggregateType<T>>

    /**
     * Group by ProductVrHotspot.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductVrHotspotGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ProductVrHotspotGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ProductVrHotspotGroupByArgs['orderBy'] }
        : { orderBy?: ProductVrHotspotGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ProductVrHotspotGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetProductVrHotspotGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ProductVrHotspot model
   */
  readonly fields: ProductVrHotspotFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ProductVrHotspot.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ProductVrHotspotClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    product<T extends ProductDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ProductDefaultArgs<ExtArgs>>): Prisma__ProductClient<$Result.GetResult<Prisma.$ProductPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ProductVrHotspot model
   */
  interface ProductVrHotspotFieldRefs {
    readonly id: FieldRef<"ProductVrHotspot", 'String'>
    readonly productId: FieldRef<"ProductVrHotspot", 'String'>
    readonly x: FieldRef<"ProductVrHotspot", 'Float'>
    readonly y: FieldRef<"ProductVrHotspot", 'Float'>
    readonly panoImageUrl: FieldRef<"ProductVrHotspot", 'String'>
    readonly title: FieldRef<"ProductVrHotspot", 'String'>
    readonly body: FieldRef<"ProductVrHotspot", 'String'>
    readonly yaw: FieldRef<"ProductVrHotspot", 'Float'>
    readonly pitch: FieldRef<"ProductVrHotspot", 'Float'>
    readonly fov: FieldRef<"ProductVrHotspot", 'Float'>
    readonly deletedAt: FieldRef<"ProductVrHotspot", 'DateTime'>
    readonly createdAt: FieldRef<"ProductVrHotspot", 'DateTime'>
    readonly updatedAt: FieldRef<"ProductVrHotspot", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ProductVrHotspot findUnique
   */
  export type ProductVrHotspotFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductVrHotspot
     */
    select?: ProductVrHotspotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductVrHotspot
     */
    omit?: ProductVrHotspotOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductVrHotspotInclude<ExtArgs> | null
    /**
     * Filter, which ProductVrHotspot to fetch.
     */
    where: ProductVrHotspotWhereUniqueInput
  }

  /**
   * ProductVrHotspot findUniqueOrThrow
   */
  export type ProductVrHotspotFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductVrHotspot
     */
    select?: ProductVrHotspotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductVrHotspot
     */
    omit?: ProductVrHotspotOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductVrHotspotInclude<ExtArgs> | null
    /**
     * Filter, which ProductVrHotspot to fetch.
     */
    where: ProductVrHotspotWhereUniqueInput
  }

  /**
   * ProductVrHotspot findFirst
   */
  export type ProductVrHotspotFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductVrHotspot
     */
    select?: ProductVrHotspotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductVrHotspot
     */
    omit?: ProductVrHotspotOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductVrHotspotInclude<ExtArgs> | null
    /**
     * Filter, which ProductVrHotspot to fetch.
     */
    where?: ProductVrHotspotWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProductVrHotspots to fetch.
     */
    orderBy?: ProductVrHotspotOrderByWithRelationInput | ProductVrHotspotOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ProductVrHotspots.
     */
    cursor?: ProductVrHotspotWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProductVrHotspots from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProductVrHotspots.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ProductVrHotspots.
     */
    distinct?: ProductVrHotspotScalarFieldEnum | ProductVrHotspotScalarFieldEnum[]
  }

  /**
   * ProductVrHotspot findFirstOrThrow
   */
  export type ProductVrHotspotFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductVrHotspot
     */
    select?: ProductVrHotspotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductVrHotspot
     */
    omit?: ProductVrHotspotOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductVrHotspotInclude<ExtArgs> | null
    /**
     * Filter, which ProductVrHotspot to fetch.
     */
    where?: ProductVrHotspotWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProductVrHotspots to fetch.
     */
    orderBy?: ProductVrHotspotOrderByWithRelationInput | ProductVrHotspotOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ProductVrHotspots.
     */
    cursor?: ProductVrHotspotWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProductVrHotspots from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProductVrHotspots.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ProductVrHotspots.
     */
    distinct?: ProductVrHotspotScalarFieldEnum | ProductVrHotspotScalarFieldEnum[]
  }

  /**
   * ProductVrHotspot findMany
   */
  export type ProductVrHotspotFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductVrHotspot
     */
    select?: ProductVrHotspotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductVrHotspot
     */
    omit?: ProductVrHotspotOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductVrHotspotInclude<ExtArgs> | null
    /**
     * Filter, which ProductVrHotspots to fetch.
     */
    where?: ProductVrHotspotWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProductVrHotspots to fetch.
     */
    orderBy?: ProductVrHotspotOrderByWithRelationInput | ProductVrHotspotOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ProductVrHotspots.
     */
    cursor?: ProductVrHotspotWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProductVrHotspots from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProductVrHotspots.
     */
    skip?: number
    distinct?: ProductVrHotspotScalarFieldEnum | ProductVrHotspotScalarFieldEnum[]
  }

  /**
   * ProductVrHotspot create
   */
  export type ProductVrHotspotCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductVrHotspot
     */
    select?: ProductVrHotspotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductVrHotspot
     */
    omit?: ProductVrHotspotOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductVrHotspotInclude<ExtArgs> | null
    /**
     * The data needed to create a ProductVrHotspot.
     */
    data: XOR<ProductVrHotspotCreateInput, ProductVrHotspotUncheckedCreateInput>
  }

  /**
   * ProductVrHotspot createMany
   */
  export type ProductVrHotspotCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ProductVrHotspots.
     */
    data: ProductVrHotspotCreateManyInput | ProductVrHotspotCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ProductVrHotspot createManyAndReturn
   */
  export type ProductVrHotspotCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductVrHotspot
     */
    select?: ProductVrHotspotSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ProductVrHotspot
     */
    omit?: ProductVrHotspotOmit<ExtArgs> | null
    /**
     * The data used to create many ProductVrHotspots.
     */
    data: ProductVrHotspotCreateManyInput | ProductVrHotspotCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductVrHotspotIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ProductVrHotspot update
   */
  export type ProductVrHotspotUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductVrHotspot
     */
    select?: ProductVrHotspotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductVrHotspot
     */
    omit?: ProductVrHotspotOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductVrHotspotInclude<ExtArgs> | null
    /**
     * The data needed to update a ProductVrHotspot.
     */
    data: XOR<ProductVrHotspotUpdateInput, ProductVrHotspotUncheckedUpdateInput>
    /**
     * Choose, which ProductVrHotspot to update.
     */
    where: ProductVrHotspotWhereUniqueInput
  }

  /**
   * ProductVrHotspot updateMany
   */
  export type ProductVrHotspotUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ProductVrHotspots.
     */
    data: XOR<ProductVrHotspotUpdateManyMutationInput, ProductVrHotspotUncheckedUpdateManyInput>
    /**
     * Filter which ProductVrHotspots to update
     */
    where?: ProductVrHotspotWhereInput
    /**
     * Limit how many ProductVrHotspots to update.
     */
    limit?: number
  }

  /**
   * ProductVrHotspot updateManyAndReturn
   */
  export type ProductVrHotspotUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductVrHotspot
     */
    select?: ProductVrHotspotSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ProductVrHotspot
     */
    omit?: ProductVrHotspotOmit<ExtArgs> | null
    /**
     * The data used to update ProductVrHotspots.
     */
    data: XOR<ProductVrHotspotUpdateManyMutationInput, ProductVrHotspotUncheckedUpdateManyInput>
    /**
     * Filter which ProductVrHotspots to update
     */
    where?: ProductVrHotspotWhereInput
    /**
     * Limit how many ProductVrHotspots to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductVrHotspotIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * ProductVrHotspot upsert
   */
  export type ProductVrHotspotUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductVrHotspot
     */
    select?: ProductVrHotspotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductVrHotspot
     */
    omit?: ProductVrHotspotOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductVrHotspotInclude<ExtArgs> | null
    /**
     * The filter to search for the ProductVrHotspot to update in case it exists.
     */
    where: ProductVrHotspotWhereUniqueInput
    /**
     * In case the ProductVrHotspot found by the `where` argument doesn't exist, create a new ProductVrHotspot with this data.
     */
    create: XOR<ProductVrHotspotCreateInput, ProductVrHotspotUncheckedCreateInput>
    /**
     * In case the ProductVrHotspot was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ProductVrHotspotUpdateInput, ProductVrHotspotUncheckedUpdateInput>
  }

  /**
   * ProductVrHotspot delete
   */
  export type ProductVrHotspotDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductVrHotspot
     */
    select?: ProductVrHotspotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductVrHotspot
     */
    omit?: ProductVrHotspotOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductVrHotspotInclude<ExtArgs> | null
    /**
     * Filter which ProductVrHotspot to delete.
     */
    where: ProductVrHotspotWhereUniqueInput
  }

  /**
   * ProductVrHotspot deleteMany
   */
  export type ProductVrHotspotDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ProductVrHotspots to delete
     */
    where?: ProductVrHotspotWhereInput
    /**
     * Limit how many ProductVrHotspots to delete.
     */
    limit?: number
  }

  /**
   * ProductVrHotspot without action
   */
  export type ProductVrHotspotDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductVrHotspot
     */
    select?: ProductVrHotspotSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductVrHotspot
     */
    omit?: ProductVrHotspotOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductVrHotspotInclude<ExtArgs> | null
  }


  /**
   * Model ProductAttribute
   */

  export type AggregateProductAttribute = {
    _count: ProductAttributeCountAggregateOutputType | null
    _avg: ProductAttributeAvgAggregateOutputType | null
    _sum: ProductAttributeSumAggregateOutputType | null
    _min: ProductAttributeMinAggregateOutputType | null
    _max: ProductAttributeMaxAggregateOutputType | null
  }

  export type ProductAttributeAvgAggregateOutputType = {
    valueInt: number | null
  }

  export type ProductAttributeSumAggregateOutputType = {
    valueInt: number | null
  }

  export type ProductAttributeMinAggregateOutputType = {
    id: string | null
    productId: string | null
    key: string | null
    valueType: $Enums.AttributeValueType | null
    valueString: string | null
    valueInt: number | null
    valueBool: boolean | null
    deletedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ProductAttributeMaxAggregateOutputType = {
    id: string | null
    productId: string | null
    key: string | null
    valueType: $Enums.AttributeValueType | null
    valueString: string | null
    valueInt: number | null
    valueBool: boolean | null
    deletedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ProductAttributeCountAggregateOutputType = {
    id: number
    productId: number
    key: number
    valueType: number
    valueString: number
    valueInt: number
    valueBool: number
    deletedAt: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ProductAttributeAvgAggregateInputType = {
    valueInt?: true
  }

  export type ProductAttributeSumAggregateInputType = {
    valueInt?: true
  }

  export type ProductAttributeMinAggregateInputType = {
    id?: true
    productId?: true
    key?: true
    valueType?: true
    valueString?: true
    valueInt?: true
    valueBool?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ProductAttributeMaxAggregateInputType = {
    id?: true
    productId?: true
    key?: true
    valueType?: true
    valueString?: true
    valueInt?: true
    valueBool?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ProductAttributeCountAggregateInputType = {
    id?: true
    productId?: true
    key?: true
    valueType?: true
    valueString?: true
    valueInt?: true
    valueBool?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ProductAttributeAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ProductAttribute to aggregate.
     */
    where?: ProductAttributeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProductAttributes to fetch.
     */
    orderBy?: ProductAttributeOrderByWithRelationInput | ProductAttributeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ProductAttributeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProductAttributes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProductAttributes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ProductAttributes
    **/
    _count?: true | ProductAttributeCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ProductAttributeAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ProductAttributeSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ProductAttributeMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ProductAttributeMaxAggregateInputType
  }

  export type GetProductAttributeAggregateType<T extends ProductAttributeAggregateArgs> = {
        [P in keyof T & keyof AggregateProductAttribute]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateProductAttribute[P]>
      : GetScalarType<T[P], AggregateProductAttribute[P]>
  }




  export type ProductAttributeGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProductAttributeWhereInput
    orderBy?: ProductAttributeOrderByWithAggregationInput | ProductAttributeOrderByWithAggregationInput[]
    by: ProductAttributeScalarFieldEnum[] | ProductAttributeScalarFieldEnum
    having?: ProductAttributeScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ProductAttributeCountAggregateInputType | true
    _avg?: ProductAttributeAvgAggregateInputType
    _sum?: ProductAttributeSumAggregateInputType
    _min?: ProductAttributeMinAggregateInputType
    _max?: ProductAttributeMaxAggregateInputType
  }

  export type ProductAttributeGroupByOutputType = {
    id: string
    productId: string
    key: string
    valueType: $Enums.AttributeValueType
    valueString: string | null
    valueInt: number | null
    valueBool: boolean | null
    deletedAt: Date | null
    createdAt: Date
    updatedAt: Date
    _count: ProductAttributeCountAggregateOutputType | null
    _avg: ProductAttributeAvgAggregateOutputType | null
    _sum: ProductAttributeSumAggregateOutputType | null
    _min: ProductAttributeMinAggregateOutputType | null
    _max: ProductAttributeMaxAggregateOutputType | null
  }

  type GetProductAttributeGroupByPayload<T extends ProductAttributeGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ProductAttributeGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ProductAttributeGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ProductAttributeGroupByOutputType[P]>
            : GetScalarType<T[P], ProductAttributeGroupByOutputType[P]>
        }
      >
    >


  export type ProductAttributeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    productId?: boolean
    key?: boolean
    valueType?: boolean
    valueString?: boolean
    valueInt?: boolean
    valueBool?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    product?: boolean | ProductDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["productAttribute"]>

  export type ProductAttributeSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    productId?: boolean
    key?: boolean
    valueType?: boolean
    valueString?: boolean
    valueInt?: boolean
    valueBool?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    product?: boolean | ProductDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["productAttribute"]>

  export type ProductAttributeSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    productId?: boolean
    key?: boolean
    valueType?: boolean
    valueString?: boolean
    valueInt?: boolean
    valueBool?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    product?: boolean | ProductDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["productAttribute"]>

  export type ProductAttributeSelectScalar = {
    id?: boolean
    productId?: boolean
    key?: boolean
    valueType?: boolean
    valueString?: boolean
    valueInt?: boolean
    valueBool?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type ProductAttributeOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "productId" | "key" | "valueType" | "valueString" | "valueInt" | "valueBool" | "deletedAt" | "createdAt" | "updatedAt", ExtArgs["result"]["productAttribute"]>
  export type ProductAttributeInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    product?: boolean | ProductDefaultArgs<ExtArgs>
  }
  export type ProductAttributeIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    product?: boolean | ProductDefaultArgs<ExtArgs>
  }
  export type ProductAttributeIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    product?: boolean | ProductDefaultArgs<ExtArgs>
  }

  export type $ProductAttributePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ProductAttribute"
    objects: {
      product: Prisma.$ProductPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      productId: string
      key: string
      valueType: $Enums.AttributeValueType
      valueString: string | null
      valueInt: number | null
      valueBool: boolean | null
      deletedAt: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["productAttribute"]>
    composites: {}
  }

  type ProductAttributeGetPayload<S extends boolean | null | undefined | ProductAttributeDefaultArgs> = $Result.GetResult<Prisma.$ProductAttributePayload, S>

  type ProductAttributeCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ProductAttributeFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ProductAttributeCountAggregateInputType | true
    }

  export interface ProductAttributeDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ProductAttribute'], meta: { name: 'ProductAttribute' } }
    /**
     * Find zero or one ProductAttribute that matches the filter.
     * @param {ProductAttributeFindUniqueArgs} args - Arguments to find a ProductAttribute
     * @example
     * // Get one ProductAttribute
     * const productAttribute = await prisma.productAttribute.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ProductAttributeFindUniqueArgs>(args: SelectSubset<T, ProductAttributeFindUniqueArgs<ExtArgs>>): Prisma__ProductAttributeClient<$Result.GetResult<Prisma.$ProductAttributePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ProductAttribute that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ProductAttributeFindUniqueOrThrowArgs} args - Arguments to find a ProductAttribute
     * @example
     * // Get one ProductAttribute
     * const productAttribute = await prisma.productAttribute.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ProductAttributeFindUniqueOrThrowArgs>(args: SelectSubset<T, ProductAttributeFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ProductAttributeClient<$Result.GetResult<Prisma.$ProductAttributePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ProductAttribute that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductAttributeFindFirstArgs} args - Arguments to find a ProductAttribute
     * @example
     * // Get one ProductAttribute
     * const productAttribute = await prisma.productAttribute.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ProductAttributeFindFirstArgs>(args?: SelectSubset<T, ProductAttributeFindFirstArgs<ExtArgs>>): Prisma__ProductAttributeClient<$Result.GetResult<Prisma.$ProductAttributePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ProductAttribute that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductAttributeFindFirstOrThrowArgs} args - Arguments to find a ProductAttribute
     * @example
     * // Get one ProductAttribute
     * const productAttribute = await prisma.productAttribute.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ProductAttributeFindFirstOrThrowArgs>(args?: SelectSubset<T, ProductAttributeFindFirstOrThrowArgs<ExtArgs>>): Prisma__ProductAttributeClient<$Result.GetResult<Prisma.$ProductAttributePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ProductAttributes that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductAttributeFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ProductAttributes
     * const productAttributes = await prisma.productAttribute.findMany()
     * 
     * // Get first 10 ProductAttributes
     * const productAttributes = await prisma.productAttribute.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const productAttributeWithIdOnly = await prisma.productAttribute.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ProductAttributeFindManyArgs>(args?: SelectSubset<T, ProductAttributeFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProductAttributePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ProductAttribute.
     * @param {ProductAttributeCreateArgs} args - Arguments to create a ProductAttribute.
     * @example
     * // Create one ProductAttribute
     * const ProductAttribute = await prisma.productAttribute.create({
     *   data: {
     *     // ... data to create a ProductAttribute
     *   }
     * })
     * 
     */
    create<T extends ProductAttributeCreateArgs>(args: SelectSubset<T, ProductAttributeCreateArgs<ExtArgs>>): Prisma__ProductAttributeClient<$Result.GetResult<Prisma.$ProductAttributePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ProductAttributes.
     * @param {ProductAttributeCreateManyArgs} args - Arguments to create many ProductAttributes.
     * @example
     * // Create many ProductAttributes
     * const productAttribute = await prisma.productAttribute.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ProductAttributeCreateManyArgs>(args?: SelectSubset<T, ProductAttributeCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ProductAttributes and returns the data saved in the database.
     * @param {ProductAttributeCreateManyAndReturnArgs} args - Arguments to create many ProductAttributes.
     * @example
     * // Create many ProductAttributes
     * const productAttribute = await prisma.productAttribute.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ProductAttributes and only return the `id`
     * const productAttributeWithIdOnly = await prisma.productAttribute.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ProductAttributeCreateManyAndReturnArgs>(args?: SelectSubset<T, ProductAttributeCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProductAttributePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ProductAttribute.
     * @param {ProductAttributeDeleteArgs} args - Arguments to delete one ProductAttribute.
     * @example
     * // Delete one ProductAttribute
     * const ProductAttribute = await prisma.productAttribute.delete({
     *   where: {
     *     // ... filter to delete one ProductAttribute
     *   }
     * })
     * 
     */
    delete<T extends ProductAttributeDeleteArgs>(args: SelectSubset<T, ProductAttributeDeleteArgs<ExtArgs>>): Prisma__ProductAttributeClient<$Result.GetResult<Prisma.$ProductAttributePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ProductAttribute.
     * @param {ProductAttributeUpdateArgs} args - Arguments to update one ProductAttribute.
     * @example
     * // Update one ProductAttribute
     * const productAttribute = await prisma.productAttribute.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ProductAttributeUpdateArgs>(args: SelectSubset<T, ProductAttributeUpdateArgs<ExtArgs>>): Prisma__ProductAttributeClient<$Result.GetResult<Prisma.$ProductAttributePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ProductAttributes.
     * @param {ProductAttributeDeleteManyArgs} args - Arguments to filter ProductAttributes to delete.
     * @example
     * // Delete a few ProductAttributes
     * const { count } = await prisma.productAttribute.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ProductAttributeDeleteManyArgs>(args?: SelectSubset<T, ProductAttributeDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ProductAttributes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductAttributeUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ProductAttributes
     * const productAttribute = await prisma.productAttribute.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ProductAttributeUpdateManyArgs>(args: SelectSubset<T, ProductAttributeUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ProductAttributes and returns the data updated in the database.
     * @param {ProductAttributeUpdateManyAndReturnArgs} args - Arguments to update many ProductAttributes.
     * @example
     * // Update many ProductAttributes
     * const productAttribute = await prisma.productAttribute.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ProductAttributes and only return the `id`
     * const productAttributeWithIdOnly = await prisma.productAttribute.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ProductAttributeUpdateManyAndReturnArgs>(args: SelectSubset<T, ProductAttributeUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProductAttributePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ProductAttribute.
     * @param {ProductAttributeUpsertArgs} args - Arguments to update or create a ProductAttribute.
     * @example
     * // Update or create a ProductAttribute
     * const productAttribute = await prisma.productAttribute.upsert({
     *   create: {
     *     // ... data to create a ProductAttribute
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ProductAttribute we want to update
     *   }
     * })
     */
    upsert<T extends ProductAttributeUpsertArgs>(args: SelectSubset<T, ProductAttributeUpsertArgs<ExtArgs>>): Prisma__ProductAttributeClient<$Result.GetResult<Prisma.$ProductAttributePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ProductAttributes.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductAttributeCountArgs} args - Arguments to filter ProductAttributes to count.
     * @example
     * // Count the number of ProductAttributes
     * const count = await prisma.productAttribute.count({
     *   where: {
     *     // ... the filter for the ProductAttributes we want to count
     *   }
     * })
    **/
    count<T extends ProductAttributeCountArgs>(
      args?: Subset<T, ProductAttributeCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ProductAttributeCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ProductAttribute.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductAttributeAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ProductAttributeAggregateArgs>(args: Subset<T, ProductAttributeAggregateArgs>): Prisma.PrismaPromise<GetProductAttributeAggregateType<T>>

    /**
     * Group by ProductAttribute.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductAttributeGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ProductAttributeGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ProductAttributeGroupByArgs['orderBy'] }
        : { orderBy?: ProductAttributeGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ProductAttributeGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetProductAttributeGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ProductAttribute model
   */
  readonly fields: ProductAttributeFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ProductAttribute.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ProductAttributeClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    product<T extends ProductDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ProductDefaultArgs<ExtArgs>>): Prisma__ProductClient<$Result.GetResult<Prisma.$ProductPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ProductAttribute model
   */
  interface ProductAttributeFieldRefs {
    readonly id: FieldRef<"ProductAttribute", 'String'>
    readonly productId: FieldRef<"ProductAttribute", 'String'>
    readonly key: FieldRef<"ProductAttribute", 'String'>
    readonly valueType: FieldRef<"ProductAttribute", 'AttributeValueType'>
    readonly valueString: FieldRef<"ProductAttribute", 'String'>
    readonly valueInt: FieldRef<"ProductAttribute", 'Int'>
    readonly valueBool: FieldRef<"ProductAttribute", 'Boolean'>
    readonly deletedAt: FieldRef<"ProductAttribute", 'DateTime'>
    readonly createdAt: FieldRef<"ProductAttribute", 'DateTime'>
    readonly updatedAt: FieldRef<"ProductAttribute", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ProductAttribute findUnique
   */
  export type ProductAttributeFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductAttribute
     */
    select?: ProductAttributeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductAttribute
     */
    omit?: ProductAttributeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductAttributeInclude<ExtArgs> | null
    /**
     * Filter, which ProductAttribute to fetch.
     */
    where: ProductAttributeWhereUniqueInput
  }

  /**
   * ProductAttribute findUniqueOrThrow
   */
  export type ProductAttributeFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductAttribute
     */
    select?: ProductAttributeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductAttribute
     */
    omit?: ProductAttributeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductAttributeInclude<ExtArgs> | null
    /**
     * Filter, which ProductAttribute to fetch.
     */
    where: ProductAttributeWhereUniqueInput
  }

  /**
   * ProductAttribute findFirst
   */
  export type ProductAttributeFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductAttribute
     */
    select?: ProductAttributeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductAttribute
     */
    omit?: ProductAttributeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductAttributeInclude<ExtArgs> | null
    /**
     * Filter, which ProductAttribute to fetch.
     */
    where?: ProductAttributeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProductAttributes to fetch.
     */
    orderBy?: ProductAttributeOrderByWithRelationInput | ProductAttributeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ProductAttributes.
     */
    cursor?: ProductAttributeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProductAttributes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProductAttributes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ProductAttributes.
     */
    distinct?: ProductAttributeScalarFieldEnum | ProductAttributeScalarFieldEnum[]
  }

  /**
   * ProductAttribute findFirstOrThrow
   */
  export type ProductAttributeFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductAttribute
     */
    select?: ProductAttributeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductAttribute
     */
    omit?: ProductAttributeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductAttributeInclude<ExtArgs> | null
    /**
     * Filter, which ProductAttribute to fetch.
     */
    where?: ProductAttributeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProductAttributes to fetch.
     */
    orderBy?: ProductAttributeOrderByWithRelationInput | ProductAttributeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ProductAttributes.
     */
    cursor?: ProductAttributeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProductAttributes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProductAttributes.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ProductAttributes.
     */
    distinct?: ProductAttributeScalarFieldEnum | ProductAttributeScalarFieldEnum[]
  }

  /**
   * ProductAttribute findMany
   */
  export type ProductAttributeFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductAttribute
     */
    select?: ProductAttributeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductAttribute
     */
    omit?: ProductAttributeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductAttributeInclude<ExtArgs> | null
    /**
     * Filter, which ProductAttributes to fetch.
     */
    where?: ProductAttributeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProductAttributes to fetch.
     */
    orderBy?: ProductAttributeOrderByWithRelationInput | ProductAttributeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ProductAttributes.
     */
    cursor?: ProductAttributeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProductAttributes from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProductAttributes.
     */
    skip?: number
    distinct?: ProductAttributeScalarFieldEnum | ProductAttributeScalarFieldEnum[]
  }

  /**
   * ProductAttribute create
   */
  export type ProductAttributeCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductAttribute
     */
    select?: ProductAttributeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductAttribute
     */
    omit?: ProductAttributeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductAttributeInclude<ExtArgs> | null
    /**
     * The data needed to create a ProductAttribute.
     */
    data: XOR<ProductAttributeCreateInput, ProductAttributeUncheckedCreateInput>
  }

  /**
   * ProductAttribute createMany
   */
  export type ProductAttributeCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ProductAttributes.
     */
    data: ProductAttributeCreateManyInput | ProductAttributeCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ProductAttribute createManyAndReturn
   */
  export type ProductAttributeCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductAttribute
     */
    select?: ProductAttributeSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ProductAttribute
     */
    omit?: ProductAttributeOmit<ExtArgs> | null
    /**
     * The data used to create many ProductAttributes.
     */
    data: ProductAttributeCreateManyInput | ProductAttributeCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductAttributeIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ProductAttribute update
   */
  export type ProductAttributeUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductAttribute
     */
    select?: ProductAttributeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductAttribute
     */
    omit?: ProductAttributeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductAttributeInclude<ExtArgs> | null
    /**
     * The data needed to update a ProductAttribute.
     */
    data: XOR<ProductAttributeUpdateInput, ProductAttributeUncheckedUpdateInput>
    /**
     * Choose, which ProductAttribute to update.
     */
    where: ProductAttributeWhereUniqueInput
  }

  /**
   * ProductAttribute updateMany
   */
  export type ProductAttributeUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ProductAttributes.
     */
    data: XOR<ProductAttributeUpdateManyMutationInput, ProductAttributeUncheckedUpdateManyInput>
    /**
     * Filter which ProductAttributes to update
     */
    where?: ProductAttributeWhereInput
    /**
     * Limit how many ProductAttributes to update.
     */
    limit?: number
  }

  /**
   * ProductAttribute updateManyAndReturn
   */
  export type ProductAttributeUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductAttribute
     */
    select?: ProductAttributeSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ProductAttribute
     */
    omit?: ProductAttributeOmit<ExtArgs> | null
    /**
     * The data used to update ProductAttributes.
     */
    data: XOR<ProductAttributeUpdateManyMutationInput, ProductAttributeUncheckedUpdateManyInput>
    /**
     * Filter which ProductAttributes to update
     */
    where?: ProductAttributeWhereInput
    /**
     * Limit how many ProductAttributes to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductAttributeIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * ProductAttribute upsert
   */
  export type ProductAttributeUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductAttribute
     */
    select?: ProductAttributeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductAttribute
     */
    omit?: ProductAttributeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductAttributeInclude<ExtArgs> | null
    /**
     * The filter to search for the ProductAttribute to update in case it exists.
     */
    where: ProductAttributeWhereUniqueInput
    /**
     * In case the ProductAttribute found by the `where` argument doesn't exist, create a new ProductAttribute with this data.
     */
    create: XOR<ProductAttributeCreateInput, ProductAttributeUncheckedCreateInput>
    /**
     * In case the ProductAttribute was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ProductAttributeUpdateInput, ProductAttributeUncheckedUpdateInput>
  }

  /**
   * ProductAttribute delete
   */
  export type ProductAttributeDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductAttribute
     */
    select?: ProductAttributeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductAttribute
     */
    omit?: ProductAttributeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductAttributeInclude<ExtArgs> | null
    /**
     * Filter which ProductAttribute to delete.
     */
    where: ProductAttributeWhereUniqueInput
  }

  /**
   * ProductAttribute deleteMany
   */
  export type ProductAttributeDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ProductAttributes to delete
     */
    where?: ProductAttributeWhereInput
    /**
     * Limit how many ProductAttributes to delete.
     */
    limit?: number
  }

  /**
   * ProductAttribute without action
   */
  export type ProductAttributeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductAttribute
     */
    select?: ProductAttributeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductAttribute
     */
    omit?: ProductAttributeOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductAttributeInclude<ExtArgs> | null
  }


  /**
   * Model ProductComment
   */

  export type AggregateProductComment = {
    _count: ProductCommentCountAggregateOutputType | null
    _avg: ProductCommentAvgAggregateOutputType | null
    _sum: ProductCommentSumAggregateOutputType | null
    _min: ProductCommentMinAggregateOutputType | null
    _max: ProductCommentMaxAggregateOutputType | null
  }

  export type ProductCommentAvgAggregateOutputType = {
    rating: number | null
  }

  export type ProductCommentSumAggregateOutputType = {
    rating: number | null
  }

  export type ProductCommentMinAggregateOutputType = {
    id: string | null
    productId: string | null
    userId: string | null
    authorName: string | null
    authorEmail: string | null
    rating: number | null
    body: string | null
    status: $Enums.CommentStatus | null
    parentId: string | null
    deletedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ProductCommentMaxAggregateOutputType = {
    id: string | null
    productId: string | null
    userId: string | null
    authorName: string | null
    authorEmail: string | null
    rating: number | null
    body: string | null
    status: $Enums.CommentStatus | null
    parentId: string | null
    deletedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ProductCommentCountAggregateOutputType = {
    id: number
    productId: number
    userId: number
    authorName: number
    authorEmail: number
    rating: number
    body: number
    status: number
    parentId: number
    deletedAt: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ProductCommentAvgAggregateInputType = {
    rating?: true
  }

  export type ProductCommentSumAggregateInputType = {
    rating?: true
  }

  export type ProductCommentMinAggregateInputType = {
    id?: true
    productId?: true
    userId?: true
    authorName?: true
    authorEmail?: true
    rating?: true
    body?: true
    status?: true
    parentId?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ProductCommentMaxAggregateInputType = {
    id?: true
    productId?: true
    userId?: true
    authorName?: true
    authorEmail?: true
    rating?: true
    body?: true
    status?: true
    parentId?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ProductCommentCountAggregateInputType = {
    id?: true
    productId?: true
    userId?: true
    authorName?: true
    authorEmail?: true
    rating?: true
    body?: true
    status?: true
    parentId?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ProductCommentAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ProductComment to aggregate.
     */
    where?: ProductCommentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProductComments to fetch.
     */
    orderBy?: ProductCommentOrderByWithRelationInput | ProductCommentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ProductCommentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProductComments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProductComments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ProductComments
    **/
    _count?: true | ProductCommentCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ProductCommentAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ProductCommentSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ProductCommentMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ProductCommentMaxAggregateInputType
  }

  export type GetProductCommentAggregateType<T extends ProductCommentAggregateArgs> = {
        [P in keyof T & keyof AggregateProductComment]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateProductComment[P]>
      : GetScalarType<T[P], AggregateProductComment[P]>
  }




  export type ProductCommentGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProductCommentWhereInput
    orderBy?: ProductCommentOrderByWithAggregationInput | ProductCommentOrderByWithAggregationInput[]
    by: ProductCommentScalarFieldEnum[] | ProductCommentScalarFieldEnum
    having?: ProductCommentScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ProductCommentCountAggregateInputType | true
    _avg?: ProductCommentAvgAggregateInputType
    _sum?: ProductCommentSumAggregateInputType
    _min?: ProductCommentMinAggregateInputType
    _max?: ProductCommentMaxAggregateInputType
  }

  export type ProductCommentGroupByOutputType = {
    id: string
    productId: string
    userId: string | null
    authorName: string | null
    authorEmail: string | null
    rating: number | null
    body: string
    status: $Enums.CommentStatus
    parentId: string | null
    deletedAt: Date | null
    createdAt: Date
    updatedAt: Date
    _count: ProductCommentCountAggregateOutputType | null
    _avg: ProductCommentAvgAggregateOutputType | null
    _sum: ProductCommentSumAggregateOutputType | null
    _min: ProductCommentMinAggregateOutputType | null
    _max: ProductCommentMaxAggregateOutputType | null
  }

  type GetProductCommentGroupByPayload<T extends ProductCommentGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ProductCommentGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ProductCommentGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ProductCommentGroupByOutputType[P]>
            : GetScalarType<T[P], ProductCommentGroupByOutputType[P]>
        }
      >
    >


  export type ProductCommentSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    productId?: boolean
    userId?: boolean
    authorName?: boolean
    authorEmail?: boolean
    rating?: boolean
    body?: boolean
    status?: boolean
    parentId?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    product?: boolean | ProductDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["productComment"]>

  export type ProductCommentSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    productId?: boolean
    userId?: boolean
    authorName?: boolean
    authorEmail?: boolean
    rating?: boolean
    body?: boolean
    status?: boolean
    parentId?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    product?: boolean | ProductDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["productComment"]>

  export type ProductCommentSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    productId?: boolean
    userId?: boolean
    authorName?: boolean
    authorEmail?: boolean
    rating?: boolean
    body?: boolean
    status?: boolean
    parentId?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    product?: boolean | ProductDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["productComment"]>

  export type ProductCommentSelectScalar = {
    id?: boolean
    productId?: boolean
    userId?: boolean
    authorName?: boolean
    authorEmail?: boolean
    rating?: boolean
    body?: boolean
    status?: boolean
    parentId?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type ProductCommentOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "productId" | "userId" | "authorName" | "authorEmail" | "rating" | "body" | "status" | "parentId" | "deletedAt" | "createdAt" | "updatedAt", ExtArgs["result"]["productComment"]>
  export type ProductCommentInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    product?: boolean | ProductDefaultArgs<ExtArgs>
  }
  export type ProductCommentIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    product?: boolean | ProductDefaultArgs<ExtArgs>
  }
  export type ProductCommentIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    product?: boolean | ProductDefaultArgs<ExtArgs>
  }

  export type $ProductCommentPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ProductComment"
    objects: {
      product: Prisma.$ProductPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      productId: string
      userId: string | null
      authorName: string | null
      authorEmail: string | null
      rating: number | null
      body: string
      status: $Enums.CommentStatus
      parentId: string | null
      deletedAt: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["productComment"]>
    composites: {}
  }

  type ProductCommentGetPayload<S extends boolean | null | undefined | ProductCommentDefaultArgs> = $Result.GetResult<Prisma.$ProductCommentPayload, S>

  type ProductCommentCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ProductCommentFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ProductCommentCountAggregateInputType | true
    }

  export interface ProductCommentDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ProductComment'], meta: { name: 'ProductComment' } }
    /**
     * Find zero or one ProductComment that matches the filter.
     * @param {ProductCommentFindUniqueArgs} args - Arguments to find a ProductComment
     * @example
     * // Get one ProductComment
     * const productComment = await prisma.productComment.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ProductCommentFindUniqueArgs>(args: SelectSubset<T, ProductCommentFindUniqueArgs<ExtArgs>>): Prisma__ProductCommentClient<$Result.GetResult<Prisma.$ProductCommentPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ProductComment that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ProductCommentFindUniqueOrThrowArgs} args - Arguments to find a ProductComment
     * @example
     * // Get one ProductComment
     * const productComment = await prisma.productComment.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ProductCommentFindUniqueOrThrowArgs>(args: SelectSubset<T, ProductCommentFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ProductCommentClient<$Result.GetResult<Prisma.$ProductCommentPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ProductComment that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductCommentFindFirstArgs} args - Arguments to find a ProductComment
     * @example
     * // Get one ProductComment
     * const productComment = await prisma.productComment.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ProductCommentFindFirstArgs>(args?: SelectSubset<T, ProductCommentFindFirstArgs<ExtArgs>>): Prisma__ProductCommentClient<$Result.GetResult<Prisma.$ProductCommentPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ProductComment that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductCommentFindFirstOrThrowArgs} args - Arguments to find a ProductComment
     * @example
     * // Get one ProductComment
     * const productComment = await prisma.productComment.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ProductCommentFindFirstOrThrowArgs>(args?: SelectSubset<T, ProductCommentFindFirstOrThrowArgs<ExtArgs>>): Prisma__ProductCommentClient<$Result.GetResult<Prisma.$ProductCommentPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ProductComments that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductCommentFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ProductComments
     * const productComments = await prisma.productComment.findMany()
     * 
     * // Get first 10 ProductComments
     * const productComments = await prisma.productComment.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const productCommentWithIdOnly = await prisma.productComment.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ProductCommentFindManyArgs>(args?: SelectSubset<T, ProductCommentFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProductCommentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ProductComment.
     * @param {ProductCommentCreateArgs} args - Arguments to create a ProductComment.
     * @example
     * // Create one ProductComment
     * const ProductComment = await prisma.productComment.create({
     *   data: {
     *     // ... data to create a ProductComment
     *   }
     * })
     * 
     */
    create<T extends ProductCommentCreateArgs>(args: SelectSubset<T, ProductCommentCreateArgs<ExtArgs>>): Prisma__ProductCommentClient<$Result.GetResult<Prisma.$ProductCommentPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ProductComments.
     * @param {ProductCommentCreateManyArgs} args - Arguments to create many ProductComments.
     * @example
     * // Create many ProductComments
     * const productComment = await prisma.productComment.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ProductCommentCreateManyArgs>(args?: SelectSubset<T, ProductCommentCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ProductComments and returns the data saved in the database.
     * @param {ProductCommentCreateManyAndReturnArgs} args - Arguments to create many ProductComments.
     * @example
     * // Create many ProductComments
     * const productComment = await prisma.productComment.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ProductComments and only return the `id`
     * const productCommentWithIdOnly = await prisma.productComment.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ProductCommentCreateManyAndReturnArgs>(args?: SelectSubset<T, ProductCommentCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProductCommentPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ProductComment.
     * @param {ProductCommentDeleteArgs} args - Arguments to delete one ProductComment.
     * @example
     * // Delete one ProductComment
     * const ProductComment = await prisma.productComment.delete({
     *   where: {
     *     // ... filter to delete one ProductComment
     *   }
     * })
     * 
     */
    delete<T extends ProductCommentDeleteArgs>(args: SelectSubset<T, ProductCommentDeleteArgs<ExtArgs>>): Prisma__ProductCommentClient<$Result.GetResult<Prisma.$ProductCommentPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ProductComment.
     * @param {ProductCommentUpdateArgs} args - Arguments to update one ProductComment.
     * @example
     * // Update one ProductComment
     * const productComment = await prisma.productComment.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ProductCommentUpdateArgs>(args: SelectSubset<T, ProductCommentUpdateArgs<ExtArgs>>): Prisma__ProductCommentClient<$Result.GetResult<Prisma.$ProductCommentPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ProductComments.
     * @param {ProductCommentDeleteManyArgs} args - Arguments to filter ProductComments to delete.
     * @example
     * // Delete a few ProductComments
     * const { count } = await prisma.productComment.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ProductCommentDeleteManyArgs>(args?: SelectSubset<T, ProductCommentDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ProductComments.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductCommentUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ProductComments
     * const productComment = await prisma.productComment.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ProductCommentUpdateManyArgs>(args: SelectSubset<T, ProductCommentUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ProductComments and returns the data updated in the database.
     * @param {ProductCommentUpdateManyAndReturnArgs} args - Arguments to update many ProductComments.
     * @example
     * // Update many ProductComments
     * const productComment = await prisma.productComment.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ProductComments and only return the `id`
     * const productCommentWithIdOnly = await prisma.productComment.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ProductCommentUpdateManyAndReturnArgs>(args: SelectSubset<T, ProductCommentUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProductCommentPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ProductComment.
     * @param {ProductCommentUpsertArgs} args - Arguments to update or create a ProductComment.
     * @example
     * // Update or create a ProductComment
     * const productComment = await prisma.productComment.upsert({
     *   create: {
     *     // ... data to create a ProductComment
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ProductComment we want to update
     *   }
     * })
     */
    upsert<T extends ProductCommentUpsertArgs>(args: SelectSubset<T, ProductCommentUpsertArgs<ExtArgs>>): Prisma__ProductCommentClient<$Result.GetResult<Prisma.$ProductCommentPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ProductComments.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductCommentCountArgs} args - Arguments to filter ProductComments to count.
     * @example
     * // Count the number of ProductComments
     * const count = await prisma.productComment.count({
     *   where: {
     *     // ... the filter for the ProductComments we want to count
     *   }
     * })
    **/
    count<T extends ProductCommentCountArgs>(
      args?: Subset<T, ProductCommentCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ProductCommentCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ProductComment.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductCommentAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ProductCommentAggregateArgs>(args: Subset<T, ProductCommentAggregateArgs>): Prisma.PrismaPromise<GetProductCommentAggregateType<T>>

    /**
     * Group by ProductComment.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductCommentGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ProductCommentGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ProductCommentGroupByArgs['orderBy'] }
        : { orderBy?: ProductCommentGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ProductCommentGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetProductCommentGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ProductComment model
   */
  readonly fields: ProductCommentFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ProductComment.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ProductCommentClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    product<T extends ProductDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ProductDefaultArgs<ExtArgs>>): Prisma__ProductClient<$Result.GetResult<Prisma.$ProductPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ProductComment model
   */
  interface ProductCommentFieldRefs {
    readonly id: FieldRef<"ProductComment", 'String'>
    readonly productId: FieldRef<"ProductComment", 'String'>
    readonly userId: FieldRef<"ProductComment", 'String'>
    readonly authorName: FieldRef<"ProductComment", 'String'>
    readonly authorEmail: FieldRef<"ProductComment", 'String'>
    readonly rating: FieldRef<"ProductComment", 'Int'>
    readonly body: FieldRef<"ProductComment", 'String'>
    readonly status: FieldRef<"ProductComment", 'CommentStatus'>
    readonly parentId: FieldRef<"ProductComment", 'String'>
    readonly deletedAt: FieldRef<"ProductComment", 'DateTime'>
    readonly createdAt: FieldRef<"ProductComment", 'DateTime'>
    readonly updatedAt: FieldRef<"ProductComment", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ProductComment findUnique
   */
  export type ProductCommentFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductComment
     */
    select?: ProductCommentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductComment
     */
    omit?: ProductCommentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductCommentInclude<ExtArgs> | null
    /**
     * Filter, which ProductComment to fetch.
     */
    where: ProductCommentWhereUniqueInput
  }

  /**
   * ProductComment findUniqueOrThrow
   */
  export type ProductCommentFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductComment
     */
    select?: ProductCommentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductComment
     */
    omit?: ProductCommentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductCommentInclude<ExtArgs> | null
    /**
     * Filter, which ProductComment to fetch.
     */
    where: ProductCommentWhereUniqueInput
  }

  /**
   * ProductComment findFirst
   */
  export type ProductCommentFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductComment
     */
    select?: ProductCommentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductComment
     */
    omit?: ProductCommentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductCommentInclude<ExtArgs> | null
    /**
     * Filter, which ProductComment to fetch.
     */
    where?: ProductCommentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProductComments to fetch.
     */
    orderBy?: ProductCommentOrderByWithRelationInput | ProductCommentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ProductComments.
     */
    cursor?: ProductCommentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProductComments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProductComments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ProductComments.
     */
    distinct?: ProductCommentScalarFieldEnum | ProductCommentScalarFieldEnum[]
  }

  /**
   * ProductComment findFirstOrThrow
   */
  export type ProductCommentFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductComment
     */
    select?: ProductCommentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductComment
     */
    omit?: ProductCommentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductCommentInclude<ExtArgs> | null
    /**
     * Filter, which ProductComment to fetch.
     */
    where?: ProductCommentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProductComments to fetch.
     */
    orderBy?: ProductCommentOrderByWithRelationInput | ProductCommentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ProductComments.
     */
    cursor?: ProductCommentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProductComments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProductComments.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ProductComments.
     */
    distinct?: ProductCommentScalarFieldEnum | ProductCommentScalarFieldEnum[]
  }

  /**
   * ProductComment findMany
   */
  export type ProductCommentFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductComment
     */
    select?: ProductCommentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductComment
     */
    omit?: ProductCommentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductCommentInclude<ExtArgs> | null
    /**
     * Filter, which ProductComments to fetch.
     */
    where?: ProductCommentWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProductComments to fetch.
     */
    orderBy?: ProductCommentOrderByWithRelationInput | ProductCommentOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ProductComments.
     */
    cursor?: ProductCommentWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProductComments from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProductComments.
     */
    skip?: number
    distinct?: ProductCommentScalarFieldEnum | ProductCommentScalarFieldEnum[]
  }

  /**
   * ProductComment create
   */
  export type ProductCommentCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductComment
     */
    select?: ProductCommentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductComment
     */
    omit?: ProductCommentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductCommentInclude<ExtArgs> | null
    /**
     * The data needed to create a ProductComment.
     */
    data: XOR<ProductCommentCreateInput, ProductCommentUncheckedCreateInput>
  }

  /**
   * ProductComment createMany
   */
  export type ProductCommentCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ProductComments.
     */
    data: ProductCommentCreateManyInput | ProductCommentCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ProductComment createManyAndReturn
   */
  export type ProductCommentCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductComment
     */
    select?: ProductCommentSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ProductComment
     */
    omit?: ProductCommentOmit<ExtArgs> | null
    /**
     * The data used to create many ProductComments.
     */
    data: ProductCommentCreateManyInput | ProductCommentCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductCommentIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * ProductComment update
   */
  export type ProductCommentUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductComment
     */
    select?: ProductCommentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductComment
     */
    omit?: ProductCommentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductCommentInclude<ExtArgs> | null
    /**
     * The data needed to update a ProductComment.
     */
    data: XOR<ProductCommentUpdateInput, ProductCommentUncheckedUpdateInput>
    /**
     * Choose, which ProductComment to update.
     */
    where: ProductCommentWhereUniqueInput
  }

  /**
   * ProductComment updateMany
   */
  export type ProductCommentUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ProductComments.
     */
    data: XOR<ProductCommentUpdateManyMutationInput, ProductCommentUncheckedUpdateManyInput>
    /**
     * Filter which ProductComments to update
     */
    where?: ProductCommentWhereInput
    /**
     * Limit how many ProductComments to update.
     */
    limit?: number
  }

  /**
   * ProductComment updateManyAndReturn
   */
  export type ProductCommentUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductComment
     */
    select?: ProductCommentSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ProductComment
     */
    omit?: ProductCommentOmit<ExtArgs> | null
    /**
     * The data used to update ProductComments.
     */
    data: XOR<ProductCommentUpdateManyMutationInput, ProductCommentUncheckedUpdateManyInput>
    /**
     * Filter which ProductComments to update
     */
    where?: ProductCommentWhereInput
    /**
     * Limit how many ProductComments to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductCommentIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * ProductComment upsert
   */
  export type ProductCommentUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductComment
     */
    select?: ProductCommentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductComment
     */
    omit?: ProductCommentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductCommentInclude<ExtArgs> | null
    /**
     * The filter to search for the ProductComment to update in case it exists.
     */
    where: ProductCommentWhereUniqueInput
    /**
     * In case the ProductComment found by the `where` argument doesn't exist, create a new ProductComment with this data.
     */
    create: XOR<ProductCommentCreateInput, ProductCommentUncheckedCreateInput>
    /**
     * In case the ProductComment was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ProductCommentUpdateInput, ProductCommentUncheckedUpdateInput>
  }

  /**
   * ProductComment delete
   */
  export type ProductCommentDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductComment
     */
    select?: ProductCommentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductComment
     */
    omit?: ProductCommentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductCommentInclude<ExtArgs> | null
    /**
     * Filter which ProductComment to delete.
     */
    where: ProductCommentWhereUniqueInput
  }

  /**
   * ProductComment deleteMany
   */
  export type ProductCommentDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ProductComments to delete
     */
    where?: ProductCommentWhereInput
    /**
     * Limit how many ProductComments to delete.
     */
    limit?: number
  }

  /**
   * ProductComment without action
   */
  export type ProductCommentDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductComment
     */
    select?: ProductCommentSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductComment
     */
    omit?: ProductCommentOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProductCommentInclude<ExtArgs> | null
  }


  /**
   * Model ProductSet
   */

  export type AggregateProductSet = {
    _count: ProductSetCountAggregateOutputType | null
    _avg: ProductSetAvgAggregateOutputType | null
    _sum: ProductSetSumAggregateOutputType | null
    _min: ProductSetMinAggregateOutputType | null
    _max: ProductSetMaxAggregateOutputType | null
  }

  export type ProductSetAvgAggregateOutputType = {
    discountValue: Decimal | null
  }

  export type ProductSetSumAggregateOutputType = {
    discountValue: Decimal | null
  }

  export type ProductSetMinAggregateOutputType = {
    id: string | null
    slug: string | null
    title: string | null
    description: string | null
    active: boolean | null
    discountType: $Enums.DiscountType | null
    discountValue: Decimal | null
    deletedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ProductSetMaxAggregateOutputType = {
    id: string | null
    slug: string | null
    title: string | null
    description: string | null
    active: boolean | null
    discountType: $Enums.DiscountType | null
    discountValue: Decimal | null
    deletedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type ProductSetCountAggregateOutputType = {
    id: number
    slug: number
    title: number
    description: number
    active: number
    discountType: number
    discountValue: number
    productIds: number
    deletedAt: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type ProductSetAvgAggregateInputType = {
    discountValue?: true
  }

  export type ProductSetSumAggregateInputType = {
    discountValue?: true
  }

  export type ProductSetMinAggregateInputType = {
    id?: true
    slug?: true
    title?: true
    description?: true
    active?: true
    discountType?: true
    discountValue?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ProductSetMaxAggregateInputType = {
    id?: true
    slug?: true
    title?: true
    description?: true
    active?: true
    discountType?: true
    discountValue?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
  }

  export type ProductSetCountAggregateInputType = {
    id?: true
    slug?: true
    title?: true
    description?: true
    active?: true
    discountType?: true
    discountValue?: true
    productIds?: true
    deletedAt?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type ProductSetAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ProductSet to aggregate.
     */
    where?: ProductSetWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProductSets to fetch.
     */
    orderBy?: ProductSetOrderByWithRelationInput | ProductSetOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ProductSetWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProductSets from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProductSets.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ProductSets
    **/
    _count?: true | ProductSetCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ProductSetAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ProductSetSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ProductSetMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ProductSetMaxAggregateInputType
  }

  export type GetProductSetAggregateType<T extends ProductSetAggregateArgs> = {
        [P in keyof T & keyof AggregateProductSet]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateProductSet[P]>
      : GetScalarType<T[P], AggregateProductSet[P]>
  }




  export type ProductSetGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProductSetWhereInput
    orderBy?: ProductSetOrderByWithAggregationInput | ProductSetOrderByWithAggregationInput[]
    by: ProductSetScalarFieldEnum[] | ProductSetScalarFieldEnum
    having?: ProductSetScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ProductSetCountAggregateInputType | true
    _avg?: ProductSetAvgAggregateInputType
    _sum?: ProductSetSumAggregateInputType
    _min?: ProductSetMinAggregateInputType
    _max?: ProductSetMaxAggregateInputType
  }

  export type ProductSetGroupByOutputType = {
    id: string
    slug: string
    title: string
    description: string | null
    active: boolean
    discountType: $Enums.DiscountType | null
    discountValue: Decimal | null
    productIds: string[]
    deletedAt: Date | null
    createdAt: Date
    updatedAt: Date
    _count: ProductSetCountAggregateOutputType | null
    _avg: ProductSetAvgAggregateOutputType | null
    _sum: ProductSetSumAggregateOutputType | null
    _min: ProductSetMinAggregateOutputType | null
    _max: ProductSetMaxAggregateOutputType | null
  }

  type GetProductSetGroupByPayload<T extends ProductSetGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ProductSetGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ProductSetGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ProductSetGroupByOutputType[P]>
            : GetScalarType<T[P], ProductSetGroupByOutputType[P]>
        }
      >
    >


  export type ProductSetSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    slug?: boolean
    title?: boolean
    description?: boolean
    active?: boolean
    discountType?: boolean
    discountValue?: boolean
    productIds?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["productSet"]>

  export type ProductSetSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    slug?: boolean
    title?: boolean
    description?: boolean
    active?: boolean
    discountType?: boolean
    discountValue?: boolean
    productIds?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["productSet"]>

  export type ProductSetSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    slug?: boolean
    title?: boolean
    description?: boolean
    active?: boolean
    discountType?: boolean
    discountValue?: boolean
    productIds?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["productSet"]>

  export type ProductSetSelectScalar = {
    id?: boolean
    slug?: boolean
    title?: boolean
    description?: boolean
    active?: boolean
    discountType?: boolean
    discountValue?: boolean
    productIds?: boolean
    deletedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type ProductSetOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "slug" | "title" | "description" | "active" | "discountType" | "discountValue" | "productIds" | "deletedAt" | "createdAt" | "updatedAt", ExtArgs["result"]["productSet"]>

  export type $ProductSetPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ProductSet"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      slug: string
      title: string
      description: string | null
      active: boolean
      discountType: $Enums.DiscountType | null
      discountValue: Prisma.Decimal | null
      productIds: string[]
      deletedAt: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["productSet"]>
    composites: {}
  }

  type ProductSetGetPayload<S extends boolean | null | undefined | ProductSetDefaultArgs> = $Result.GetResult<Prisma.$ProductSetPayload, S>

  type ProductSetCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ProductSetFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ProductSetCountAggregateInputType | true
    }

  export interface ProductSetDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ProductSet'], meta: { name: 'ProductSet' } }
    /**
     * Find zero or one ProductSet that matches the filter.
     * @param {ProductSetFindUniqueArgs} args - Arguments to find a ProductSet
     * @example
     * // Get one ProductSet
     * const productSet = await prisma.productSet.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ProductSetFindUniqueArgs>(args: SelectSubset<T, ProductSetFindUniqueArgs<ExtArgs>>): Prisma__ProductSetClient<$Result.GetResult<Prisma.$ProductSetPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ProductSet that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ProductSetFindUniqueOrThrowArgs} args - Arguments to find a ProductSet
     * @example
     * // Get one ProductSet
     * const productSet = await prisma.productSet.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ProductSetFindUniqueOrThrowArgs>(args: SelectSubset<T, ProductSetFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ProductSetClient<$Result.GetResult<Prisma.$ProductSetPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ProductSet that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductSetFindFirstArgs} args - Arguments to find a ProductSet
     * @example
     * // Get one ProductSet
     * const productSet = await prisma.productSet.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ProductSetFindFirstArgs>(args?: SelectSubset<T, ProductSetFindFirstArgs<ExtArgs>>): Prisma__ProductSetClient<$Result.GetResult<Prisma.$ProductSetPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ProductSet that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductSetFindFirstOrThrowArgs} args - Arguments to find a ProductSet
     * @example
     * // Get one ProductSet
     * const productSet = await prisma.productSet.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ProductSetFindFirstOrThrowArgs>(args?: SelectSubset<T, ProductSetFindFirstOrThrowArgs<ExtArgs>>): Prisma__ProductSetClient<$Result.GetResult<Prisma.$ProductSetPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ProductSets that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductSetFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ProductSets
     * const productSets = await prisma.productSet.findMany()
     * 
     * // Get first 10 ProductSets
     * const productSets = await prisma.productSet.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const productSetWithIdOnly = await prisma.productSet.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ProductSetFindManyArgs>(args?: SelectSubset<T, ProductSetFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProductSetPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ProductSet.
     * @param {ProductSetCreateArgs} args - Arguments to create a ProductSet.
     * @example
     * // Create one ProductSet
     * const ProductSet = await prisma.productSet.create({
     *   data: {
     *     // ... data to create a ProductSet
     *   }
     * })
     * 
     */
    create<T extends ProductSetCreateArgs>(args: SelectSubset<T, ProductSetCreateArgs<ExtArgs>>): Prisma__ProductSetClient<$Result.GetResult<Prisma.$ProductSetPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ProductSets.
     * @param {ProductSetCreateManyArgs} args - Arguments to create many ProductSets.
     * @example
     * // Create many ProductSets
     * const productSet = await prisma.productSet.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ProductSetCreateManyArgs>(args?: SelectSubset<T, ProductSetCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many ProductSets and returns the data saved in the database.
     * @param {ProductSetCreateManyAndReturnArgs} args - Arguments to create many ProductSets.
     * @example
     * // Create many ProductSets
     * const productSet = await prisma.productSet.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many ProductSets and only return the `id`
     * const productSetWithIdOnly = await prisma.productSet.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ProductSetCreateManyAndReturnArgs>(args?: SelectSubset<T, ProductSetCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProductSetPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a ProductSet.
     * @param {ProductSetDeleteArgs} args - Arguments to delete one ProductSet.
     * @example
     * // Delete one ProductSet
     * const ProductSet = await prisma.productSet.delete({
     *   where: {
     *     // ... filter to delete one ProductSet
     *   }
     * })
     * 
     */
    delete<T extends ProductSetDeleteArgs>(args: SelectSubset<T, ProductSetDeleteArgs<ExtArgs>>): Prisma__ProductSetClient<$Result.GetResult<Prisma.$ProductSetPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ProductSet.
     * @param {ProductSetUpdateArgs} args - Arguments to update one ProductSet.
     * @example
     * // Update one ProductSet
     * const productSet = await prisma.productSet.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ProductSetUpdateArgs>(args: SelectSubset<T, ProductSetUpdateArgs<ExtArgs>>): Prisma__ProductSetClient<$Result.GetResult<Prisma.$ProductSetPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ProductSets.
     * @param {ProductSetDeleteManyArgs} args - Arguments to filter ProductSets to delete.
     * @example
     * // Delete a few ProductSets
     * const { count } = await prisma.productSet.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ProductSetDeleteManyArgs>(args?: SelectSubset<T, ProductSetDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ProductSets.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductSetUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ProductSets
     * const productSet = await prisma.productSet.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ProductSetUpdateManyArgs>(args: SelectSubset<T, ProductSetUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ProductSets and returns the data updated in the database.
     * @param {ProductSetUpdateManyAndReturnArgs} args - Arguments to update many ProductSets.
     * @example
     * // Update many ProductSets
     * const productSet = await prisma.productSet.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more ProductSets and only return the `id`
     * const productSetWithIdOnly = await prisma.productSet.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ProductSetUpdateManyAndReturnArgs>(args: SelectSubset<T, ProductSetUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProductSetPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one ProductSet.
     * @param {ProductSetUpsertArgs} args - Arguments to update or create a ProductSet.
     * @example
     * // Update or create a ProductSet
     * const productSet = await prisma.productSet.upsert({
     *   create: {
     *     // ... data to create a ProductSet
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ProductSet we want to update
     *   }
     * })
     */
    upsert<T extends ProductSetUpsertArgs>(args: SelectSubset<T, ProductSetUpsertArgs<ExtArgs>>): Prisma__ProductSetClient<$Result.GetResult<Prisma.$ProductSetPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ProductSets.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductSetCountArgs} args - Arguments to filter ProductSets to count.
     * @example
     * // Count the number of ProductSets
     * const count = await prisma.productSet.count({
     *   where: {
     *     // ... the filter for the ProductSets we want to count
     *   }
     * })
    **/
    count<T extends ProductSetCountArgs>(
      args?: Subset<T, ProductSetCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ProductSetCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ProductSet.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductSetAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ProductSetAggregateArgs>(args: Subset<T, ProductSetAggregateArgs>): Prisma.PrismaPromise<GetProductSetAggregateType<T>>

    /**
     * Group by ProductSet.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProductSetGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ProductSetGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ProductSetGroupByArgs['orderBy'] }
        : { orderBy?: ProductSetGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ProductSetGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetProductSetGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ProductSet model
   */
  readonly fields: ProductSetFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ProductSet.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ProductSetClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ProductSet model
   */
  interface ProductSetFieldRefs {
    readonly id: FieldRef<"ProductSet", 'String'>
    readonly slug: FieldRef<"ProductSet", 'String'>
    readonly title: FieldRef<"ProductSet", 'String'>
    readonly description: FieldRef<"ProductSet", 'String'>
    readonly active: FieldRef<"ProductSet", 'Boolean'>
    readonly discountType: FieldRef<"ProductSet", 'DiscountType'>
    readonly discountValue: FieldRef<"ProductSet", 'Decimal'>
    readonly productIds: FieldRef<"ProductSet", 'String[]'>
    readonly deletedAt: FieldRef<"ProductSet", 'DateTime'>
    readonly createdAt: FieldRef<"ProductSet", 'DateTime'>
    readonly updatedAt: FieldRef<"ProductSet", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ProductSet findUnique
   */
  export type ProductSetFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductSet
     */
    select?: ProductSetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductSet
     */
    omit?: ProductSetOmit<ExtArgs> | null
    /**
     * Filter, which ProductSet to fetch.
     */
    where: ProductSetWhereUniqueInput
  }

  /**
   * ProductSet findUniqueOrThrow
   */
  export type ProductSetFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductSet
     */
    select?: ProductSetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductSet
     */
    omit?: ProductSetOmit<ExtArgs> | null
    /**
     * Filter, which ProductSet to fetch.
     */
    where: ProductSetWhereUniqueInput
  }

  /**
   * ProductSet findFirst
   */
  export type ProductSetFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductSet
     */
    select?: ProductSetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductSet
     */
    omit?: ProductSetOmit<ExtArgs> | null
    /**
     * Filter, which ProductSet to fetch.
     */
    where?: ProductSetWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProductSets to fetch.
     */
    orderBy?: ProductSetOrderByWithRelationInput | ProductSetOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ProductSets.
     */
    cursor?: ProductSetWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProductSets from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProductSets.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ProductSets.
     */
    distinct?: ProductSetScalarFieldEnum | ProductSetScalarFieldEnum[]
  }

  /**
   * ProductSet findFirstOrThrow
   */
  export type ProductSetFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductSet
     */
    select?: ProductSetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductSet
     */
    omit?: ProductSetOmit<ExtArgs> | null
    /**
     * Filter, which ProductSet to fetch.
     */
    where?: ProductSetWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProductSets to fetch.
     */
    orderBy?: ProductSetOrderByWithRelationInput | ProductSetOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ProductSets.
     */
    cursor?: ProductSetWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProductSets from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProductSets.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ProductSets.
     */
    distinct?: ProductSetScalarFieldEnum | ProductSetScalarFieldEnum[]
  }

  /**
   * ProductSet findMany
   */
  export type ProductSetFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductSet
     */
    select?: ProductSetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductSet
     */
    omit?: ProductSetOmit<ExtArgs> | null
    /**
     * Filter, which ProductSets to fetch.
     */
    where?: ProductSetWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ProductSets to fetch.
     */
    orderBy?: ProductSetOrderByWithRelationInput | ProductSetOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ProductSets.
     */
    cursor?: ProductSetWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ProductSets from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ProductSets.
     */
    skip?: number
    distinct?: ProductSetScalarFieldEnum | ProductSetScalarFieldEnum[]
  }

  /**
   * ProductSet create
   */
  export type ProductSetCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductSet
     */
    select?: ProductSetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductSet
     */
    omit?: ProductSetOmit<ExtArgs> | null
    /**
     * The data needed to create a ProductSet.
     */
    data: XOR<ProductSetCreateInput, ProductSetUncheckedCreateInput>
  }

  /**
   * ProductSet createMany
   */
  export type ProductSetCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ProductSets.
     */
    data: ProductSetCreateManyInput | ProductSetCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ProductSet createManyAndReturn
   */
  export type ProductSetCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductSet
     */
    select?: ProductSetSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ProductSet
     */
    omit?: ProductSetOmit<ExtArgs> | null
    /**
     * The data used to create many ProductSets.
     */
    data: ProductSetCreateManyInput | ProductSetCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ProductSet update
   */
  export type ProductSetUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductSet
     */
    select?: ProductSetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductSet
     */
    omit?: ProductSetOmit<ExtArgs> | null
    /**
     * The data needed to update a ProductSet.
     */
    data: XOR<ProductSetUpdateInput, ProductSetUncheckedUpdateInput>
    /**
     * Choose, which ProductSet to update.
     */
    where: ProductSetWhereUniqueInput
  }

  /**
   * ProductSet updateMany
   */
  export type ProductSetUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ProductSets.
     */
    data: XOR<ProductSetUpdateManyMutationInput, ProductSetUncheckedUpdateManyInput>
    /**
     * Filter which ProductSets to update
     */
    where?: ProductSetWhereInput
    /**
     * Limit how many ProductSets to update.
     */
    limit?: number
  }

  /**
   * ProductSet updateManyAndReturn
   */
  export type ProductSetUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductSet
     */
    select?: ProductSetSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the ProductSet
     */
    omit?: ProductSetOmit<ExtArgs> | null
    /**
     * The data used to update ProductSets.
     */
    data: XOR<ProductSetUpdateManyMutationInput, ProductSetUncheckedUpdateManyInput>
    /**
     * Filter which ProductSets to update
     */
    where?: ProductSetWhereInput
    /**
     * Limit how many ProductSets to update.
     */
    limit?: number
  }

  /**
   * ProductSet upsert
   */
  export type ProductSetUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductSet
     */
    select?: ProductSetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductSet
     */
    omit?: ProductSetOmit<ExtArgs> | null
    /**
     * The filter to search for the ProductSet to update in case it exists.
     */
    where: ProductSetWhereUniqueInput
    /**
     * In case the ProductSet found by the `where` argument doesn't exist, create a new ProductSet with this data.
     */
    create: XOR<ProductSetCreateInput, ProductSetUncheckedCreateInput>
    /**
     * In case the ProductSet was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ProductSetUpdateInput, ProductSetUncheckedUpdateInput>
  }

  /**
   * ProductSet delete
   */
  export type ProductSetDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductSet
     */
    select?: ProductSetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductSet
     */
    omit?: ProductSetOmit<ExtArgs> | null
    /**
     * Filter which ProductSet to delete.
     */
    where: ProductSetWhereUniqueInput
  }

  /**
   * ProductSet deleteMany
   */
  export type ProductSetDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ProductSets to delete
     */
    where?: ProductSetWhereInput
    /**
     * Limit how many ProductSets to delete.
     */
    limit?: number
  }

  /**
   * ProductSet without action
   */
  export type ProductSetDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ProductSet
     */
    select?: ProductSetSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ProductSet
     */
    omit?: ProductSetOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const ProductCategoryScalarFieldEnum: {
    id: 'id',
    slug: 'slug',
    title: 'title',
    isHidden: 'isHidden',
    isSystem: 'isSystem',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    deletedAt: 'deletedAt'
  };

  export type ProductCategoryScalarFieldEnum = (typeof ProductCategoryScalarFieldEnum)[keyof typeof ProductCategoryScalarFieldEnum]


  export const ProductScalarFieldEnum: {
    id: 'id',
    slug: 'slug',
    title: 'title',
    description: 'description',
    excerpt: 'excerpt',
    sku: 'sku',
    status: 'status',
    price: 'price',
    currency: 'currency',
    thumbnailUrl: 'thumbnailUrl',
    categoryId: 'categoryId',
    discountType: 'discountType',
    discountValue: 'discountValue',
    discountActive: 'discountActive',
    discountStart: 'discountStart',
    discountEnd: 'discountEnd',
    model3dUrl: 'model3dUrl',
    model3dFormat: 'model3dFormat',
    model3dLiveView: 'model3dLiveView',
    model3dPosterUrl: 'model3dPosterUrl',
    vrPlanImageUrl: 'vrPlanImageUrl',
    vrEnabled: 'vrEnabled',
    metaTitle: 'metaTitle',
    metaDescription: 'metaDescription',
    metaKeywords: 'metaKeywords',
    customSchema: 'customSchema',
    noindex: 'noindex',
    isFeatured: 'isFeatured',
    featureSort: 'featureSort',
    promoTitle: 'promoTitle',
    promoBadge: 'promoBadge',
    promoActive: 'promoActive',
    promoStart: 'promoStart',
    promoEnd: 'promoEnd',
    tags: 'tags',
    complementaryIds: 'complementaryIds',
    deletedAt: 'deletedAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type ProductScalarFieldEnum = (typeof ProductScalarFieldEnum)[keyof typeof ProductScalarFieldEnum]


  export const ProductGalleryImageScalarFieldEnum: {
    id: 'id',
    productId: 'productId',
    url: 'url',
    alt: 'alt',
    sortOrder: 'sortOrder',
    deletedAt: 'deletedAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type ProductGalleryImageScalarFieldEnum = (typeof ProductGalleryImageScalarFieldEnum)[keyof typeof ProductGalleryImageScalarFieldEnum]


  export const ProductVrHotspotScalarFieldEnum: {
    id: 'id',
    productId: 'productId',
    x: 'x',
    y: 'y',
    panoImageUrl: 'panoImageUrl',
    title: 'title',
    body: 'body',
    yaw: 'yaw',
    pitch: 'pitch',
    fov: 'fov',
    deletedAt: 'deletedAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type ProductVrHotspotScalarFieldEnum = (typeof ProductVrHotspotScalarFieldEnum)[keyof typeof ProductVrHotspotScalarFieldEnum]


  export const ProductAttributeScalarFieldEnum: {
    id: 'id',
    productId: 'productId',
    key: 'key',
    valueType: 'valueType',
    valueString: 'valueString',
    valueInt: 'valueInt',
    valueBool: 'valueBool',
    deletedAt: 'deletedAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type ProductAttributeScalarFieldEnum = (typeof ProductAttributeScalarFieldEnum)[keyof typeof ProductAttributeScalarFieldEnum]


  export const ProductCommentScalarFieldEnum: {
    id: 'id',
    productId: 'productId',
    userId: 'userId',
    authorName: 'authorName',
    authorEmail: 'authorEmail',
    rating: 'rating',
    body: 'body',
    status: 'status',
    parentId: 'parentId',
    deletedAt: 'deletedAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type ProductCommentScalarFieldEnum = (typeof ProductCommentScalarFieldEnum)[keyof typeof ProductCommentScalarFieldEnum]


  export const ProductSetScalarFieldEnum: {
    id: 'id',
    slug: 'slug',
    title: 'title',
    description: 'description',
    active: 'active',
    discountType: 'discountType',
    discountValue: 'discountValue',
    productIds: 'productIds',
    deletedAt: 'deletedAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type ProductSetScalarFieldEnum = (typeof ProductSetScalarFieldEnum)[keyof typeof ProductSetScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'ProductStatus'
   */
  export type EnumProductStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ProductStatus'>
    


  /**
   * Reference to a field of type 'ProductStatus[]'
   */
  export type ListEnumProductStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ProductStatus[]'>
    


  /**
   * Reference to a field of type 'Decimal'
   */
  export type DecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal'>
    


  /**
   * Reference to a field of type 'Decimal[]'
   */
  export type ListDecimalFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Decimal[]'>
    


  /**
   * Reference to a field of type 'DiscountType'
   */
  export type EnumDiscountTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DiscountType'>
    


  /**
   * Reference to a field of type 'DiscountType[]'
   */
  export type ListEnumDiscountTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DiscountType[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    


  /**
   * Reference to a field of type 'AttributeValueType'
   */
  export type EnumAttributeValueTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AttributeValueType'>
    


  /**
   * Reference to a field of type 'AttributeValueType[]'
   */
  export type ListEnumAttributeValueTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AttributeValueType[]'>
    


  /**
   * Reference to a field of type 'CommentStatus'
   */
  export type EnumCommentStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'CommentStatus'>
    


  /**
   * Reference to a field of type 'CommentStatus[]'
   */
  export type ListEnumCommentStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'CommentStatus[]'>
    
  /**
   * Deep Input Types
   */


  export type ProductCategoryWhereInput = {
    AND?: ProductCategoryWhereInput | ProductCategoryWhereInput[]
    OR?: ProductCategoryWhereInput[]
    NOT?: ProductCategoryWhereInput | ProductCategoryWhereInput[]
    id?: UuidFilter<"ProductCategory"> | string
    slug?: StringFilter<"ProductCategory"> | string
    title?: StringFilter<"ProductCategory"> | string
    isHidden?: BoolFilter<"ProductCategory"> | boolean
    isSystem?: BoolFilter<"ProductCategory"> | boolean
    createdAt?: DateTimeFilter<"ProductCategory"> | Date | string
    updatedAt?: DateTimeFilter<"ProductCategory"> | Date | string
    deletedAt?: DateTimeNullableFilter<"ProductCategory"> | Date | string | null
    products?: ProductListRelationFilter
  }

  export type ProductCategoryOrderByWithRelationInput = {
    id?: SortOrder
    slug?: SortOrder
    title?: SortOrder
    isHidden?: SortOrder
    isSystem?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    products?: ProductOrderByRelationAggregateInput
  }

  export type ProductCategoryWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    slug?: string
    AND?: ProductCategoryWhereInput | ProductCategoryWhereInput[]
    OR?: ProductCategoryWhereInput[]
    NOT?: ProductCategoryWhereInput | ProductCategoryWhereInput[]
    title?: StringFilter<"ProductCategory"> | string
    isHidden?: BoolFilter<"ProductCategory"> | boolean
    isSystem?: BoolFilter<"ProductCategory"> | boolean
    createdAt?: DateTimeFilter<"ProductCategory"> | Date | string
    updatedAt?: DateTimeFilter<"ProductCategory"> | Date | string
    deletedAt?: DateTimeNullableFilter<"ProductCategory"> | Date | string | null
    products?: ProductListRelationFilter
  }, "id" | "slug">

  export type ProductCategoryOrderByWithAggregationInput = {
    id?: SortOrder
    slug?: SortOrder
    title?: SortOrder
    isHidden?: SortOrder
    isSystem?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    _count?: ProductCategoryCountOrderByAggregateInput
    _max?: ProductCategoryMaxOrderByAggregateInput
    _min?: ProductCategoryMinOrderByAggregateInput
  }

  export type ProductCategoryScalarWhereWithAggregatesInput = {
    AND?: ProductCategoryScalarWhereWithAggregatesInput | ProductCategoryScalarWhereWithAggregatesInput[]
    OR?: ProductCategoryScalarWhereWithAggregatesInput[]
    NOT?: ProductCategoryScalarWhereWithAggregatesInput | ProductCategoryScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"ProductCategory"> | string
    slug?: StringWithAggregatesFilter<"ProductCategory"> | string
    title?: StringWithAggregatesFilter<"ProductCategory"> | string
    isHidden?: BoolWithAggregatesFilter<"ProductCategory"> | boolean
    isSystem?: BoolWithAggregatesFilter<"ProductCategory"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"ProductCategory"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"ProductCategory"> | Date | string
    deletedAt?: DateTimeNullableWithAggregatesFilter<"ProductCategory"> | Date | string | null
  }

  export type ProductWhereInput = {
    AND?: ProductWhereInput | ProductWhereInput[]
    OR?: ProductWhereInput[]
    NOT?: ProductWhereInput | ProductWhereInput[]
    id?: StringFilter<"Product"> | string
    slug?: StringFilter<"Product"> | string
    title?: StringFilter<"Product"> | string
    description?: StringFilter<"Product"> | string
    excerpt?: StringNullableFilter<"Product"> | string | null
    sku?: StringFilter<"Product"> | string
    status?: EnumProductStatusFilter<"Product"> | $Enums.ProductStatus
    price?: DecimalFilter<"Product"> | Decimal | DecimalJsLike | number | string
    currency?: StringFilter<"Product"> | string
    thumbnailUrl?: StringNullableFilter<"Product"> | string | null
    categoryId?: UuidFilter<"Product"> | string
    discountType?: EnumDiscountTypeNullableFilter<"Product"> | $Enums.DiscountType | null
    discountValue?: DecimalNullableFilter<"Product"> | Decimal | DecimalJsLike | number | string | null
    discountActive?: BoolFilter<"Product"> | boolean
    discountStart?: DateTimeNullableFilter<"Product"> | Date | string | null
    discountEnd?: DateTimeNullableFilter<"Product"> | Date | string | null
    model3dUrl?: StringNullableFilter<"Product"> | string | null
    model3dFormat?: StringNullableFilter<"Product"> | string | null
    model3dLiveView?: BoolFilter<"Product"> | boolean
    model3dPosterUrl?: StringNullableFilter<"Product"> | string | null
    vrPlanImageUrl?: StringNullableFilter<"Product"> | string | null
    vrEnabled?: BoolFilter<"Product"> | boolean
    metaTitle?: StringNullableFilter<"Product"> | string | null
    metaDescription?: StringNullableFilter<"Product"> | string | null
    metaKeywords?: StringNullableFilter<"Product"> | string | null
    customSchema?: StringNullableFilter<"Product"> | string | null
    noindex?: BoolFilter<"Product"> | boolean
    isFeatured?: BoolFilter<"Product"> | boolean
    featureSort?: IntFilter<"Product"> | number
    promoTitle?: StringNullableFilter<"Product"> | string | null
    promoBadge?: StringNullableFilter<"Product"> | string | null
    promoActive?: BoolFilter<"Product"> | boolean
    promoStart?: DateTimeNullableFilter<"Product"> | Date | string | null
    promoEnd?: DateTimeNullableFilter<"Product"> | Date | string | null
    tags?: StringNullableListFilter<"Product">
    complementaryIds?: StringNullableListFilter<"Product">
    deletedAt?: DateTimeNullableFilter<"Product"> | Date | string | null
    createdAt?: DateTimeFilter<"Product"> | Date | string
    updatedAt?: DateTimeFilter<"Product"> | Date | string
    category?: XOR<ProductCategoryScalarRelationFilter, ProductCategoryWhereInput>
    gallery?: ProductGalleryImageListRelationFilter
    vrHotspots?: ProductVrHotspotListRelationFilter
    comments?: ProductCommentListRelationFilter
    attributes?: ProductAttributeListRelationFilter
  }

  export type ProductOrderByWithRelationInput = {
    id?: SortOrder
    slug?: SortOrder
    title?: SortOrder
    description?: SortOrder
    excerpt?: SortOrderInput | SortOrder
    sku?: SortOrder
    status?: SortOrder
    price?: SortOrder
    currency?: SortOrder
    thumbnailUrl?: SortOrderInput | SortOrder
    categoryId?: SortOrder
    discountType?: SortOrderInput | SortOrder
    discountValue?: SortOrderInput | SortOrder
    discountActive?: SortOrder
    discountStart?: SortOrderInput | SortOrder
    discountEnd?: SortOrderInput | SortOrder
    model3dUrl?: SortOrderInput | SortOrder
    model3dFormat?: SortOrderInput | SortOrder
    model3dLiveView?: SortOrder
    model3dPosterUrl?: SortOrderInput | SortOrder
    vrPlanImageUrl?: SortOrderInput | SortOrder
    vrEnabled?: SortOrder
    metaTitle?: SortOrderInput | SortOrder
    metaDescription?: SortOrderInput | SortOrder
    metaKeywords?: SortOrderInput | SortOrder
    customSchema?: SortOrderInput | SortOrder
    noindex?: SortOrder
    isFeatured?: SortOrder
    featureSort?: SortOrder
    promoTitle?: SortOrderInput | SortOrder
    promoBadge?: SortOrderInput | SortOrder
    promoActive?: SortOrder
    promoStart?: SortOrderInput | SortOrder
    promoEnd?: SortOrderInput | SortOrder
    tags?: SortOrder
    complementaryIds?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    category?: ProductCategoryOrderByWithRelationInput
    gallery?: ProductGalleryImageOrderByRelationAggregateInput
    vrHotspots?: ProductVrHotspotOrderByRelationAggregateInput
    comments?: ProductCommentOrderByRelationAggregateInput
    attributes?: ProductAttributeOrderByRelationAggregateInput
  }

  export type ProductWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    slug?: string
    sku?: string
    AND?: ProductWhereInput | ProductWhereInput[]
    OR?: ProductWhereInput[]
    NOT?: ProductWhereInput | ProductWhereInput[]
    title?: StringFilter<"Product"> | string
    description?: StringFilter<"Product"> | string
    excerpt?: StringNullableFilter<"Product"> | string | null
    status?: EnumProductStatusFilter<"Product"> | $Enums.ProductStatus
    price?: DecimalFilter<"Product"> | Decimal | DecimalJsLike | number | string
    currency?: StringFilter<"Product"> | string
    thumbnailUrl?: StringNullableFilter<"Product"> | string | null
    categoryId?: UuidFilter<"Product"> | string
    discountType?: EnumDiscountTypeNullableFilter<"Product"> | $Enums.DiscountType | null
    discountValue?: DecimalNullableFilter<"Product"> | Decimal | DecimalJsLike | number | string | null
    discountActive?: BoolFilter<"Product"> | boolean
    discountStart?: DateTimeNullableFilter<"Product"> | Date | string | null
    discountEnd?: DateTimeNullableFilter<"Product"> | Date | string | null
    model3dUrl?: StringNullableFilter<"Product"> | string | null
    model3dFormat?: StringNullableFilter<"Product"> | string | null
    model3dLiveView?: BoolFilter<"Product"> | boolean
    model3dPosterUrl?: StringNullableFilter<"Product"> | string | null
    vrPlanImageUrl?: StringNullableFilter<"Product"> | string | null
    vrEnabled?: BoolFilter<"Product"> | boolean
    metaTitle?: StringNullableFilter<"Product"> | string | null
    metaDescription?: StringNullableFilter<"Product"> | string | null
    metaKeywords?: StringNullableFilter<"Product"> | string | null
    customSchema?: StringNullableFilter<"Product"> | string | null
    noindex?: BoolFilter<"Product"> | boolean
    isFeatured?: BoolFilter<"Product"> | boolean
    featureSort?: IntFilter<"Product"> | number
    promoTitle?: StringNullableFilter<"Product"> | string | null
    promoBadge?: StringNullableFilter<"Product"> | string | null
    promoActive?: BoolFilter<"Product"> | boolean
    promoStart?: DateTimeNullableFilter<"Product"> | Date | string | null
    promoEnd?: DateTimeNullableFilter<"Product"> | Date | string | null
    tags?: StringNullableListFilter<"Product">
    complementaryIds?: StringNullableListFilter<"Product">
    deletedAt?: DateTimeNullableFilter<"Product"> | Date | string | null
    createdAt?: DateTimeFilter<"Product"> | Date | string
    updatedAt?: DateTimeFilter<"Product"> | Date | string
    category?: XOR<ProductCategoryScalarRelationFilter, ProductCategoryWhereInput>
    gallery?: ProductGalleryImageListRelationFilter
    vrHotspots?: ProductVrHotspotListRelationFilter
    comments?: ProductCommentListRelationFilter
    attributes?: ProductAttributeListRelationFilter
  }, "id" | "slug" | "sku">

  export type ProductOrderByWithAggregationInput = {
    id?: SortOrder
    slug?: SortOrder
    title?: SortOrder
    description?: SortOrder
    excerpt?: SortOrderInput | SortOrder
    sku?: SortOrder
    status?: SortOrder
    price?: SortOrder
    currency?: SortOrder
    thumbnailUrl?: SortOrderInput | SortOrder
    categoryId?: SortOrder
    discountType?: SortOrderInput | SortOrder
    discountValue?: SortOrderInput | SortOrder
    discountActive?: SortOrder
    discountStart?: SortOrderInput | SortOrder
    discountEnd?: SortOrderInput | SortOrder
    model3dUrl?: SortOrderInput | SortOrder
    model3dFormat?: SortOrderInput | SortOrder
    model3dLiveView?: SortOrder
    model3dPosterUrl?: SortOrderInput | SortOrder
    vrPlanImageUrl?: SortOrderInput | SortOrder
    vrEnabled?: SortOrder
    metaTitle?: SortOrderInput | SortOrder
    metaDescription?: SortOrderInput | SortOrder
    metaKeywords?: SortOrderInput | SortOrder
    customSchema?: SortOrderInput | SortOrder
    noindex?: SortOrder
    isFeatured?: SortOrder
    featureSort?: SortOrder
    promoTitle?: SortOrderInput | SortOrder
    promoBadge?: SortOrderInput | SortOrder
    promoActive?: SortOrder
    promoStart?: SortOrderInput | SortOrder
    promoEnd?: SortOrderInput | SortOrder
    tags?: SortOrder
    complementaryIds?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ProductCountOrderByAggregateInput
    _avg?: ProductAvgOrderByAggregateInput
    _max?: ProductMaxOrderByAggregateInput
    _min?: ProductMinOrderByAggregateInput
    _sum?: ProductSumOrderByAggregateInput
  }

  export type ProductScalarWhereWithAggregatesInput = {
    AND?: ProductScalarWhereWithAggregatesInput | ProductScalarWhereWithAggregatesInput[]
    OR?: ProductScalarWhereWithAggregatesInput[]
    NOT?: ProductScalarWhereWithAggregatesInput | ProductScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Product"> | string
    slug?: StringWithAggregatesFilter<"Product"> | string
    title?: StringWithAggregatesFilter<"Product"> | string
    description?: StringWithAggregatesFilter<"Product"> | string
    excerpt?: StringNullableWithAggregatesFilter<"Product"> | string | null
    sku?: StringWithAggregatesFilter<"Product"> | string
    status?: EnumProductStatusWithAggregatesFilter<"Product"> | $Enums.ProductStatus
    price?: DecimalWithAggregatesFilter<"Product"> | Decimal | DecimalJsLike | number | string
    currency?: StringWithAggregatesFilter<"Product"> | string
    thumbnailUrl?: StringNullableWithAggregatesFilter<"Product"> | string | null
    categoryId?: UuidWithAggregatesFilter<"Product"> | string
    discountType?: EnumDiscountTypeNullableWithAggregatesFilter<"Product"> | $Enums.DiscountType | null
    discountValue?: DecimalNullableWithAggregatesFilter<"Product"> | Decimal | DecimalJsLike | number | string | null
    discountActive?: BoolWithAggregatesFilter<"Product"> | boolean
    discountStart?: DateTimeNullableWithAggregatesFilter<"Product"> | Date | string | null
    discountEnd?: DateTimeNullableWithAggregatesFilter<"Product"> | Date | string | null
    model3dUrl?: StringNullableWithAggregatesFilter<"Product"> | string | null
    model3dFormat?: StringNullableWithAggregatesFilter<"Product"> | string | null
    model3dLiveView?: BoolWithAggregatesFilter<"Product"> | boolean
    model3dPosterUrl?: StringNullableWithAggregatesFilter<"Product"> | string | null
    vrPlanImageUrl?: StringNullableWithAggregatesFilter<"Product"> | string | null
    vrEnabled?: BoolWithAggregatesFilter<"Product"> | boolean
    metaTitle?: StringNullableWithAggregatesFilter<"Product"> | string | null
    metaDescription?: StringNullableWithAggregatesFilter<"Product"> | string | null
    metaKeywords?: StringNullableWithAggregatesFilter<"Product"> | string | null
    customSchema?: StringNullableWithAggregatesFilter<"Product"> | string | null
    noindex?: BoolWithAggregatesFilter<"Product"> | boolean
    isFeatured?: BoolWithAggregatesFilter<"Product"> | boolean
    featureSort?: IntWithAggregatesFilter<"Product"> | number
    promoTitle?: StringNullableWithAggregatesFilter<"Product"> | string | null
    promoBadge?: StringNullableWithAggregatesFilter<"Product"> | string | null
    promoActive?: BoolWithAggregatesFilter<"Product"> | boolean
    promoStart?: DateTimeNullableWithAggregatesFilter<"Product"> | Date | string | null
    promoEnd?: DateTimeNullableWithAggregatesFilter<"Product"> | Date | string | null
    tags?: StringNullableListFilter<"Product">
    complementaryIds?: StringNullableListFilter<"Product">
    deletedAt?: DateTimeNullableWithAggregatesFilter<"Product"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Product"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Product"> | Date | string
  }

  export type ProductGalleryImageWhereInput = {
    AND?: ProductGalleryImageWhereInput | ProductGalleryImageWhereInput[]
    OR?: ProductGalleryImageWhereInput[]
    NOT?: ProductGalleryImageWhereInput | ProductGalleryImageWhereInput[]
    id?: StringFilter<"ProductGalleryImage"> | string
    productId?: StringFilter<"ProductGalleryImage"> | string
    url?: StringFilter<"ProductGalleryImage"> | string
    alt?: StringNullableFilter<"ProductGalleryImage"> | string | null
    sortOrder?: IntFilter<"ProductGalleryImage"> | number
    deletedAt?: DateTimeNullableFilter<"ProductGalleryImage"> | Date | string | null
    createdAt?: DateTimeFilter<"ProductGalleryImage"> | Date | string
    updatedAt?: DateTimeFilter<"ProductGalleryImage"> | Date | string
    product?: XOR<ProductScalarRelationFilter, ProductWhereInput>
  }

  export type ProductGalleryImageOrderByWithRelationInput = {
    id?: SortOrder
    productId?: SortOrder
    url?: SortOrder
    alt?: SortOrderInput | SortOrder
    sortOrder?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    product?: ProductOrderByWithRelationInput
  }

  export type ProductGalleryImageWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ProductGalleryImageWhereInput | ProductGalleryImageWhereInput[]
    OR?: ProductGalleryImageWhereInput[]
    NOT?: ProductGalleryImageWhereInput | ProductGalleryImageWhereInput[]
    productId?: StringFilter<"ProductGalleryImage"> | string
    url?: StringFilter<"ProductGalleryImage"> | string
    alt?: StringNullableFilter<"ProductGalleryImage"> | string | null
    sortOrder?: IntFilter<"ProductGalleryImage"> | number
    deletedAt?: DateTimeNullableFilter<"ProductGalleryImage"> | Date | string | null
    createdAt?: DateTimeFilter<"ProductGalleryImage"> | Date | string
    updatedAt?: DateTimeFilter<"ProductGalleryImage"> | Date | string
    product?: XOR<ProductScalarRelationFilter, ProductWhereInput>
  }, "id">

  export type ProductGalleryImageOrderByWithAggregationInput = {
    id?: SortOrder
    productId?: SortOrder
    url?: SortOrder
    alt?: SortOrderInput | SortOrder
    sortOrder?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ProductGalleryImageCountOrderByAggregateInput
    _avg?: ProductGalleryImageAvgOrderByAggregateInput
    _max?: ProductGalleryImageMaxOrderByAggregateInput
    _min?: ProductGalleryImageMinOrderByAggregateInput
    _sum?: ProductGalleryImageSumOrderByAggregateInput
  }

  export type ProductGalleryImageScalarWhereWithAggregatesInput = {
    AND?: ProductGalleryImageScalarWhereWithAggregatesInput | ProductGalleryImageScalarWhereWithAggregatesInput[]
    OR?: ProductGalleryImageScalarWhereWithAggregatesInput[]
    NOT?: ProductGalleryImageScalarWhereWithAggregatesInput | ProductGalleryImageScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ProductGalleryImage"> | string
    productId?: StringWithAggregatesFilter<"ProductGalleryImage"> | string
    url?: StringWithAggregatesFilter<"ProductGalleryImage"> | string
    alt?: StringNullableWithAggregatesFilter<"ProductGalleryImage"> | string | null
    sortOrder?: IntWithAggregatesFilter<"ProductGalleryImage"> | number
    deletedAt?: DateTimeNullableWithAggregatesFilter<"ProductGalleryImage"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"ProductGalleryImage"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"ProductGalleryImage"> | Date | string
  }

  export type ProductVrHotspotWhereInput = {
    AND?: ProductVrHotspotWhereInput | ProductVrHotspotWhereInput[]
    OR?: ProductVrHotspotWhereInput[]
    NOT?: ProductVrHotspotWhereInput | ProductVrHotspotWhereInput[]
    id?: StringFilter<"ProductVrHotspot"> | string
    productId?: StringFilter<"ProductVrHotspot"> | string
    x?: FloatFilter<"ProductVrHotspot"> | number
    y?: FloatFilter<"ProductVrHotspot"> | number
    panoImageUrl?: StringFilter<"ProductVrHotspot"> | string
    title?: StringNullableFilter<"ProductVrHotspot"> | string | null
    body?: StringNullableFilter<"ProductVrHotspot"> | string | null
    yaw?: FloatNullableFilter<"ProductVrHotspot"> | number | null
    pitch?: FloatNullableFilter<"ProductVrHotspot"> | number | null
    fov?: FloatNullableFilter<"ProductVrHotspot"> | number | null
    deletedAt?: DateTimeNullableFilter<"ProductVrHotspot"> | Date | string | null
    createdAt?: DateTimeFilter<"ProductVrHotspot"> | Date | string
    updatedAt?: DateTimeFilter<"ProductVrHotspot"> | Date | string
    product?: XOR<ProductScalarRelationFilter, ProductWhereInput>
  }

  export type ProductVrHotspotOrderByWithRelationInput = {
    id?: SortOrder
    productId?: SortOrder
    x?: SortOrder
    y?: SortOrder
    panoImageUrl?: SortOrder
    title?: SortOrderInput | SortOrder
    body?: SortOrderInput | SortOrder
    yaw?: SortOrderInput | SortOrder
    pitch?: SortOrderInput | SortOrder
    fov?: SortOrderInput | SortOrder
    deletedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    product?: ProductOrderByWithRelationInput
  }

  export type ProductVrHotspotWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ProductVrHotspotWhereInput | ProductVrHotspotWhereInput[]
    OR?: ProductVrHotspotWhereInput[]
    NOT?: ProductVrHotspotWhereInput | ProductVrHotspotWhereInput[]
    productId?: StringFilter<"ProductVrHotspot"> | string
    x?: FloatFilter<"ProductVrHotspot"> | number
    y?: FloatFilter<"ProductVrHotspot"> | number
    panoImageUrl?: StringFilter<"ProductVrHotspot"> | string
    title?: StringNullableFilter<"ProductVrHotspot"> | string | null
    body?: StringNullableFilter<"ProductVrHotspot"> | string | null
    yaw?: FloatNullableFilter<"ProductVrHotspot"> | number | null
    pitch?: FloatNullableFilter<"ProductVrHotspot"> | number | null
    fov?: FloatNullableFilter<"ProductVrHotspot"> | number | null
    deletedAt?: DateTimeNullableFilter<"ProductVrHotspot"> | Date | string | null
    createdAt?: DateTimeFilter<"ProductVrHotspot"> | Date | string
    updatedAt?: DateTimeFilter<"ProductVrHotspot"> | Date | string
    product?: XOR<ProductScalarRelationFilter, ProductWhereInput>
  }, "id">

  export type ProductVrHotspotOrderByWithAggregationInput = {
    id?: SortOrder
    productId?: SortOrder
    x?: SortOrder
    y?: SortOrder
    panoImageUrl?: SortOrder
    title?: SortOrderInput | SortOrder
    body?: SortOrderInput | SortOrder
    yaw?: SortOrderInput | SortOrder
    pitch?: SortOrderInput | SortOrder
    fov?: SortOrderInput | SortOrder
    deletedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ProductVrHotspotCountOrderByAggregateInput
    _avg?: ProductVrHotspotAvgOrderByAggregateInput
    _max?: ProductVrHotspotMaxOrderByAggregateInput
    _min?: ProductVrHotspotMinOrderByAggregateInput
    _sum?: ProductVrHotspotSumOrderByAggregateInput
  }

  export type ProductVrHotspotScalarWhereWithAggregatesInput = {
    AND?: ProductVrHotspotScalarWhereWithAggregatesInput | ProductVrHotspotScalarWhereWithAggregatesInput[]
    OR?: ProductVrHotspotScalarWhereWithAggregatesInput[]
    NOT?: ProductVrHotspotScalarWhereWithAggregatesInput | ProductVrHotspotScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ProductVrHotspot"> | string
    productId?: StringWithAggregatesFilter<"ProductVrHotspot"> | string
    x?: FloatWithAggregatesFilter<"ProductVrHotspot"> | number
    y?: FloatWithAggregatesFilter<"ProductVrHotspot"> | number
    panoImageUrl?: StringWithAggregatesFilter<"ProductVrHotspot"> | string
    title?: StringNullableWithAggregatesFilter<"ProductVrHotspot"> | string | null
    body?: StringNullableWithAggregatesFilter<"ProductVrHotspot"> | string | null
    yaw?: FloatNullableWithAggregatesFilter<"ProductVrHotspot"> | number | null
    pitch?: FloatNullableWithAggregatesFilter<"ProductVrHotspot"> | number | null
    fov?: FloatNullableWithAggregatesFilter<"ProductVrHotspot"> | number | null
    deletedAt?: DateTimeNullableWithAggregatesFilter<"ProductVrHotspot"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"ProductVrHotspot"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"ProductVrHotspot"> | Date | string
  }

  export type ProductAttributeWhereInput = {
    AND?: ProductAttributeWhereInput | ProductAttributeWhereInput[]
    OR?: ProductAttributeWhereInput[]
    NOT?: ProductAttributeWhereInput | ProductAttributeWhereInput[]
    id?: StringFilter<"ProductAttribute"> | string
    productId?: StringFilter<"ProductAttribute"> | string
    key?: StringFilter<"ProductAttribute"> | string
    valueType?: EnumAttributeValueTypeFilter<"ProductAttribute"> | $Enums.AttributeValueType
    valueString?: StringNullableFilter<"ProductAttribute"> | string | null
    valueInt?: IntNullableFilter<"ProductAttribute"> | number | null
    valueBool?: BoolNullableFilter<"ProductAttribute"> | boolean | null
    deletedAt?: DateTimeNullableFilter<"ProductAttribute"> | Date | string | null
    createdAt?: DateTimeFilter<"ProductAttribute"> | Date | string
    updatedAt?: DateTimeFilter<"ProductAttribute"> | Date | string
    product?: XOR<ProductScalarRelationFilter, ProductWhereInput>
  }

  export type ProductAttributeOrderByWithRelationInput = {
    id?: SortOrder
    productId?: SortOrder
    key?: SortOrder
    valueType?: SortOrder
    valueString?: SortOrderInput | SortOrder
    valueInt?: SortOrderInput | SortOrder
    valueBool?: SortOrderInput | SortOrder
    deletedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    product?: ProductOrderByWithRelationInput
  }

  export type ProductAttributeWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ProductAttributeWhereInput | ProductAttributeWhereInput[]
    OR?: ProductAttributeWhereInput[]
    NOT?: ProductAttributeWhereInput | ProductAttributeWhereInput[]
    productId?: StringFilter<"ProductAttribute"> | string
    key?: StringFilter<"ProductAttribute"> | string
    valueType?: EnumAttributeValueTypeFilter<"ProductAttribute"> | $Enums.AttributeValueType
    valueString?: StringNullableFilter<"ProductAttribute"> | string | null
    valueInt?: IntNullableFilter<"ProductAttribute"> | number | null
    valueBool?: BoolNullableFilter<"ProductAttribute"> | boolean | null
    deletedAt?: DateTimeNullableFilter<"ProductAttribute"> | Date | string | null
    createdAt?: DateTimeFilter<"ProductAttribute"> | Date | string
    updatedAt?: DateTimeFilter<"ProductAttribute"> | Date | string
    product?: XOR<ProductScalarRelationFilter, ProductWhereInput>
  }, "id">

  export type ProductAttributeOrderByWithAggregationInput = {
    id?: SortOrder
    productId?: SortOrder
    key?: SortOrder
    valueType?: SortOrder
    valueString?: SortOrderInput | SortOrder
    valueInt?: SortOrderInput | SortOrder
    valueBool?: SortOrderInput | SortOrder
    deletedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ProductAttributeCountOrderByAggregateInput
    _avg?: ProductAttributeAvgOrderByAggregateInput
    _max?: ProductAttributeMaxOrderByAggregateInput
    _min?: ProductAttributeMinOrderByAggregateInput
    _sum?: ProductAttributeSumOrderByAggregateInput
  }

  export type ProductAttributeScalarWhereWithAggregatesInput = {
    AND?: ProductAttributeScalarWhereWithAggregatesInput | ProductAttributeScalarWhereWithAggregatesInput[]
    OR?: ProductAttributeScalarWhereWithAggregatesInput[]
    NOT?: ProductAttributeScalarWhereWithAggregatesInput | ProductAttributeScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ProductAttribute"> | string
    productId?: StringWithAggregatesFilter<"ProductAttribute"> | string
    key?: StringWithAggregatesFilter<"ProductAttribute"> | string
    valueType?: EnumAttributeValueTypeWithAggregatesFilter<"ProductAttribute"> | $Enums.AttributeValueType
    valueString?: StringNullableWithAggregatesFilter<"ProductAttribute"> | string | null
    valueInt?: IntNullableWithAggregatesFilter<"ProductAttribute"> | number | null
    valueBool?: BoolNullableWithAggregatesFilter<"ProductAttribute"> | boolean | null
    deletedAt?: DateTimeNullableWithAggregatesFilter<"ProductAttribute"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"ProductAttribute"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"ProductAttribute"> | Date | string
  }

  export type ProductCommentWhereInput = {
    AND?: ProductCommentWhereInput | ProductCommentWhereInput[]
    OR?: ProductCommentWhereInput[]
    NOT?: ProductCommentWhereInput | ProductCommentWhereInput[]
    id?: StringFilter<"ProductComment"> | string
    productId?: StringFilter<"ProductComment"> | string
    userId?: StringNullableFilter<"ProductComment"> | string | null
    authorName?: StringNullableFilter<"ProductComment"> | string | null
    authorEmail?: StringNullableFilter<"ProductComment"> | string | null
    rating?: IntNullableFilter<"ProductComment"> | number | null
    body?: StringFilter<"ProductComment"> | string
    status?: EnumCommentStatusFilter<"ProductComment"> | $Enums.CommentStatus
    parentId?: StringNullableFilter<"ProductComment"> | string | null
    deletedAt?: DateTimeNullableFilter<"ProductComment"> | Date | string | null
    createdAt?: DateTimeFilter<"ProductComment"> | Date | string
    updatedAt?: DateTimeFilter<"ProductComment"> | Date | string
    product?: XOR<ProductScalarRelationFilter, ProductWhereInput>
  }

  export type ProductCommentOrderByWithRelationInput = {
    id?: SortOrder
    productId?: SortOrder
    userId?: SortOrderInput | SortOrder
    authorName?: SortOrderInput | SortOrder
    authorEmail?: SortOrderInput | SortOrder
    rating?: SortOrderInput | SortOrder
    body?: SortOrder
    status?: SortOrder
    parentId?: SortOrderInput | SortOrder
    deletedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    product?: ProductOrderByWithRelationInput
  }

  export type ProductCommentWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ProductCommentWhereInput | ProductCommentWhereInput[]
    OR?: ProductCommentWhereInput[]
    NOT?: ProductCommentWhereInput | ProductCommentWhereInput[]
    productId?: StringFilter<"ProductComment"> | string
    userId?: StringNullableFilter<"ProductComment"> | string | null
    authorName?: StringNullableFilter<"ProductComment"> | string | null
    authorEmail?: StringNullableFilter<"ProductComment"> | string | null
    rating?: IntNullableFilter<"ProductComment"> | number | null
    body?: StringFilter<"ProductComment"> | string
    status?: EnumCommentStatusFilter<"ProductComment"> | $Enums.CommentStatus
    parentId?: StringNullableFilter<"ProductComment"> | string | null
    deletedAt?: DateTimeNullableFilter<"ProductComment"> | Date | string | null
    createdAt?: DateTimeFilter<"ProductComment"> | Date | string
    updatedAt?: DateTimeFilter<"ProductComment"> | Date | string
    product?: XOR<ProductScalarRelationFilter, ProductWhereInput>
  }, "id">

  export type ProductCommentOrderByWithAggregationInput = {
    id?: SortOrder
    productId?: SortOrder
    userId?: SortOrderInput | SortOrder
    authorName?: SortOrderInput | SortOrder
    authorEmail?: SortOrderInput | SortOrder
    rating?: SortOrderInput | SortOrder
    body?: SortOrder
    status?: SortOrder
    parentId?: SortOrderInput | SortOrder
    deletedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ProductCommentCountOrderByAggregateInput
    _avg?: ProductCommentAvgOrderByAggregateInput
    _max?: ProductCommentMaxOrderByAggregateInput
    _min?: ProductCommentMinOrderByAggregateInput
    _sum?: ProductCommentSumOrderByAggregateInput
  }

  export type ProductCommentScalarWhereWithAggregatesInput = {
    AND?: ProductCommentScalarWhereWithAggregatesInput | ProductCommentScalarWhereWithAggregatesInput[]
    OR?: ProductCommentScalarWhereWithAggregatesInput[]
    NOT?: ProductCommentScalarWhereWithAggregatesInput | ProductCommentScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ProductComment"> | string
    productId?: StringWithAggregatesFilter<"ProductComment"> | string
    userId?: StringNullableWithAggregatesFilter<"ProductComment"> | string | null
    authorName?: StringNullableWithAggregatesFilter<"ProductComment"> | string | null
    authorEmail?: StringNullableWithAggregatesFilter<"ProductComment"> | string | null
    rating?: IntNullableWithAggregatesFilter<"ProductComment"> | number | null
    body?: StringWithAggregatesFilter<"ProductComment"> | string
    status?: EnumCommentStatusWithAggregatesFilter<"ProductComment"> | $Enums.CommentStatus
    parentId?: StringNullableWithAggregatesFilter<"ProductComment"> | string | null
    deletedAt?: DateTimeNullableWithAggregatesFilter<"ProductComment"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"ProductComment"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"ProductComment"> | Date | string
  }

  export type ProductSetWhereInput = {
    AND?: ProductSetWhereInput | ProductSetWhereInput[]
    OR?: ProductSetWhereInput[]
    NOT?: ProductSetWhereInput | ProductSetWhereInput[]
    id?: StringFilter<"ProductSet"> | string
    slug?: StringFilter<"ProductSet"> | string
    title?: StringFilter<"ProductSet"> | string
    description?: StringNullableFilter<"ProductSet"> | string | null
    active?: BoolFilter<"ProductSet"> | boolean
    discountType?: EnumDiscountTypeNullableFilter<"ProductSet"> | $Enums.DiscountType | null
    discountValue?: DecimalNullableFilter<"ProductSet"> | Decimal | DecimalJsLike | number | string | null
    productIds?: StringNullableListFilter<"ProductSet">
    deletedAt?: DateTimeNullableFilter<"ProductSet"> | Date | string | null
    createdAt?: DateTimeFilter<"ProductSet"> | Date | string
    updatedAt?: DateTimeFilter<"ProductSet"> | Date | string
  }

  export type ProductSetOrderByWithRelationInput = {
    id?: SortOrder
    slug?: SortOrder
    title?: SortOrder
    description?: SortOrderInput | SortOrder
    active?: SortOrder
    discountType?: SortOrderInput | SortOrder
    discountValue?: SortOrderInput | SortOrder
    productIds?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProductSetWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    slug?: string
    AND?: ProductSetWhereInput | ProductSetWhereInput[]
    OR?: ProductSetWhereInput[]
    NOT?: ProductSetWhereInput | ProductSetWhereInput[]
    title?: StringFilter<"ProductSet"> | string
    description?: StringNullableFilter<"ProductSet"> | string | null
    active?: BoolFilter<"ProductSet"> | boolean
    discountType?: EnumDiscountTypeNullableFilter<"ProductSet"> | $Enums.DiscountType | null
    discountValue?: DecimalNullableFilter<"ProductSet"> | Decimal | DecimalJsLike | number | string | null
    productIds?: StringNullableListFilter<"ProductSet">
    deletedAt?: DateTimeNullableFilter<"ProductSet"> | Date | string | null
    createdAt?: DateTimeFilter<"ProductSet"> | Date | string
    updatedAt?: DateTimeFilter<"ProductSet"> | Date | string
  }, "id" | "slug">

  export type ProductSetOrderByWithAggregationInput = {
    id?: SortOrder
    slug?: SortOrder
    title?: SortOrder
    description?: SortOrderInput | SortOrder
    active?: SortOrder
    discountType?: SortOrderInput | SortOrder
    discountValue?: SortOrderInput | SortOrder
    productIds?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: ProductSetCountOrderByAggregateInput
    _avg?: ProductSetAvgOrderByAggregateInput
    _max?: ProductSetMaxOrderByAggregateInput
    _min?: ProductSetMinOrderByAggregateInput
    _sum?: ProductSetSumOrderByAggregateInput
  }

  export type ProductSetScalarWhereWithAggregatesInput = {
    AND?: ProductSetScalarWhereWithAggregatesInput | ProductSetScalarWhereWithAggregatesInput[]
    OR?: ProductSetScalarWhereWithAggregatesInput[]
    NOT?: ProductSetScalarWhereWithAggregatesInput | ProductSetScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"ProductSet"> | string
    slug?: StringWithAggregatesFilter<"ProductSet"> | string
    title?: StringWithAggregatesFilter<"ProductSet"> | string
    description?: StringNullableWithAggregatesFilter<"ProductSet"> | string | null
    active?: BoolWithAggregatesFilter<"ProductSet"> | boolean
    discountType?: EnumDiscountTypeNullableWithAggregatesFilter<"ProductSet"> | $Enums.DiscountType | null
    discountValue?: DecimalNullableWithAggregatesFilter<"ProductSet"> | Decimal | DecimalJsLike | number | string | null
    productIds?: StringNullableListFilter<"ProductSet">
    deletedAt?: DateTimeNullableWithAggregatesFilter<"ProductSet"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"ProductSet"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"ProductSet"> | Date | string
  }

  export type ProductCategoryCreateInput = {
    id?: string
    slug: string
    title: string
    isHidden?: boolean
    isSystem?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    products?: ProductCreateNestedManyWithoutCategoryInput
  }

  export type ProductCategoryUncheckedCreateInput = {
    id?: string
    slug: string
    title: string
    isHidden?: boolean
    isSystem?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    products?: ProductUncheckedCreateNestedManyWithoutCategoryInput
  }

  export type ProductCategoryUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    isHidden?: BoolFieldUpdateOperationsInput | boolean
    isSystem?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    products?: ProductUpdateManyWithoutCategoryNestedInput
  }

  export type ProductCategoryUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    isHidden?: BoolFieldUpdateOperationsInput | boolean
    isSystem?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    products?: ProductUncheckedUpdateManyWithoutCategoryNestedInput
  }

  export type ProductCategoryCreateManyInput = {
    id?: string
    slug: string
    title: string
    isHidden?: boolean
    isSystem?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type ProductCategoryUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    isHidden?: BoolFieldUpdateOperationsInput | boolean
    isSystem?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ProductCategoryUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    isHidden?: BoolFieldUpdateOperationsInput | boolean
    isSystem?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ProductCreateInput = {
    id?: string
    slug: string
    title: string
    description: string
    excerpt?: string | null
    sku: string
    status?: $Enums.ProductStatus
    price: Decimal | DecimalJsLike | number | string
    currency?: string
    thumbnailUrl?: string | null
    discountType?: $Enums.DiscountType | null
    discountValue?: Decimal | DecimalJsLike | number | string | null
    discountActive?: boolean
    discountStart?: Date | string | null
    discountEnd?: Date | string | null
    model3dUrl?: string | null
    model3dFormat?: string | null
    model3dLiveView?: boolean
    model3dPosterUrl?: string | null
    vrPlanImageUrl?: string | null
    vrEnabled?: boolean
    metaTitle?: string | null
    metaDescription?: string | null
    metaKeywords?: string | null
    customSchema?: string | null
    noindex?: boolean
    isFeatured?: boolean
    featureSort?: number
    promoTitle?: string | null
    promoBadge?: string | null
    promoActive?: boolean
    promoStart?: Date | string | null
    promoEnd?: Date | string | null
    tags?: ProductCreatetagsInput | string[]
    complementaryIds?: ProductCreatecomplementaryIdsInput | string[]
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    category: ProductCategoryCreateNestedOneWithoutProductsInput
    gallery?: ProductGalleryImageCreateNestedManyWithoutProductInput
    vrHotspots?: ProductVrHotspotCreateNestedManyWithoutProductInput
    comments?: ProductCommentCreateNestedManyWithoutProductInput
    attributes?: ProductAttributeCreateNestedManyWithoutProductInput
  }

  export type ProductUncheckedCreateInput = {
    id?: string
    slug: string
    title: string
    description: string
    excerpt?: string | null
    sku: string
    status?: $Enums.ProductStatus
    price: Decimal | DecimalJsLike | number | string
    currency?: string
    thumbnailUrl?: string | null
    categoryId: string
    discountType?: $Enums.DiscountType | null
    discountValue?: Decimal | DecimalJsLike | number | string | null
    discountActive?: boolean
    discountStart?: Date | string | null
    discountEnd?: Date | string | null
    model3dUrl?: string | null
    model3dFormat?: string | null
    model3dLiveView?: boolean
    model3dPosterUrl?: string | null
    vrPlanImageUrl?: string | null
    vrEnabled?: boolean
    metaTitle?: string | null
    metaDescription?: string | null
    metaKeywords?: string | null
    customSchema?: string | null
    noindex?: boolean
    isFeatured?: boolean
    featureSort?: number
    promoTitle?: string | null
    promoBadge?: string | null
    promoActive?: boolean
    promoStart?: Date | string | null
    promoEnd?: Date | string | null
    tags?: ProductCreatetagsInput | string[]
    complementaryIds?: ProductCreatecomplementaryIdsInput | string[]
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    gallery?: ProductGalleryImageUncheckedCreateNestedManyWithoutProductInput
    vrHotspots?: ProductVrHotspotUncheckedCreateNestedManyWithoutProductInput
    comments?: ProductCommentUncheckedCreateNestedManyWithoutProductInput
    attributes?: ProductAttributeUncheckedCreateNestedManyWithoutProductInput
  }

  export type ProductUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    excerpt?: NullableStringFieldUpdateOperationsInput | string | null
    sku?: StringFieldUpdateOperationsInput | string
    status?: EnumProductStatusFieldUpdateOperationsInput | $Enums.ProductStatus
    price?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    thumbnailUrl?: NullableStringFieldUpdateOperationsInput | string | null
    discountType?: NullableEnumDiscountTypeFieldUpdateOperationsInput | $Enums.DiscountType | null
    discountValue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    discountActive?: BoolFieldUpdateOperationsInput | boolean
    discountStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    discountEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    model3dUrl?: NullableStringFieldUpdateOperationsInput | string | null
    model3dFormat?: NullableStringFieldUpdateOperationsInput | string | null
    model3dLiveView?: BoolFieldUpdateOperationsInput | boolean
    model3dPosterUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vrPlanImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vrEnabled?: BoolFieldUpdateOperationsInput | boolean
    metaTitle?: NullableStringFieldUpdateOperationsInput | string | null
    metaDescription?: NullableStringFieldUpdateOperationsInput | string | null
    metaKeywords?: NullableStringFieldUpdateOperationsInput | string | null
    customSchema?: NullableStringFieldUpdateOperationsInput | string | null
    noindex?: BoolFieldUpdateOperationsInput | boolean
    isFeatured?: BoolFieldUpdateOperationsInput | boolean
    featureSort?: IntFieldUpdateOperationsInput | number
    promoTitle?: NullableStringFieldUpdateOperationsInput | string | null
    promoBadge?: NullableStringFieldUpdateOperationsInput | string | null
    promoActive?: BoolFieldUpdateOperationsInput | boolean
    promoStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    promoEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tags?: ProductUpdatetagsInput | string[]
    complementaryIds?: ProductUpdatecomplementaryIdsInput | string[]
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    category?: ProductCategoryUpdateOneRequiredWithoutProductsNestedInput
    gallery?: ProductGalleryImageUpdateManyWithoutProductNestedInput
    vrHotspots?: ProductVrHotspotUpdateManyWithoutProductNestedInput
    comments?: ProductCommentUpdateManyWithoutProductNestedInput
    attributes?: ProductAttributeUpdateManyWithoutProductNestedInput
  }

  export type ProductUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    excerpt?: NullableStringFieldUpdateOperationsInput | string | null
    sku?: StringFieldUpdateOperationsInput | string
    status?: EnumProductStatusFieldUpdateOperationsInput | $Enums.ProductStatus
    price?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    thumbnailUrl?: NullableStringFieldUpdateOperationsInput | string | null
    categoryId?: StringFieldUpdateOperationsInput | string
    discountType?: NullableEnumDiscountTypeFieldUpdateOperationsInput | $Enums.DiscountType | null
    discountValue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    discountActive?: BoolFieldUpdateOperationsInput | boolean
    discountStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    discountEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    model3dUrl?: NullableStringFieldUpdateOperationsInput | string | null
    model3dFormat?: NullableStringFieldUpdateOperationsInput | string | null
    model3dLiveView?: BoolFieldUpdateOperationsInput | boolean
    model3dPosterUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vrPlanImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vrEnabled?: BoolFieldUpdateOperationsInput | boolean
    metaTitle?: NullableStringFieldUpdateOperationsInput | string | null
    metaDescription?: NullableStringFieldUpdateOperationsInput | string | null
    metaKeywords?: NullableStringFieldUpdateOperationsInput | string | null
    customSchema?: NullableStringFieldUpdateOperationsInput | string | null
    noindex?: BoolFieldUpdateOperationsInput | boolean
    isFeatured?: BoolFieldUpdateOperationsInput | boolean
    featureSort?: IntFieldUpdateOperationsInput | number
    promoTitle?: NullableStringFieldUpdateOperationsInput | string | null
    promoBadge?: NullableStringFieldUpdateOperationsInput | string | null
    promoActive?: BoolFieldUpdateOperationsInput | boolean
    promoStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    promoEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tags?: ProductUpdatetagsInput | string[]
    complementaryIds?: ProductUpdatecomplementaryIdsInput | string[]
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gallery?: ProductGalleryImageUncheckedUpdateManyWithoutProductNestedInput
    vrHotspots?: ProductVrHotspotUncheckedUpdateManyWithoutProductNestedInput
    comments?: ProductCommentUncheckedUpdateManyWithoutProductNestedInput
    attributes?: ProductAttributeUncheckedUpdateManyWithoutProductNestedInput
  }

  export type ProductCreateManyInput = {
    id?: string
    slug: string
    title: string
    description: string
    excerpt?: string | null
    sku: string
    status?: $Enums.ProductStatus
    price: Decimal | DecimalJsLike | number | string
    currency?: string
    thumbnailUrl?: string | null
    categoryId: string
    discountType?: $Enums.DiscountType | null
    discountValue?: Decimal | DecimalJsLike | number | string | null
    discountActive?: boolean
    discountStart?: Date | string | null
    discountEnd?: Date | string | null
    model3dUrl?: string | null
    model3dFormat?: string | null
    model3dLiveView?: boolean
    model3dPosterUrl?: string | null
    vrPlanImageUrl?: string | null
    vrEnabled?: boolean
    metaTitle?: string | null
    metaDescription?: string | null
    metaKeywords?: string | null
    customSchema?: string | null
    noindex?: boolean
    isFeatured?: boolean
    featureSort?: number
    promoTitle?: string | null
    promoBadge?: string | null
    promoActive?: boolean
    promoStart?: Date | string | null
    promoEnd?: Date | string | null
    tags?: ProductCreatetagsInput | string[]
    complementaryIds?: ProductCreatecomplementaryIdsInput | string[]
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProductUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    excerpt?: NullableStringFieldUpdateOperationsInput | string | null
    sku?: StringFieldUpdateOperationsInput | string
    status?: EnumProductStatusFieldUpdateOperationsInput | $Enums.ProductStatus
    price?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    thumbnailUrl?: NullableStringFieldUpdateOperationsInput | string | null
    discountType?: NullableEnumDiscountTypeFieldUpdateOperationsInput | $Enums.DiscountType | null
    discountValue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    discountActive?: BoolFieldUpdateOperationsInput | boolean
    discountStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    discountEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    model3dUrl?: NullableStringFieldUpdateOperationsInput | string | null
    model3dFormat?: NullableStringFieldUpdateOperationsInput | string | null
    model3dLiveView?: BoolFieldUpdateOperationsInput | boolean
    model3dPosterUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vrPlanImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vrEnabled?: BoolFieldUpdateOperationsInput | boolean
    metaTitle?: NullableStringFieldUpdateOperationsInput | string | null
    metaDescription?: NullableStringFieldUpdateOperationsInput | string | null
    metaKeywords?: NullableStringFieldUpdateOperationsInput | string | null
    customSchema?: NullableStringFieldUpdateOperationsInput | string | null
    noindex?: BoolFieldUpdateOperationsInput | boolean
    isFeatured?: BoolFieldUpdateOperationsInput | boolean
    featureSort?: IntFieldUpdateOperationsInput | number
    promoTitle?: NullableStringFieldUpdateOperationsInput | string | null
    promoBadge?: NullableStringFieldUpdateOperationsInput | string | null
    promoActive?: BoolFieldUpdateOperationsInput | boolean
    promoStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    promoEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tags?: ProductUpdatetagsInput | string[]
    complementaryIds?: ProductUpdatecomplementaryIdsInput | string[]
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProductUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    excerpt?: NullableStringFieldUpdateOperationsInput | string | null
    sku?: StringFieldUpdateOperationsInput | string
    status?: EnumProductStatusFieldUpdateOperationsInput | $Enums.ProductStatus
    price?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    thumbnailUrl?: NullableStringFieldUpdateOperationsInput | string | null
    categoryId?: StringFieldUpdateOperationsInput | string
    discountType?: NullableEnumDiscountTypeFieldUpdateOperationsInput | $Enums.DiscountType | null
    discountValue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    discountActive?: BoolFieldUpdateOperationsInput | boolean
    discountStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    discountEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    model3dUrl?: NullableStringFieldUpdateOperationsInput | string | null
    model3dFormat?: NullableStringFieldUpdateOperationsInput | string | null
    model3dLiveView?: BoolFieldUpdateOperationsInput | boolean
    model3dPosterUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vrPlanImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vrEnabled?: BoolFieldUpdateOperationsInput | boolean
    metaTitle?: NullableStringFieldUpdateOperationsInput | string | null
    metaDescription?: NullableStringFieldUpdateOperationsInput | string | null
    metaKeywords?: NullableStringFieldUpdateOperationsInput | string | null
    customSchema?: NullableStringFieldUpdateOperationsInput | string | null
    noindex?: BoolFieldUpdateOperationsInput | boolean
    isFeatured?: BoolFieldUpdateOperationsInput | boolean
    featureSort?: IntFieldUpdateOperationsInput | number
    promoTitle?: NullableStringFieldUpdateOperationsInput | string | null
    promoBadge?: NullableStringFieldUpdateOperationsInput | string | null
    promoActive?: BoolFieldUpdateOperationsInput | boolean
    promoStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    promoEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tags?: ProductUpdatetagsInput | string[]
    complementaryIds?: ProductUpdatecomplementaryIdsInput | string[]
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProductGalleryImageCreateInput = {
    id?: string
    url: string
    alt?: string | null
    sortOrder?: number
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    product: ProductCreateNestedOneWithoutGalleryInput
  }

  export type ProductGalleryImageUncheckedCreateInput = {
    id?: string
    productId: string
    url: string
    alt?: string | null
    sortOrder?: number
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProductGalleryImageUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    alt?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    product?: ProductUpdateOneRequiredWithoutGalleryNestedInput
  }

  export type ProductGalleryImageUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    productId?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    alt?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProductGalleryImageCreateManyInput = {
    id?: string
    productId: string
    url: string
    alt?: string | null
    sortOrder?: number
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProductGalleryImageUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    alt?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProductGalleryImageUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    productId?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    alt?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProductVrHotspotCreateInput = {
    id?: string
    x: number
    y: number
    panoImageUrl: string
    title?: string | null
    body?: string | null
    yaw?: number | null
    pitch?: number | null
    fov?: number | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    product: ProductCreateNestedOneWithoutVrHotspotsInput
  }

  export type ProductVrHotspotUncheckedCreateInput = {
    id?: string
    productId: string
    x: number
    y: number
    panoImageUrl: string
    title?: string | null
    body?: string | null
    yaw?: number | null
    pitch?: number | null
    fov?: number | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProductVrHotspotUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    x?: FloatFieldUpdateOperationsInput | number
    y?: FloatFieldUpdateOperationsInput | number
    panoImageUrl?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    body?: NullableStringFieldUpdateOperationsInput | string | null
    yaw?: NullableFloatFieldUpdateOperationsInput | number | null
    pitch?: NullableFloatFieldUpdateOperationsInput | number | null
    fov?: NullableFloatFieldUpdateOperationsInput | number | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    product?: ProductUpdateOneRequiredWithoutVrHotspotsNestedInput
  }

  export type ProductVrHotspotUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    productId?: StringFieldUpdateOperationsInput | string
    x?: FloatFieldUpdateOperationsInput | number
    y?: FloatFieldUpdateOperationsInput | number
    panoImageUrl?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    body?: NullableStringFieldUpdateOperationsInput | string | null
    yaw?: NullableFloatFieldUpdateOperationsInput | number | null
    pitch?: NullableFloatFieldUpdateOperationsInput | number | null
    fov?: NullableFloatFieldUpdateOperationsInput | number | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProductVrHotspotCreateManyInput = {
    id?: string
    productId: string
    x: number
    y: number
    panoImageUrl: string
    title?: string | null
    body?: string | null
    yaw?: number | null
    pitch?: number | null
    fov?: number | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProductVrHotspotUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    x?: FloatFieldUpdateOperationsInput | number
    y?: FloatFieldUpdateOperationsInput | number
    panoImageUrl?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    body?: NullableStringFieldUpdateOperationsInput | string | null
    yaw?: NullableFloatFieldUpdateOperationsInput | number | null
    pitch?: NullableFloatFieldUpdateOperationsInput | number | null
    fov?: NullableFloatFieldUpdateOperationsInput | number | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProductVrHotspotUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    productId?: StringFieldUpdateOperationsInput | string
    x?: FloatFieldUpdateOperationsInput | number
    y?: FloatFieldUpdateOperationsInput | number
    panoImageUrl?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    body?: NullableStringFieldUpdateOperationsInput | string | null
    yaw?: NullableFloatFieldUpdateOperationsInput | number | null
    pitch?: NullableFloatFieldUpdateOperationsInput | number | null
    fov?: NullableFloatFieldUpdateOperationsInput | number | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProductAttributeCreateInput = {
    id?: string
    key: string
    valueType: $Enums.AttributeValueType
    valueString?: string | null
    valueInt?: number | null
    valueBool?: boolean | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    product: ProductCreateNestedOneWithoutAttributesInput
  }

  export type ProductAttributeUncheckedCreateInput = {
    id?: string
    productId: string
    key: string
    valueType: $Enums.AttributeValueType
    valueString?: string | null
    valueInt?: number | null
    valueBool?: boolean | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProductAttributeUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    valueType?: EnumAttributeValueTypeFieldUpdateOperationsInput | $Enums.AttributeValueType
    valueString?: NullableStringFieldUpdateOperationsInput | string | null
    valueInt?: NullableIntFieldUpdateOperationsInput | number | null
    valueBool?: NullableBoolFieldUpdateOperationsInput | boolean | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    product?: ProductUpdateOneRequiredWithoutAttributesNestedInput
  }

  export type ProductAttributeUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    productId?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    valueType?: EnumAttributeValueTypeFieldUpdateOperationsInput | $Enums.AttributeValueType
    valueString?: NullableStringFieldUpdateOperationsInput | string | null
    valueInt?: NullableIntFieldUpdateOperationsInput | number | null
    valueBool?: NullableBoolFieldUpdateOperationsInput | boolean | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProductAttributeCreateManyInput = {
    id?: string
    productId: string
    key: string
    valueType: $Enums.AttributeValueType
    valueString?: string | null
    valueInt?: number | null
    valueBool?: boolean | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProductAttributeUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    valueType?: EnumAttributeValueTypeFieldUpdateOperationsInput | $Enums.AttributeValueType
    valueString?: NullableStringFieldUpdateOperationsInput | string | null
    valueInt?: NullableIntFieldUpdateOperationsInput | number | null
    valueBool?: NullableBoolFieldUpdateOperationsInput | boolean | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProductAttributeUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    productId?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    valueType?: EnumAttributeValueTypeFieldUpdateOperationsInput | $Enums.AttributeValueType
    valueString?: NullableStringFieldUpdateOperationsInput | string | null
    valueInt?: NullableIntFieldUpdateOperationsInput | number | null
    valueBool?: NullableBoolFieldUpdateOperationsInput | boolean | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProductCommentCreateInput = {
    id?: string
    userId?: string | null
    authorName?: string | null
    authorEmail?: string | null
    rating?: number | null
    body: string
    status?: $Enums.CommentStatus
    parentId?: string | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    product: ProductCreateNestedOneWithoutCommentsInput
  }

  export type ProductCommentUncheckedCreateInput = {
    id?: string
    productId: string
    userId?: string | null
    authorName?: string | null
    authorEmail?: string | null
    rating?: number | null
    body: string
    status?: $Enums.CommentStatus
    parentId?: string | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProductCommentUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    authorName?: NullableStringFieldUpdateOperationsInput | string | null
    authorEmail?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: NullableIntFieldUpdateOperationsInput | number | null
    body?: StringFieldUpdateOperationsInput | string
    status?: EnumCommentStatusFieldUpdateOperationsInput | $Enums.CommentStatus
    parentId?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    product?: ProductUpdateOneRequiredWithoutCommentsNestedInput
  }

  export type ProductCommentUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    productId?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    authorName?: NullableStringFieldUpdateOperationsInput | string | null
    authorEmail?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: NullableIntFieldUpdateOperationsInput | number | null
    body?: StringFieldUpdateOperationsInput | string
    status?: EnumCommentStatusFieldUpdateOperationsInput | $Enums.CommentStatus
    parentId?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProductCommentCreateManyInput = {
    id?: string
    productId: string
    userId?: string | null
    authorName?: string | null
    authorEmail?: string | null
    rating?: number | null
    body: string
    status?: $Enums.CommentStatus
    parentId?: string | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProductCommentUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    authorName?: NullableStringFieldUpdateOperationsInput | string | null
    authorEmail?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: NullableIntFieldUpdateOperationsInput | number | null
    body?: StringFieldUpdateOperationsInput | string
    status?: EnumCommentStatusFieldUpdateOperationsInput | $Enums.CommentStatus
    parentId?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProductCommentUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    productId?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    authorName?: NullableStringFieldUpdateOperationsInput | string | null
    authorEmail?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: NullableIntFieldUpdateOperationsInput | number | null
    body?: StringFieldUpdateOperationsInput | string
    status?: EnumCommentStatusFieldUpdateOperationsInput | $Enums.CommentStatus
    parentId?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProductSetCreateInput = {
    id?: string
    slug: string
    title: string
    description?: string | null
    active?: boolean
    discountType?: $Enums.DiscountType | null
    discountValue?: Decimal | DecimalJsLike | number | string | null
    productIds?: ProductSetCreateproductIdsInput | string[]
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProductSetUncheckedCreateInput = {
    id?: string
    slug: string
    title: string
    description?: string | null
    active?: boolean
    discountType?: $Enums.DiscountType | null
    discountValue?: Decimal | DecimalJsLike | number | string | null
    productIds?: ProductSetCreateproductIdsInput | string[]
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProductSetUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    active?: BoolFieldUpdateOperationsInput | boolean
    discountType?: NullableEnumDiscountTypeFieldUpdateOperationsInput | $Enums.DiscountType | null
    discountValue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    productIds?: ProductSetUpdateproductIdsInput | string[]
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProductSetUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    active?: BoolFieldUpdateOperationsInput | boolean
    discountType?: NullableEnumDiscountTypeFieldUpdateOperationsInput | $Enums.DiscountType | null
    discountValue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    productIds?: ProductSetUpdateproductIdsInput | string[]
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProductSetCreateManyInput = {
    id?: string
    slug: string
    title: string
    description?: string | null
    active?: boolean
    discountType?: $Enums.DiscountType | null
    discountValue?: Decimal | DecimalJsLike | number | string | null
    productIds?: ProductSetCreateproductIdsInput | string[]
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProductSetUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    active?: BoolFieldUpdateOperationsInput | boolean
    discountType?: NullableEnumDiscountTypeFieldUpdateOperationsInput | $Enums.DiscountType | null
    discountValue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    productIds?: ProductSetUpdateproductIdsInput | string[]
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProductSetUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    active?: BoolFieldUpdateOperationsInput | boolean
    discountType?: NullableEnumDiscountTypeFieldUpdateOperationsInput | $Enums.DiscountType | null
    discountValue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    productIds?: ProductSetUpdateproductIdsInput | string[]
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidFilter<$PrismaModel> | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type ProductListRelationFilter = {
    every?: ProductWhereInput
    some?: ProductWhereInput
    none?: ProductWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type ProductOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ProductCategoryCountOrderByAggregateInput = {
    id?: SortOrder
    slug?: SortOrder
    title?: SortOrder
    isHidden?: SortOrder
    isSystem?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type ProductCategoryMaxOrderByAggregateInput = {
    id?: SortOrder
    slug?: SortOrder
    title?: SortOrder
    isHidden?: SortOrder
    isSystem?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type ProductCategoryMinOrderByAggregateInput = {
    id?: SortOrder
    slug?: SortOrder
    title?: SortOrder
    isHidden?: SortOrder
    isSystem?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type UuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type EnumProductStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.ProductStatus | EnumProductStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ProductStatus[] | ListEnumProductStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ProductStatus[] | ListEnumProductStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumProductStatusFilter<$PrismaModel> | $Enums.ProductStatus
  }

  export type DecimalFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
  }

  export type EnumDiscountTypeNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.DiscountType | EnumDiscountTypeFieldRefInput<$PrismaModel> | null
    in?: $Enums.DiscountType[] | ListEnumDiscountTypeFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.DiscountType[] | ListEnumDiscountTypeFieldRefInput<$PrismaModel> | null
    not?: NestedEnumDiscountTypeNullableFilter<$PrismaModel> | $Enums.DiscountType | null
  }

  export type DecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type StringNullableListFilter<$PrismaModel = never> = {
    equals?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    has?: string | StringFieldRefInput<$PrismaModel> | null
    hasEvery?: string[] | ListStringFieldRefInput<$PrismaModel>
    hasSome?: string[] | ListStringFieldRefInput<$PrismaModel>
    isEmpty?: boolean
  }

  export type ProductCategoryScalarRelationFilter = {
    is?: ProductCategoryWhereInput
    isNot?: ProductCategoryWhereInput
  }

  export type ProductGalleryImageListRelationFilter = {
    every?: ProductGalleryImageWhereInput
    some?: ProductGalleryImageWhereInput
    none?: ProductGalleryImageWhereInput
  }

  export type ProductVrHotspotListRelationFilter = {
    every?: ProductVrHotspotWhereInput
    some?: ProductVrHotspotWhereInput
    none?: ProductVrHotspotWhereInput
  }

  export type ProductCommentListRelationFilter = {
    every?: ProductCommentWhereInput
    some?: ProductCommentWhereInput
    none?: ProductCommentWhereInput
  }

  export type ProductAttributeListRelationFilter = {
    every?: ProductAttributeWhereInput
    some?: ProductAttributeWhereInput
    none?: ProductAttributeWhereInput
  }

  export type ProductGalleryImageOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ProductVrHotspotOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ProductCommentOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ProductAttributeOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ProductCountOrderByAggregateInput = {
    id?: SortOrder
    slug?: SortOrder
    title?: SortOrder
    description?: SortOrder
    excerpt?: SortOrder
    sku?: SortOrder
    status?: SortOrder
    price?: SortOrder
    currency?: SortOrder
    thumbnailUrl?: SortOrder
    categoryId?: SortOrder
    discountType?: SortOrder
    discountValue?: SortOrder
    discountActive?: SortOrder
    discountStart?: SortOrder
    discountEnd?: SortOrder
    model3dUrl?: SortOrder
    model3dFormat?: SortOrder
    model3dLiveView?: SortOrder
    model3dPosterUrl?: SortOrder
    vrPlanImageUrl?: SortOrder
    vrEnabled?: SortOrder
    metaTitle?: SortOrder
    metaDescription?: SortOrder
    metaKeywords?: SortOrder
    customSchema?: SortOrder
    noindex?: SortOrder
    isFeatured?: SortOrder
    featureSort?: SortOrder
    promoTitle?: SortOrder
    promoBadge?: SortOrder
    promoActive?: SortOrder
    promoStart?: SortOrder
    promoEnd?: SortOrder
    tags?: SortOrder
    complementaryIds?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProductAvgOrderByAggregateInput = {
    price?: SortOrder
    discountValue?: SortOrder
    featureSort?: SortOrder
  }

  export type ProductMaxOrderByAggregateInput = {
    id?: SortOrder
    slug?: SortOrder
    title?: SortOrder
    description?: SortOrder
    excerpt?: SortOrder
    sku?: SortOrder
    status?: SortOrder
    price?: SortOrder
    currency?: SortOrder
    thumbnailUrl?: SortOrder
    categoryId?: SortOrder
    discountType?: SortOrder
    discountValue?: SortOrder
    discountActive?: SortOrder
    discountStart?: SortOrder
    discountEnd?: SortOrder
    model3dUrl?: SortOrder
    model3dFormat?: SortOrder
    model3dLiveView?: SortOrder
    model3dPosterUrl?: SortOrder
    vrPlanImageUrl?: SortOrder
    vrEnabled?: SortOrder
    metaTitle?: SortOrder
    metaDescription?: SortOrder
    metaKeywords?: SortOrder
    customSchema?: SortOrder
    noindex?: SortOrder
    isFeatured?: SortOrder
    featureSort?: SortOrder
    promoTitle?: SortOrder
    promoBadge?: SortOrder
    promoActive?: SortOrder
    promoStart?: SortOrder
    promoEnd?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProductMinOrderByAggregateInput = {
    id?: SortOrder
    slug?: SortOrder
    title?: SortOrder
    description?: SortOrder
    excerpt?: SortOrder
    sku?: SortOrder
    status?: SortOrder
    price?: SortOrder
    currency?: SortOrder
    thumbnailUrl?: SortOrder
    categoryId?: SortOrder
    discountType?: SortOrder
    discountValue?: SortOrder
    discountActive?: SortOrder
    discountStart?: SortOrder
    discountEnd?: SortOrder
    model3dUrl?: SortOrder
    model3dFormat?: SortOrder
    model3dLiveView?: SortOrder
    model3dPosterUrl?: SortOrder
    vrPlanImageUrl?: SortOrder
    vrEnabled?: SortOrder
    metaTitle?: SortOrder
    metaDescription?: SortOrder
    metaKeywords?: SortOrder
    customSchema?: SortOrder
    noindex?: SortOrder
    isFeatured?: SortOrder
    featureSort?: SortOrder
    promoTitle?: SortOrder
    promoBadge?: SortOrder
    promoActive?: SortOrder
    promoStart?: SortOrder
    promoEnd?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProductSumOrderByAggregateInput = {
    price?: SortOrder
    discountValue?: SortOrder
    featureSort?: SortOrder
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type EnumProductStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ProductStatus | EnumProductStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ProductStatus[] | ListEnumProductStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ProductStatus[] | ListEnumProductStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumProductStatusWithAggregatesFilter<$PrismaModel> | $Enums.ProductStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumProductStatusFilter<$PrismaModel>
    _max?: NestedEnumProductStatusFilter<$PrismaModel>
  }

  export type DecimalWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedDecimalFilter<$PrismaModel>
    _sum?: NestedDecimalFilter<$PrismaModel>
    _min?: NestedDecimalFilter<$PrismaModel>
    _max?: NestedDecimalFilter<$PrismaModel>
  }

  export type EnumDiscountTypeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.DiscountType | EnumDiscountTypeFieldRefInput<$PrismaModel> | null
    in?: $Enums.DiscountType[] | ListEnumDiscountTypeFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.DiscountType[] | ListEnumDiscountTypeFieldRefInput<$PrismaModel> | null
    not?: NestedEnumDiscountTypeNullableWithAggregatesFilter<$PrismaModel> | $Enums.DiscountType | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedEnumDiscountTypeNullableFilter<$PrismaModel>
    _max?: NestedEnumDiscountTypeNullableFilter<$PrismaModel>
  }

  export type DecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type ProductScalarRelationFilter = {
    is?: ProductWhereInput
    isNot?: ProductWhereInput
  }

  export type ProductGalleryImageCountOrderByAggregateInput = {
    id?: SortOrder
    productId?: SortOrder
    url?: SortOrder
    alt?: SortOrder
    sortOrder?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProductGalleryImageAvgOrderByAggregateInput = {
    sortOrder?: SortOrder
  }

  export type ProductGalleryImageMaxOrderByAggregateInput = {
    id?: SortOrder
    productId?: SortOrder
    url?: SortOrder
    alt?: SortOrder
    sortOrder?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProductGalleryImageMinOrderByAggregateInput = {
    id?: SortOrder
    productId?: SortOrder
    url?: SortOrder
    alt?: SortOrder
    sortOrder?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProductGalleryImageSumOrderByAggregateInput = {
    sortOrder?: SortOrder
  }

  export type FloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type FloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type ProductVrHotspotCountOrderByAggregateInput = {
    id?: SortOrder
    productId?: SortOrder
    x?: SortOrder
    y?: SortOrder
    panoImageUrl?: SortOrder
    title?: SortOrder
    body?: SortOrder
    yaw?: SortOrder
    pitch?: SortOrder
    fov?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProductVrHotspotAvgOrderByAggregateInput = {
    x?: SortOrder
    y?: SortOrder
    yaw?: SortOrder
    pitch?: SortOrder
    fov?: SortOrder
  }

  export type ProductVrHotspotMaxOrderByAggregateInput = {
    id?: SortOrder
    productId?: SortOrder
    x?: SortOrder
    y?: SortOrder
    panoImageUrl?: SortOrder
    title?: SortOrder
    body?: SortOrder
    yaw?: SortOrder
    pitch?: SortOrder
    fov?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProductVrHotspotMinOrderByAggregateInput = {
    id?: SortOrder
    productId?: SortOrder
    x?: SortOrder
    y?: SortOrder
    panoImageUrl?: SortOrder
    title?: SortOrder
    body?: SortOrder
    yaw?: SortOrder
    pitch?: SortOrder
    fov?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProductVrHotspotSumOrderByAggregateInput = {
    x?: SortOrder
    y?: SortOrder
    yaw?: SortOrder
    pitch?: SortOrder
    fov?: SortOrder
  }

  export type FloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type FloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type EnumAttributeValueTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.AttributeValueType | EnumAttributeValueTypeFieldRefInput<$PrismaModel>
    in?: $Enums.AttributeValueType[] | ListEnumAttributeValueTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AttributeValueType[] | ListEnumAttributeValueTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumAttributeValueTypeFilter<$PrismaModel> | $Enums.AttributeValueType
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type BoolNullableFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableFilter<$PrismaModel> | boolean | null
  }

  export type ProductAttributeCountOrderByAggregateInput = {
    id?: SortOrder
    productId?: SortOrder
    key?: SortOrder
    valueType?: SortOrder
    valueString?: SortOrder
    valueInt?: SortOrder
    valueBool?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProductAttributeAvgOrderByAggregateInput = {
    valueInt?: SortOrder
  }

  export type ProductAttributeMaxOrderByAggregateInput = {
    id?: SortOrder
    productId?: SortOrder
    key?: SortOrder
    valueType?: SortOrder
    valueString?: SortOrder
    valueInt?: SortOrder
    valueBool?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProductAttributeMinOrderByAggregateInput = {
    id?: SortOrder
    productId?: SortOrder
    key?: SortOrder
    valueType?: SortOrder
    valueString?: SortOrder
    valueInt?: SortOrder
    valueBool?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProductAttributeSumOrderByAggregateInput = {
    valueInt?: SortOrder
  }

  export type EnumAttributeValueTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AttributeValueType | EnumAttributeValueTypeFieldRefInput<$PrismaModel>
    in?: $Enums.AttributeValueType[] | ListEnumAttributeValueTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AttributeValueType[] | ListEnumAttributeValueTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumAttributeValueTypeWithAggregatesFilter<$PrismaModel> | $Enums.AttributeValueType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAttributeValueTypeFilter<$PrismaModel>
    _max?: NestedEnumAttributeValueTypeFilter<$PrismaModel>
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type BoolNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableWithAggregatesFilter<$PrismaModel> | boolean | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedBoolNullableFilter<$PrismaModel>
    _max?: NestedBoolNullableFilter<$PrismaModel>
  }

  export type EnumCommentStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.CommentStatus | EnumCommentStatusFieldRefInput<$PrismaModel>
    in?: $Enums.CommentStatus[] | ListEnumCommentStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.CommentStatus[] | ListEnumCommentStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumCommentStatusFilter<$PrismaModel> | $Enums.CommentStatus
  }

  export type ProductCommentCountOrderByAggregateInput = {
    id?: SortOrder
    productId?: SortOrder
    userId?: SortOrder
    authorName?: SortOrder
    authorEmail?: SortOrder
    rating?: SortOrder
    body?: SortOrder
    status?: SortOrder
    parentId?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProductCommentAvgOrderByAggregateInput = {
    rating?: SortOrder
  }

  export type ProductCommentMaxOrderByAggregateInput = {
    id?: SortOrder
    productId?: SortOrder
    userId?: SortOrder
    authorName?: SortOrder
    authorEmail?: SortOrder
    rating?: SortOrder
    body?: SortOrder
    status?: SortOrder
    parentId?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProductCommentMinOrderByAggregateInput = {
    id?: SortOrder
    productId?: SortOrder
    userId?: SortOrder
    authorName?: SortOrder
    authorEmail?: SortOrder
    rating?: SortOrder
    body?: SortOrder
    status?: SortOrder
    parentId?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProductCommentSumOrderByAggregateInput = {
    rating?: SortOrder
  }

  export type EnumCommentStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.CommentStatus | EnumCommentStatusFieldRefInput<$PrismaModel>
    in?: $Enums.CommentStatus[] | ListEnumCommentStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.CommentStatus[] | ListEnumCommentStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumCommentStatusWithAggregatesFilter<$PrismaModel> | $Enums.CommentStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumCommentStatusFilter<$PrismaModel>
    _max?: NestedEnumCommentStatusFilter<$PrismaModel>
  }

  export type ProductSetCountOrderByAggregateInput = {
    id?: SortOrder
    slug?: SortOrder
    title?: SortOrder
    description?: SortOrder
    active?: SortOrder
    discountType?: SortOrder
    discountValue?: SortOrder
    productIds?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProductSetAvgOrderByAggregateInput = {
    discountValue?: SortOrder
  }

  export type ProductSetMaxOrderByAggregateInput = {
    id?: SortOrder
    slug?: SortOrder
    title?: SortOrder
    description?: SortOrder
    active?: SortOrder
    discountType?: SortOrder
    discountValue?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProductSetMinOrderByAggregateInput = {
    id?: SortOrder
    slug?: SortOrder
    title?: SortOrder
    description?: SortOrder
    active?: SortOrder
    discountType?: SortOrder
    discountValue?: SortOrder
    deletedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type ProductSetSumOrderByAggregateInput = {
    discountValue?: SortOrder
  }

  export type ProductCreateNestedManyWithoutCategoryInput = {
    create?: XOR<ProductCreateWithoutCategoryInput, ProductUncheckedCreateWithoutCategoryInput> | ProductCreateWithoutCategoryInput[] | ProductUncheckedCreateWithoutCategoryInput[]
    connectOrCreate?: ProductCreateOrConnectWithoutCategoryInput | ProductCreateOrConnectWithoutCategoryInput[]
    createMany?: ProductCreateManyCategoryInputEnvelope
    connect?: ProductWhereUniqueInput | ProductWhereUniqueInput[]
  }

  export type ProductUncheckedCreateNestedManyWithoutCategoryInput = {
    create?: XOR<ProductCreateWithoutCategoryInput, ProductUncheckedCreateWithoutCategoryInput> | ProductCreateWithoutCategoryInput[] | ProductUncheckedCreateWithoutCategoryInput[]
    connectOrCreate?: ProductCreateOrConnectWithoutCategoryInput | ProductCreateOrConnectWithoutCategoryInput[]
    createMany?: ProductCreateManyCategoryInputEnvelope
    connect?: ProductWhereUniqueInput | ProductWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type ProductUpdateManyWithoutCategoryNestedInput = {
    create?: XOR<ProductCreateWithoutCategoryInput, ProductUncheckedCreateWithoutCategoryInput> | ProductCreateWithoutCategoryInput[] | ProductUncheckedCreateWithoutCategoryInput[]
    connectOrCreate?: ProductCreateOrConnectWithoutCategoryInput | ProductCreateOrConnectWithoutCategoryInput[]
    upsert?: ProductUpsertWithWhereUniqueWithoutCategoryInput | ProductUpsertWithWhereUniqueWithoutCategoryInput[]
    createMany?: ProductCreateManyCategoryInputEnvelope
    set?: ProductWhereUniqueInput | ProductWhereUniqueInput[]
    disconnect?: ProductWhereUniqueInput | ProductWhereUniqueInput[]
    delete?: ProductWhereUniqueInput | ProductWhereUniqueInput[]
    connect?: ProductWhereUniqueInput | ProductWhereUniqueInput[]
    update?: ProductUpdateWithWhereUniqueWithoutCategoryInput | ProductUpdateWithWhereUniqueWithoutCategoryInput[]
    updateMany?: ProductUpdateManyWithWhereWithoutCategoryInput | ProductUpdateManyWithWhereWithoutCategoryInput[]
    deleteMany?: ProductScalarWhereInput | ProductScalarWhereInput[]
  }

  export type ProductUncheckedUpdateManyWithoutCategoryNestedInput = {
    create?: XOR<ProductCreateWithoutCategoryInput, ProductUncheckedCreateWithoutCategoryInput> | ProductCreateWithoutCategoryInput[] | ProductUncheckedCreateWithoutCategoryInput[]
    connectOrCreate?: ProductCreateOrConnectWithoutCategoryInput | ProductCreateOrConnectWithoutCategoryInput[]
    upsert?: ProductUpsertWithWhereUniqueWithoutCategoryInput | ProductUpsertWithWhereUniqueWithoutCategoryInput[]
    createMany?: ProductCreateManyCategoryInputEnvelope
    set?: ProductWhereUniqueInput | ProductWhereUniqueInput[]
    disconnect?: ProductWhereUniqueInput | ProductWhereUniqueInput[]
    delete?: ProductWhereUniqueInput | ProductWhereUniqueInput[]
    connect?: ProductWhereUniqueInput | ProductWhereUniqueInput[]
    update?: ProductUpdateWithWhereUniqueWithoutCategoryInput | ProductUpdateWithWhereUniqueWithoutCategoryInput[]
    updateMany?: ProductUpdateManyWithWhereWithoutCategoryInput | ProductUpdateManyWithWhereWithoutCategoryInput[]
    deleteMany?: ProductScalarWhereInput | ProductScalarWhereInput[]
  }

  export type ProductCreatetagsInput = {
    set: string[]
  }

  export type ProductCreatecomplementaryIdsInput = {
    set: string[]
  }

  export type ProductCategoryCreateNestedOneWithoutProductsInput = {
    create?: XOR<ProductCategoryCreateWithoutProductsInput, ProductCategoryUncheckedCreateWithoutProductsInput>
    connectOrCreate?: ProductCategoryCreateOrConnectWithoutProductsInput
    connect?: ProductCategoryWhereUniqueInput
  }

  export type ProductGalleryImageCreateNestedManyWithoutProductInput = {
    create?: XOR<ProductGalleryImageCreateWithoutProductInput, ProductGalleryImageUncheckedCreateWithoutProductInput> | ProductGalleryImageCreateWithoutProductInput[] | ProductGalleryImageUncheckedCreateWithoutProductInput[]
    connectOrCreate?: ProductGalleryImageCreateOrConnectWithoutProductInput | ProductGalleryImageCreateOrConnectWithoutProductInput[]
    createMany?: ProductGalleryImageCreateManyProductInputEnvelope
    connect?: ProductGalleryImageWhereUniqueInput | ProductGalleryImageWhereUniqueInput[]
  }

  export type ProductVrHotspotCreateNestedManyWithoutProductInput = {
    create?: XOR<ProductVrHotspotCreateWithoutProductInput, ProductVrHotspotUncheckedCreateWithoutProductInput> | ProductVrHotspotCreateWithoutProductInput[] | ProductVrHotspotUncheckedCreateWithoutProductInput[]
    connectOrCreate?: ProductVrHotspotCreateOrConnectWithoutProductInput | ProductVrHotspotCreateOrConnectWithoutProductInput[]
    createMany?: ProductVrHotspotCreateManyProductInputEnvelope
    connect?: ProductVrHotspotWhereUniqueInput | ProductVrHotspotWhereUniqueInput[]
  }

  export type ProductCommentCreateNestedManyWithoutProductInput = {
    create?: XOR<ProductCommentCreateWithoutProductInput, ProductCommentUncheckedCreateWithoutProductInput> | ProductCommentCreateWithoutProductInput[] | ProductCommentUncheckedCreateWithoutProductInput[]
    connectOrCreate?: ProductCommentCreateOrConnectWithoutProductInput | ProductCommentCreateOrConnectWithoutProductInput[]
    createMany?: ProductCommentCreateManyProductInputEnvelope
    connect?: ProductCommentWhereUniqueInput | ProductCommentWhereUniqueInput[]
  }

  export type ProductAttributeCreateNestedManyWithoutProductInput = {
    create?: XOR<ProductAttributeCreateWithoutProductInput, ProductAttributeUncheckedCreateWithoutProductInput> | ProductAttributeCreateWithoutProductInput[] | ProductAttributeUncheckedCreateWithoutProductInput[]
    connectOrCreate?: ProductAttributeCreateOrConnectWithoutProductInput | ProductAttributeCreateOrConnectWithoutProductInput[]
    createMany?: ProductAttributeCreateManyProductInputEnvelope
    connect?: ProductAttributeWhereUniqueInput | ProductAttributeWhereUniqueInput[]
  }

  export type ProductGalleryImageUncheckedCreateNestedManyWithoutProductInput = {
    create?: XOR<ProductGalleryImageCreateWithoutProductInput, ProductGalleryImageUncheckedCreateWithoutProductInput> | ProductGalleryImageCreateWithoutProductInput[] | ProductGalleryImageUncheckedCreateWithoutProductInput[]
    connectOrCreate?: ProductGalleryImageCreateOrConnectWithoutProductInput | ProductGalleryImageCreateOrConnectWithoutProductInput[]
    createMany?: ProductGalleryImageCreateManyProductInputEnvelope
    connect?: ProductGalleryImageWhereUniqueInput | ProductGalleryImageWhereUniqueInput[]
  }

  export type ProductVrHotspotUncheckedCreateNestedManyWithoutProductInput = {
    create?: XOR<ProductVrHotspotCreateWithoutProductInput, ProductVrHotspotUncheckedCreateWithoutProductInput> | ProductVrHotspotCreateWithoutProductInput[] | ProductVrHotspotUncheckedCreateWithoutProductInput[]
    connectOrCreate?: ProductVrHotspotCreateOrConnectWithoutProductInput | ProductVrHotspotCreateOrConnectWithoutProductInput[]
    createMany?: ProductVrHotspotCreateManyProductInputEnvelope
    connect?: ProductVrHotspotWhereUniqueInput | ProductVrHotspotWhereUniqueInput[]
  }

  export type ProductCommentUncheckedCreateNestedManyWithoutProductInput = {
    create?: XOR<ProductCommentCreateWithoutProductInput, ProductCommentUncheckedCreateWithoutProductInput> | ProductCommentCreateWithoutProductInput[] | ProductCommentUncheckedCreateWithoutProductInput[]
    connectOrCreate?: ProductCommentCreateOrConnectWithoutProductInput | ProductCommentCreateOrConnectWithoutProductInput[]
    createMany?: ProductCommentCreateManyProductInputEnvelope
    connect?: ProductCommentWhereUniqueInput | ProductCommentWhereUniqueInput[]
  }

  export type ProductAttributeUncheckedCreateNestedManyWithoutProductInput = {
    create?: XOR<ProductAttributeCreateWithoutProductInput, ProductAttributeUncheckedCreateWithoutProductInput> | ProductAttributeCreateWithoutProductInput[] | ProductAttributeUncheckedCreateWithoutProductInput[]
    connectOrCreate?: ProductAttributeCreateOrConnectWithoutProductInput | ProductAttributeCreateOrConnectWithoutProductInput[]
    createMany?: ProductAttributeCreateManyProductInputEnvelope
    connect?: ProductAttributeWhereUniqueInput | ProductAttributeWhereUniqueInput[]
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type EnumProductStatusFieldUpdateOperationsInput = {
    set?: $Enums.ProductStatus
  }

  export type DecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type NullableEnumDiscountTypeFieldUpdateOperationsInput = {
    set?: $Enums.DiscountType | null
  }

  export type NullableDecimalFieldUpdateOperationsInput = {
    set?: Decimal | DecimalJsLike | number | string | null
    increment?: Decimal | DecimalJsLike | number | string
    decrement?: Decimal | DecimalJsLike | number | string
    multiply?: Decimal | DecimalJsLike | number | string
    divide?: Decimal | DecimalJsLike | number | string
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type ProductUpdatetagsInput = {
    set?: string[]
    push?: string | string[]
  }

  export type ProductUpdatecomplementaryIdsInput = {
    set?: string[]
    push?: string | string[]
  }

  export type ProductCategoryUpdateOneRequiredWithoutProductsNestedInput = {
    create?: XOR<ProductCategoryCreateWithoutProductsInput, ProductCategoryUncheckedCreateWithoutProductsInput>
    connectOrCreate?: ProductCategoryCreateOrConnectWithoutProductsInput
    upsert?: ProductCategoryUpsertWithoutProductsInput
    connect?: ProductCategoryWhereUniqueInput
    update?: XOR<XOR<ProductCategoryUpdateToOneWithWhereWithoutProductsInput, ProductCategoryUpdateWithoutProductsInput>, ProductCategoryUncheckedUpdateWithoutProductsInput>
  }

  export type ProductGalleryImageUpdateManyWithoutProductNestedInput = {
    create?: XOR<ProductGalleryImageCreateWithoutProductInput, ProductGalleryImageUncheckedCreateWithoutProductInput> | ProductGalleryImageCreateWithoutProductInput[] | ProductGalleryImageUncheckedCreateWithoutProductInput[]
    connectOrCreate?: ProductGalleryImageCreateOrConnectWithoutProductInput | ProductGalleryImageCreateOrConnectWithoutProductInput[]
    upsert?: ProductGalleryImageUpsertWithWhereUniqueWithoutProductInput | ProductGalleryImageUpsertWithWhereUniqueWithoutProductInput[]
    createMany?: ProductGalleryImageCreateManyProductInputEnvelope
    set?: ProductGalleryImageWhereUniqueInput | ProductGalleryImageWhereUniqueInput[]
    disconnect?: ProductGalleryImageWhereUniqueInput | ProductGalleryImageWhereUniqueInput[]
    delete?: ProductGalleryImageWhereUniqueInput | ProductGalleryImageWhereUniqueInput[]
    connect?: ProductGalleryImageWhereUniqueInput | ProductGalleryImageWhereUniqueInput[]
    update?: ProductGalleryImageUpdateWithWhereUniqueWithoutProductInput | ProductGalleryImageUpdateWithWhereUniqueWithoutProductInput[]
    updateMany?: ProductGalleryImageUpdateManyWithWhereWithoutProductInput | ProductGalleryImageUpdateManyWithWhereWithoutProductInput[]
    deleteMany?: ProductGalleryImageScalarWhereInput | ProductGalleryImageScalarWhereInput[]
  }

  export type ProductVrHotspotUpdateManyWithoutProductNestedInput = {
    create?: XOR<ProductVrHotspotCreateWithoutProductInput, ProductVrHotspotUncheckedCreateWithoutProductInput> | ProductVrHotspotCreateWithoutProductInput[] | ProductVrHotspotUncheckedCreateWithoutProductInput[]
    connectOrCreate?: ProductVrHotspotCreateOrConnectWithoutProductInput | ProductVrHotspotCreateOrConnectWithoutProductInput[]
    upsert?: ProductVrHotspotUpsertWithWhereUniqueWithoutProductInput | ProductVrHotspotUpsertWithWhereUniqueWithoutProductInput[]
    createMany?: ProductVrHotspotCreateManyProductInputEnvelope
    set?: ProductVrHotspotWhereUniqueInput | ProductVrHotspotWhereUniqueInput[]
    disconnect?: ProductVrHotspotWhereUniqueInput | ProductVrHotspotWhereUniqueInput[]
    delete?: ProductVrHotspotWhereUniqueInput | ProductVrHotspotWhereUniqueInput[]
    connect?: ProductVrHotspotWhereUniqueInput | ProductVrHotspotWhereUniqueInput[]
    update?: ProductVrHotspotUpdateWithWhereUniqueWithoutProductInput | ProductVrHotspotUpdateWithWhereUniqueWithoutProductInput[]
    updateMany?: ProductVrHotspotUpdateManyWithWhereWithoutProductInput | ProductVrHotspotUpdateManyWithWhereWithoutProductInput[]
    deleteMany?: ProductVrHotspotScalarWhereInput | ProductVrHotspotScalarWhereInput[]
  }

  export type ProductCommentUpdateManyWithoutProductNestedInput = {
    create?: XOR<ProductCommentCreateWithoutProductInput, ProductCommentUncheckedCreateWithoutProductInput> | ProductCommentCreateWithoutProductInput[] | ProductCommentUncheckedCreateWithoutProductInput[]
    connectOrCreate?: ProductCommentCreateOrConnectWithoutProductInput | ProductCommentCreateOrConnectWithoutProductInput[]
    upsert?: ProductCommentUpsertWithWhereUniqueWithoutProductInput | ProductCommentUpsertWithWhereUniqueWithoutProductInput[]
    createMany?: ProductCommentCreateManyProductInputEnvelope
    set?: ProductCommentWhereUniqueInput | ProductCommentWhereUniqueInput[]
    disconnect?: ProductCommentWhereUniqueInput | ProductCommentWhereUniqueInput[]
    delete?: ProductCommentWhereUniqueInput | ProductCommentWhereUniqueInput[]
    connect?: ProductCommentWhereUniqueInput | ProductCommentWhereUniqueInput[]
    update?: ProductCommentUpdateWithWhereUniqueWithoutProductInput | ProductCommentUpdateWithWhereUniqueWithoutProductInput[]
    updateMany?: ProductCommentUpdateManyWithWhereWithoutProductInput | ProductCommentUpdateManyWithWhereWithoutProductInput[]
    deleteMany?: ProductCommentScalarWhereInput | ProductCommentScalarWhereInput[]
  }

  export type ProductAttributeUpdateManyWithoutProductNestedInput = {
    create?: XOR<ProductAttributeCreateWithoutProductInput, ProductAttributeUncheckedCreateWithoutProductInput> | ProductAttributeCreateWithoutProductInput[] | ProductAttributeUncheckedCreateWithoutProductInput[]
    connectOrCreate?: ProductAttributeCreateOrConnectWithoutProductInput | ProductAttributeCreateOrConnectWithoutProductInput[]
    upsert?: ProductAttributeUpsertWithWhereUniqueWithoutProductInput | ProductAttributeUpsertWithWhereUniqueWithoutProductInput[]
    createMany?: ProductAttributeCreateManyProductInputEnvelope
    set?: ProductAttributeWhereUniqueInput | ProductAttributeWhereUniqueInput[]
    disconnect?: ProductAttributeWhereUniqueInput | ProductAttributeWhereUniqueInput[]
    delete?: ProductAttributeWhereUniqueInput | ProductAttributeWhereUniqueInput[]
    connect?: ProductAttributeWhereUniqueInput | ProductAttributeWhereUniqueInput[]
    update?: ProductAttributeUpdateWithWhereUniqueWithoutProductInput | ProductAttributeUpdateWithWhereUniqueWithoutProductInput[]
    updateMany?: ProductAttributeUpdateManyWithWhereWithoutProductInput | ProductAttributeUpdateManyWithWhereWithoutProductInput[]
    deleteMany?: ProductAttributeScalarWhereInput | ProductAttributeScalarWhereInput[]
  }

  export type ProductGalleryImageUncheckedUpdateManyWithoutProductNestedInput = {
    create?: XOR<ProductGalleryImageCreateWithoutProductInput, ProductGalleryImageUncheckedCreateWithoutProductInput> | ProductGalleryImageCreateWithoutProductInput[] | ProductGalleryImageUncheckedCreateWithoutProductInput[]
    connectOrCreate?: ProductGalleryImageCreateOrConnectWithoutProductInput | ProductGalleryImageCreateOrConnectWithoutProductInput[]
    upsert?: ProductGalleryImageUpsertWithWhereUniqueWithoutProductInput | ProductGalleryImageUpsertWithWhereUniqueWithoutProductInput[]
    createMany?: ProductGalleryImageCreateManyProductInputEnvelope
    set?: ProductGalleryImageWhereUniqueInput | ProductGalleryImageWhereUniqueInput[]
    disconnect?: ProductGalleryImageWhereUniqueInput | ProductGalleryImageWhereUniqueInput[]
    delete?: ProductGalleryImageWhereUniqueInput | ProductGalleryImageWhereUniqueInput[]
    connect?: ProductGalleryImageWhereUniqueInput | ProductGalleryImageWhereUniqueInput[]
    update?: ProductGalleryImageUpdateWithWhereUniqueWithoutProductInput | ProductGalleryImageUpdateWithWhereUniqueWithoutProductInput[]
    updateMany?: ProductGalleryImageUpdateManyWithWhereWithoutProductInput | ProductGalleryImageUpdateManyWithWhereWithoutProductInput[]
    deleteMany?: ProductGalleryImageScalarWhereInput | ProductGalleryImageScalarWhereInput[]
  }

  export type ProductVrHotspotUncheckedUpdateManyWithoutProductNestedInput = {
    create?: XOR<ProductVrHotspotCreateWithoutProductInput, ProductVrHotspotUncheckedCreateWithoutProductInput> | ProductVrHotspotCreateWithoutProductInput[] | ProductVrHotspotUncheckedCreateWithoutProductInput[]
    connectOrCreate?: ProductVrHotspotCreateOrConnectWithoutProductInput | ProductVrHotspotCreateOrConnectWithoutProductInput[]
    upsert?: ProductVrHotspotUpsertWithWhereUniqueWithoutProductInput | ProductVrHotspotUpsertWithWhereUniqueWithoutProductInput[]
    createMany?: ProductVrHotspotCreateManyProductInputEnvelope
    set?: ProductVrHotspotWhereUniqueInput | ProductVrHotspotWhereUniqueInput[]
    disconnect?: ProductVrHotspotWhereUniqueInput | ProductVrHotspotWhereUniqueInput[]
    delete?: ProductVrHotspotWhereUniqueInput | ProductVrHotspotWhereUniqueInput[]
    connect?: ProductVrHotspotWhereUniqueInput | ProductVrHotspotWhereUniqueInput[]
    update?: ProductVrHotspotUpdateWithWhereUniqueWithoutProductInput | ProductVrHotspotUpdateWithWhereUniqueWithoutProductInput[]
    updateMany?: ProductVrHotspotUpdateManyWithWhereWithoutProductInput | ProductVrHotspotUpdateManyWithWhereWithoutProductInput[]
    deleteMany?: ProductVrHotspotScalarWhereInput | ProductVrHotspotScalarWhereInput[]
  }

  export type ProductCommentUncheckedUpdateManyWithoutProductNestedInput = {
    create?: XOR<ProductCommentCreateWithoutProductInput, ProductCommentUncheckedCreateWithoutProductInput> | ProductCommentCreateWithoutProductInput[] | ProductCommentUncheckedCreateWithoutProductInput[]
    connectOrCreate?: ProductCommentCreateOrConnectWithoutProductInput | ProductCommentCreateOrConnectWithoutProductInput[]
    upsert?: ProductCommentUpsertWithWhereUniqueWithoutProductInput | ProductCommentUpsertWithWhereUniqueWithoutProductInput[]
    createMany?: ProductCommentCreateManyProductInputEnvelope
    set?: ProductCommentWhereUniqueInput | ProductCommentWhereUniqueInput[]
    disconnect?: ProductCommentWhereUniqueInput | ProductCommentWhereUniqueInput[]
    delete?: ProductCommentWhereUniqueInput | ProductCommentWhereUniqueInput[]
    connect?: ProductCommentWhereUniqueInput | ProductCommentWhereUniqueInput[]
    update?: ProductCommentUpdateWithWhereUniqueWithoutProductInput | ProductCommentUpdateWithWhereUniqueWithoutProductInput[]
    updateMany?: ProductCommentUpdateManyWithWhereWithoutProductInput | ProductCommentUpdateManyWithWhereWithoutProductInput[]
    deleteMany?: ProductCommentScalarWhereInput | ProductCommentScalarWhereInput[]
  }

  export type ProductAttributeUncheckedUpdateManyWithoutProductNestedInput = {
    create?: XOR<ProductAttributeCreateWithoutProductInput, ProductAttributeUncheckedCreateWithoutProductInput> | ProductAttributeCreateWithoutProductInput[] | ProductAttributeUncheckedCreateWithoutProductInput[]
    connectOrCreate?: ProductAttributeCreateOrConnectWithoutProductInput | ProductAttributeCreateOrConnectWithoutProductInput[]
    upsert?: ProductAttributeUpsertWithWhereUniqueWithoutProductInput | ProductAttributeUpsertWithWhereUniqueWithoutProductInput[]
    createMany?: ProductAttributeCreateManyProductInputEnvelope
    set?: ProductAttributeWhereUniqueInput | ProductAttributeWhereUniqueInput[]
    disconnect?: ProductAttributeWhereUniqueInput | ProductAttributeWhereUniqueInput[]
    delete?: ProductAttributeWhereUniqueInput | ProductAttributeWhereUniqueInput[]
    connect?: ProductAttributeWhereUniqueInput | ProductAttributeWhereUniqueInput[]
    update?: ProductAttributeUpdateWithWhereUniqueWithoutProductInput | ProductAttributeUpdateWithWhereUniqueWithoutProductInput[]
    updateMany?: ProductAttributeUpdateManyWithWhereWithoutProductInput | ProductAttributeUpdateManyWithWhereWithoutProductInput[]
    deleteMany?: ProductAttributeScalarWhereInput | ProductAttributeScalarWhereInput[]
  }

  export type ProductCreateNestedOneWithoutGalleryInput = {
    create?: XOR<ProductCreateWithoutGalleryInput, ProductUncheckedCreateWithoutGalleryInput>
    connectOrCreate?: ProductCreateOrConnectWithoutGalleryInput
    connect?: ProductWhereUniqueInput
  }

  export type ProductUpdateOneRequiredWithoutGalleryNestedInput = {
    create?: XOR<ProductCreateWithoutGalleryInput, ProductUncheckedCreateWithoutGalleryInput>
    connectOrCreate?: ProductCreateOrConnectWithoutGalleryInput
    upsert?: ProductUpsertWithoutGalleryInput
    connect?: ProductWhereUniqueInput
    update?: XOR<XOR<ProductUpdateToOneWithWhereWithoutGalleryInput, ProductUpdateWithoutGalleryInput>, ProductUncheckedUpdateWithoutGalleryInput>
  }

  export type ProductCreateNestedOneWithoutVrHotspotsInput = {
    create?: XOR<ProductCreateWithoutVrHotspotsInput, ProductUncheckedCreateWithoutVrHotspotsInput>
    connectOrCreate?: ProductCreateOrConnectWithoutVrHotspotsInput
    connect?: ProductWhereUniqueInput
  }

  export type FloatFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableFloatFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type ProductUpdateOneRequiredWithoutVrHotspotsNestedInput = {
    create?: XOR<ProductCreateWithoutVrHotspotsInput, ProductUncheckedCreateWithoutVrHotspotsInput>
    connectOrCreate?: ProductCreateOrConnectWithoutVrHotspotsInput
    upsert?: ProductUpsertWithoutVrHotspotsInput
    connect?: ProductWhereUniqueInput
    update?: XOR<XOR<ProductUpdateToOneWithWhereWithoutVrHotspotsInput, ProductUpdateWithoutVrHotspotsInput>, ProductUncheckedUpdateWithoutVrHotspotsInput>
  }

  export type ProductCreateNestedOneWithoutAttributesInput = {
    create?: XOR<ProductCreateWithoutAttributesInput, ProductUncheckedCreateWithoutAttributesInput>
    connectOrCreate?: ProductCreateOrConnectWithoutAttributesInput
    connect?: ProductWhereUniqueInput
  }

  export type EnumAttributeValueTypeFieldUpdateOperationsInput = {
    set?: $Enums.AttributeValueType
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableBoolFieldUpdateOperationsInput = {
    set?: boolean | null
  }

  export type ProductUpdateOneRequiredWithoutAttributesNestedInput = {
    create?: XOR<ProductCreateWithoutAttributesInput, ProductUncheckedCreateWithoutAttributesInput>
    connectOrCreate?: ProductCreateOrConnectWithoutAttributesInput
    upsert?: ProductUpsertWithoutAttributesInput
    connect?: ProductWhereUniqueInput
    update?: XOR<XOR<ProductUpdateToOneWithWhereWithoutAttributesInput, ProductUpdateWithoutAttributesInput>, ProductUncheckedUpdateWithoutAttributesInput>
  }

  export type ProductCreateNestedOneWithoutCommentsInput = {
    create?: XOR<ProductCreateWithoutCommentsInput, ProductUncheckedCreateWithoutCommentsInput>
    connectOrCreate?: ProductCreateOrConnectWithoutCommentsInput
    connect?: ProductWhereUniqueInput
  }

  export type EnumCommentStatusFieldUpdateOperationsInput = {
    set?: $Enums.CommentStatus
  }

  export type ProductUpdateOneRequiredWithoutCommentsNestedInput = {
    create?: XOR<ProductCreateWithoutCommentsInput, ProductUncheckedCreateWithoutCommentsInput>
    connectOrCreate?: ProductCreateOrConnectWithoutCommentsInput
    upsert?: ProductUpsertWithoutCommentsInput
    connect?: ProductWhereUniqueInput
    update?: XOR<XOR<ProductUpdateToOneWithWhereWithoutCommentsInput, ProductUpdateWithoutCommentsInput>, ProductUncheckedUpdateWithoutCommentsInput>
  }

  export type ProductSetCreateproductIdsInput = {
    set: string[]
  }

  export type ProductSetUpdateproductIdsInput = {
    set?: string[]
    push?: string | string[]
  }

  export type NestedUuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidFilter<$PrismaModel> | string
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedUuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedEnumProductStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.ProductStatus | EnumProductStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ProductStatus[] | ListEnumProductStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ProductStatus[] | ListEnumProductStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumProductStatusFilter<$PrismaModel> | $Enums.ProductStatus
  }

  export type NestedDecimalFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
  }

  export type NestedEnumDiscountTypeNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.DiscountType | EnumDiscountTypeFieldRefInput<$PrismaModel> | null
    in?: $Enums.DiscountType[] | ListEnumDiscountTypeFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.DiscountType[] | ListEnumDiscountTypeFieldRefInput<$PrismaModel> | null
    not?: NestedEnumDiscountTypeNullableFilter<$PrismaModel> | $Enums.DiscountType | null
  }

  export type NestedDecimalNullableFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedEnumProductStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ProductStatus | EnumProductStatusFieldRefInput<$PrismaModel>
    in?: $Enums.ProductStatus[] | ListEnumProductStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.ProductStatus[] | ListEnumProductStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumProductStatusWithAggregatesFilter<$PrismaModel> | $Enums.ProductStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumProductStatusFilter<$PrismaModel>
    _max?: NestedEnumProductStatusFilter<$PrismaModel>
  }

  export type NestedDecimalWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel>
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedDecimalFilter<$PrismaModel>
    _sum?: NestedDecimalFilter<$PrismaModel>
    _min?: NestedDecimalFilter<$PrismaModel>
    _max?: NestedDecimalFilter<$PrismaModel>
  }

  export type NestedEnumDiscountTypeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.DiscountType | EnumDiscountTypeFieldRefInput<$PrismaModel> | null
    in?: $Enums.DiscountType[] | ListEnumDiscountTypeFieldRefInput<$PrismaModel> | null
    notIn?: $Enums.DiscountType[] | ListEnumDiscountTypeFieldRefInput<$PrismaModel> | null
    not?: NestedEnumDiscountTypeNullableWithAggregatesFilter<$PrismaModel> | $Enums.DiscountType | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedEnumDiscountTypeNullableFilter<$PrismaModel>
    _max?: NestedEnumDiscountTypeNullableFilter<$PrismaModel>
  }

  export type NestedDecimalNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel> | null
    in?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    notIn?: Decimal[] | DecimalJsLike[] | number[] | string[] | ListDecimalFieldRefInput<$PrismaModel> | null
    lt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    lte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gt?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    gte?: Decimal | DecimalJsLike | number | string | DecimalFieldRefInput<$PrismaModel>
    not?: NestedDecimalNullableWithAggregatesFilter<$PrismaModel> | Decimal | DecimalJsLike | number | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedDecimalNullableFilter<$PrismaModel>
    _sum?: NestedDecimalNullableFilter<$PrismaModel>
    _min?: NestedDecimalNullableFilter<$PrismaModel>
    _max?: NestedDecimalNullableFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedFloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type NestedFloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type NestedEnumAttributeValueTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.AttributeValueType | EnumAttributeValueTypeFieldRefInput<$PrismaModel>
    in?: $Enums.AttributeValueType[] | ListEnumAttributeValueTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AttributeValueType[] | ListEnumAttributeValueTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumAttributeValueTypeFilter<$PrismaModel> | $Enums.AttributeValueType
  }

  export type NestedBoolNullableFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableFilter<$PrismaModel> | boolean | null
  }

  export type NestedEnumAttributeValueTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AttributeValueType | EnumAttributeValueTypeFieldRefInput<$PrismaModel>
    in?: $Enums.AttributeValueType[] | ListEnumAttributeValueTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.AttributeValueType[] | ListEnumAttributeValueTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumAttributeValueTypeWithAggregatesFilter<$PrismaModel> | $Enums.AttributeValueType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAttributeValueTypeFilter<$PrismaModel>
    _max?: NestedEnumAttributeValueTypeFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedBoolNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableWithAggregatesFilter<$PrismaModel> | boolean | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedBoolNullableFilter<$PrismaModel>
    _max?: NestedBoolNullableFilter<$PrismaModel>
  }

  export type NestedEnumCommentStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.CommentStatus | EnumCommentStatusFieldRefInput<$PrismaModel>
    in?: $Enums.CommentStatus[] | ListEnumCommentStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.CommentStatus[] | ListEnumCommentStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumCommentStatusFilter<$PrismaModel> | $Enums.CommentStatus
  }

  export type NestedEnumCommentStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.CommentStatus | EnumCommentStatusFieldRefInput<$PrismaModel>
    in?: $Enums.CommentStatus[] | ListEnumCommentStatusFieldRefInput<$PrismaModel>
    notIn?: $Enums.CommentStatus[] | ListEnumCommentStatusFieldRefInput<$PrismaModel>
    not?: NestedEnumCommentStatusWithAggregatesFilter<$PrismaModel> | $Enums.CommentStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumCommentStatusFilter<$PrismaModel>
    _max?: NestedEnumCommentStatusFilter<$PrismaModel>
  }

  export type ProductCreateWithoutCategoryInput = {
    id?: string
    slug: string
    title: string
    description: string
    excerpt?: string | null
    sku: string
    status?: $Enums.ProductStatus
    price: Decimal | DecimalJsLike | number | string
    currency?: string
    thumbnailUrl?: string | null
    discountType?: $Enums.DiscountType | null
    discountValue?: Decimal | DecimalJsLike | number | string | null
    discountActive?: boolean
    discountStart?: Date | string | null
    discountEnd?: Date | string | null
    model3dUrl?: string | null
    model3dFormat?: string | null
    model3dLiveView?: boolean
    model3dPosterUrl?: string | null
    vrPlanImageUrl?: string | null
    vrEnabled?: boolean
    metaTitle?: string | null
    metaDescription?: string | null
    metaKeywords?: string | null
    customSchema?: string | null
    noindex?: boolean
    isFeatured?: boolean
    featureSort?: number
    promoTitle?: string | null
    promoBadge?: string | null
    promoActive?: boolean
    promoStart?: Date | string | null
    promoEnd?: Date | string | null
    tags?: ProductCreatetagsInput | string[]
    complementaryIds?: ProductCreatecomplementaryIdsInput | string[]
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    gallery?: ProductGalleryImageCreateNestedManyWithoutProductInput
    vrHotspots?: ProductVrHotspotCreateNestedManyWithoutProductInput
    comments?: ProductCommentCreateNestedManyWithoutProductInput
    attributes?: ProductAttributeCreateNestedManyWithoutProductInput
  }

  export type ProductUncheckedCreateWithoutCategoryInput = {
    id?: string
    slug: string
    title: string
    description: string
    excerpt?: string | null
    sku: string
    status?: $Enums.ProductStatus
    price: Decimal | DecimalJsLike | number | string
    currency?: string
    thumbnailUrl?: string | null
    discountType?: $Enums.DiscountType | null
    discountValue?: Decimal | DecimalJsLike | number | string | null
    discountActive?: boolean
    discountStart?: Date | string | null
    discountEnd?: Date | string | null
    model3dUrl?: string | null
    model3dFormat?: string | null
    model3dLiveView?: boolean
    model3dPosterUrl?: string | null
    vrPlanImageUrl?: string | null
    vrEnabled?: boolean
    metaTitle?: string | null
    metaDescription?: string | null
    metaKeywords?: string | null
    customSchema?: string | null
    noindex?: boolean
    isFeatured?: boolean
    featureSort?: number
    promoTitle?: string | null
    promoBadge?: string | null
    promoActive?: boolean
    promoStart?: Date | string | null
    promoEnd?: Date | string | null
    tags?: ProductCreatetagsInput | string[]
    complementaryIds?: ProductCreatecomplementaryIdsInput | string[]
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    gallery?: ProductGalleryImageUncheckedCreateNestedManyWithoutProductInput
    vrHotspots?: ProductVrHotspotUncheckedCreateNestedManyWithoutProductInput
    comments?: ProductCommentUncheckedCreateNestedManyWithoutProductInput
    attributes?: ProductAttributeUncheckedCreateNestedManyWithoutProductInput
  }

  export type ProductCreateOrConnectWithoutCategoryInput = {
    where: ProductWhereUniqueInput
    create: XOR<ProductCreateWithoutCategoryInput, ProductUncheckedCreateWithoutCategoryInput>
  }

  export type ProductCreateManyCategoryInputEnvelope = {
    data: ProductCreateManyCategoryInput | ProductCreateManyCategoryInput[]
    skipDuplicates?: boolean
  }

  export type ProductUpsertWithWhereUniqueWithoutCategoryInput = {
    where: ProductWhereUniqueInput
    update: XOR<ProductUpdateWithoutCategoryInput, ProductUncheckedUpdateWithoutCategoryInput>
    create: XOR<ProductCreateWithoutCategoryInput, ProductUncheckedCreateWithoutCategoryInput>
  }

  export type ProductUpdateWithWhereUniqueWithoutCategoryInput = {
    where: ProductWhereUniqueInput
    data: XOR<ProductUpdateWithoutCategoryInput, ProductUncheckedUpdateWithoutCategoryInput>
  }

  export type ProductUpdateManyWithWhereWithoutCategoryInput = {
    where: ProductScalarWhereInput
    data: XOR<ProductUpdateManyMutationInput, ProductUncheckedUpdateManyWithoutCategoryInput>
  }

  export type ProductScalarWhereInput = {
    AND?: ProductScalarWhereInput | ProductScalarWhereInput[]
    OR?: ProductScalarWhereInput[]
    NOT?: ProductScalarWhereInput | ProductScalarWhereInput[]
    id?: StringFilter<"Product"> | string
    slug?: StringFilter<"Product"> | string
    title?: StringFilter<"Product"> | string
    description?: StringFilter<"Product"> | string
    excerpt?: StringNullableFilter<"Product"> | string | null
    sku?: StringFilter<"Product"> | string
    status?: EnumProductStatusFilter<"Product"> | $Enums.ProductStatus
    price?: DecimalFilter<"Product"> | Decimal | DecimalJsLike | number | string
    currency?: StringFilter<"Product"> | string
    thumbnailUrl?: StringNullableFilter<"Product"> | string | null
    categoryId?: UuidFilter<"Product"> | string
    discountType?: EnumDiscountTypeNullableFilter<"Product"> | $Enums.DiscountType | null
    discountValue?: DecimalNullableFilter<"Product"> | Decimal | DecimalJsLike | number | string | null
    discountActive?: BoolFilter<"Product"> | boolean
    discountStart?: DateTimeNullableFilter<"Product"> | Date | string | null
    discountEnd?: DateTimeNullableFilter<"Product"> | Date | string | null
    model3dUrl?: StringNullableFilter<"Product"> | string | null
    model3dFormat?: StringNullableFilter<"Product"> | string | null
    model3dLiveView?: BoolFilter<"Product"> | boolean
    model3dPosterUrl?: StringNullableFilter<"Product"> | string | null
    vrPlanImageUrl?: StringNullableFilter<"Product"> | string | null
    vrEnabled?: BoolFilter<"Product"> | boolean
    metaTitle?: StringNullableFilter<"Product"> | string | null
    metaDescription?: StringNullableFilter<"Product"> | string | null
    metaKeywords?: StringNullableFilter<"Product"> | string | null
    customSchema?: StringNullableFilter<"Product"> | string | null
    noindex?: BoolFilter<"Product"> | boolean
    isFeatured?: BoolFilter<"Product"> | boolean
    featureSort?: IntFilter<"Product"> | number
    promoTitle?: StringNullableFilter<"Product"> | string | null
    promoBadge?: StringNullableFilter<"Product"> | string | null
    promoActive?: BoolFilter<"Product"> | boolean
    promoStart?: DateTimeNullableFilter<"Product"> | Date | string | null
    promoEnd?: DateTimeNullableFilter<"Product"> | Date | string | null
    tags?: StringNullableListFilter<"Product">
    complementaryIds?: StringNullableListFilter<"Product">
    deletedAt?: DateTimeNullableFilter<"Product"> | Date | string | null
    createdAt?: DateTimeFilter<"Product"> | Date | string
    updatedAt?: DateTimeFilter<"Product"> | Date | string
  }

  export type ProductCategoryCreateWithoutProductsInput = {
    id?: string
    slug: string
    title: string
    isHidden?: boolean
    isSystem?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type ProductCategoryUncheckedCreateWithoutProductsInput = {
    id?: string
    slug: string
    title: string
    isHidden?: boolean
    isSystem?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type ProductCategoryCreateOrConnectWithoutProductsInput = {
    where: ProductCategoryWhereUniqueInput
    create: XOR<ProductCategoryCreateWithoutProductsInput, ProductCategoryUncheckedCreateWithoutProductsInput>
  }

  export type ProductGalleryImageCreateWithoutProductInput = {
    id?: string
    url: string
    alt?: string | null
    sortOrder?: number
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProductGalleryImageUncheckedCreateWithoutProductInput = {
    id?: string
    url: string
    alt?: string | null
    sortOrder?: number
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProductGalleryImageCreateOrConnectWithoutProductInput = {
    where: ProductGalleryImageWhereUniqueInput
    create: XOR<ProductGalleryImageCreateWithoutProductInput, ProductGalleryImageUncheckedCreateWithoutProductInput>
  }

  export type ProductGalleryImageCreateManyProductInputEnvelope = {
    data: ProductGalleryImageCreateManyProductInput | ProductGalleryImageCreateManyProductInput[]
    skipDuplicates?: boolean
  }

  export type ProductVrHotspotCreateWithoutProductInput = {
    id?: string
    x: number
    y: number
    panoImageUrl: string
    title?: string | null
    body?: string | null
    yaw?: number | null
    pitch?: number | null
    fov?: number | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProductVrHotspotUncheckedCreateWithoutProductInput = {
    id?: string
    x: number
    y: number
    panoImageUrl: string
    title?: string | null
    body?: string | null
    yaw?: number | null
    pitch?: number | null
    fov?: number | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProductVrHotspotCreateOrConnectWithoutProductInput = {
    where: ProductVrHotspotWhereUniqueInput
    create: XOR<ProductVrHotspotCreateWithoutProductInput, ProductVrHotspotUncheckedCreateWithoutProductInput>
  }

  export type ProductVrHotspotCreateManyProductInputEnvelope = {
    data: ProductVrHotspotCreateManyProductInput | ProductVrHotspotCreateManyProductInput[]
    skipDuplicates?: boolean
  }

  export type ProductCommentCreateWithoutProductInput = {
    id?: string
    userId?: string | null
    authorName?: string | null
    authorEmail?: string | null
    rating?: number | null
    body: string
    status?: $Enums.CommentStatus
    parentId?: string | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProductCommentUncheckedCreateWithoutProductInput = {
    id?: string
    userId?: string | null
    authorName?: string | null
    authorEmail?: string | null
    rating?: number | null
    body: string
    status?: $Enums.CommentStatus
    parentId?: string | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProductCommentCreateOrConnectWithoutProductInput = {
    where: ProductCommentWhereUniqueInput
    create: XOR<ProductCommentCreateWithoutProductInput, ProductCommentUncheckedCreateWithoutProductInput>
  }

  export type ProductCommentCreateManyProductInputEnvelope = {
    data: ProductCommentCreateManyProductInput | ProductCommentCreateManyProductInput[]
    skipDuplicates?: boolean
  }

  export type ProductAttributeCreateWithoutProductInput = {
    id?: string
    key: string
    valueType: $Enums.AttributeValueType
    valueString?: string | null
    valueInt?: number | null
    valueBool?: boolean | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProductAttributeUncheckedCreateWithoutProductInput = {
    id?: string
    key: string
    valueType: $Enums.AttributeValueType
    valueString?: string | null
    valueInt?: number | null
    valueBool?: boolean | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProductAttributeCreateOrConnectWithoutProductInput = {
    where: ProductAttributeWhereUniqueInput
    create: XOR<ProductAttributeCreateWithoutProductInput, ProductAttributeUncheckedCreateWithoutProductInput>
  }

  export type ProductAttributeCreateManyProductInputEnvelope = {
    data: ProductAttributeCreateManyProductInput | ProductAttributeCreateManyProductInput[]
    skipDuplicates?: boolean
  }

  export type ProductCategoryUpsertWithoutProductsInput = {
    update: XOR<ProductCategoryUpdateWithoutProductsInput, ProductCategoryUncheckedUpdateWithoutProductsInput>
    create: XOR<ProductCategoryCreateWithoutProductsInput, ProductCategoryUncheckedCreateWithoutProductsInput>
    where?: ProductCategoryWhereInput
  }

  export type ProductCategoryUpdateToOneWithWhereWithoutProductsInput = {
    where?: ProductCategoryWhereInput
    data: XOR<ProductCategoryUpdateWithoutProductsInput, ProductCategoryUncheckedUpdateWithoutProductsInput>
  }

  export type ProductCategoryUpdateWithoutProductsInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    isHidden?: BoolFieldUpdateOperationsInput | boolean
    isSystem?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ProductCategoryUncheckedUpdateWithoutProductsInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    isHidden?: BoolFieldUpdateOperationsInput | boolean
    isSystem?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type ProductGalleryImageUpsertWithWhereUniqueWithoutProductInput = {
    where: ProductGalleryImageWhereUniqueInput
    update: XOR<ProductGalleryImageUpdateWithoutProductInput, ProductGalleryImageUncheckedUpdateWithoutProductInput>
    create: XOR<ProductGalleryImageCreateWithoutProductInput, ProductGalleryImageUncheckedCreateWithoutProductInput>
  }

  export type ProductGalleryImageUpdateWithWhereUniqueWithoutProductInput = {
    where: ProductGalleryImageWhereUniqueInput
    data: XOR<ProductGalleryImageUpdateWithoutProductInput, ProductGalleryImageUncheckedUpdateWithoutProductInput>
  }

  export type ProductGalleryImageUpdateManyWithWhereWithoutProductInput = {
    where: ProductGalleryImageScalarWhereInput
    data: XOR<ProductGalleryImageUpdateManyMutationInput, ProductGalleryImageUncheckedUpdateManyWithoutProductInput>
  }

  export type ProductGalleryImageScalarWhereInput = {
    AND?: ProductGalleryImageScalarWhereInput | ProductGalleryImageScalarWhereInput[]
    OR?: ProductGalleryImageScalarWhereInput[]
    NOT?: ProductGalleryImageScalarWhereInput | ProductGalleryImageScalarWhereInput[]
    id?: StringFilter<"ProductGalleryImage"> | string
    productId?: StringFilter<"ProductGalleryImage"> | string
    url?: StringFilter<"ProductGalleryImage"> | string
    alt?: StringNullableFilter<"ProductGalleryImage"> | string | null
    sortOrder?: IntFilter<"ProductGalleryImage"> | number
    deletedAt?: DateTimeNullableFilter<"ProductGalleryImage"> | Date | string | null
    createdAt?: DateTimeFilter<"ProductGalleryImage"> | Date | string
    updatedAt?: DateTimeFilter<"ProductGalleryImage"> | Date | string
  }

  export type ProductVrHotspotUpsertWithWhereUniqueWithoutProductInput = {
    where: ProductVrHotspotWhereUniqueInput
    update: XOR<ProductVrHotspotUpdateWithoutProductInput, ProductVrHotspotUncheckedUpdateWithoutProductInput>
    create: XOR<ProductVrHotspotCreateWithoutProductInput, ProductVrHotspotUncheckedCreateWithoutProductInput>
  }

  export type ProductVrHotspotUpdateWithWhereUniqueWithoutProductInput = {
    where: ProductVrHotspotWhereUniqueInput
    data: XOR<ProductVrHotspotUpdateWithoutProductInput, ProductVrHotspotUncheckedUpdateWithoutProductInput>
  }

  export type ProductVrHotspotUpdateManyWithWhereWithoutProductInput = {
    where: ProductVrHotspotScalarWhereInput
    data: XOR<ProductVrHotspotUpdateManyMutationInput, ProductVrHotspotUncheckedUpdateManyWithoutProductInput>
  }

  export type ProductVrHotspotScalarWhereInput = {
    AND?: ProductVrHotspotScalarWhereInput | ProductVrHotspotScalarWhereInput[]
    OR?: ProductVrHotspotScalarWhereInput[]
    NOT?: ProductVrHotspotScalarWhereInput | ProductVrHotspotScalarWhereInput[]
    id?: StringFilter<"ProductVrHotspot"> | string
    productId?: StringFilter<"ProductVrHotspot"> | string
    x?: FloatFilter<"ProductVrHotspot"> | number
    y?: FloatFilter<"ProductVrHotspot"> | number
    panoImageUrl?: StringFilter<"ProductVrHotspot"> | string
    title?: StringNullableFilter<"ProductVrHotspot"> | string | null
    body?: StringNullableFilter<"ProductVrHotspot"> | string | null
    yaw?: FloatNullableFilter<"ProductVrHotspot"> | number | null
    pitch?: FloatNullableFilter<"ProductVrHotspot"> | number | null
    fov?: FloatNullableFilter<"ProductVrHotspot"> | number | null
    deletedAt?: DateTimeNullableFilter<"ProductVrHotspot"> | Date | string | null
    createdAt?: DateTimeFilter<"ProductVrHotspot"> | Date | string
    updatedAt?: DateTimeFilter<"ProductVrHotspot"> | Date | string
  }

  export type ProductCommentUpsertWithWhereUniqueWithoutProductInput = {
    where: ProductCommentWhereUniqueInput
    update: XOR<ProductCommentUpdateWithoutProductInput, ProductCommentUncheckedUpdateWithoutProductInput>
    create: XOR<ProductCommentCreateWithoutProductInput, ProductCommentUncheckedCreateWithoutProductInput>
  }

  export type ProductCommentUpdateWithWhereUniqueWithoutProductInput = {
    where: ProductCommentWhereUniqueInput
    data: XOR<ProductCommentUpdateWithoutProductInput, ProductCommentUncheckedUpdateWithoutProductInput>
  }

  export type ProductCommentUpdateManyWithWhereWithoutProductInput = {
    where: ProductCommentScalarWhereInput
    data: XOR<ProductCommentUpdateManyMutationInput, ProductCommentUncheckedUpdateManyWithoutProductInput>
  }

  export type ProductCommentScalarWhereInput = {
    AND?: ProductCommentScalarWhereInput | ProductCommentScalarWhereInput[]
    OR?: ProductCommentScalarWhereInput[]
    NOT?: ProductCommentScalarWhereInput | ProductCommentScalarWhereInput[]
    id?: StringFilter<"ProductComment"> | string
    productId?: StringFilter<"ProductComment"> | string
    userId?: StringNullableFilter<"ProductComment"> | string | null
    authorName?: StringNullableFilter<"ProductComment"> | string | null
    authorEmail?: StringNullableFilter<"ProductComment"> | string | null
    rating?: IntNullableFilter<"ProductComment"> | number | null
    body?: StringFilter<"ProductComment"> | string
    status?: EnumCommentStatusFilter<"ProductComment"> | $Enums.CommentStatus
    parentId?: StringNullableFilter<"ProductComment"> | string | null
    deletedAt?: DateTimeNullableFilter<"ProductComment"> | Date | string | null
    createdAt?: DateTimeFilter<"ProductComment"> | Date | string
    updatedAt?: DateTimeFilter<"ProductComment"> | Date | string
  }

  export type ProductAttributeUpsertWithWhereUniqueWithoutProductInput = {
    where: ProductAttributeWhereUniqueInput
    update: XOR<ProductAttributeUpdateWithoutProductInput, ProductAttributeUncheckedUpdateWithoutProductInput>
    create: XOR<ProductAttributeCreateWithoutProductInput, ProductAttributeUncheckedCreateWithoutProductInput>
  }

  export type ProductAttributeUpdateWithWhereUniqueWithoutProductInput = {
    where: ProductAttributeWhereUniqueInput
    data: XOR<ProductAttributeUpdateWithoutProductInput, ProductAttributeUncheckedUpdateWithoutProductInput>
  }

  export type ProductAttributeUpdateManyWithWhereWithoutProductInput = {
    where: ProductAttributeScalarWhereInput
    data: XOR<ProductAttributeUpdateManyMutationInput, ProductAttributeUncheckedUpdateManyWithoutProductInput>
  }

  export type ProductAttributeScalarWhereInput = {
    AND?: ProductAttributeScalarWhereInput | ProductAttributeScalarWhereInput[]
    OR?: ProductAttributeScalarWhereInput[]
    NOT?: ProductAttributeScalarWhereInput | ProductAttributeScalarWhereInput[]
    id?: StringFilter<"ProductAttribute"> | string
    productId?: StringFilter<"ProductAttribute"> | string
    key?: StringFilter<"ProductAttribute"> | string
    valueType?: EnumAttributeValueTypeFilter<"ProductAttribute"> | $Enums.AttributeValueType
    valueString?: StringNullableFilter<"ProductAttribute"> | string | null
    valueInt?: IntNullableFilter<"ProductAttribute"> | number | null
    valueBool?: BoolNullableFilter<"ProductAttribute"> | boolean | null
    deletedAt?: DateTimeNullableFilter<"ProductAttribute"> | Date | string | null
    createdAt?: DateTimeFilter<"ProductAttribute"> | Date | string
    updatedAt?: DateTimeFilter<"ProductAttribute"> | Date | string
  }

  export type ProductCreateWithoutGalleryInput = {
    id?: string
    slug: string
    title: string
    description: string
    excerpt?: string | null
    sku: string
    status?: $Enums.ProductStatus
    price: Decimal | DecimalJsLike | number | string
    currency?: string
    thumbnailUrl?: string | null
    discountType?: $Enums.DiscountType | null
    discountValue?: Decimal | DecimalJsLike | number | string | null
    discountActive?: boolean
    discountStart?: Date | string | null
    discountEnd?: Date | string | null
    model3dUrl?: string | null
    model3dFormat?: string | null
    model3dLiveView?: boolean
    model3dPosterUrl?: string | null
    vrPlanImageUrl?: string | null
    vrEnabled?: boolean
    metaTitle?: string | null
    metaDescription?: string | null
    metaKeywords?: string | null
    customSchema?: string | null
    noindex?: boolean
    isFeatured?: boolean
    featureSort?: number
    promoTitle?: string | null
    promoBadge?: string | null
    promoActive?: boolean
    promoStart?: Date | string | null
    promoEnd?: Date | string | null
    tags?: ProductCreatetagsInput | string[]
    complementaryIds?: ProductCreatecomplementaryIdsInput | string[]
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    category: ProductCategoryCreateNestedOneWithoutProductsInput
    vrHotspots?: ProductVrHotspotCreateNestedManyWithoutProductInput
    comments?: ProductCommentCreateNestedManyWithoutProductInput
    attributes?: ProductAttributeCreateNestedManyWithoutProductInput
  }

  export type ProductUncheckedCreateWithoutGalleryInput = {
    id?: string
    slug: string
    title: string
    description: string
    excerpt?: string | null
    sku: string
    status?: $Enums.ProductStatus
    price: Decimal | DecimalJsLike | number | string
    currency?: string
    thumbnailUrl?: string | null
    categoryId: string
    discountType?: $Enums.DiscountType | null
    discountValue?: Decimal | DecimalJsLike | number | string | null
    discountActive?: boolean
    discountStart?: Date | string | null
    discountEnd?: Date | string | null
    model3dUrl?: string | null
    model3dFormat?: string | null
    model3dLiveView?: boolean
    model3dPosterUrl?: string | null
    vrPlanImageUrl?: string | null
    vrEnabled?: boolean
    metaTitle?: string | null
    metaDescription?: string | null
    metaKeywords?: string | null
    customSchema?: string | null
    noindex?: boolean
    isFeatured?: boolean
    featureSort?: number
    promoTitle?: string | null
    promoBadge?: string | null
    promoActive?: boolean
    promoStart?: Date | string | null
    promoEnd?: Date | string | null
    tags?: ProductCreatetagsInput | string[]
    complementaryIds?: ProductCreatecomplementaryIdsInput | string[]
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    vrHotspots?: ProductVrHotspotUncheckedCreateNestedManyWithoutProductInput
    comments?: ProductCommentUncheckedCreateNestedManyWithoutProductInput
    attributes?: ProductAttributeUncheckedCreateNestedManyWithoutProductInput
  }

  export type ProductCreateOrConnectWithoutGalleryInput = {
    where: ProductWhereUniqueInput
    create: XOR<ProductCreateWithoutGalleryInput, ProductUncheckedCreateWithoutGalleryInput>
  }

  export type ProductUpsertWithoutGalleryInput = {
    update: XOR<ProductUpdateWithoutGalleryInput, ProductUncheckedUpdateWithoutGalleryInput>
    create: XOR<ProductCreateWithoutGalleryInput, ProductUncheckedCreateWithoutGalleryInput>
    where?: ProductWhereInput
  }

  export type ProductUpdateToOneWithWhereWithoutGalleryInput = {
    where?: ProductWhereInput
    data: XOR<ProductUpdateWithoutGalleryInput, ProductUncheckedUpdateWithoutGalleryInput>
  }

  export type ProductUpdateWithoutGalleryInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    excerpt?: NullableStringFieldUpdateOperationsInput | string | null
    sku?: StringFieldUpdateOperationsInput | string
    status?: EnumProductStatusFieldUpdateOperationsInput | $Enums.ProductStatus
    price?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    thumbnailUrl?: NullableStringFieldUpdateOperationsInput | string | null
    discountType?: NullableEnumDiscountTypeFieldUpdateOperationsInput | $Enums.DiscountType | null
    discountValue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    discountActive?: BoolFieldUpdateOperationsInput | boolean
    discountStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    discountEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    model3dUrl?: NullableStringFieldUpdateOperationsInput | string | null
    model3dFormat?: NullableStringFieldUpdateOperationsInput | string | null
    model3dLiveView?: BoolFieldUpdateOperationsInput | boolean
    model3dPosterUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vrPlanImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vrEnabled?: BoolFieldUpdateOperationsInput | boolean
    metaTitle?: NullableStringFieldUpdateOperationsInput | string | null
    metaDescription?: NullableStringFieldUpdateOperationsInput | string | null
    metaKeywords?: NullableStringFieldUpdateOperationsInput | string | null
    customSchema?: NullableStringFieldUpdateOperationsInput | string | null
    noindex?: BoolFieldUpdateOperationsInput | boolean
    isFeatured?: BoolFieldUpdateOperationsInput | boolean
    featureSort?: IntFieldUpdateOperationsInput | number
    promoTitle?: NullableStringFieldUpdateOperationsInput | string | null
    promoBadge?: NullableStringFieldUpdateOperationsInput | string | null
    promoActive?: BoolFieldUpdateOperationsInput | boolean
    promoStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    promoEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tags?: ProductUpdatetagsInput | string[]
    complementaryIds?: ProductUpdatecomplementaryIdsInput | string[]
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    category?: ProductCategoryUpdateOneRequiredWithoutProductsNestedInput
    vrHotspots?: ProductVrHotspotUpdateManyWithoutProductNestedInput
    comments?: ProductCommentUpdateManyWithoutProductNestedInput
    attributes?: ProductAttributeUpdateManyWithoutProductNestedInput
  }

  export type ProductUncheckedUpdateWithoutGalleryInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    excerpt?: NullableStringFieldUpdateOperationsInput | string | null
    sku?: StringFieldUpdateOperationsInput | string
    status?: EnumProductStatusFieldUpdateOperationsInput | $Enums.ProductStatus
    price?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    thumbnailUrl?: NullableStringFieldUpdateOperationsInput | string | null
    categoryId?: StringFieldUpdateOperationsInput | string
    discountType?: NullableEnumDiscountTypeFieldUpdateOperationsInput | $Enums.DiscountType | null
    discountValue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    discountActive?: BoolFieldUpdateOperationsInput | boolean
    discountStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    discountEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    model3dUrl?: NullableStringFieldUpdateOperationsInput | string | null
    model3dFormat?: NullableStringFieldUpdateOperationsInput | string | null
    model3dLiveView?: BoolFieldUpdateOperationsInput | boolean
    model3dPosterUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vrPlanImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vrEnabled?: BoolFieldUpdateOperationsInput | boolean
    metaTitle?: NullableStringFieldUpdateOperationsInput | string | null
    metaDescription?: NullableStringFieldUpdateOperationsInput | string | null
    metaKeywords?: NullableStringFieldUpdateOperationsInput | string | null
    customSchema?: NullableStringFieldUpdateOperationsInput | string | null
    noindex?: BoolFieldUpdateOperationsInput | boolean
    isFeatured?: BoolFieldUpdateOperationsInput | boolean
    featureSort?: IntFieldUpdateOperationsInput | number
    promoTitle?: NullableStringFieldUpdateOperationsInput | string | null
    promoBadge?: NullableStringFieldUpdateOperationsInput | string | null
    promoActive?: BoolFieldUpdateOperationsInput | boolean
    promoStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    promoEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tags?: ProductUpdatetagsInput | string[]
    complementaryIds?: ProductUpdatecomplementaryIdsInput | string[]
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    vrHotspots?: ProductVrHotspotUncheckedUpdateManyWithoutProductNestedInput
    comments?: ProductCommentUncheckedUpdateManyWithoutProductNestedInput
    attributes?: ProductAttributeUncheckedUpdateManyWithoutProductNestedInput
  }

  export type ProductCreateWithoutVrHotspotsInput = {
    id?: string
    slug: string
    title: string
    description: string
    excerpt?: string | null
    sku: string
    status?: $Enums.ProductStatus
    price: Decimal | DecimalJsLike | number | string
    currency?: string
    thumbnailUrl?: string | null
    discountType?: $Enums.DiscountType | null
    discountValue?: Decimal | DecimalJsLike | number | string | null
    discountActive?: boolean
    discountStart?: Date | string | null
    discountEnd?: Date | string | null
    model3dUrl?: string | null
    model3dFormat?: string | null
    model3dLiveView?: boolean
    model3dPosterUrl?: string | null
    vrPlanImageUrl?: string | null
    vrEnabled?: boolean
    metaTitle?: string | null
    metaDescription?: string | null
    metaKeywords?: string | null
    customSchema?: string | null
    noindex?: boolean
    isFeatured?: boolean
    featureSort?: number
    promoTitle?: string | null
    promoBadge?: string | null
    promoActive?: boolean
    promoStart?: Date | string | null
    promoEnd?: Date | string | null
    tags?: ProductCreatetagsInput | string[]
    complementaryIds?: ProductCreatecomplementaryIdsInput | string[]
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    category: ProductCategoryCreateNestedOneWithoutProductsInput
    gallery?: ProductGalleryImageCreateNestedManyWithoutProductInput
    comments?: ProductCommentCreateNestedManyWithoutProductInput
    attributes?: ProductAttributeCreateNestedManyWithoutProductInput
  }

  export type ProductUncheckedCreateWithoutVrHotspotsInput = {
    id?: string
    slug: string
    title: string
    description: string
    excerpt?: string | null
    sku: string
    status?: $Enums.ProductStatus
    price: Decimal | DecimalJsLike | number | string
    currency?: string
    thumbnailUrl?: string | null
    categoryId: string
    discountType?: $Enums.DiscountType | null
    discountValue?: Decimal | DecimalJsLike | number | string | null
    discountActive?: boolean
    discountStart?: Date | string | null
    discountEnd?: Date | string | null
    model3dUrl?: string | null
    model3dFormat?: string | null
    model3dLiveView?: boolean
    model3dPosterUrl?: string | null
    vrPlanImageUrl?: string | null
    vrEnabled?: boolean
    metaTitle?: string | null
    metaDescription?: string | null
    metaKeywords?: string | null
    customSchema?: string | null
    noindex?: boolean
    isFeatured?: boolean
    featureSort?: number
    promoTitle?: string | null
    promoBadge?: string | null
    promoActive?: boolean
    promoStart?: Date | string | null
    promoEnd?: Date | string | null
    tags?: ProductCreatetagsInput | string[]
    complementaryIds?: ProductCreatecomplementaryIdsInput | string[]
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    gallery?: ProductGalleryImageUncheckedCreateNestedManyWithoutProductInput
    comments?: ProductCommentUncheckedCreateNestedManyWithoutProductInput
    attributes?: ProductAttributeUncheckedCreateNestedManyWithoutProductInput
  }

  export type ProductCreateOrConnectWithoutVrHotspotsInput = {
    where: ProductWhereUniqueInput
    create: XOR<ProductCreateWithoutVrHotspotsInput, ProductUncheckedCreateWithoutVrHotspotsInput>
  }

  export type ProductUpsertWithoutVrHotspotsInput = {
    update: XOR<ProductUpdateWithoutVrHotspotsInput, ProductUncheckedUpdateWithoutVrHotspotsInput>
    create: XOR<ProductCreateWithoutVrHotspotsInput, ProductUncheckedCreateWithoutVrHotspotsInput>
    where?: ProductWhereInput
  }

  export type ProductUpdateToOneWithWhereWithoutVrHotspotsInput = {
    where?: ProductWhereInput
    data: XOR<ProductUpdateWithoutVrHotspotsInput, ProductUncheckedUpdateWithoutVrHotspotsInput>
  }

  export type ProductUpdateWithoutVrHotspotsInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    excerpt?: NullableStringFieldUpdateOperationsInput | string | null
    sku?: StringFieldUpdateOperationsInput | string
    status?: EnumProductStatusFieldUpdateOperationsInput | $Enums.ProductStatus
    price?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    thumbnailUrl?: NullableStringFieldUpdateOperationsInput | string | null
    discountType?: NullableEnumDiscountTypeFieldUpdateOperationsInput | $Enums.DiscountType | null
    discountValue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    discountActive?: BoolFieldUpdateOperationsInput | boolean
    discountStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    discountEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    model3dUrl?: NullableStringFieldUpdateOperationsInput | string | null
    model3dFormat?: NullableStringFieldUpdateOperationsInput | string | null
    model3dLiveView?: BoolFieldUpdateOperationsInput | boolean
    model3dPosterUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vrPlanImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vrEnabled?: BoolFieldUpdateOperationsInput | boolean
    metaTitle?: NullableStringFieldUpdateOperationsInput | string | null
    metaDescription?: NullableStringFieldUpdateOperationsInput | string | null
    metaKeywords?: NullableStringFieldUpdateOperationsInput | string | null
    customSchema?: NullableStringFieldUpdateOperationsInput | string | null
    noindex?: BoolFieldUpdateOperationsInput | boolean
    isFeatured?: BoolFieldUpdateOperationsInput | boolean
    featureSort?: IntFieldUpdateOperationsInput | number
    promoTitle?: NullableStringFieldUpdateOperationsInput | string | null
    promoBadge?: NullableStringFieldUpdateOperationsInput | string | null
    promoActive?: BoolFieldUpdateOperationsInput | boolean
    promoStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    promoEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tags?: ProductUpdatetagsInput | string[]
    complementaryIds?: ProductUpdatecomplementaryIdsInput | string[]
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    category?: ProductCategoryUpdateOneRequiredWithoutProductsNestedInput
    gallery?: ProductGalleryImageUpdateManyWithoutProductNestedInput
    comments?: ProductCommentUpdateManyWithoutProductNestedInput
    attributes?: ProductAttributeUpdateManyWithoutProductNestedInput
  }

  export type ProductUncheckedUpdateWithoutVrHotspotsInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    excerpt?: NullableStringFieldUpdateOperationsInput | string | null
    sku?: StringFieldUpdateOperationsInput | string
    status?: EnumProductStatusFieldUpdateOperationsInput | $Enums.ProductStatus
    price?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    thumbnailUrl?: NullableStringFieldUpdateOperationsInput | string | null
    categoryId?: StringFieldUpdateOperationsInput | string
    discountType?: NullableEnumDiscountTypeFieldUpdateOperationsInput | $Enums.DiscountType | null
    discountValue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    discountActive?: BoolFieldUpdateOperationsInput | boolean
    discountStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    discountEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    model3dUrl?: NullableStringFieldUpdateOperationsInput | string | null
    model3dFormat?: NullableStringFieldUpdateOperationsInput | string | null
    model3dLiveView?: BoolFieldUpdateOperationsInput | boolean
    model3dPosterUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vrPlanImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vrEnabled?: BoolFieldUpdateOperationsInput | boolean
    metaTitle?: NullableStringFieldUpdateOperationsInput | string | null
    metaDescription?: NullableStringFieldUpdateOperationsInput | string | null
    metaKeywords?: NullableStringFieldUpdateOperationsInput | string | null
    customSchema?: NullableStringFieldUpdateOperationsInput | string | null
    noindex?: BoolFieldUpdateOperationsInput | boolean
    isFeatured?: BoolFieldUpdateOperationsInput | boolean
    featureSort?: IntFieldUpdateOperationsInput | number
    promoTitle?: NullableStringFieldUpdateOperationsInput | string | null
    promoBadge?: NullableStringFieldUpdateOperationsInput | string | null
    promoActive?: BoolFieldUpdateOperationsInput | boolean
    promoStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    promoEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tags?: ProductUpdatetagsInput | string[]
    complementaryIds?: ProductUpdatecomplementaryIdsInput | string[]
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gallery?: ProductGalleryImageUncheckedUpdateManyWithoutProductNestedInput
    comments?: ProductCommentUncheckedUpdateManyWithoutProductNestedInput
    attributes?: ProductAttributeUncheckedUpdateManyWithoutProductNestedInput
  }

  export type ProductCreateWithoutAttributesInput = {
    id?: string
    slug: string
    title: string
    description: string
    excerpt?: string | null
    sku: string
    status?: $Enums.ProductStatus
    price: Decimal | DecimalJsLike | number | string
    currency?: string
    thumbnailUrl?: string | null
    discountType?: $Enums.DiscountType | null
    discountValue?: Decimal | DecimalJsLike | number | string | null
    discountActive?: boolean
    discountStart?: Date | string | null
    discountEnd?: Date | string | null
    model3dUrl?: string | null
    model3dFormat?: string | null
    model3dLiveView?: boolean
    model3dPosterUrl?: string | null
    vrPlanImageUrl?: string | null
    vrEnabled?: boolean
    metaTitle?: string | null
    metaDescription?: string | null
    metaKeywords?: string | null
    customSchema?: string | null
    noindex?: boolean
    isFeatured?: boolean
    featureSort?: number
    promoTitle?: string | null
    promoBadge?: string | null
    promoActive?: boolean
    promoStart?: Date | string | null
    promoEnd?: Date | string | null
    tags?: ProductCreatetagsInput | string[]
    complementaryIds?: ProductCreatecomplementaryIdsInput | string[]
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    category: ProductCategoryCreateNestedOneWithoutProductsInput
    gallery?: ProductGalleryImageCreateNestedManyWithoutProductInput
    vrHotspots?: ProductVrHotspotCreateNestedManyWithoutProductInput
    comments?: ProductCommentCreateNestedManyWithoutProductInput
  }

  export type ProductUncheckedCreateWithoutAttributesInput = {
    id?: string
    slug: string
    title: string
    description: string
    excerpt?: string | null
    sku: string
    status?: $Enums.ProductStatus
    price: Decimal | DecimalJsLike | number | string
    currency?: string
    thumbnailUrl?: string | null
    categoryId: string
    discountType?: $Enums.DiscountType | null
    discountValue?: Decimal | DecimalJsLike | number | string | null
    discountActive?: boolean
    discountStart?: Date | string | null
    discountEnd?: Date | string | null
    model3dUrl?: string | null
    model3dFormat?: string | null
    model3dLiveView?: boolean
    model3dPosterUrl?: string | null
    vrPlanImageUrl?: string | null
    vrEnabled?: boolean
    metaTitle?: string | null
    metaDescription?: string | null
    metaKeywords?: string | null
    customSchema?: string | null
    noindex?: boolean
    isFeatured?: boolean
    featureSort?: number
    promoTitle?: string | null
    promoBadge?: string | null
    promoActive?: boolean
    promoStart?: Date | string | null
    promoEnd?: Date | string | null
    tags?: ProductCreatetagsInput | string[]
    complementaryIds?: ProductCreatecomplementaryIdsInput | string[]
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    gallery?: ProductGalleryImageUncheckedCreateNestedManyWithoutProductInput
    vrHotspots?: ProductVrHotspotUncheckedCreateNestedManyWithoutProductInput
    comments?: ProductCommentUncheckedCreateNestedManyWithoutProductInput
  }

  export type ProductCreateOrConnectWithoutAttributesInput = {
    where: ProductWhereUniqueInput
    create: XOR<ProductCreateWithoutAttributesInput, ProductUncheckedCreateWithoutAttributesInput>
  }

  export type ProductUpsertWithoutAttributesInput = {
    update: XOR<ProductUpdateWithoutAttributesInput, ProductUncheckedUpdateWithoutAttributesInput>
    create: XOR<ProductCreateWithoutAttributesInput, ProductUncheckedCreateWithoutAttributesInput>
    where?: ProductWhereInput
  }

  export type ProductUpdateToOneWithWhereWithoutAttributesInput = {
    where?: ProductWhereInput
    data: XOR<ProductUpdateWithoutAttributesInput, ProductUncheckedUpdateWithoutAttributesInput>
  }

  export type ProductUpdateWithoutAttributesInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    excerpt?: NullableStringFieldUpdateOperationsInput | string | null
    sku?: StringFieldUpdateOperationsInput | string
    status?: EnumProductStatusFieldUpdateOperationsInput | $Enums.ProductStatus
    price?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    thumbnailUrl?: NullableStringFieldUpdateOperationsInput | string | null
    discountType?: NullableEnumDiscountTypeFieldUpdateOperationsInput | $Enums.DiscountType | null
    discountValue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    discountActive?: BoolFieldUpdateOperationsInput | boolean
    discountStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    discountEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    model3dUrl?: NullableStringFieldUpdateOperationsInput | string | null
    model3dFormat?: NullableStringFieldUpdateOperationsInput | string | null
    model3dLiveView?: BoolFieldUpdateOperationsInput | boolean
    model3dPosterUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vrPlanImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vrEnabled?: BoolFieldUpdateOperationsInput | boolean
    metaTitle?: NullableStringFieldUpdateOperationsInput | string | null
    metaDescription?: NullableStringFieldUpdateOperationsInput | string | null
    metaKeywords?: NullableStringFieldUpdateOperationsInput | string | null
    customSchema?: NullableStringFieldUpdateOperationsInput | string | null
    noindex?: BoolFieldUpdateOperationsInput | boolean
    isFeatured?: BoolFieldUpdateOperationsInput | boolean
    featureSort?: IntFieldUpdateOperationsInput | number
    promoTitle?: NullableStringFieldUpdateOperationsInput | string | null
    promoBadge?: NullableStringFieldUpdateOperationsInput | string | null
    promoActive?: BoolFieldUpdateOperationsInput | boolean
    promoStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    promoEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tags?: ProductUpdatetagsInput | string[]
    complementaryIds?: ProductUpdatecomplementaryIdsInput | string[]
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    category?: ProductCategoryUpdateOneRequiredWithoutProductsNestedInput
    gallery?: ProductGalleryImageUpdateManyWithoutProductNestedInput
    vrHotspots?: ProductVrHotspotUpdateManyWithoutProductNestedInput
    comments?: ProductCommentUpdateManyWithoutProductNestedInput
  }

  export type ProductUncheckedUpdateWithoutAttributesInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    excerpt?: NullableStringFieldUpdateOperationsInput | string | null
    sku?: StringFieldUpdateOperationsInput | string
    status?: EnumProductStatusFieldUpdateOperationsInput | $Enums.ProductStatus
    price?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    thumbnailUrl?: NullableStringFieldUpdateOperationsInput | string | null
    categoryId?: StringFieldUpdateOperationsInput | string
    discountType?: NullableEnumDiscountTypeFieldUpdateOperationsInput | $Enums.DiscountType | null
    discountValue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    discountActive?: BoolFieldUpdateOperationsInput | boolean
    discountStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    discountEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    model3dUrl?: NullableStringFieldUpdateOperationsInput | string | null
    model3dFormat?: NullableStringFieldUpdateOperationsInput | string | null
    model3dLiveView?: BoolFieldUpdateOperationsInput | boolean
    model3dPosterUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vrPlanImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vrEnabled?: BoolFieldUpdateOperationsInput | boolean
    metaTitle?: NullableStringFieldUpdateOperationsInput | string | null
    metaDescription?: NullableStringFieldUpdateOperationsInput | string | null
    metaKeywords?: NullableStringFieldUpdateOperationsInput | string | null
    customSchema?: NullableStringFieldUpdateOperationsInput | string | null
    noindex?: BoolFieldUpdateOperationsInput | boolean
    isFeatured?: BoolFieldUpdateOperationsInput | boolean
    featureSort?: IntFieldUpdateOperationsInput | number
    promoTitle?: NullableStringFieldUpdateOperationsInput | string | null
    promoBadge?: NullableStringFieldUpdateOperationsInput | string | null
    promoActive?: BoolFieldUpdateOperationsInput | boolean
    promoStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    promoEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tags?: ProductUpdatetagsInput | string[]
    complementaryIds?: ProductUpdatecomplementaryIdsInput | string[]
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gallery?: ProductGalleryImageUncheckedUpdateManyWithoutProductNestedInput
    vrHotspots?: ProductVrHotspotUncheckedUpdateManyWithoutProductNestedInput
    comments?: ProductCommentUncheckedUpdateManyWithoutProductNestedInput
  }

  export type ProductCreateWithoutCommentsInput = {
    id?: string
    slug: string
    title: string
    description: string
    excerpt?: string | null
    sku: string
    status?: $Enums.ProductStatus
    price: Decimal | DecimalJsLike | number | string
    currency?: string
    thumbnailUrl?: string | null
    discountType?: $Enums.DiscountType | null
    discountValue?: Decimal | DecimalJsLike | number | string | null
    discountActive?: boolean
    discountStart?: Date | string | null
    discountEnd?: Date | string | null
    model3dUrl?: string | null
    model3dFormat?: string | null
    model3dLiveView?: boolean
    model3dPosterUrl?: string | null
    vrPlanImageUrl?: string | null
    vrEnabled?: boolean
    metaTitle?: string | null
    metaDescription?: string | null
    metaKeywords?: string | null
    customSchema?: string | null
    noindex?: boolean
    isFeatured?: boolean
    featureSort?: number
    promoTitle?: string | null
    promoBadge?: string | null
    promoActive?: boolean
    promoStart?: Date | string | null
    promoEnd?: Date | string | null
    tags?: ProductCreatetagsInput | string[]
    complementaryIds?: ProductCreatecomplementaryIdsInput | string[]
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    category: ProductCategoryCreateNestedOneWithoutProductsInput
    gallery?: ProductGalleryImageCreateNestedManyWithoutProductInput
    vrHotspots?: ProductVrHotspotCreateNestedManyWithoutProductInput
    attributes?: ProductAttributeCreateNestedManyWithoutProductInput
  }

  export type ProductUncheckedCreateWithoutCommentsInput = {
    id?: string
    slug: string
    title: string
    description: string
    excerpt?: string | null
    sku: string
    status?: $Enums.ProductStatus
    price: Decimal | DecimalJsLike | number | string
    currency?: string
    thumbnailUrl?: string | null
    categoryId: string
    discountType?: $Enums.DiscountType | null
    discountValue?: Decimal | DecimalJsLike | number | string | null
    discountActive?: boolean
    discountStart?: Date | string | null
    discountEnd?: Date | string | null
    model3dUrl?: string | null
    model3dFormat?: string | null
    model3dLiveView?: boolean
    model3dPosterUrl?: string | null
    vrPlanImageUrl?: string | null
    vrEnabled?: boolean
    metaTitle?: string | null
    metaDescription?: string | null
    metaKeywords?: string | null
    customSchema?: string | null
    noindex?: boolean
    isFeatured?: boolean
    featureSort?: number
    promoTitle?: string | null
    promoBadge?: string | null
    promoActive?: boolean
    promoStart?: Date | string | null
    promoEnd?: Date | string | null
    tags?: ProductCreatetagsInput | string[]
    complementaryIds?: ProductCreatecomplementaryIdsInput | string[]
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    gallery?: ProductGalleryImageUncheckedCreateNestedManyWithoutProductInput
    vrHotspots?: ProductVrHotspotUncheckedCreateNestedManyWithoutProductInput
    attributes?: ProductAttributeUncheckedCreateNestedManyWithoutProductInput
  }

  export type ProductCreateOrConnectWithoutCommentsInput = {
    where: ProductWhereUniqueInput
    create: XOR<ProductCreateWithoutCommentsInput, ProductUncheckedCreateWithoutCommentsInput>
  }

  export type ProductUpsertWithoutCommentsInput = {
    update: XOR<ProductUpdateWithoutCommentsInput, ProductUncheckedUpdateWithoutCommentsInput>
    create: XOR<ProductCreateWithoutCommentsInput, ProductUncheckedCreateWithoutCommentsInput>
    where?: ProductWhereInput
  }

  export type ProductUpdateToOneWithWhereWithoutCommentsInput = {
    where?: ProductWhereInput
    data: XOR<ProductUpdateWithoutCommentsInput, ProductUncheckedUpdateWithoutCommentsInput>
  }

  export type ProductUpdateWithoutCommentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    excerpt?: NullableStringFieldUpdateOperationsInput | string | null
    sku?: StringFieldUpdateOperationsInput | string
    status?: EnumProductStatusFieldUpdateOperationsInput | $Enums.ProductStatus
    price?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    thumbnailUrl?: NullableStringFieldUpdateOperationsInput | string | null
    discountType?: NullableEnumDiscountTypeFieldUpdateOperationsInput | $Enums.DiscountType | null
    discountValue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    discountActive?: BoolFieldUpdateOperationsInput | boolean
    discountStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    discountEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    model3dUrl?: NullableStringFieldUpdateOperationsInput | string | null
    model3dFormat?: NullableStringFieldUpdateOperationsInput | string | null
    model3dLiveView?: BoolFieldUpdateOperationsInput | boolean
    model3dPosterUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vrPlanImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vrEnabled?: BoolFieldUpdateOperationsInput | boolean
    metaTitle?: NullableStringFieldUpdateOperationsInput | string | null
    metaDescription?: NullableStringFieldUpdateOperationsInput | string | null
    metaKeywords?: NullableStringFieldUpdateOperationsInput | string | null
    customSchema?: NullableStringFieldUpdateOperationsInput | string | null
    noindex?: BoolFieldUpdateOperationsInput | boolean
    isFeatured?: BoolFieldUpdateOperationsInput | boolean
    featureSort?: IntFieldUpdateOperationsInput | number
    promoTitle?: NullableStringFieldUpdateOperationsInput | string | null
    promoBadge?: NullableStringFieldUpdateOperationsInput | string | null
    promoActive?: BoolFieldUpdateOperationsInput | boolean
    promoStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    promoEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tags?: ProductUpdatetagsInput | string[]
    complementaryIds?: ProductUpdatecomplementaryIdsInput | string[]
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    category?: ProductCategoryUpdateOneRequiredWithoutProductsNestedInput
    gallery?: ProductGalleryImageUpdateManyWithoutProductNestedInput
    vrHotspots?: ProductVrHotspotUpdateManyWithoutProductNestedInput
    attributes?: ProductAttributeUpdateManyWithoutProductNestedInput
  }

  export type ProductUncheckedUpdateWithoutCommentsInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    excerpt?: NullableStringFieldUpdateOperationsInput | string | null
    sku?: StringFieldUpdateOperationsInput | string
    status?: EnumProductStatusFieldUpdateOperationsInput | $Enums.ProductStatus
    price?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    thumbnailUrl?: NullableStringFieldUpdateOperationsInput | string | null
    categoryId?: StringFieldUpdateOperationsInput | string
    discountType?: NullableEnumDiscountTypeFieldUpdateOperationsInput | $Enums.DiscountType | null
    discountValue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    discountActive?: BoolFieldUpdateOperationsInput | boolean
    discountStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    discountEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    model3dUrl?: NullableStringFieldUpdateOperationsInput | string | null
    model3dFormat?: NullableStringFieldUpdateOperationsInput | string | null
    model3dLiveView?: BoolFieldUpdateOperationsInput | boolean
    model3dPosterUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vrPlanImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vrEnabled?: BoolFieldUpdateOperationsInput | boolean
    metaTitle?: NullableStringFieldUpdateOperationsInput | string | null
    metaDescription?: NullableStringFieldUpdateOperationsInput | string | null
    metaKeywords?: NullableStringFieldUpdateOperationsInput | string | null
    customSchema?: NullableStringFieldUpdateOperationsInput | string | null
    noindex?: BoolFieldUpdateOperationsInput | boolean
    isFeatured?: BoolFieldUpdateOperationsInput | boolean
    featureSort?: IntFieldUpdateOperationsInput | number
    promoTitle?: NullableStringFieldUpdateOperationsInput | string | null
    promoBadge?: NullableStringFieldUpdateOperationsInput | string | null
    promoActive?: BoolFieldUpdateOperationsInput | boolean
    promoStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    promoEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tags?: ProductUpdatetagsInput | string[]
    complementaryIds?: ProductUpdatecomplementaryIdsInput | string[]
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gallery?: ProductGalleryImageUncheckedUpdateManyWithoutProductNestedInput
    vrHotspots?: ProductVrHotspotUncheckedUpdateManyWithoutProductNestedInput
    attributes?: ProductAttributeUncheckedUpdateManyWithoutProductNestedInput
  }

  export type ProductCreateManyCategoryInput = {
    id?: string
    slug: string
    title: string
    description: string
    excerpt?: string | null
    sku: string
    status?: $Enums.ProductStatus
    price: Decimal | DecimalJsLike | number | string
    currency?: string
    thumbnailUrl?: string | null
    discountType?: $Enums.DiscountType | null
    discountValue?: Decimal | DecimalJsLike | number | string | null
    discountActive?: boolean
    discountStart?: Date | string | null
    discountEnd?: Date | string | null
    model3dUrl?: string | null
    model3dFormat?: string | null
    model3dLiveView?: boolean
    model3dPosterUrl?: string | null
    vrPlanImageUrl?: string | null
    vrEnabled?: boolean
    metaTitle?: string | null
    metaDescription?: string | null
    metaKeywords?: string | null
    customSchema?: string | null
    noindex?: boolean
    isFeatured?: boolean
    featureSort?: number
    promoTitle?: string | null
    promoBadge?: string | null
    promoActive?: boolean
    promoStart?: Date | string | null
    promoEnd?: Date | string | null
    tags?: ProductCreatetagsInput | string[]
    complementaryIds?: ProductCreatecomplementaryIdsInput | string[]
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProductUpdateWithoutCategoryInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    excerpt?: NullableStringFieldUpdateOperationsInput | string | null
    sku?: StringFieldUpdateOperationsInput | string
    status?: EnumProductStatusFieldUpdateOperationsInput | $Enums.ProductStatus
    price?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    thumbnailUrl?: NullableStringFieldUpdateOperationsInput | string | null
    discountType?: NullableEnumDiscountTypeFieldUpdateOperationsInput | $Enums.DiscountType | null
    discountValue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    discountActive?: BoolFieldUpdateOperationsInput | boolean
    discountStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    discountEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    model3dUrl?: NullableStringFieldUpdateOperationsInput | string | null
    model3dFormat?: NullableStringFieldUpdateOperationsInput | string | null
    model3dLiveView?: BoolFieldUpdateOperationsInput | boolean
    model3dPosterUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vrPlanImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vrEnabled?: BoolFieldUpdateOperationsInput | boolean
    metaTitle?: NullableStringFieldUpdateOperationsInput | string | null
    metaDescription?: NullableStringFieldUpdateOperationsInput | string | null
    metaKeywords?: NullableStringFieldUpdateOperationsInput | string | null
    customSchema?: NullableStringFieldUpdateOperationsInput | string | null
    noindex?: BoolFieldUpdateOperationsInput | boolean
    isFeatured?: BoolFieldUpdateOperationsInput | boolean
    featureSort?: IntFieldUpdateOperationsInput | number
    promoTitle?: NullableStringFieldUpdateOperationsInput | string | null
    promoBadge?: NullableStringFieldUpdateOperationsInput | string | null
    promoActive?: BoolFieldUpdateOperationsInput | boolean
    promoStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    promoEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tags?: ProductUpdatetagsInput | string[]
    complementaryIds?: ProductUpdatecomplementaryIdsInput | string[]
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gallery?: ProductGalleryImageUpdateManyWithoutProductNestedInput
    vrHotspots?: ProductVrHotspotUpdateManyWithoutProductNestedInput
    comments?: ProductCommentUpdateManyWithoutProductNestedInput
    attributes?: ProductAttributeUpdateManyWithoutProductNestedInput
  }

  export type ProductUncheckedUpdateWithoutCategoryInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    excerpt?: NullableStringFieldUpdateOperationsInput | string | null
    sku?: StringFieldUpdateOperationsInput | string
    status?: EnumProductStatusFieldUpdateOperationsInput | $Enums.ProductStatus
    price?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    thumbnailUrl?: NullableStringFieldUpdateOperationsInput | string | null
    discountType?: NullableEnumDiscountTypeFieldUpdateOperationsInput | $Enums.DiscountType | null
    discountValue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    discountActive?: BoolFieldUpdateOperationsInput | boolean
    discountStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    discountEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    model3dUrl?: NullableStringFieldUpdateOperationsInput | string | null
    model3dFormat?: NullableStringFieldUpdateOperationsInput | string | null
    model3dLiveView?: BoolFieldUpdateOperationsInput | boolean
    model3dPosterUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vrPlanImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vrEnabled?: BoolFieldUpdateOperationsInput | boolean
    metaTitle?: NullableStringFieldUpdateOperationsInput | string | null
    metaDescription?: NullableStringFieldUpdateOperationsInput | string | null
    metaKeywords?: NullableStringFieldUpdateOperationsInput | string | null
    customSchema?: NullableStringFieldUpdateOperationsInput | string | null
    noindex?: BoolFieldUpdateOperationsInput | boolean
    isFeatured?: BoolFieldUpdateOperationsInput | boolean
    featureSort?: IntFieldUpdateOperationsInput | number
    promoTitle?: NullableStringFieldUpdateOperationsInput | string | null
    promoBadge?: NullableStringFieldUpdateOperationsInput | string | null
    promoActive?: BoolFieldUpdateOperationsInput | boolean
    promoStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    promoEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tags?: ProductUpdatetagsInput | string[]
    complementaryIds?: ProductUpdatecomplementaryIdsInput | string[]
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    gallery?: ProductGalleryImageUncheckedUpdateManyWithoutProductNestedInput
    vrHotspots?: ProductVrHotspotUncheckedUpdateManyWithoutProductNestedInput
    comments?: ProductCommentUncheckedUpdateManyWithoutProductNestedInput
    attributes?: ProductAttributeUncheckedUpdateManyWithoutProductNestedInput
  }

  export type ProductUncheckedUpdateManyWithoutCategoryInput = {
    id?: StringFieldUpdateOperationsInput | string
    slug?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    description?: StringFieldUpdateOperationsInput | string
    excerpt?: NullableStringFieldUpdateOperationsInput | string | null
    sku?: StringFieldUpdateOperationsInput | string
    status?: EnumProductStatusFieldUpdateOperationsInput | $Enums.ProductStatus
    price?: DecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string
    currency?: StringFieldUpdateOperationsInput | string
    thumbnailUrl?: NullableStringFieldUpdateOperationsInput | string | null
    discountType?: NullableEnumDiscountTypeFieldUpdateOperationsInput | $Enums.DiscountType | null
    discountValue?: NullableDecimalFieldUpdateOperationsInput | Decimal | DecimalJsLike | number | string | null
    discountActive?: BoolFieldUpdateOperationsInput | boolean
    discountStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    discountEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    model3dUrl?: NullableStringFieldUpdateOperationsInput | string | null
    model3dFormat?: NullableStringFieldUpdateOperationsInput | string | null
    model3dLiveView?: BoolFieldUpdateOperationsInput | boolean
    model3dPosterUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vrPlanImageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    vrEnabled?: BoolFieldUpdateOperationsInput | boolean
    metaTitle?: NullableStringFieldUpdateOperationsInput | string | null
    metaDescription?: NullableStringFieldUpdateOperationsInput | string | null
    metaKeywords?: NullableStringFieldUpdateOperationsInput | string | null
    customSchema?: NullableStringFieldUpdateOperationsInput | string | null
    noindex?: BoolFieldUpdateOperationsInput | boolean
    isFeatured?: BoolFieldUpdateOperationsInput | boolean
    featureSort?: IntFieldUpdateOperationsInput | number
    promoTitle?: NullableStringFieldUpdateOperationsInput | string | null
    promoBadge?: NullableStringFieldUpdateOperationsInput | string | null
    promoActive?: BoolFieldUpdateOperationsInput | boolean
    promoStart?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    promoEnd?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    tags?: ProductUpdatetagsInput | string[]
    complementaryIds?: ProductUpdatecomplementaryIdsInput | string[]
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProductGalleryImageCreateManyProductInput = {
    id?: string
    url: string
    alt?: string | null
    sortOrder?: number
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProductVrHotspotCreateManyProductInput = {
    id?: string
    x: number
    y: number
    panoImageUrl: string
    title?: string | null
    body?: string | null
    yaw?: number | null
    pitch?: number | null
    fov?: number | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProductCommentCreateManyProductInput = {
    id?: string
    userId?: string | null
    authorName?: string | null
    authorEmail?: string | null
    rating?: number | null
    body: string
    status?: $Enums.CommentStatus
    parentId?: string | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProductAttributeCreateManyProductInput = {
    id?: string
    key: string
    valueType: $Enums.AttributeValueType
    valueString?: string | null
    valueInt?: number | null
    valueBool?: boolean | null
    deletedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type ProductGalleryImageUpdateWithoutProductInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    alt?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProductGalleryImageUncheckedUpdateWithoutProductInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    alt?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProductGalleryImageUncheckedUpdateManyWithoutProductInput = {
    id?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    alt?: NullableStringFieldUpdateOperationsInput | string | null
    sortOrder?: IntFieldUpdateOperationsInput | number
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProductVrHotspotUpdateWithoutProductInput = {
    id?: StringFieldUpdateOperationsInput | string
    x?: FloatFieldUpdateOperationsInput | number
    y?: FloatFieldUpdateOperationsInput | number
    panoImageUrl?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    body?: NullableStringFieldUpdateOperationsInput | string | null
    yaw?: NullableFloatFieldUpdateOperationsInput | number | null
    pitch?: NullableFloatFieldUpdateOperationsInput | number | null
    fov?: NullableFloatFieldUpdateOperationsInput | number | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProductVrHotspotUncheckedUpdateWithoutProductInput = {
    id?: StringFieldUpdateOperationsInput | string
    x?: FloatFieldUpdateOperationsInput | number
    y?: FloatFieldUpdateOperationsInput | number
    panoImageUrl?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    body?: NullableStringFieldUpdateOperationsInput | string | null
    yaw?: NullableFloatFieldUpdateOperationsInput | number | null
    pitch?: NullableFloatFieldUpdateOperationsInput | number | null
    fov?: NullableFloatFieldUpdateOperationsInput | number | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProductVrHotspotUncheckedUpdateManyWithoutProductInput = {
    id?: StringFieldUpdateOperationsInput | string
    x?: FloatFieldUpdateOperationsInput | number
    y?: FloatFieldUpdateOperationsInput | number
    panoImageUrl?: StringFieldUpdateOperationsInput | string
    title?: NullableStringFieldUpdateOperationsInput | string | null
    body?: NullableStringFieldUpdateOperationsInput | string | null
    yaw?: NullableFloatFieldUpdateOperationsInput | number | null
    pitch?: NullableFloatFieldUpdateOperationsInput | number | null
    fov?: NullableFloatFieldUpdateOperationsInput | number | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProductCommentUpdateWithoutProductInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    authorName?: NullableStringFieldUpdateOperationsInput | string | null
    authorEmail?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: NullableIntFieldUpdateOperationsInput | number | null
    body?: StringFieldUpdateOperationsInput | string
    status?: EnumCommentStatusFieldUpdateOperationsInput | $Enums.CommentStatus
    parentId?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProductCommentUncheckedUpdateWithoutProductInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    authorName?: NullableStringFieldUpdateOperationsInput | string | null
    authorEmail?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: NullableIntFieldUpdateOperationsInput | number | null
    body?: StringFieldUpdateOperationsInput | string
    status?: EnumCommentStatusFieldUpdateOperationsInput | $Enums.CommentStatus
    parentId?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProductCommentUncheckedUpdateManyWithoutProductInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: NullableStringFieldUpdateOperationsInput | string | null
    authorName?: NullableStringFieldUpdateOperationsInput | string | null
    authorEmail?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: NullableIntFieldUpdateOperationsInput | number | null
    body?: StringFieldUpdateOperationsInput | string
    status?: EnumCommentStatusFieldUpdateOperationsInput | $Enums.CommentStatus
    parentId?: NullableStringFieldUpdateOperationsInput | string | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProductAttributeUpdateWithoutProductInput = {
    id?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    valueType?: EnumAttributeValueTypeFieldUpdateOperationsInput | $Enums.AttributeValueType
    valueString?: NullableStringFieldUpdateOperationsInput | string | null
    valueInt?: NullableIntFieldUpdateOperationsInput | number | null
    valueBool?: NullableBoolFieldUpdateOperationsInput | boolean | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProductAttributeUncheckedUpdateWithoutProductInput = {
    id?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    valueType?: EnumAttributeValueTypeFieldUpdateOperationsInput | $Enums.AttributeValueType
    valueString?: NullableStringFieldUpdateOperationsInput | string | null
    valueInt?: NullableIntFieldUpdateOperationsInput | number | null
    valueBool?: NullableBoolFieldUpdateOperationsInput | boolean | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProductAttributeUncheckedUpdateManyWithoutProductInput = {
    id?: StringFieldUpdateOperationsInput | string
    key?: StringFieldUpdateOperationsInput | string
    valueType?: EnumAttributeValueTypeFieldUpdateOperationsInput | $Enums.AttributeValueType
    valueString?: NullableStringFieldUpdateOperationsInput | string | null
    valueInt?: NullableIntFieldUpdateOperationsInput | number | null
    valueBool?: NullableBoolFieldUpdateOperationsInput | boolean | null
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}