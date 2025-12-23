import { httpJson } from "../utils/http"

const MEDIA_HTTP = process.env.MEDIA_HTTP_URL ?? "http://127.0.0.1:3007"
const AUTH_HTTP  = process.env.AUTH_HTTP_URL  ?? "http://127.0.0.1:3001"

type LoginResp = { accessToken: string; refreshToken: string }

describe("media-service HTTP (admin-only)", () => {
  let userAccess = ""
  let adminAccess = ""

  beforeAll(async () => {
    // login seeded user
    const ut = await httpJson<LoginResp>("POST", `${AUTH_HTTP}/auth/login`, {
      identifier: process.env.SEED_USER_EMAIL ?? "user@example.com",
      password: process.env.SEED_USER_PASS ?? "User123!",
    })
    userAccess = ut.accessToken

    // login seeded admin
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

    // user token → should fail
    await expect(
      httpJson<any>("POST", `${MEDIA_HTTP}/media/presign`, body, {
        authorization: `Bearer ${userAccess}`,
      })
    ).rejects.toBeTruthy()

    // admin token → should succeed
    const res = await httpJson<any>("POST", `${MEDIA_HTTP}/media/presign`, body, {
      authorization: `Bearer ${adminAccess}`,
    })

    // response is { data: {...} }
    expect(res?.data?.uploadUrl).toBeTruthy()
    expect(res?.data?.bucket).toBeTruthy()
    expect(res?.data?.path).toBeTruthy()
    expect(res?.data?.mimeType).toBe("image/webp")
  })

  it("POST /media (create) requires admin (user denied, admin allowed)", async () => {
    // first presign as admin
    const presign = await httpJson<any>(
      "POST",
      `${MEDIA_HTTP}/media/presign`,
      { filename: "e2e.webp", mimeType: "image/webp", visibility: "private", scope: "panel" },
      { authorization: `Bearer ${adminAccess}` }
    )

    const uploadUrl: string = presign.data.uploadUrl
    const bucket: string = presign.data.bucket
    const path: string = presign.data.path

    // upload tiny payload (proves storage flow)
    const up = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "content-type": "image/webp" },
      body: Buffer.from("hello"),
    })
    expect([200, 204]).toContain(up.status)

    const createBody = {
      storage: "s3",
      bucket,
      path,
      filename: presign.data.filename ?? "e2e.webp",
      mimeType: presign.data.mimeType ?? "image/webp",
      sizeBytes: "5",
      visibility: presign.data.visibility ?? "private",
      scope: presign.data.scope ?? "panel",
    }

    // user token → should fail
    await expect(
      httpJson<any>("POST", `${MEDIA_HTTP}/media`, createBody, {
        authorization: `Bearer ${userAccess}`,
      })
    ).rejects.toBeTruthy()

    // admin token → should succeed
    const created = await httpJson<any>("POST", `${MEDIA_HTTP}/media`, createBody, {
      authorization: `Bearer ${adminAccess}`,
    })

    expect(created?.data?.id).toBeTruthy()
    expect(created?.data?.storage).toBe("s3")
    expect(created?.data?.bucket).toBe(bucket)
    expect(created?.data?.path).toBe(path)

    // cleanup: delete as admin
    const id = created.data.id
    const del = await httpJson<any>("DELETE", `${MEDIA_HTTP}/media/${id}`, undefined, {
      authorization: `Bearer ${adminAccess}`,
    })
    expect(del).toEqual({ deleted: true })
  })

  it("GET /media and GET /media/:id require admin (user denied, admin allowed)", async () => {
    // create one row (admin)
    const presign = await httpJson<any>(
      "POST",
      `${MEDIA_HTTP}/media/presign`,
      { filename: "e2e.webp", mimeType: "image/webp", visibility: "private", scope: "panel" },
      { authorization: `Bearer ${adminAccess}` }
    )

    const up = await fetch(presign.data.uploadUrl, {
      method: "PUT",
      headers: { "content-type": "image/webp" },
      body: Buffer.from("hello"),
    })
    expect([200, 204]).toContain(up.status)

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
        visibility: "private",
        scope: "panel",
      },
      { authorization: `Bearer ${adminAccess}` }
    )

    const id = created.data.id

    // user token → should fail
    await expect(
      httpJson<any>("GET", `${MEDIA_HTTP}/media`, undefined, { authorization: `Bearer ${userAccess}` })
    ).rejects.toBeTruthy()

    await expect(
      httpJson<any>("GET", `${MEDIA_HTTP}/media/${id}`, undefined, { authorization: `Bearer ${userAccess}` })
    ).rejects.toBeTruthy()

    // admin token → should succeed
    const list = await httpJson<any>("GET", `${MEDIA_HTTP}/media?take=10&skip=0`, undefined, {
      authorization: `Bearer ${adminAccess}`,
    })
    expect(Array.isArray(list.data)).toBe(true)

    const got = await httpJson<any>("GET", `${MEDIA_HTTP}/media/${id}`, undefined, {
      authorization: `Bearer ${adminAccess}`,
    })
    expect(got.data.id).toBe(id)

    // cleanup
    const del = await httpJson<any>("DELETE", `${MEDIA_HTTP}/media/${id}`, undefined, {
      authorization: `Bearer ${adminAccess}`,
    })
    expect(del).toEqual({ deleted: true })
  })
})
