import {httpJson} from "../utils/http"


const PRODUCT_HTTP = process.env.PRODUCT_HTTP_URL || "http://127.0.0.1:3003"
const BASE = `${PRODUCT_HTTP}/taxonomies`
const KIND = "category.default"

describe("Product taxonomy HTTP (category.default kind)", () => {
  let id = ""
  let slug = ""

  it("POST /taxonomies/:kind creates taxonomy", async () => {
    slug = `e2e-tax-http-${Date.now()}`
    const body = {
      slug,
      title: "E2E HTTP Category",
      description: "",
      parentId: null,
      isHidden: false,
      sortOrder: 0,
    }

    const res = await httpJson<any>("POST", `${BASE}/${KIND}`, body /* + your auth options, unchanged */)

    expect(res.data.id).toBeTruthy()
    expect(res.data.slug).toBe(slug)
    expect(res.data.kind).toBe(KIND)
    expect(res.data.scope).toBe("product")

    id = res.data.id
  })

  it("GET /taxonomies/:kind/:id returns the created item", async () => {
    const res = await httpJson<any>("GET", `${BASE}/${KIND}/${id}`)

    expect(res.data.id).toBe(id)
    expect(res.data.slug).toBe(slug)
  })

  it("GET /taxonomies/:kind lists and finds the created item", async () => {
    const res = await httpJson<any>("GET", `${BASE}/${KIND}?page=1&limit=20&q=HTTP`)

    const list = Array.isArray(res.data) ? res.data : []
    expect(Array.isArray(list)).toBe(true)

    const hit = list.find((t: any) => t.id === id)
    expect(!!hit).toBe(true)
  })

  it("PATCH /taxonomies/:kind/:id updates title", async () => {
    const body = { title: "E2E HTTP Category Pro" }

    const res = await httpJson<any>("PATCH", `${BASE}/${KIND}/${id}`, body /* + your auth options */)

    expect(res.data.id).toBe(id)
    expect(res.data.title).toBe("E2E HTTP Category Pro")
  })

  it("DELETE /taxonomies/:kind/:id deletes the taxonomy", async () => {
    const res = await httpJson<any>("DELETE", `${BASE}/${KIND}/${id}` /* + your auth options */)

    expect(res.data).toBe(true) // or whatever your controller returns; you already know from existing test
  })
})
