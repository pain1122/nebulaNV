import { NextRequest, NextResponse } from "next/server"

function baseAuth() {
  const base = process.env.AUTH_HTTP_URL || "http://127.0.0.1:3001"
  return base.replace(/\/+$/, "")
}

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get("refreshToken")?.value

    if (!refreshToken) {
      return NextResponse.json(
        { ok: false, message: "missing_refresh_token" },
        { status: 401 },
      )
    }

    const upstream = await fetch(`${baseAuth()}/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    })

    const text = await upstream.text()
    let json: any = {}
    try {
      json = text ? JSON.parse(text) : {}
    } catch {}

    if (!upstream.ok) {
      return NextResponse.json(
        { ok: false, message: json?.message || text || "refresh_failed" },
        { status: upstream.status },
      )
    }

    const accessToken = json?.accessToken
    const rotatedRefreshToken = json?.refreshToken

    if (!accessToken || !rotatedRefreshToken) {
      return NextResponse.json(
        { ok: false, message: "missing_tokens_from_auth_service" },
        { status: 502 },
      )
    }

    const res = NextResponse.json({
      ok: true,
      accessToken,
    })

    res.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    })

    res.cookies.set("refreshToken", rotatedRefreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })

    return res
  } catch (e: any) {
    console.error("[/api/auth/refresh]", e)
    return NextResponse.json(
      { ok: false, message: e?.message || "refresh_route_failed" },
      { status: 500 },
    )
  }
}
