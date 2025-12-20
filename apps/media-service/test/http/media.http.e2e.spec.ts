// apps/media-service/test/http/media.http.e2e.spec.ts
import { httpJson } from "../utils/http"

const MEDIA_HTTP = process.env.MEDIA_HTTP_URL ?? "http://127.0.0.1:3007"
const AUTH_HTTP  = process.env.AUTH_HTTP_URL  ?? "http://127.0.0.1:3001"

type LoginResp = { accessToken: string; refreshToken: string }

describe("media-service HTTP (admin-only)", () => {
  let userAccess = ""
  let adminAccess = ""

  beforeAll(async () => {
    const ut = await httpJson<LoginResp>("POST", `${AUTH_HTTP}/auth/login`, {
      identifier: process.env.SEED_USER_EMAIL ?? "user@example.com",
      password: process.env.SEED_USER_PASS ?? "User123!",
    })
    userAccess = ut.accessToken

    const at = await httpJson<LoginResp>("POST", `${AUTH_HTTP}/auth/login`, {
      identifier: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
      password: process.env.SEED_ADMIN_PASS ?? "Admin123!",
    })
    adminAccess = at.accessToken
  })

  it("POST /media/presign requires admin (user denied, admin allowed)", async () => {
    const body = {
      filename: `e2e_${Math.random().toString(36).slice(2, 8)}.webp`,
      mimeType: "image/webp",
      visibility: "private",
      scope: "panel",
    }

    await expect(
      httpJson<any>("POST", `${MEDIA_HTTP}/media/presign`, body, {
        authorization: `Bearer ${userAccess}`,
      })
    ).rejects.toBeTruthy()

    const res = await httpJson<any>("POST", `${MEDIA_HTTP}/media/presign`, body, {
      authorization: `Bearer ${adminAccess}`,
    })

    expect(res?.data?.uploadUrl).toBeTruthy()
    expect(res?.data?.bucket).toBeTruthy()
    expect(res?.data?.path).toBeTruthy()
    expect(res?.data?.mimeType).toBe("image/webp")
  })

  it("POST /media -> GET -> LIST -> DELETE (admin)", async () => {
    // 1) presign
    const presign = await httpJson<any>(
      "POST",
      `${MEDIA_HTTP}/media/presign`,
      { filename: "e2e.webp", mimeType: "image/webp", visibility: "private", scope: "panel" },
      { authorization: `Bearer ${adminAccess}` }
    )

    const uploadUrl: string = presign.data.uploadUrl

    // 2) upload tiny payload
    const up = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "content-type": "image/webp" },
      body: Buffer.from("hello"),
    })
    expect([200, 204]).toContain(up.status)

    // 3) create row
    const created = await httpJson<any>(
      "POST",
      `${MEDIA_HTTP}/media`,
      {
        storage: "s3",
        bucket: presign.data.bucket,
        path: presign.data.path,
        filename: presign.data.filename ?? "e2e.webp",
        mimeType: presign.data.mimeType ?? "image/webp",
        sizeBytes: "5",
        visibility: presign.data.visibility ?? "private",
        scope: presign.data.scope ?? "panel",
      },
      { authorization: `Bearer ${adminAccess}` }
    )

    expect(created?.data?.id).toBeTruthy()
    const id = created.data.id

    // user cannot list/get
    await expect(
      httpJson<any>("GET", `${MEDIA_HTTP}/media?take=10&skip=0`, undefined, {
        authorization: `Bearer ${userAccess}`,
      })
    ).rejects.toBeTruthy()

    await expect(
      httpJson<any>("GET", `${MEDIA_HTTP}/media/${id}`, undefined, {
        authorization: `Bearer ${userAccess}`,
      })
    ).rejects.toBeTruthy()

    // admin can get
    const got = await httpJson<any>("GET", `${MEDIA_HTTP}/media/${id}`, undefined, {
      authorization: `Bearer ${adminAccess}`,
    })
    expect(got.data.id).toBe(id)

    // admin can list
    const list = await httpJson<any>("GET", `${MEDIA_HTTP}/media?take=10&skip=0`, undefined, {
      authorization: `Bearer ${adminAccess}`,
    })
    expect(Array.isArray(list.data)).toBe(true)

    // delete
    const del = await httpJson<any>("DELETE", `${MEDIA_HTTP}/media/${id}`, undefined, {
      authorization: `Bearer ${adminAccess}`,
    })
    expect(del).toEqual({ deleted: true })
  })
})
