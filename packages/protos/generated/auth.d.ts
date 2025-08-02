import { BinaryReader, BinaryWriter } from "@bufbuild/protobuf/wire";
import { type CallOptions, type ChannelCredentials, Client, type ClientOptions, type ClientUnaryCall, type handleUnaryCall, type Metadata, type ServiceError, type UntypedServiceImplementation } from "@grpc/grpc-js";
export declare const protobufPackage = "auth";
export interface ValidateUserRequest {
    /** email or phone */
    identifier: string;
    password: string;
}
export interface ValidateUserResponse {
    isValid: boolean;
    userId: string;
}
export interface GetTokensRequest {
    userId: string;
}
export interface RefreshTokensRequest {
    refreshToken: string;
}
export interface GetTokensResponse {
    accessToken: string;
    refreshToken: string;
}
export interface ValidateTokenRequest {
    token: string;
}
export interface ValidateTokenResponse {
    isValid: boolean;
    userId: string;
    email: string;
    role: string;
}
export declare const ValidateUserRequest: MessageFns<ValidateUserRequest>;
export declare const ValidateUserResponse: MessageFns<ValidateUserResponse>;
export declare const GetTokensRequest: MessageFns<GetTokensRequest>;
export declare const RefreshTokensRequest: MessageFns<RefreshTokensRequest>;
export declare const GetTokensResponse: MessageFns<GetTokensResponse>;
export declare const ValidateTokenRequest: MessageFns<ValidateTokenRequest>;
export declare const ValidateTokenResponse: MessageFns<ValidateTokenResponse>;
export type AuthServiceService = typeof AuthServiceService;
export declare const AuthServiceService: {
    /** Validate credentials against user‑service */
    readonly validateUser: {
        readonly path: "/auth.AuthService/ValidateUser";
        readonly requestStream: false;
        readonly responseStream: false;
        readonly requestSerialize: (value: ValidateUserRequest) => Buffer;
        readonly requestDeserialize: (value: Buffer) => ValidateUserRequest;
        readonly responseSerialize: (value: ValidateUserResponse) => Buffer;
        readonly responseDeserialize: (value: Buffer) => ValidateUserResponse;
    };
    /** Given a valid userId, issue JWT + refresh token */
    readonly getTokens: {
        readonly path: "/auth.AuthService/GetTokens";
        readonly requestStream: false;
        readonly responseStream: false;
        readonly requestSerialize: (value: GetTokensRequest) => Buffer;
        readonly requestDeserialize: (value: Buffer) => GetTokensRequest;
        readonly responseSerialize: (value: GetTokensResponse) => Buffer;
        readonly responseDeserialize: (value: Buffer) => GetTokensResponse;
    };
    /** Rotate refresh token */
    readonly refreshTokens: {
        readonly path: "/auth.AuthService/RefreshTokens";
        readonly requestStream: false;
        readonly responseStream: false;
        readonly requestSerialize: (value: RefreshTokensRequest) => Buffer;
        readonly requestDeserialize: (value: Buffer) => RefreshTokensRequest;
        readonly responseSerialize: (value: GetTokensResponse) => Buffer;
        readonly responseDeserialize: (value: Buffer) => GetTokensResponse;
    };
    /** Validate token */
    readonly validateToken: {
        readonly path: "/auth.AuthService/ValidateToken";
        readonly requestStream: false;
        readonly responseStream: false;
        readonly requestSerialize: (value: ValidateTokenRequest) => Buffer;
        readonly requestDeserialize: (value: Buffer) => ValidateTokenRequest;
        readonly responseSerialize: (value: ValidateTokenResponse) => Buffer;
        readonly responseDeserialize: (value: Buffer) => ValidateTokenResponse;
    };
};
export interface AuthServiceServer extends UntypedServiceImplementation {
    /** Validate credentials against user‑service */
    validateUser: handleUnaryCall<ValidateUserRequest, ValidateUserResponse>;
    /** Given a valid userId, issue JWT + refresh token */
    getTokens: handleUnaryCall<GetTokensRequest, GetTokensResponse>;
    /** Rotate refresh token */
    refreshTokens: handleUnaryCall<RefreshTokensRequest, GetTokensResponse>;
    /** Validate token */
    validateToken: handleUnaryCall<ValidateTokenRequest, ValidateTokenResponse>;
}
export interface AuthServiceClient extends Client {
    /** Validate credentials against user‑service */
    validateUser(request: ValidateUserRequest, callback: (error: ServiceError | null, response: ValidateUserResponse) => void): ClientUnaryCall;
    validateUser(request: ValidateUserRequest, metadata: Metadata, callback: (error: ServiceError | null, response: ValidateUserResponse) => void): ClientUnaryCall;
    validateUser(request: ValidateUserRequest, metadata: Metadata, options: Partial<CallOptions>, callback: (error: ServiceError | null, response: ValidateUserResponse) => void): ClientUnaryCall;
    /** Given a valid userId, issue JWT + refresh token */
    getTokens(request: GetTokensRequest, callback: (error: ServiceError | null, response: GetTokensResponse) => void): ClientUnaryCall;
    getTokens(request: GetTokensRequest, metadata: Metadata, callback: (error: ServiceError | null, response: GetTokensResponse) => void): ClientUnaryCall;
    getTokens(request: GetTokensRequest, metadata: Metadata, options: Partial<CallOptions>, callback: (error: ServiceError | null, response: GetTokensResponse) => void): ClientUnaryCall;
    /** Rotate refresh token */
    refreshTokens(request: RefreshTokensRequest, callback: (error: ServiceError | null, response: GetTokensResponse) => void): ClientUnaryCall;
    refreshTokens(request: RefreshTokensRequest, metadata: Metadata, callback: (error: ServiceError | null, response: GetTokensResponse) => void): ClientUnaryCall;
    refreshTokens(request: RefreshTokensRequest, metadata: Metadata, options: Partial<CallOptions>, callback: (error: ServiceError | null, response: GetTokensResponse) => void): ClientUnaryCall;
    /** Validate token */
    validateToken(request: ValidateTokenRequest, callback: (error: ServiceError | null, response: ValidateTokenResponse) => void): ClientUnaryCall;
    validateToken(request: ValidateTokenRequest, metadata: Metadata, callback: (error: ServiceError | null, response: ValidateTokenResponse) => void): ClientUnaryCall;
    validateToken(request: ValidateTokenRequest, metadata: Metadata, options: Partial<CallOptions>, callback: (error: ServiceError | null, response: ValidateTokenResponse) => void): ClientUnaryCall;
}
export declare const AuthServiceClient: {
    new (address: string, credentials: ChannelCredentials, options?: Partial<ClientOptions>): AuthServiceClient;
    service: typeof AuthServiceService;
    serviceName: string;
};
type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;
export type DeepPartial<T> = T extends Builtin ? T : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>> : T extends {} ? {
    [K in keyof T]?: DeepPartial<T[K]>;
} : Partial<T>;
type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin ? P : P & {
    [K in keyof P]: Exact<P[K], I[K]>;
} & {
    [K in Exclude<keyof I, KeysOfUnion<P>>]: never;
};
export interface MessageFns<T> {
    encode(message: T, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): T;
    fromJSON(object: any): T;
    toJSON(message: T): unknown;
    create<I extends Exact<DeepPartial<T>, I>>(base?: I): T;
    fromPartial<I extends Exact<DeepPartial<T>, I>>(object: I): T;
}
export {};
