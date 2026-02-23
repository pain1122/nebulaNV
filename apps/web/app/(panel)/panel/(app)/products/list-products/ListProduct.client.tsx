"use client"

import {useEffect, useMemo, useState} from "react"
import Link from "next/link"
import { apiFetch } from "@/lib/api/apiFetch"

type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED"

type ProductRow = {
  id: string
  slug: string
  title: string
  sku: string
  status: ProductStatus
  price: string
  currency: string
  thumbnailUrl: string | null
  categoryId: string
  isFeatured: boolean
  createdAt: string
  updatedAt: string
}

type GetProductsResponse = {
  ok: true
  page: number
  limit: number
  total: number
  totalPages: number
  items: ProductRow[]
}

type TaxonomyDto = {
  id: string
  title: string
  slug: string
  parentId: string | null
  childCount?: number
}

type TaxonomyListResponse = {
  data: TaxonomyDto[]
  page: number
  limit: number
  total: number
}

function fmtMoney(price: string, currency: string) {
  // price is string because Decimal
  const n = Number(price)
  if (Number.isFinite(n)) {
    try {
      return new Intl.NumberFormat("fa-IR", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(n)
    } catch {
      return `${n.toLocaleString("fa-IR")} ${currency}`
    }
  }
  return `${price} ${currency}`
}

function buildQuery(params: Record<string, string | number | undefined | null>) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue
    sp.set(k, String(v))
  }
  const qs = sp.toString()
  return qs ? `?${qs}` : ""
}

