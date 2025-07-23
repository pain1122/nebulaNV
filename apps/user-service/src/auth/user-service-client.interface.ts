import { Observable } from 'rxjs';

export interface GetUserRequest {   id: string; }
export interface UserResponse   {   id: string; email: string; role: string; }
export interface UpdateProfileRequest {
  id: string;
  email?: string;
  newPassword?: string;
  currentPassword?: string;
}

export interface UserServiceClient {
  // these names must match your .proto service + RPC names
  GetUser(request: GetUserRequest, metadata?: any): Observable<UserResponse>;
  UpdateProfile(request: UpdateProfileRequest, metadata?: any): Observable<UserResponse>;
}
