// apps/media-service/test/grpc/media.e2e.spec.ts
import {loadClient, call, mdS2S} from "./helpers"

const MEDIA_PROTO = require.resolve("@nebula/protos/media.proto")
const URL = process.env.MEDIA_GRPC_URL || "127.0.0.1:50058"

describe("MediaService gRPC (gateway-only S2S, svc:bucket)", () => {
  beforeAll(() => {
    process.env.SVC_NAME = "bucket"
  })

  const client = loadClient<any>({
    url: URL,
    protoPath: MEDIA_PROTO,
    pkg: ["media"],
    svc: "MediaService",
  })

  it("PresignUpload -> PUT -> Create -> GetById -> List -> DeleteById", async () => {
    const presign = await call<any>(client, "PresignUpload", {filename: "e2e.webp", mimeType: "image/webp", visibility: "private", scope: "panel"}, mdS2S({role: "admin"}))

    expect(presign.uploadUrl).toBeTruthy()
    expect(presign.bucket).toBeTruthy()
    expect(presign.path).toBeTruthy()

    const up = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: {"content-type": "image/webp"},
      body: Buffer.from("hello"),
    })
    expect([200, 204]).toContain(up.status)

    const created = await call<any>(
      client,
      "FinalizeUpload",
      {
        storage: "s3",
        bucket: presign.bucket,
        path: presign.path,

        filename: presign.filename || "e2e.webp",
        mimeType: presign.mimeType || "image/webp",
        visibility: presign.visibility || "private",
        scope: presign.scope || "panel",
      },
      mdS2S({role: "admin"})
    )

    expect(created.media?.id).toBeTruthy()
    const id = created.media.id

    const got = await call<any>(client, "GetById", {id}, mdS2S({role: "admin"}))
    expect(got.media?.id).toBe(id)

    const list = await call<any>(client, "List", {q: "", take: 50, skip: 0}, mdS2S({role: "admin"}))
    expect(Array.isArray(list.items)).toBe(true)

    const del = await call<any>(client, "DeleteById", {id}, mdS2S({role: "admin"}))
    expect(del).toEqual({deleted: true})
  })

  it("Missing signature → request fails", async () => {
    await expect(
      call<any>(client, "PresignUpload", {filename: "x.webp", mimeType: "image/webp"}) // no mdS2S()
    ).rejects.toBeTruthy()
  })
})
