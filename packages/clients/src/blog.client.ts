import type { ClientGrpc } from "@nestjs/microservices";
import { BLOG_SERVICE_TARGET } from "@nebula/grpc-auth";
import { blogv1 } from "@nebula/protos";
import {
  createSignedGrpcUnary,
  type GrpcClientSigningPolicy,
  type RawGrpcUnary,
  type SignedGrpcUnary,
} from "./s2s-metadata";

type BlogRaw = {
  ListPosts: RawGrpcUnary<blogv1.ListPostsRequest, blogv1.ListPostsResponse>;
  GetPost: RawGrpcUnary<blogv1.GetPostRequest, blogv1.PostResponse>;
  CreatePost: RawGrpcUnary<blogv1.CreatePostRequest, blogv1.PostResponse>;
  UpdatePost: RawGrpcUnary<blogv1.UpdatePostRequest, blogv1.PostResponse>;
  DeletePost: RawGrpcUnary<blogv1.DeletePostRequest, blogv1.BasicResponse>;
};

type BlogTaxonomyRaw = {
  List: RawGrpcUnary<
    blogv1.ListBlogTaxonomiesRequest,
    blogv1.ListBlogTaxonomiesResponse
  >;
  Get: RawGrpcUnary<blogv1.GetBlogTaxonomyRequest, blogv1.BlogTaxonomyResponse>;
  Create: RawGrpcUnary<
    blogv1.CreateBlogTaxonomyRequest,
    blogv1.BlogTaxonomyResponse
  >;
  Update: RawGrpcUnary<
    blogv1.UpdateBlogTaxonomyRequest,
    blogv1.BlogTaxonomyResponse
  >;
  Delete: RawGrpcUnary<
    blogv1.DeleteBlogTaxonomyRequest,
    blogv1.DeleteBlogTaxonomyResponse
  >;
};

export interface BlogProxy {
  ListPosts: SignedGrpcUnary<blogv1.ListPostsRequest, blogv1.ListPostsResponse>;
  GetPost: SignedGrpcUnary<blogv1.GetPostRequest, blogv1.PostResponse>;
  CreatePost: SignedGrpcUnary<blogv1.CreatePostRequest, blogv1.PostResponse>;
  UpdatePost: SignedGrpcUnary<blogv1.UpdatePostRequest, blogv1.PostResponse>;
  DeletePost: SignedGrpcUnary<blogv1.DeletePostRequest, blogv1.BasicResponse>;
}

export interface BlogTaxonomyProxy {
  List: SignedGrpcUnary<
    blogv1.ListBlogTaxonomiesRequest,
    blogv1.ListBlogTaxonomiesResponse
  >;
  Get: SignedGrpcUnary<
    blogv1.GetBlogTaxonomyRequest,
    blogv1.BlogTaxonomyResponse
  >;
  Create: SignedGrpcUnary<
    blogv1.CreateBlogTaxonomyRequest,
    blogv1.BlogTaxonomyResponse
  >;
  Update: SignedGrpcUnary<
    blogv1.UpdateBlogTaxonomyRequest,
    blogv1.BlogTaxonomyResponse
  >;
  Delete: SignedGrpcUnary<
    blogv1.DeleteBlogTaxonomyRequest,
    blogv1.DeleteBlogTaxonomyResponse
  >;
}

export function getBlog(
  client: ClientGrpc,
  signingPolicy?: GrpcClientSigningPolicy,
): BlogProxy {
  const raw = client.getService<BlogRaw>("BlogService");
  const common = { policy: signingPolicy, target: BLOG_SERVICE_TARGET };
  return {
    ListPosts: createSignedGrpcUnary({
      ...common,
      method: raw.ListPosts.bind(raw),
      definition: blogv1.BlogServiceService.listPosts,
    }),
    GetPost: createSignedGrpcUnary({
      ...common,
      method: raw.GetPost.bind(raw),
      definition: blogv1.BlogServiceService.getPost,
    }),
    CreatePost: createSignedGrpcUnary({
      ...common,
      method: raw.CreatePost.bind(raw),
      definition: blogv1.BlogServiceService.createPost,
    }),
    UpdatePost: createSignedGrpcUnary({
      ...common,
      method: raw.UpdatePost.bind(raw),
      definition: blogv1.BlogServiceService.updatePost,
    }),
    DeletePost: createSignedGrpcUnary({
      ...common,
      method: raw.DeletePost.bind(raw),
      definition: blogv1.BlogServiceService.deletePost,
    }),
  };
}

export function getBlogTaxonomy(
  client: ClientGrpc,
  signingPolicy?: GrpcClientSigningPolicy,
): BlogTaxonomyProxy {
  const raw = client.getService<BlogTaxonomyRaw>("BlogTaxonomyService");
  const common = { policy: signingPolicy, target: BLOG_SERVICE_TARGET };
  return {
    List: createSignedGrpcUnary({
      ...common,
      method: raw.List.bind(raw),
      definition: blogv1.BlogTaxonomyServiceService.list,
    }),
    Get: createSignedGrpcUnary({
      ...common,
      method: raw.Get.bind(raw),
      definition: blogv1.BlogTaxonomyServiceService.get,
    }),
    Create: createSignedGrpcUnary({
      ...common,
      method: raw.Create.bind(raw),
      definition: blogv1.BlogTaxonomyServiceService.create,
    }),
    Update: createSignedGrpcUnary({
      ...common,
      method: raw.Update.bind(raw),
      definition: blogv1.BlogTaxonomyServiceService.update,
    }),
    Delete: createSignedGrpcUnary({
      ...common,
      method: raw.Delete.bind(raw),
      definition: blogv1.BlogTaxonomyServiceService.delete,
    }),
  };
}
