import {NextRequest, NextResponse} from "next/server"

function baseAuth() {
  const base = process.env.AUTH_HTTP_URL || "http://127.0.0.1:3001"
  return base.replace(/\/+$/, "")
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      identifier: string;
      password: string;
      remember?: boolean;
    };

    const upstream = await fetch(`${baseAuth()}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        identifier: body.identifier,
        password: body.password,
      }),
      cache: "no-store",
    });

    const text = await upstream.text();
    let json: any = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {}

    if (!upstream.ok) {
      return NextResponse.json(
        { ok: false, message: json?.message || text || "login_failed" },
        { status: upstream.status }
      );
    }

    const accessToken = json?.accessToken;
    const refreshToken = json?.refreshToken;

    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        { ok: false, message: "missing_tokens_from_auth_service" },
        { status: 502 }
      );
    }

    // (cookies are OPTIONAL — fine to keep)
    const maxAge = body.remember ? 60 * 60 * 24 * 30 : 60 * 60 * 8;

    const res = NextResponse.json({
      ok: true,
      accessToken,
    });

    res.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge,
    });

    res.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: body.remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7,
    });

    return res;
  } catch (e: any) {
    console.error("[/api/auth/login]", e);
    return NextResponse.json(
      { ok: false, message: e?.message || "login_route_failed" },
      { status: 500 }
    );
  }
}
