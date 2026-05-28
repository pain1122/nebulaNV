import { BlogPostStatus, type BlogPost } from "../../prisma/generated";
import { BlogPostStatusDto } from "./dto/post.dto";

export type BlogPostRecord = BlogPost;

export type BlogPostView = {
  id: string;
  slug: string;
  title: string;
  body: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  status: BlogPostStatus;
  tags: string[];
  categories: string[];
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const BLOG_POST_STATUS_VALUES = new Set<string>(Object.values(BlogPostStatus));

export function toPrismaBlogPostStatus(
  value: BlogPostStatusDto | BlogPostStatus | undefined,
  fallback: BlogPostStatus,
): BlogPostStatus {
  return typeof value === "string" && BLOG_POST_STATUS_VALUES.has(value)
    ? (value as BlogPostStatus)
    : fallback;
}
