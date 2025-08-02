import { BinaryReader, BinaryWriter } from "@bufbuild/protobuf/wire";
import { type CallOptions, type ChannelCredentials, Client, type ClientOptions, type ClientUnaryCall, type handleUnaryCall, type Metadata, type ServiceError, type UntypedServiceImplementation } from "@grpc/grpc-js";
export declare const protobufPackage = "user";
/** user.proto - gRPC contract for UserService */
export interface FindUserRequest {
    email?: string | undefined;
    /** E.164 format, e.g. "+994501234567" */
    phone?: string | undefined;
}
/** Request message for fetching a user by ID */
export interface GetUserRequest {
    /** The UUID of the user to fetch */
    id: string;
}
/** Response message representing a User */
export interface UserResponse {
    /** Unique identifier of the user */
    id: string;
    /** Email address */
    email: string;
    /** Role (e.g., "user", "admin") */
    role: string;
}
/** Request message for updating a profile */
export interface UpdateProfileRequest {
    /** The UUID of the user making the update */
    id: string;
    /** Only include fields if they should be updated */
    email: string;
    newPassword: string;
    currentPassword: string;
}
/** New messages below: */
export interface CreateUserRequest {
    email: string;
    /** hashed */
    password: string;
    role: string;
}
export interface FindUserWithHashRequest {
    email?: string | undefined;
    phone?: string | undefined;
}
export interface FindUserWithHashResponse {
    id: string;
    email: string;
    role: string;
    passwordHash: string;
    /** the stored hash */
    refreshToken: string;
}
export interface SetRefreshTokenRequest {
    userId: string;
    refreshToken: string;
}
export declare const FindUserRequest: MessageFns<FindUserRequest>;
export declare const GetUserRequest: MessageFns<GetUserRequest>;
export declare const UserResponse: MessageFns<UserResponse>;
export declare const UpdateProfileRequest: MessageFns<UpdateProfileRequest>;
export declare const CreateUserRequest: MessageFns<CreateUserRequest>;
export declare const FindUserWithHashRequest: MessageFns<FindUserWithHashRequest>;
export declare const FindUserWithHashResponse: MessageFns<FindUserWithHashResponse>;
export declare const SetRefreshTokenRequest: MessageFns<SetRefreshTokenRequest>;
export type UserServiceService = typeof UserServiceService;
export declare const UserServiceService: {
    readonly findUser: {
        readonly path: "/user.UserService/FindUser";
        readonly requestStream: false;
        readonly responseStream: false;
        readonly requestSerialize: (value: FindUserRequest) => Buffer;
        readonly requestDeserialize: (value: Buffer) => FindUserRequest;
        readonly responseSerialize: (value: UserResponse) => Buffer;
        readonly responseDeserialize: (value: Buffer) => UserResponse;
    };
    readonly getUser: {
        readonly path: "/user.UserService/GetUser";
        readonly requestStream: false;
        readonly responseStream: false;
        readonly requestSerialize: (value: GetUserRequest) => Buffer;
        readonly requestDeserialize: (value: Buffer) => GetUserRequest;
        readonly responseSerialize: (value: UserResponse) => Buffer;
        readonly responseDeserialize: (value: Buffer) => UserResponse;
    };
    readonly updateProfile: {
        readonly path: "/user.UserService/UpdateProfile";
        readonly requestStream: false;
        readonly responseStream: false;
        readonly requestSerialize: (value: UpdateProfileRequest) => Buffer;
        readonly requestDeserialize: (value: Buffer) => UpdateProfileRequest;
        readonly responseSerialize: (value: UserResponse) => Buffer;
        readonly responseDeserialize: (value: Buffer) => UserResponse;
    };
    readonly createUser: {
        readonly path: "/user.UserService/CreateUser";
        readonly requestStream: false;
        readonly responseStream: false;
        readonly requestSerialize: (value: CreateUserRequest) => Buffer;
        readonly requestDeserialize: (value: Buffer) => CreateUserRequest;
        readonly responseSerialize: (value: UserResponse) => Buffer;
        readonly responseDeserialize: (value: Buffer) => UserResponse;
    };
    readonly findUserWithHash: {
        readonly path: "/user.UserService/FindUserWithHash";
        readonly requestStream: false;
        readonly responseStream: false;
        readonly requestSerialize: (value: FindUserWithHashRequest) => Buffer;
        readonly requestDeserialize: (value: Buffer) => FindUserWithHashRequest;
        readonly responseSerialize: (value: FindUserWithHashResponse) => Buffer;
        readonly responseDeserialize: (value: Buffer) => FindUserWithHashResponse;
    };
    readonly setRefreshToken: {
        readonly path: "/user.UserService/SetRefreshToken";
        readonly requestStream: false;
        readonly responseStream: false;
        readonly requestSerialize: (value: SetRefreshTokenRequest) => Buffer;
        readonly requestDeserialize: (value: Buffer) => SetRefreshTokenRequest;
        readonly responseSerialize: (value: UserResponse) => Buffer;
        readonly responseDeserialize: (value: Buffer) => UserResponse;
    };
};
export interface UserServiceServer extends UntypedServiceImplementation {
    findUser: handleUnaryCall<FindUserRequest, UserResponse>;
    getUser: handleUnaryCall<GetUserRequest, UserResponse>;
    updateProfile: handleUnaryCall<UpdateProfileRequest, UserResponse>;
    createUser: handleUnaryCall<CreateUserRequest, UserResponse>;
    findUserWithHash: handleUnaryCall<FindUserWithHashRequest, FindUserWithHashResponse>;
    setRefreshToken: handleUnaryCall<SetRefreshTokenRequest, UserResponse>;
}
export interface UserServiceClient extends Client {
    findUser(request: FindUserRequest, callback: (error: ServiceError | null, response: UserResponse) => void): ClientUnaryCall;
    findUser(request: FindUserRequest, metadata: Metadata, callback: (error: ServiceError | null, response: UserResponse) => void): ClientUnaryCall;
    findUser(request: FindUserRequest, metadata: Metadata, options: Partial<CallOptions>, callback: (error: ServiceError | null, response: UserResponse) => void): ClientUnaryCall;
    getUser(request: GetUserRequest, callback: (error: ServiceError | null, response: UserResponse) => void): ClientUnaryCall;
    getUser(request: GetUserRequest, metadata: Metadata, callback: (error: ServiceError | null, response: UserResponse) => void): ClientUnaryCall;
    getUser(request: GetUserRequest, metadata: Metadata, options: Partial<CallOptions>, callback: (error: ServiceError | null, response: UserResponse) => void): ClientUnaryCall;
    updateProfile(request: UpdateProfileRequest, callback: (error: ServiceError | null, response: UserResponse) => void): ClientUnaryCall;
    updateProfile(request: UpdateProfileRequest, metadata: Metadata, callback: (error: ServiceError | null, response: UserResponse) => void): ClientUnaryCall;
    updateProfile(request: UpdateProfileRequest, metadata: Metadata, options: Partial<CallOptions>, callback: (error: ServiceError | null, response: UserResponse) => void): ClientUnaryCall;
    createUser(request: CreateUserRequest, callback: (error: ServiceError | null, response: UserResponse) => void): ClientUnaryCall;
    createUser(request: CreateUserRequest, metadata: Metadata, callback: (error: ServiceError | null, response: UserResponse) => void): ClientUnaryCall;
    createUser(request: CreateUserRequest, metadata: Metadata, options: Partial<CallOptions>, callback: (error: ServiceError | null, response: UserResponse) => void): ClientUnaryCall;
    findUserWithHash(request: FindUserWithHashRequest, callback: (error: ServiceError | null, response: FindUserWithHashResponse) => void): ClientUnaryCall;
    findUserWithHash(request: FindUserWithHashRequest, metadata: Metadata, callback: (error: ServiceError | null, response: FindUserWithHashResponse) => void): ClientUnaryCall;
    findUserWithHash(request: FindUserWithHashRequest, metadata: Metadata, options: Partial<CallOptions>, callback: (error: ServiceError | null, response: FindUserWithHashResponse) => void): ClientUnaryCall;
    setRefreshToken(request: SetRefreshTokenRequest, callback: (error: ServiceError | null, response: UserResponse) => void): ClientUnaryCall;
    setRefreshToken(request: SetRefreshTokenRequest, metadata: Metadata, callback: (error: ServiceError | null, response: UserResponse) => void): ClientUnaryCall;
    setRefreshToken(request: SetRefreshTokenRequest, metadata: Metadata, options: Partial<CallOptions>, callback: (error: ServiceError | null, response: UserResponse) => void): ClientUnaryCall;
}
export declare const UserServiceClient: {
    new (address: string, credentials: ChannelCredentials, options?: Partial<ClientOptions>): UserServiceClient;
    service: typeof UserServiceService;
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
