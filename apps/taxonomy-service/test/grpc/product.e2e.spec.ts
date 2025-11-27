import {loadClient, call, mdS2S} from "./helpers"

const PRODUCT_PROTO = require.resolve("@nebula/protos/taxonomy.proto")
const URL = process.env.PRODUCT_GRPC_URL || "127.0.0.1:50053"

const input = {title: "E2E Widget gRPC", price: 149.5}

describe("TaxonomyService gRPC (admin required on writes)", () => {
  const client = loadClient<any>({
    url: URL,
    protoPath: PRODUCT_PROTO,
    pkg: ["taxonomy"],
    svc: "TaxonomyService",
  })

  let id = ""

  it("'CreateTaxonomy works without metadata (internal call)", async () => {
    const res = await call<any>(client, "CreateTaxonomy", {data: input})
    expect(res.data.title).toBe(input.title)
  })

  it("CreateTaxonomy succeeds with S2S admin metadata", async () => {
    const res = await call<any>(client, "CreateTaxonomy", {data: input}, mdS2S({role: "admin"}))
    id = res.data.id
    expect(res.data.title).toBe(input.title)
  })

  it("GetTaxonomy returns the created item (public)", async () => {
    const res = await call<any>(client, "GetTaxonomy", {id}, mdS2S())
    expect(res.data.id).toBe(id)
  })

  it("ListTaxonomys finds the created item (public)", async () => {
    const res = await call<any>(client, "ListTaxonomys", {q: "gRPC", page: 1, limit: 20}, mdS2S())
    const hit = res.data.find((p: any) => p.id === id)
    expect(!!hit).toBe(true)
  })

  it("UpdateTaxonomy (admin) changes title", async () => {
    const res = await call<any>(client, "UpdateTaxonomy", {id, data: {title: "E2E Widget gRPC Pro"}}, mdS2S({role: "admin"}))
    expect(res.data.title).toBe("E2E Widget gRPC Pro")
  })
})
