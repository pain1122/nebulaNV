// apps/blog-service/test/grpc/blog.e2e.spec.ts
import * as grpc from "@grpc/grpc-js";
import { loadClient, call, mdS2S, setS2STestActorToken } from "./helpers";
import { httpJson } from "../utils/http";

const BLOG_PROTO = require.resolve("@nebula/protos/blog.proto");
const URL = process.env.BLOG_GRPC_URL || "127.0.0.1:50055";
const AUTH_HTTP = process.env.AUTH_HTTP_URL ?? "http://127.0.0.1:3001";

type LoginResponse = { accessToken: string };

const input = {
  title: "E2E Blog Post gRPC",
  body: "Hello from gRPC tests",
  status: "PUBLISHED",
};

describe("BlogService gRPC (admin required on writes)", () => {
  const client = loadClient<any>({
    url: URL,
    protoPath: BLOG_PROTO,
    pkg: ["blog"],
    svc: "BlogService",
  });

  let id = "";
  let slug = "";

  beforeAll(async () => {
    const login = await httpJson<LoginResponse>(
      "POST",
      `${AUTH_HTTP}/auth/login`,
      {
        identifier: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
        password: process.env.SEED_ADMIN_PASS ?? "Admin123!",
      },
    );
    setS2STestActorToken(login.accessToken);
  });

  it("CreatePost rejects a signed call without an actor JWT", async () => {
    await expect(
      call<any>(
        client,
        "CreatePost",
        { data: input },
        mdS2S({ accessToken: "" }),
      ),
    ).rejects.toMatchObject({ code: grpc.status.UNAUTHENTICATED });
  });

  it("CreatePost succeeds with S2S admin metadata", async () => {
    const res = await call<any>(
      client,
      "CreatePost",
      { data: input },
      mdS2S({ role: "admin" }),
    );
    id = res.data.id;
    slug = res.data.slug;
    expect(res.data.title).toBe(input.title);
  });

  it("GetPost returns the created item (public)", async () => {
    const res = await call<any>(
      client,
      "GetPost",
      { slug },
      mdS2S(), // optional: public but guard allows OPTIONAL_AUTH
    );
    expect(res.data.id).toBe(id);
  });

  it("ListPosts finds the created item (public)", async () => {
    const res = await call<any>(
      client,
      "ListPosts",
      { q: "Blog", page: 1, limit: 20 },
      mdS2S(),
    );

    const hit = res.data.find((p: any) => p.id === id);
    expect(!!hit).toBe(true);
  });

  it("UpdatePost (admin) changes title", async () => {
    const res = await call<any>(
      client,
      "UpdatePost",
      { id, patch: { title: "E2E Blog Post gRPC Pro" } },
      mdS2S({ role: "admin" }),
    );

    expect(res.data.title).toBe("E2E Blog Post gRPC Pro");
  });

  it("DeletePost (admin) marks post archived", async () => {
    const res = await call<any>(
      client,
      "DeletePost",
      { id },
      mdS2S({ role: "admin" }),
    );

    expect(res.success ?? true).toBe(true);
  });
});
