import { NextRequest, NextResponse } from "next/server";
import { getBearerFromReq } from "@/lib/auth/bearer"

function getProductServiceBaseUrl() {
  const httpUrl = process.env.PRODUCT_HTTP_URL;
  if (httpUrl) return httpUrl.replace(/\/+$/, "");
  const port = process.env.PRODUCT_HTTP_PORT ?? "3003";
  return `http://127.0.0.1:${port}`;
}

const ALLOWED = new Set(["includeDeleted", "page", "limit", "q", "categoryId", "status"]);

export async function GET(req: NextRequest) {
  const base = getProductServiceBaseUrl();
  const upstreamPath = "/products";

  const url = new URL(req.url);
  const incoming = url.searchParams;

  const out = new URLSearchParams();
  for (const [k, v] of incoming.entries()) {
    if (!ALLOWED.has(k)) continue;
    out.append(k, v);
  }

  const upstreamUrl = `${base}${upstreamPath}${out.toString() ? `?${out.toString()}` : ""}`;

  try {
    const headers = new Headers();
    const bearer = getBearerFromReq(req);
    if (bearer) headers.set("authorization", bearer);

    const res = await fetch(upstreamUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    const upstreamBody = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      return isJson
        ? NextResponse.json(upstreamBody, { status: res.status })
        : new NextResponse(String(upstreamBody), { status: res.status });
    }

    // normalize response for panel
    const page = Math.max(1, Number(incoming.get("page") || 1));
    const limit = Math.min(100, Math.max(1, Number(incoming.get("limit") || 20)));

    const items = Array.isArray((upstreamBody as any)?.data) ? (upstreamBody as any).data : [];
    const total = Number((upstreamBody as any)?.total ?? items.length);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json(
      { ok: true, page, limit, total, totalPages, items },
      { status: 200, headers: { "cache-control": "no-store" } }
    );
  } catch (e: any) {
    console.error("[web/api/products] proxy error:", e);
    return NextResponse.json(
      { ok: false, error: "UPSTREAM_UNREACHABLE", message: e?.message ?? "Unknown error" },
      { status: 502 }
    );
  }
}
