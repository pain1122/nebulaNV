import { Observable } from 'rxjs';
import { Metadata } from '@grpc/grpc-js';
import {
  GetUserRequest,
  FindUserRequest,
  UpdateProfileRequest,
  UserResponse,
} from '../user';

/** Defines the Nest ClientGrpc Observable API so we can pass Metadata (JWT) */
export type { GetUserRequest, FindUserRequest, UpdateProfileRequest, UserResponse };
export interface UserServiceClient {
  GetUser(request: GetUserRequest, metadata: Metadata): Observable<UserResponse>;
  FindUser(request: FindUserRequest, metadata: Metadata): Observable<UserResponse>;
  UpdateProfile(request: UpdateProfileRequest, metadata: Metadata): Observable<UserResponse>;
}
