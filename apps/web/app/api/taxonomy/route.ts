// apps/web/app/api/taxonomy/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getBearerFromReq } from "@/lib/auth/bearer";

type UiKind = "product_cat" | "product_tag" | "product_attribute" | "product_variable" | "product_brand";

const KIND_MAP: Record<UiKind, string> = {
  product_cat: "category.default",
  product_tag: "tag.default",
  product_attribute: "attribute.default",
  product_variable: "variable.default",
  product_brand: "brand.default",
};

function getBase() {
  const base = process.env.TAXONOMY_HTTP_URL || "http://127.0.0.1:3006";
  return base.replace(/\/+$/, "");
}

const ALLOWED = new Set(["page", "limit", "q", "parentId"]);

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    const uiKind = (url.searchParams.get("kind") || "") as UiKind;
    const kind = KIND_MAP[uiKind];
    if (!kind) return NextResponse.json({ ok: false, error: "invalid_kind" }, { status: 400 });

    const upstream = new URL(`${getBase()}/taxonomies`);
    upstream.searchParams.set("scope", "product");
    upstream.searchParams.set("kind", kind);

    for (const [k, v] of url.searchParams.entries()) {
      if (k === "kind") continue;
      if (!ALLOWED.has(k)) continue;
      upstream.searchParams.append(k, v);
    }

    // ✅ server-side Bearer
    const headers = new Headers();
    const bearer = getBearerFromReq(req);
    if (bearer) headers.set("authorization", bearer);

    const res = await fetch(upstream.toString(), { headers, cache: "no-store" });
    const contentType = res.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    const body = isJson ? await res.json() : await res.text();

    if (!res.ok) return isJson
      ? NextResponse.json(body, { status: res.status })
      : new NextResponse(String(body), { status: res.status });

    return NextResponse.json(body, { status: 200 });
  } catch (e: any) {
    console.error("[/api/taxonomy] error:", e);
    return NextResponse.json({ ok: false, error: "fetch_failed", message: e?.message || "Unknown error" }, { status: 500 });
  }
}
