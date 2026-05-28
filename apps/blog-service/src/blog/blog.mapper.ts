import { blogv1 } from "@nebula/protos";
import type { BlogPostRecord, BlogPostView } from "./blog.types";

export function toBlogPostView(post: BlogPostRecord): BlogPostView {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    body: post.body,
    excerpt: post.excerpt,
    coverImageUrl: post.coverImageUrl,
    status: post.status,
    tags: post.tags,
    categories: post.categories,
    metaTitle: post.metaTitle,
    metaDescription: post.metaDescription,
    metaKeywords: post.metaKeywords,
    publishedAt: post.publishedAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

export function toProtoPost(post: BlogPostView): blogv1.Post {
  return blogv1.Post.create({
    id: post.id,
    slug: post.slug,
    title: post.title,
    body: post.body,
    excerpt: post.excerpt ?? "",
    coverImageUrl: post.coverImageUrl ?? "",
    status: post.status,
    tags: post.tags,
    categories: post.categories,
    metaTitle: post.metaTitle ?? "",
    metaDescription: post.metaDescription ?? "",
    metaKeywords: post.metaKeywords ?? "",
    publishedAt: post.publishedAt?.toISOString() ?? "",
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  });
}
