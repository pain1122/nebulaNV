import { NextRequest } from "next/server"

export function getBearerFromReq(req: NextRequest): string | "" {
  const auth = req.headers.get("authorization")
  if (auth?.startsWith("Bearer ")) return auth
  return ""
}
