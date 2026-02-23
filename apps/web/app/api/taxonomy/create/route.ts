// apps/web/app/api/taxonomy/create/route.ts
import { NextRequest, NextResponse } from "next/server";

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

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      kind: UiKind;
      name: string;
      slug: string;
      parentId?: string | null;
      sortOrder?: number;
      isHidden?: boolean;
    };

    const kind = KIND_MAP[body.kind];
    if (!kind) return NextResponse.json({ ok: false, error: "invalid_kind" }, { status: 400 });

    const upstreamUrl = `${getBase()}/taxonomies`;

    const headers = new Headers();
    headers.set("content-type", "application/json");

    // forward auth/cookies (same pattern as other proxies)
    const auth = req.headers.get("authorization");
    if (auth) headers.set("authorization", auth);

    const cookie = req.headers.get("cookie");
    if (cookie) headers.set("cookie", cookie);

    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        scope: "product",
        kind,
        slug: body.slug,
        title: body.name,
        parentId: body.parentId ?? null,
        sortOrder: body.sortOrder ?? 0,
        isHidden: body.isHidden ?? false,
        isTree: true,
      }),
      cache: "no-store",
    });

    const text = await upstream.text();

    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("[/api/taxonomy/create]", e);
    return NextResponse.json(
      { ok: false, error: "fetch_failed", message: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
