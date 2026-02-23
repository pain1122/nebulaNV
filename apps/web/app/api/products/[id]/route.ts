import { NextRequest, NextResponse } from "next/server"
import { getBearerFromReq } from "@/lib/auth/bearer"

function getProductServiceBaseUrl() {
  const httpUrl = process.env.PRODUCT_HTTP_URL
  if (httpUrl) return httpUrl.replace(/\/+$/, "")
  const port = process.env.PRODUCT_HTTP_PORT ?? "3003"
  return `http://127.0.0.1:${port}`
}

function proxyHeaders(req: NextRequest) {
  const headers = new Headers()
  const bearer = getBearerFromReq(req)
  if (bearer) headers.set("authorization", bearer)
  return headers
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const base = getProductServiceBaseUrl()

  try {
    const res = await fetch(`${base}/products/${id}`, {
      method: "GET",
      headers: proxyHeaders(req),
      cache: "no-store",
    })

    const contentType = res.headers.get("content-type") ?? ""
    const isJson = contentType.includes("application/json")
    const body = isJson ? await res.json() : await res.text()

    if (!res.ok) {
      return isJson
        ? NextResponse.json(body, { status: res.status })
        : new NextResponse(String(body), { status: res.status })
    }

    return isJson
      ? NextResponse.json(body, { status: 200, headers: { "cache-control": "no-store" } })
      : new NextResponse(String(body), { status: 200, headers: { "cache-control": "no-store" } })
  } catch (e: any) {
    console.error("[web/api/products/[id]] proxy error:", e)
    return NextResponse.json(
      { ok: false, error: "UPSTREAM_UNREACHABLE", message: e?.message ?? "Unknown error" },
      { status: 502 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const base = getProductServiceBaseUrl()

  try {
    const body = await req.text()

    const headers = proxyHeaders(req)
    headers.set("content-type", "application/json")

    const res = await fetch(`${base}/products/${id}`, {
      method: "PATCH",
      headers,
      body,
      cache: "no-store",
    })

    const contentType = res.headers.get("content-type") ?? ""
    const isJson = contentType.includes("application/json")
    const out = isJson ? await res.json() : await res.text()

    if (!res.ok) {
      return isJson
        ? NextResponse.json(out, { status: res.status })
        : new NextResponse(String(out), { status: res.status })
    }

    return isJson
      ? NextResponse.json(out, { status: 200, headers: { "cache-control": "no-store" } })
      : new NextResponse(String(out), { status: 200, headers: { "cache-control": "no-store" } })
  } catch (e: any) {
    console.error("[web/api/products/[id]] proxy error:", e)
    return NextResponse.json(
      { ok: false, error: "UPSTREAM_UNREACHABLE", message: e?.message ?? "Unknown error" },
      { status: 502 }
    )
  }
}
