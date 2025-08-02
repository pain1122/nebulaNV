// types/global.d.ts
declare module "@bufbuild/protobuf/wire" {
    export const BinaryReader: any;
    export const BinaryWriter: any;
  }
  
  declare module "@grpc/grpc-js" {
    export * from "grpc";            // or `any` stubs
    export type Metadata = any;
    export type ClientUnaryCall = any;
    export type ServiceError = any;
    export const makeGenericClientConstructor: any;
  }
  