export default function ListProductClient() {
  // UI state
  const [activeTab, setActiveTab] = useState<"all" | "published" | "draft">("all")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  const [page, setPage] = useState(1)
  const limit = 20

  // data state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [dataAll, setDataAll] = useState<GetProductsResponse | null>(null)
  const [dataActive, setDataActive] = useState<GetProductsResponse | null>(null)
  const [dataDraft, setDataDraft] = useState<GetProductsResponse | null>(null)

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const [categories, setCategories] = useState<TaxonomyDto[]>([])
  const [brands, setBrands] = useState<TaxonomyDto[]>([])
  const [taxLoading, setTaxLoading] = useState(false)
  const [taxError, setTaxError] = useState<string | null>(null)
  const [brandSearch, setBrandSearch] = useState("")

  const [minCost, setMinCost] = useState<number>(0)
  const [maxCost, setMaxCost] = useState<number>(1000)

  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [selectedDiscounts, setSelectedDiscounts] = useState<number[]>([])
  const [selectedRatings, setSelectedRatings] = useState<number[]>([])

  const toggleBrand = (b: string) => {
    setSelectedBrands((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]))
    setPage(1)
  }

  const toggleDiscount = (n: number) => {
    setSelectedDiscounts((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]))
    setPage(1)
  }

  const toggleRating = (n: number) => {
    setSelectedRatings((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]))
    setPage(1)
  }

  useEffect(() => {
    fetchProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, page, debouncedSearch, selectedCategory])

  useEffect(() => {
    setPage(1)
  }, [selectedCategory, selectedBrands, selectedDiscounts, selectedRatings, minCost, maxCost])

  useEffect(() => {
    let cancelled = false

    async function loadTaxonomies() {
      setTaxLoading(true)
      setTaxError(null)

      try {
        const [catRes, brandRes] = await Promise.all([apiFetch(`/api/taxonomy?kind=product_cat&limit=200`, {cache: "no-store"}), apiFetch(`/api/taxonomy?kind=product_brand&limit=200`, {cache: "no-store"})])

        const [catJson, brandJson] = await Promise.all([catRes.json() as Promise<TaxonomyListResponse>, brandRes.json() as Promise<TaxonomyListResponse>])

        if (!catRes.ok) throw new Error((catJson as any)?.message || `categories failed (${catRes.status})`)
        if (!brandRes.ok) throw new Error((brandJson as any)?.message || `brands failed (${brandRes.status})`)

        if (!cancelled) {
          setCategories(catJson.data ?? [])
          setBrands(brandJson.data ?? [])
        }
      } catch (e: any) {
        if (!cancelled) setTaxError(e?.message || "taxonomy load failed")
      } finally {
        if (!cancelled) setTaxLoading(false)
      }
    }

    loadTaxonomies()
    return () => {
      cancelled = true
    }
  }, [])

  // debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  // Reset pagination when tab/search changes
  useEffect(() => {
    setPage(1)
  }, [activeTab, debouncedSearch])

  const statusForTab: ProductStatus | undefined = useMemo(() => {
    if (activeTab === "published") return "ACTIVE"
    if (activeTab === "draft") return "DRAFT"
    return undefined
  }, [activeTab])

  async function fetchProducts() {
    setLoading(true)
    setError(null)

    try {
      const qs = buildQuery({
        page,
        limit,
        q: debouncedSearch || undefined,
        status: statusForTab || undefined,

        // ✅ backend-supported today:
        categoryId: selectedCategory || undefined,

        // ✅ add later when backend supports:
        // minPrice: minCost,
        // maxPrice: maxCost,
        // tags: selectedBrands.join(","),
      })

      const res = await apiFetch(`/api/products${qs}`, {cache: "no-store"})
      const json = (await res.json()) as any

      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || `Request failed (${res.status})`)
      }

      const payload = json as GetProductsResponse

      if (activeTab === "all") setDataAll(payload)
      else if (activeTab === "published") setDataActive(payload)
      else setDataDraft(payload)
    } catch (e: any) {
      setError(e?.message ?? "خطای نامشخص")
    } finally {
      setLoading(false)
    }
  }

  const currentData = activeTab === "all" ? dataAll : activeTab === "published" ? dataActive : dataDraft

  const totalForBadges = {
    all: dataAll?.total ?? 0,
    published: dataActive?.total ?? 0,
    draft: dataDraft?.total ?? 0,
  }

  const items = currentData?.items ?? []

  return (
    <div className="row">
      <div className="col-xl-3 col-lg-4">
        <div className="card">
          <div className="card-header">
            <div className="d-flex mb-3">
              <div className="flex-grow-1">
                <h5 className="fs-16">فیلترها</h5>
              </div>
              <div className="flex-shrink-0">
                <button
                  type="button"
                  className="btn btn-link text-decoration-underline p-0"
                  id="clearall"
                  onClick={() => {
                    setSearch("")
                    setActiveTab("all")
                    setPage(1)

                    // add these states if you create them
                    setSelectedCategory(null)
                    setMinCost(0)
                    setMaxCost(1000)
                    setSelectedBrands([])
                    setSelectedDiscounts([])
                    setSelectedRatings([])
                  }}
                >
                  پاک کردن همه
                </button>
              </div>
            </div>
            <div className="filter-choices-input">
              <input className="form-control" type="text" id="filter-choices-input" placeholder="جستجو..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="accordion accordion-flush filter-accordion">
            <div className="card-body border-bottom">
              <div>
                <p className="text-muted text-uppercase fs-12 fw-medium mb-2">محصولات</p>
                <ul className="list-unstyled mb-0 filter-list">
                  <li>
                    <button
                      type="button"
                      className="btn btn-link d-flex py-1 align-items-center text-start w-100 text-decoration-none"
                      onClick={() => {
                        setSelectedCategory(null)
                      }}
                    >
                      <div className="flex-grow-1">
                        <h5 className="fs-13 mb-0 listname">همه</h5>
                      </div>
                    </button>
                  </li>

                  {taxLoading ? (
                    <li className="py-2 text-muted fs-12">در حال دریافت...</li>
                  ) : taxError ? (
                    <li className="py-2 text-danger fs-12">{taxError}</li>
                  ) : (
                    categories.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="btn btn-link d-flex py-1 align-items-center text-start w-100 text-decoration-none"
                          onClick={() => {
                            setSelectedCategory(c.id)
                          }}
                        >
                          <div className="flex-grow-1">
                            <h5 className="fs-13 mb-0 listname">{c.title}</h5>
                          </div>

                          {/* optional count badge if you expose childCount */}
                          {typeof c.childCount === "number" && c.childCount > 0 ? (
                            <div className="flex-shrink-0 ms-2">
                              <span className="badge bg-light text-muted">{c.childCount}</span>
                            </div>
                          ) : null}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
            <div className="card-body border-bottom">
              <p className="text-muted text-uppercase fs-12 fw-medium mb-4">قیمت</p>
              <div id="product-price-range" />
              <div className="formCost d-flex gap-2 align-items-center mt-3">
                <input className="form-control form-control-sm" type="number" id="minCost" value={minCost} onChange={(e) => setMinCost(Number(e.target.value || 0))} />

                <span className="fw-semibold text-muted">به</span>

                <input className="form-control form-control-sm" type="number" id="maxCost" value={maxCost} onChange={(e) => setMaxCost(Number(e.target.value || 0))} />
              </div>
            </div>
            <div className="accordion-item">
              <h2 className="accordion-header" id="flush-headingBrands">
                <button className="accordion-button bg-transparent shadow-none" type="button" data-bs-toggle="collapse" data-bs-target="#flush-collapseBrands" aria-expanded="true" aria-controls="flush-collapseBrands">
                  <span className="text-muted text-uppercase fs-12 fw-medium">برندها</span>
                  <span className="badge bg-info rounded-pill align-middle ms-1 filter-badge">{selectedBrands.length || ""}</span>
                </button>
              </h2>
              <div id="flush-collapseBrands" className="accordion-collapse collapse show" aria-labelledby="flush-headingBrands">
                <div className="accordion-body text-body pt-0">
                  <div className="search-box search-box-sm">
                    <input type="text" className="form-control bg-light border-0" id="searchBrandsList" placeholder="جستجوی برندها..." value={brandSearch} onChange={(e) => setBrandSearch(e.target.value)} />
                    <i className="ri-search-line search-icon" />
                  </div>
                  <div className="d-flex flex-column gap-2 mt-3 filter-check">
                    {taxLoading ? (
                      <div className="text-muted fs-12">در حال دریافت...</div>
                    ) : taxError ? (
                      <div className="text-danger fs-12">{taxError}</div>
                    ) : (
                      brands
                        .filter((b) => b.title.toLowerCase().includes(brandSearch.trim().toLowerCase()))
                        .slice(0, 30)
                        .map((b) => (
                          <div className="form-check" key={b.id}>
                            <input className="form-check-input" type="checkbox" id={`brand-${b.id}`} checked={selectedBrands.includes(b.id)} onChange={() => toggleBrand(b.id)} />
                            <label className="form-check-label" htmlFor={`brand-${b.id}`}>
                              {b.title}
                            </label>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* end accordion-item */}
            <div className="accordion-item">
              <h2 className="accordion-header" id="flush-headingDiscount">
                <button className="accordion-button bg-transparent shadow-none collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#flush-collapseDiscount" aria-expanded="true" aria-controls="flush-collapseDiscount">
                  <span className="text-muted text-uppercase fs-12 fw-medium">تخفیف</span>
                  <span className="badge bg-info rounded-pill align-middle ms-1 filter-badge">{selectedDiscounts.length || ""}</span>
                </button>
              </h2>
              <div id="flush-collapseDiscount" className="accordion-collapse collapse" aria-labelledby="flush-headingDiscount">
                <div className="accordion-body text-body pt-1">
                  <div className="d-flex flex-column gap-2 filter-check">
                    {[50, 40, 30, 20, 10].map((n) => (
                      <div className="form-check" key={n}>
                        <input className="form-check-input" type="checkbox" id={`discount-${n}`} checked={selectedDiscounts.includes(n)} onChange={() => toggleDiscount(n)} />
                        <label className="form-check-label" htmlFor={`discount-${n}`}>
                          {n} درصد یا بیشتر
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* end accordion-item */}
            <div className="accordion-item">
              <h2 className="accordion-header" id="flush-headingRating">
                <button className="accordion-button bg-transparent shadow-none collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#flush-collapseRating" aria-expanded="false" aria-controls="flush-collapseRating">
                  <span className="text-muted text-uppercase fs-12 fw-medium">رتبه بندی</span> <span className="badge bg-info rounded-pill align-middle ms-1 filter-badge" />
                </button>
              </h2>
              <div id="flush-collapseRating" className="accordion-collapse collapse" aria-labelledby="flush-headingRating">
                <div className="accordion-body text-body">
                  <div className="d-flex flex-column gap-2 filter-check">
                    {[4, 3, 2, 1].map((n) => (
                      <div className="form-check" key={n}>
                        <input className="form-check-input" type="checkbox" id={`rating-${n}`} checked={selectedRatings.includes(n)} onChange={() => toggleRating(n)} />
                        <label className="form-check-label" htmlFor={`rating-${n}`}>
                          <span className="text-muted">
                            {Array.from({length: 5}).map((_, i) => (
                              <i key={i} className={`mdi mdi-star ${i < n ? "text-warning" : ""}`} />
                            ))}
                          </span>
                          {n} و بالاتر
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* end accordion-item */}
          </div>
        </div>
        {/* end card */}
      </div>

      <div className="col-xl-9 col-lg-8">
        <div>
          <div className="card">
            <div className="card-header border-0">
              <div className="row g-4">
                <div className="col-sm-auto">
                  <div>
                    <Link href="/panel/products/add-product" className="btn btn-info" id="addproduct-btn">
                      <i className="ri-add-line align-bottom me-1" />
                      افزودن محصول
                    </Link>
                  </div>
                </div>
                <div className="col-sm">
                  <div className="d-flex justify-content-sm-end">
                    <div className="search-box ms-2">
                      <input type="text" className="form-control" id="searchProductList" placeholder="جستجوی محصولات..." value={search} onChange={(e) => setSearch(e.target.value)} />
                      <i className="ri-search-line search-icon" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-header">
              <div className="row align-items-center">
                <div className="col">
                  <ul className="nav nav-tabs-custom card-header-tabs border-bottom-0" role="tablist">
                    <li className="nav-item">
                      <button type="button" className={`nav-link text-body fw-semibold ${activeTab === "all" ? "active" : ""}`} onClick={() => setActiveTab("all")}>
                        همه
                        <span className="badge bg-danger-subtle text-danger align-middle rounded-pill ms-1">{totalForBadges.all || ""}</span>
                      </button>
                    </li>

                    <li className="nav-item">
                      <button type="button" className={`nav-link text-body fw-semibold ${activeTab === "published" ? "active" : ""}`} onClick={() => setActiveTab("published")}>
                        منتشر شد
                        <span className="badge bg-danger-subtle text-danger align-middle rounded-pill ms-1">{totalForBadges.published || ""}</span>
                      </button>
                    </li>

                    <li className="nav-item">
                      <button type="button" className={`nav-link text-body fw-semibold ${activeTab === "draft" ? "active" : ""}`} onClick={() => setActiveTab("draft")}>
                        پیش نویس
                        <span className="badge bg-danger-subtle text-danger align-middle rounded-pill ms-1">{totalForBadges.draft || ""}</span>
                      </button>
                    </li>
                  </ul>
                </div>

                <div className="col-auto">
                  {loading ? (
                    <span className="text-muted">در حال دریافت...</span>
                  ) : currentData ? (
                    <span className="text-muted">
                      صفحه {currentData.page} از {currentData.totalPages} — {currentData.total} نتیجه
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="card-body">
              {error ? <div className="alert alert-danger mb-3">{error}</div> : null}

              <div className="tab-content text-muted">
                <div className={`tab-pane ${activeTab === "all" ? "active" : ""}`} id="productnav-all" role="tabpanel">
                  <ProductsTable items={items} loading={loading} />
                  <Pager page={currentData?.page ?? page} totalPages={currentData?.totalPages ?? 1} onPageChange={setPage} disabled={loading} />
                </div>

                <div className={`tab-pane ${activeTab === "published" ? "active" : ""}`} id="productnav-published" role="tabpanel">
                  <ProductsTable items={items} loading={loading} />
                  <Pager page={currentData?.page ?? page} totalPages={currentData?.totalPages ?? 1} onPageChange={setPage} disabled={loading} />
                </div>

                <div className={`tab-pane ${activeTab === "draft" ? "active" : ""}`} id="productnav-draft" role="tabpanel">
                  <ProductsTable items={items} loading={loading} emptyText="متاسفم! هیچ نتیجه ای یافت نشد" />
                  <Pager page={currentData?.page ?? page} totalPages={currentData?.totalPages ?? 1} onPageChange={setPage} disabled={loading} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProductsTable({items, loading, emptyText = "متاسفم! هیچ نتیجه ای یافت نشد"}: {items: ProductRow[]; loading: boolean; emptyText?: string}) {
  if (loading) {
    return (
      <div className="py-4 text-center">
        <div className="spinner-border text-info" role="status" />
        <div className="mt-3">در حال دریافت لیست محصولات...</div>
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="py-4 text-center">
        <h5 className="mt-2">{emptyText}</h5>
      </div>
    )
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light">
          <tr>
            <th style={{width: 60}} />
            <th>عنوان</th>
            <th>SKU</th>
            <th>وضعیت</th>
            <th>قیمت</th>
            <th>ویژه</th>
            <th>آپدیت</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id}>
              <td>
                {p.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.thumbnailUrl} alt={p.title} style={{width: 42, height: 42, objectFit: "cover", borderRadius: 8}} />
                ) : (
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 8,
                      background: "rgba(0,0,0,0.06)",
                    }}
                  />
                )}
              </td>
              <td>
                <div className="fw-semibold text-body">
                  <Link href={`/panel/products/add-product/${p.id}/edit`} className="text-body text-decoration-none">
                    {p.title}
                  </Link>
                </div>
                <div className="text-muted fs-12">{p.slug}</div>
              </td>
              <td className="text-muted">{p.sku}</td>
              <td>
                <span className={`badge ${p.status === "ACTIVE" ? "bg-success-subtle text-success" : p.status === "DRAFT" ? "bg-warning-subtle text-warning" : "bg-secondary-subtle text-secondary"}`}>{p.status === "ACTIVE" ? "فعال" : p.status === "DRAFT" ? "پیش‌نویس" : "آرشیو"}</span>
              </td>
              <td className="fw-medium">{fmtMoney(p.price, p.currency)}</td>
              <td>{p.isFeatured ? <span className="badge bg-info-subtle text-info">ویژه</span> : "-"}</td>
              <td className="text-muted fs-12">{new Date(p.updatedAt).toLocaleString("fa-IR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Pager({page, totalPages, onPageChange, disabled}: {page: number; totalPages: number; onPageChange: (p: number) => void; disabled: boolean}) {
  if (totalPages <= 1) return null

  return (
    <div className="d-flex justify-content-between align-items-center mt-3">
      <button type="button" className="btn btn-light" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)}>
        قبلی
      </button>

      <span className="text-muted">
        صفحه {page} از {totalPages}
      </span>

      <button type="button" className="btn btn-light" disabled={disabled || page >= totalPages} onClick={() => onPageChange(page + 1)}>
        بعدی
      </button>
    </div>
  )
}
