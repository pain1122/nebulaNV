import { NextResponse } from "next/server"

type UiKind = "product_cat" | "product_tag" | "product_attribute" | "product_variable"

// Map UI kinds to taxonomy-service kind strings
const KIND_MAP: Record<UiKind, string> = {
  product_cat: "category.default",
  product_tag: "tag.default",
  product_attribute: "attribute.default",
  product_variable: "variable.default",
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      kind: UiKind
      name: string
      slug: string
      parentId?: string | null
    }

    const base = process.env.TAXONOMY_HTTP_URL || "http://127.0.0.1:3006"
    const url = `${base.replace(/\/+$/, "")}/taxonomies`

    const scope = "product"
    const kind = KIND_MAP[body.kind]

    if (!kind) {
      return NextResponse.json({ error: "invalid_kind" }, { status: 400 })
    }

    // TODO: attach auth header from your panel session
    // For now, if your taxonomy-service is admin-protected, this will 401 unless you add auth below.
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // "authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        scope,
        kind,
        slug: body.slug,
        title: body.name,
        parentId: body.parentId ?? null,
        isTree: body.parentId ? true : true, // OK; service sets isTree = parentId ? true : input.isTree
      }),
    })

    const text = await upstream.text()

    if (!upstream.ok) {
      // Return upstream message for fast debugging in browser
      return new NextResponse(text || "upstream_error", { status: upstream.status })
    }

    const parsed = JSON.parse(text)
    const t = parsed?.data ?? parsed

    return NextResponse.json({
      id: t.id,
      name: t.title, // your dto uses "title"
      slug: t.slug,
    })
  } catch (e: any) {
    console.error("[/api/taxonomy/create]", e)
    return NextResponse.json({ error: e?.message || "fetch_failed" }, { status: 500 })
  }
}
