// apps/media-service/test/http/media.http.e2e.spec.ts
import {httpJson} from "../utils/http"
import {MediaStatus, PrismaClient, ScanStatus} from "../../prisma/generated"

const MEDIA_HTTP = process.env.MEDIA_HTTP_URL ?? "http://127.0.0.1:3007"
const AUTH_HTTP = process.env.AUTH_HTTP_URL ?? "http://127.0.0.1:3001"
const prisma = new PrismaClient()

type LoginResp = {accessToken: string; refreshToken: string}

describe("media-service HTTP (admin-only)", () => {
  let userAccess = ""
  let adminAccess = ""
  let userId = ""
  let adminId = ""

  beforeAll(async () => {
    const ut = await httpJson<LoginResp>("POST", `${AUTH_HTTP}/auth/login`, {
      identifier: process.env.SEED_USER_EMAIL ?? "user@example.com",
      password: process.env.SEED_USER_PASS ?? "User123!",
    })
    userAccess = ut.accessToken
    userId = subFromJwt(userAccess)

    const at = await httpJson<LoginResp>("POST", `${AUTH_HTTP}/auth/login`, {
      identifier: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
      password: process.env.SEED_ADMIN_PASS ?? "Admin123!",
    })
    adminAccess = at.accessToken
    adminId = subFromJwt(adminAccess)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  async function markReadyClean(id: string) {
    await prisma.media.update({
      where: {id},
      data: {
        status: MediaStatus.READY,
        scanStatus: ScanStatus.CLEAN,
        promotedAt: new Date(),
      },
    })
  }

  async function uploadPublicMedia(folderPath: string, displayName: string) {
    const presign = await httpJson<any>(
      "POST",
      `${MEDIA_HTTP}/media/public-library/presign`,
      {
        filename: displayName,
        mimeType: "image/webp",
        folderPath,
        displayName,
        visibility: "public",
        scope: "panel",
      },
      {authorization: `Bearer ${adminAccess}`},
    )

    const up = await fetch(presign.data.uploadUrl, {
      method: "PUT",
      headers: {"content-type": "image/webp"},
      body: Buffer.from("hello"),
    })
    expect([200, 204]).toContain(up.status)

    const created = await httpJson<any>(
      "POST",
      `${MEDIA_HTTP}/media/public-library/finalize`,
      {
        storage: "s3",
        bucket: presign.data.bucket,
        path: presign.data.path,
        folderPath: presign.data.folderPath,
        displayName: presign.data.displayName,
        originalFilename: presign.data.originalFilename,
        filename: presign.data.filename,
        mimeType: presign.data.mimeType,
        visibility: presign.data.visibility,
        scope: presign.data.scope,
      },
      {authorization: `Bearer ${adminAccess}`},
    )

    return created.data
  }

  function subFromJwt(token: string) {
    const [, payload] = token.split(".")
    if (!payload) throw new Error("jwt_payload_missing")
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).sub as string
  }

  async function uploadProtectedMedia(ownerId: string, entityId: string) {
    const presign = await httpJson<any>(
      "POST",
      `${MEDIA_HTTP}/media/protected-library/presign`,
      {
        filename: "manual.webp",
        mimeType: "image/webp",
        displayName: "manual.webp",
        ownerId,
        scope: "product-media",
        entityType: "product",
        entityId,
      },
      {authorization: `Bearer ${adminAccess}`},
    )

    const up = await fetch(presign.data.uploadUrl, {
      method: "PUT",
      headers: {"content-type": "image/webp"},
      body: Buffer.from("hello"),
    })
    expect([200, 204]).toContain(up.status)

    const created = await httpJson<any>(
      "POST",
      `${MEDIA_HTTP}/media/protected-library/finalize`,
      {
        storage: "s3",
        bucket: presign.data.bucket,
        path: presign.data.path,
        folderPath: presign.data.folderPath,
        displayName: presign.data.displayName,
        originalFilename: presign.data.originalFilename,
        filename: presign.data.filename,
        mimeType: presign.data.mimeType,
        visibility: presign.data.visibility,
        accessClass: presign.data.accessClass,
        scope: presign.data.scope,
        ownerId: presign.data.ownerId,
        entityType: presign.data.entityType,
        entityId: presign.data.entityId,
      },
      {authorization: `Bearer ${adminAccess}`},
    )

    return created.data
  }

  it("GET /health reports DB and storage checks", async () => {
    const health = await httpJson<any>("GET", `${MEDIA_HTTP}/health`)

    expect(health.status).toBe("ok")
    expect(health.checks.db.status).toBe("ok")
    expect(["ok", "skipped"]).toContain(health.checks.storage.status)
  })

  it("POST /media/presign requires admin (user denied, admin allowed)", async () => {
    const body = {
      filename: `e2e_${Math.random().toString(36).slice(2, 8)}.webp`,
      mimeType: "image/webp",
      folderPath: "/test/presign",
      displayName: `public_${Math.random().toString(36).slice(2, 8)}.webp`,
      visibility: "public",
      scope: "panel",
    }

    await expect(
      httpJson<any>("POST", `${MEDIA_HTTP}/media/presign`, body, {
        authorization: `Bearer ${userAccess}`,
      }),
    ).rejects.toBeTruthy()

    const res = await httpJson<any>("POST", `${MEDIA_HTTP}/media/presign`, body, {
      authorization: `Bearer ${adminAccess}`,
    })

    expect(res?.data?.uploadUrl).toBeTruthy()
    expect(new URL(res.data.uploadUrl).hostname).not.toBe("minio")
    expect(res?.data?.bucket).toBeTruthy()
    expect(res?.data?.path).toBeTruthy()
    expect(res.data.path).toBe(`uploads/test/presign/${body.displayName}`)
    expect(res.data.folderPath).toBe("/test/presign")
    expect(res.data.displayName).toBe(body.displayName)
    expect(res.data.originalFilename).toBe(body.filename)
    expect(res.data.path).not.toContain("pending")
    expect(res.data.path).not.toContain("protected")
    expect(res?.data?.mimeType).toBe("image/webp")
  })

  it("POST /media rejects direct S3 row creation", async () => {
    await expect(
      httpJson<any>(
        "POST",
        `${MEDIA_HTTP}/media`,
        {
          storage: "s3",
          bucket: "media",
          path: "uploads/test/direct/direct.webp",
          folderPath: "/test/direct",
          displayName: "direct.webp",
          filename: "direct.webp",
          mimeType: "image/webp",
          sizeBytes: 5,
          visibility: "public",
          scope: "panel",
        },
        {authorization: `Bearer ${adminAccess}`},
      ),
    ).rejects.toBeTruthy()
  })

  it("GET /media/render/:id streams ready public media without admin credentials", async () => {
    const folderPath = `/test/render_${Math.random().toString(36).slice(2, 8)}`
    let id: string | undefined

    try {
      const media = await uploadPublicMedia(folderPath, "render.webp")
      id = media.id
      await markReadyClean(id)

      const res = await fetch(`${MEDIA_HTTP}/media/render/${id}?variant=web`)

      expect(res.status).toBe(200)
      expect(res.headers.get("content-type")).toContain("image/webp")
      expect(res.headers.get("content-disposition")).toContain("inline")
      expect(res.headers.get("cache-control")).toContain("public")
      expect(await res.text()).toBe("hello")
    } finally {
      if (id) {
        await httpJson<any>("DELETE", `${MEDIA_HTTP}/media/${id}`, undefined, {
          authorization: `Bearer ${adminAccess}`,
        }).catch(() => undefined)
      }
    }
  })

  it("GET /media/render/:id rejects original/raw public variants", async () => {
    const folderPath = `/test/render_variant_${Math.random().toString(36).slice(2, 8)}`
    let id: string | undefined

    try {
      const media = await uploadPublicMedia(folderPath, "variant.webp")
      id = media.id
      await markReadyClean(id)

      const res = await fetch(`${MEDIA_HTTP}/media/render/${id}?variant=original`)

      expect(res.status).toBe(400)
    } finally {
      if (id) {
        await httpJson<any>("DELETE", `${MEDIA_HTTP}/media/${id}`, undefined, {
          authorization: `Bearer ${adminAccess}`,
        }).catch(() => undefined)
      }
    }
  })

  it("GET /media/render/:id blocks pending and non-public media", async () => {
    const folderPath = `/test/render_block_${Math.random().toString(36).slice(2, 8)}`
    let pendingId: string | undefined
    let protectedId: string | undefined

    try {
      const pending = await uploadPublicMedia(folderPath, "pending.webp")
      pendingId = pending.id

      const pendingRes = await fetch(`${MEDIA_HTTP}/media/render/${pendingId}?variant=web`)
      expect(pendingRes.status).toBe(403)

      const protectedRow = await httpJson<any>(
        "POST",
        `${MEDIA_HTTP}/media`,
        {
          storage: "local",
          path: "private/objects/local-render-protected.webp",
          folderPath: "/",
          displayName: "local-render-protected.webp",
          filename: "local-render-protected.webp",
          mimeType: "image/webp",
          sizeBytes: 5,
          accessClass: "PROTECTED",
          visibility: "private",
          scope: "panel",
        },
        {authorization: `Bearer ${adminAccess}`},
      )
      protectedId = protectedRow.data.id

      const protectedRes = await fetch(`${MEDIA_HTTP}/media/render/${protectedId}?variant=web`)
      expect(protectedRes.status).toBe(403)
    } finally {
      for (const id of [pendingId, protectedId]) {
        if (!id) continue
        await httpJson<any>("DELETE", `${MEDIA_HTTP}/media/${id}`, undefined, {
          authorization: `Bearer ${adminAccess}`,
        }).catch(() => undefined)
      }
    }
  })

  it("presign -> PUT -> finalize -> GET -> LIST -> pending read-url blocked -> DELETE (admin)", async () => {
    const folderPath = `/test/e2e_${Math.random().toString(36).slice(2, 8)}`

    // 1) presign
    const presign = await httpJson<any>(
      "POST",
      `${MEDIA_HTTP}/media/presign`,
      {
        filename: "e2e.webp",
        mimeType: "image/webp",
        folderPath,
        displayName: "hero.webp",
        visibility: "public",
        scope: "panel",
      },
      {authorization: `Bearer ${adminAccess}`},
    )

    const uploadUrl: string = presign.data.uploadUrl
    expect(new URL(uploadUrl).hostname).not.toBe("minio")
    expect(presign.data.path).toBe(`uploads/${folderPath.slice(1)}/hero.webp`)
    expect(presign.data.folderPath).toBe(folderPath)
    expect(presign.data.displayName).toBe("hero.webp")

    // 2) upload tiny payload
    const up = await fetch(uploadUrl, {
      method: "PUT",
      headers: {"content-type": "image/webp"},
      body: Buffer.from("hello"),
    })
    expect([200, 204]).toContain(up.status)

    // 3) finalize row from trusted object metadata
    const created = await httpJson<any>(
      "POST",
      `${MEDIA_HTTP}/media/finalize`,
      {
        storage: "s3",
        bucket: presign.data.bucket,
        path: presign.data.path,
        folderPath: presign.data.folderPath,
        displayName: presign.data.displayName,
        originalFilename: presign.data.originalFilename,
        filename: presign.data.filename ?? "e2e.webp",
        mimeType: presign.data.mimeType ?? "image/webp",
        visibility: presign.data.visibility ?? "public",
        scope: presign.data.scope ?? "panel",
      },
      {authorization: `Bearer ${adminAccess}`},
    )

    expect(created?.data?.id).toBeTruthy()
    expect(created.data.path).toBe(presign.data.path)
    expect(created.data.folderPath).toBe(folderPath)
    expect(created.data.displayName).toBe("hero.webp")
    const id = created.data.id

    // user cannot list/get
    await expect(
      httpJson<any>("GET", `${MEDIA_HTTP}/media?take=10&skip=0`, undefined, {
        authorization: `Bearer ${userAccess}`,
      }),
    ).rejects.toBeTruthy()

    await expect(
      httpJson<any>("GET", `${MEDIA_HTTP}/media/${id}`, undefined, {
        authorization: `Bearer ${userAccess}`,
      }),
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

    const folderList = await httpJson<any>("GET", `${MEDIA_HTTP}/media?folderPath=${encodeURIComponent(folderPath)}`, undefined, {
      authorization: `Bearer ${adminAccess}`,
    })
    expect(folderList.data.some((item: any) => item.id === id)).toBe(true)

    await expect(
      httpJson<any>("POST", `${MEDIA_HTTP}/media/public-library/${id}/read-url`, undefined, {
        authorization: `Bearer ${adminAccess}`,
      }),
    ).rejects.toBeTruthy()

    // delete
    const del = await httpJson<any>("DELETE", `${MEDIA_HTTP}/media/public-library/${id}`, undefined, {
      authorization: `Bearer ${adminAccess}`,
    })
    expect(del).toEqual({deleted: true})
  })

  it("POST /media/presign renames duplicate public file names numerically", async () => {
    const folderPath = `/test/duplicates_${Math.random().toString(36).slice(2, 8)}`
    const ids: string[] = []

    try {
      const first = await uploadPublicMedia(folderPath, "hero.webp")
      const second = await uploadPublicMedia(folderPath, "hero.webp")
      ids.push(first.id, second.id)

      expect(first.displayName).toBe("hero.webp")
      expect(first.path).toBe(`uploads/${folderPath.slice(1)}/hero.webp`)
      expect(second.displayName).toBe("hero-(1).webp")
      expect(second.path).toBe(`uploads/${folderPath.slice(1)}/hero-(1).webp`)
    } finally {
      for (const id of ids) {
        await httpJson<any>("DELETE", `${MEDIA_HTTP}/media/${id}`, undefined, {
          authorization: `Bearer ${adminAccess}`,
        }).catch(() => undefined)
      }
    }
  })

  it("requires admin for browse, read-url, and delete", async () => {
    const folderPath = `/test/role_${Math.random().toString(36).slice(2, 8)}`
    let id: string | undefined

    try {
      const media = await uploadPublicMedia(folderPath, "locked.webp")
      id = media.id

      await expect(
        httpJson<any>("GET", `${MEDIA_HTTP}/media/browse?folderPath=${encodeURIComponent(folderPath)}`, undefined, {
          authorization: `Bearer ${userAccess}`,
        }),
      ).rejects.toBeTruthy()

      await expect(
        httpJson<any>("GET", `${MEDIA_HTTP}/media/public-library/browse?folderPath=${encodeURIComponent(folderPath)}`, undefined, {
          authorization: `Bearer ${userAccess}`,
        }),
      ).rejects.toBeTruthy()

      await expect(
        httpJson<any>("POST", `${MEDIA_HTTP}/media/${id}/read-url`, undefined, {
          authorization: `Bearer ${userAccess}`,
        }),
      ).rejects.toBeTruthy()

      await expect(
        httpJson<any>("POST", `${MEDIA_HTTP}/media/public-library/${id}/read-url`, undefined, {
          authorization: `Bearer ${userAccess}`,
        }),
      ).rejects.toBeTruthy()

      await expect(
        httpJson<any>("DELETE", `${MEDIA_HTTP}/media/${id}`, undefined, {
          authorization: `Bearer ${userAccess}`,
        }),
      ).rejects.toBeTruthy()

      await expect(
        httpJson<any>("DELETE", `${MEDIA_HTTP}/media/public-library/${id}`, undefined, {
          authorization: `Bearer ${userAccess}`,
        }),
      ).rejects.toBeTruthy()

      await expect(
        httpJson<any>(
          "POST",
          `${MEDIA_HTTP}/media/public-library/delete-preview`,
          {
            items: [{type: "file", id}],
          },
          {authorization: `Bearer ${userAccess}`},
        ),
      ).rejects.toBeTruthy()
    } finally {
      if (id) {
        await httpJson<any>("DELETE", `${MEDIA_HTTP}/media/${id}`, undefined, {
          authorization: `Bearer ${adminAccess}`,
        }).catch(() => undefined)
      }
    }
  })

  it("public-library read-url and delete reject non-public media", async () => {
    let id: string | undefined

    try {
      const created = await httpJson<any>(
        "POST",
        `${MEDIA_HTTP}/media`,
        {
          storage: "local",
          path: "private/objects/local-protected.webp",
          folderPath: "/",
          displayName: "Protected.webp",
          filename: "Protected.webp",
          mimeType: "image/webp",
          sizeBytes: 5,
          accessClass: "PROTECTED",
          visibility: "private",
          scope: "panel",
        },
        {authorization: `Bearer ${adminAccess}`},
      )
      id = created.data.id

      await expect(
        httpJson<any>("POST", `${MEDIA_HTTP}/media/public-library/${id}/read-url`, undefined, {
          authorization: `Bearer ${adminAccess}`,
        }),
      ).rejects.toBeTruthy()

      await expect(
        httpJson<any>("DELETE", `${MEDIA_HTTP}/media/public-library/${id}`, undefined, {
          authorization: `Bearer ${adminAccess}`,
        }),
      ).rejects.toBeTruthy()

      await expect(
        httpJson<any>(
          "POST",
          `${MEDIA_HTTP}/media/public-library/delete-preview`,
          {
            items: [{type: "file", id}],
          },
          {authorization: `Bearer ${adminAccess}`},
        ),
      ).rejects.toBeTruthy()
    } finally {
      if (id) {
        await httpJson<any>("DELETE", `${MEDIA_HTTP}/media/${id}`, undefined, {
          authorization: `Bearer ${adminAccess}`,
        }).catch(() => undefined)
      }
    }
  })

  it("public-library delete preview/confirm handles bulk and recursive folder deletes", async () => {
    const suffix = Math.random().toString(36).slice(2, 8)
    const baseFolder = `/test/delete_${suffix}`
    const ids: string[] = []

    async function createLocalPublic(folderPath: string, displayName: string) {
      const created = await httpJson<any>(
        "POST",
        `${MEDIA_HTTP}/media`,
        {
          storage: "local",
          path: `uploads${folderPath}/${displayName}`,
          folderPath,
          displayName,
          filename: displayName,
          mimeType: "image/webp",
          sizeBytes: 5,
          accessClass: "PUBLIC",
          visibility: "public",
          scope: "panel",
        },
        {authorization: `Bearer ${adminAccess}`},
      )
      ids.push(created.data.id)
      return created.data
    }

    try {
      const direct = await createLocalPublic(baseFolder, "direct.webp")
      const nested = await createLocalPublic(`${baseFolder}/nested`, "nested.webp")

      const blockedPreview = await httpJson<any>(
        "POST",
        `${MEDIA_HTTP}/media/public-library/delete-preview`,
        {
          items: [{type: "folder", folderPath: baseFolder}],
          recursive: false,
        },
        {authorization: `Bearer ${adminAccess}`},
      )

      expect(blockedPreview.data.canDelete).toBe(false)
      expect(blockedPreview.data.confirmToken).toBeUndefined()
      expect(blockedPreview.data.fileCount).toBe(2)
      expect(blockedPreview.data.warnings.some((warning: any) => warning.code === "folder_not_empty_requires_recursive")).toBe(true)

      const preview = await httpJson<any>(
        "POST",
        `${MEDIA_HTTP}/media/public-library/delete-preview`,
        {
          items: [{type: "folder", folderPath: baseFolder}],
          recursive: true,
        },
        {authorization: `Bearer ${adminAccess}`},
      )

      expect(preview.data.canDelete).toBe(true)
      expect(preview.data.confirmToken).toBeTruthy()
      expect(preview.data.fileCount).toBe(2)
      expect(preview.data.files.map((file: any) => file.id).sort()).toEqual([direct.id, nested.id].sort())

      const confirmed = await httpJson<any>(
        "POST",
        `${MEDIA_HTTP}/media/public-library/delete-confirm`,
        {
          items: [{type: "folder", folderPath: baseFolder}],
          recursive: true,
          confirmToken: preview.data.confirmToken,
        },
        {authorization: `Bearer ${adminAccess}`},
      )

      expect(confirmed.data.deleted).toBe(true)
      expect(confirmed.data.fileCount).toBe(2)

      await expect(
        httpJson<any>("GET", `${MEDIA_HTTP}/media/${direct.id}`, undefined, {
          authorization: `Bearer ${adminAccess}`,
        }),
      ).rejects.toBeTruthy()

      await expect(
        httpJson<any>("GET", `${MEDIA_HTTP}/media/${nested.id}`, undefined, {
          authorization: `Bearer ${adminAccess}`,
        }),
      ).rejects.toBeTruthy()

      ids.length = 0
    } finally {
      for (const id of ids) {
        await httpJson<any>("DELETE", `${MEDIA_HTTP}/media/${id}`, undefined, {
          authorization: `Bearer ${adminAccess}`,
        }).catch(() => undefined)
      }
    }
  })

  it("GET /media/browse returns Supabase-style folders and files", async () => {
    const suffix = Math.random().toString(36).slice(2, 8)
    const baseFolder = `/test/browse_${suffix}`
    const heroName = `hero_${suffix}.webp`
    const sideName = `side_${suffix}.webp`
    const ids: string[] = []

    try {
      const hero = await uploadPublicMedia(`${baseFolder}/shoes`, heroName)
      const side = await uploadPublicMedia(`${baseFolder}/shoes/gallery`, sideName)
      ids.push(hero.id, side.id)

      const rootBrowse = await httpJson<any>("GET", `${MEDIA_HTTP}/media/browse?take=200`, undefined, {authorization: `Bearer ${adminAccess}`})
      expect(rootBrowse.data.folders.some((f: any) => f.name === "test")).toBe(true)

      const testBrowse = await httpJson<any>("GET", `${MEDIA_HTTP}/media/browse?path=${encodeURIComponent("test")}&take=200`, undefined, {authorization: `Bearer ${adminAccess}`})
      expect(testBrowse.data.folders.some((f: any) => f.name === `browse_${suffix}`)).toBe(true)

      const baseBrowse = await httpJson<any>("GET", `${MEDIA_HTTP}/media/browse?folderPath=${encodeURIComponent(baseFolder)}&take=200`, undefined, {authorization: `Bearer ${adminAccess}`})
      expect(baseBrowse.data.folders.some((f: any) => f.name === "shoes")).toBe(true)
      expect(Array.isArray(baseBrowse.data.files)).toBe(true)

      const shoesBrowse = await httpJson<any>("GET", `${MEDIA_HTTP}/media/browse?path=${encodeURIComponent(`${baseFolder.slice(1)}/shoes`)}&take=200`, undefined, {authorization: `Bearer ${adminAccess}`})
      expect(shoesBrowse.data.folders.some((f: any) => f.name === "gallery")).toBe(true)
      expect(shoesBrowse.data.files.some((file: any) => file.displayName === heroName)).toBe(true)

      const searchBrowse = await httpJson<any>("GET", `${MEDIA_HTTP}/media/browse?folderPath=${encodeURIComponent(`${baseFolder}/shoes`)}&search=${encodeURIComponent("hero")}`, undefined, {authorization: `Bearer ${adminAccess}`})
      expect(searchBrowse.data.files.some((file: any) => file.displayName === heroName)).toBe(true)
      expect(searchBrowse.data.files.some((file: any) => file.displayName === sideName)).toBe(false)
    } finally {
      for (const id of ids) {
        await httpJson<any>("DELETE", `${MEDIA_HTTP}/media/${id}`, undefined, {
          authorization: `Bearer ${adminAccess}`,
        }).catch(() => undefined)
      }
    }
  })

  it("POST /media/presign rejects protected/strict filemanager uploads", async () => {
    const base = {
      filename: "secret.webp",
      mimeType: "image/webp",
      folderPath: "/test/private",
      displayName: "secret.webp",
      scope: "panel",
    }

    await expect(httpJson<any>("POST", `${MEDIA_HTTP}/media/presign`, {...base, accessClass: "PROTECTED"}, {authorization: `Bearer ${adminAccess}`})).rejects.toBeTruthy()

    await expect(httpJson<any>("POST", `${MEDIA_HTTP}/media/presign`, {...base, accessClass: "STRICT"}, {authorization: `Bearer ${adminAccess}`})).rejects.toBeTruthy()
  })

  it("protected-library presign requires context and uses opaque private keys", async () => {
    const body = {
      filename: "secret.webp",
      mimeType: "image/webp",
      displayName: "secret.webp",
      scope: "product-media",
      entityType: "product",
      entityId: `prod_${Math.random().toString(36).slice(2, 8)}`,
    }

    await expect(
      httpJson<any>(
        "POST",
        `${MEDIA_HTTP}/media/protected-library/presign`,
        {...body, entityId: undefined},
        {authorization: `Bearer ${adminAccess}`},
      ),
    ).rejects.toBeTruthy()

    const res = await httpJson<any>(
      "POST",
      `${MEDIA_HTTP}/media/protected-library/presign`,
      body,
      {authorization: `Bearer ${adminAccess}`},
    )

    expect(res.data.path).toMatch(/^private\/objects\/[0-9a-f-]{36}$/)
    expect(res.data.path).not.toContain(body.filename)
    expect(res.data.folderPath).toBe("/")
    expect(res.data.displayName).toBe("secret.webp")
    expect(res.data.originalFilename).toBe("secret.webp")
    expect(res.data.visibility).toBe("private")
    expect(res.data.accessClass).toBe("PROTECTED")
    expect(res.data.scope).toBe(body.scope)
    expect(res.data.entityType).toBe(body.entityType)
    expect(res.data.entityId).toBe(body.entityId)
  })

  it("strict-library presign hides sensitive original filenames", async () => {
    const body = {
      filename: "passport_salar.webp",
      mimeType: "image/webp",
      displayName: "passport_salar.webp",
      scope: "identity-docs",
      entityType: "user",
      entityId: `user_${Math.random().toString(36).slice(2, 8)}`,
    }

    const res = await httpJson<any>(
      "POST",
      `${MEDIA_HTTP}/media/strict-library/presign`,
      body,
      {authorization: `Bearer ${adminAccess}`},
    )

    expect(res.data.path).toMatch(/^private\/objects\/[0-9a-f-]{36}$/)
    expect(res.data.path).not.toContain("passport")
    expect(res.data.path).not.toContain("salar")
    expect(res.data.filename).not.toBe(body.filename)
    expect(res.data.displayName).toBe(res.data.filename)
    expect(res.data.displayName).not.toContain("passport")
    expect(res.data.displayName).not.toContain("salar")
    expect(res.data.originalFilename).toBeNull()
    expect(res.data.accessClass).toBe("STRICT")
    expect(res.data.visibility).toBe("private")
  })

  it("protected-library browse lists files by owner and entity context", async () => {
    const suffix = Math.random().toString(36).slice(2, 8)
    let id: string | undefined

    try {
      const created = await httpJson<any>(
        "POST",
        `${MEDIA_HTTP}/media`,
        {
          storage: "local",
          path: `private/objects/local-protected-${suffix}.webp`,
          filename: `protected_${suffix}.webp`,
          displayName: `protected_${suffix}.webp`,
          mimeType: "image/webp",
          sizeBytes: 5,
          accessClass: "PROTECTED",
          visibility: "private",
          scope: "product-media",
          entityType: "product",
          entityId: `prod_${suffix}`,
        },
        {authorization: `Bearer ${adminAccess}`},
      )
      id = created.data.id

      await expect(
        httpJson<any>(
          "GET",
          `${MEDIA_HTTP}/media/protected-library/browse?scope=product-media&entityType=product`,
          undefined,
          {authorization: `Bearer ${adminAccess}`},
        ),
      ).rejects.toBeTruthy()

      const browse = await httpJson<any>(
        "GET",
        `${MEDIA_HTTP}/media/protected-library/browse?scope=product-media&entityType=product&entityId=prod_${suffix}`,
        undefined,
        {authorization: `Bearer ${adminAccess}`},
      )

      expect(browse.data.context.accessClass).toBe("PROTECTED")
      expect(browse.data.context.entityType).toBe("product")
      expect(browse.data.context.entityId).toBe(`prod_${suffix}`)
      expect(browse.data.folders).toEqual([])
      expect(browse.data.files.some((item: any) => item.id === id)).toBe(true)

      const deleted = await httpJson<any>(
        "DELETE",
        `${MEDIA_HTTP}/media/protected-library/${id}`,
        undefined,
        {authorization: `Bearer ${adminAccess}`},
      )
      expect(deleted).toEqual({deleted: true})
      id = undefined
    } finally {
      if (id) {
        await httpJson<any>("DELETE", `${MEDIA_HTTP}/media/${id}`, undefined, {
          authorization: `Bearer ${adminAccess}`,
        }).catch(() => undefined)
      }
    }
  })

  it("my protected-library routes only expose the current user's feature-owned files", async () => {
    const suffix = Math.random().toString(36).slice(2, 8)
    const entityId = `prod_${suffix}`
    const ids: string[] = []

    try {
      const own = await uploadProtectedMedia(userId, entityId)
      const otherOwner = await uploadProtectedMedia(adminId, entityId)
      ids.push(own.id, otherOwner.id)

      await markReadyClean(own.id)
      await markReadyClean(otherOwner.id)

      const browse = await httpJson<any>(
        "GET",
        `${MEDIA_HTTP}/media/my/protected-library/browse?scope=product-media&entityType=product&entityId=${entityId}`,
        undefined,
        {authorization: `Bearer ${userAccess}`},
      )

      expect(browse.data.context.ownerId).toBe(userId)
      expect(browse.data.context.accessClass).toBe("PROTECTED")
      expect(browse.data.files.some((item: any) => item.id === own.id)).toBe(true)
      expect(browse.data.files.some((item: any) => item.id === otherOwner.id)).toBe(false)

      const wrongEntityBrowse = await httpJson<any>(
        "GET",
        `${MEDIA_HTTP}/media/my/protected-library/browse?scope=product-media&entityType=product&entityId=prod_wrong_${suffix}`,
        undefined,
        {authorization: `Bearer ${userAccess}`},
      )
      expect(wrongEntityBrowse.data.files.some((item: any) => item.id === own.id)).toBe(false)

      const read = await httpJson<any>(
        "POST",
        `${MEDIA_HTTP}/media/my/protected-library/${own.id}/read-url?scope=product-media&entityType=product&entityId=${entityId}`,
        undefined,
        {authorization: `Bearer ${userAccess}`},
      )
      expect(read.data.url).toBeTruthy()
      expect(read.data.accessClass).toBe("PROTECTED")

      await expect(
        httpJson<any>(
          "POST",
          `${MEDIA_HTTP}/media/my/protected-library/${own.id}/read-url?scope=product-media&entityType=product&entityId=prod_wrong_${suffix}`,
          undefined,
          {authorization: `Bearer ${userAccess}`},
        ),
      ).rejects.toBeTruthy()

      await expect(
        httpJson<any>(
          "POST",
          `${MEDIA_HTTP}/media/my/protected-library/${otherOwner.id}/read-url?scope=product-media&entityType=product&entityId=${entityId}`,
          undefined,
          {authorization: `Bearer ${userAccess}`},
        ),
      ).rejects.toBeTruthy()
    } finally {
      for (const id of ids) {
        await httpJson<any>("DELETE", `${MEDIA_HTTP}/media/${id}`, undefined, {
          authorization: `Bearer ${adminAccess}`,
        }).catch(() => undefined)
      }
    }
  })

  it("POST /media/finalize rejects protected/strict public filemanager paths", async () => {
    await expect(
      httpJson<any>(
        "POST",
        `${MEDIA_HTTP}/media/finalize`,
        {
          storage: "s3",
          bucket: "media",
          path: "uploads/test/private/secret.webp",
          filename: "secret.webp",
          mimeType: "image/webp",
          accessClass: "STRICT",
          scope: "panel",
        },
        {authorization: `Bearer ${adminAccess}`},
      ),
    ).rejects.toBeTruthy()
  })

  it("POST /media/finalize rejects descriptive protected/strict private paths", async () => {
    await expect(
      httpJson<any>(
        "POST",
        `${MEDIA_HTTP}/media/finalize`,
        {
          storage: "s3",
          bucket: "media",
          path: "private/objects/products/secret.webp",
          filename: "secret.webp",
          mimeType: "image/webp",
          accessClass: "STRICT",
          scope: "panel",
        },
        {authorization: `Bearer ${adminAccess}`},
      ),
    ).rejects.toBeTruthy()
  })

  it("POST /media/finalize rejects public metadata that does not match path", async () => {
    await expect(
      httpJson<any>(
        "POST",
        `${MEDIA_HTTP}/media/finalize`,
        {
          storage: "s3",
          bucket: "media",
          path: "uploads/products/shoes/hero.webp",
          folderPath: "/products/hats",
          displayName: "hero.webp",
          filename: "hero.webp",
          mimeType: "image/webp",
          visibility: "public",
          scope: "panel",
        },
        {authorization: `Bearer ${adminAccess}`},
      ),
    ).rejects.toBeTruthy()

    await expect(
      httpJson<any>(
        "POST",
        `${MEDIA_HTTP}/media/finalize`,
        {
          storage: "s3",
          bucket: "media",
          path: "uploads/products/shoes/hero.webp",
          folderPath: "/products/shoes",
          displayName: "wrong.webp",
          filename: "hero.webp",
          mimeType: "image/webp",
          visibility: "public",
          scope: "panel",
        },
        {authorization: `Bearer ${adminAccess}`},
      ),
    ).rejects.toBeTruthy()
  })
})
