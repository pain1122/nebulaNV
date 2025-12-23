"use client"

import React, {useEffect, useMemo, useState} from "react"
import TagifyInput, {type TagItem} from "@/components/forms/TagifyInput"

type TaxonomyKind = "product_cat" | "product_tag" | "product_attribute" | "product_variable"

export type CreatedTaxonomy = {
  id: string
  name: string
  slug: string
  kind: TaxonomyKind
  parentId?: string | null
}

type Props = {
  open: boolean
  onClose: () => void

  kind: TaxonomyKind
  titleLabel: string

  // TagifyInput items => { value: string; id?: string }
  parentOptions?: TagItem[]

  onCreated: (t: CreatedTaxonomy) => void
}

function slugifyFa(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}\-]+/gu, "")
}

export default function AddTaxonomyOffcanvas({open, onClose, kind, titleLabel, parentOptions = [], onCreated}: Props) {
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [parent, setParent] = useState<TagItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slugTouched, setSlugTouched] = useState(false)

  function onNameBlur() {
    if (slugTouched) return
    if (!name.trim()) return
    setSlug(slugifyFa(name))
  }

  // reset each open / kind change
  useEffect(() => {
    if (!open) return
    setName("")
    setSlug("")
    setParent([])
    setError(null)
  }, [open, kind])

  const showParent = useMemo(() => kind === "product_cat" || kind === "product_attribute" || kind === "product_variable", [kind])

  async function submit() {
    if (!name.trim()) return setError("نام الزامی است")
    if (!slug.trim()) return setError("نامک الزامی است")

    setSubmitting(true)
    setError(null)

    try {
      const parentId = showParent ? (parent?.[0]?.id ?? null) : null

      const res = await fetch("/api/taxonomy/create", {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({
          scope: "product",
          kind,
          title: name,
          slug,
          parentId,
        }),
      })

      const payloadText = await res.text().catch(() => "")
      if (!res.ok) {
        throw new Error(payloadText || `HTTP ${res.status}`)
      }

      let payload: any = null
      try {
        payload = payloadText ? JSON.parse(payloadText) : null
      } catch {
        payload = null
      }

      // Accept both:
      // 1) { id, name, slug }
      // 2) { data: { id, title/name, slug } }
      const data = payload?.data ?? payload ?? {}
      const id = data.id
      const createdName = data.name ?? data.title ?? name.trim()
      const createdSlug = data.slug ?? slugifyFa(slug)

      if (!id) throw new Error("پاسخ نامعتبر از سرور (id ندارد)")

      onCreated({
        id,
        name: createdName,
        slug: createdSlug,
        kind,
        parentId,
      })

      onClose()
    } catch (e: any) {
      setError(e?.message || "خطا در ثبت")
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <>
      {/* backdrop */}
      <div className="offcanvas-backdrop fade show" onClick={onClose} />

      <div className="offcanvas offcanvas-start show" tabIndex={-1} style={{visibility: "visible"}} aria-modal="true" role="dialog">
        <div className="offcanvas-header border-bottom">
          <h6 className="offcanvas-title">
            افزودن <span>{titleLabel}</span>
          </h6>
          <button type="button" className="btn-close text-reset" aria-label="Close" onClick={onClose} />
        </div>

        <div className="offcanvas-body mx-0 flex-grow-0">
          <form
            className="pt-0"
            onSubmit={(e) => {
              e.preventDefault()
              void submit()
            }}
          >
            <div className="mb-3">
              <label className="form-label">نام</label>
              <input type="text" className="form-control" placeholder="نام" value={name} onChange={(e) => setName(e.target.value)} onBlur={onNameBlur} required />
            </div>

            <div className="mb-3">
              <label className="form-label">نامک</label>
              <input
                type="text"
                className="form-control text-start"
                placeholder="نامک"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setSlug(slugifyFa(e.target.value))
                }}
                required
              />
            </div>

            {showParent ? (
              <div className="mb-3">
                <label className="form-label">دسته مادر</label>
                <TagifyInput name="product_cat_parent" placeholder="انتخاب دسته" value={parent} onChange={setParent} whitelist={parentOptions} maxTags={1} dropdownEnabled={1} enforceWhitelist={true} />
                <div className="form-text">اگر دسته مادر ندارید، خالی بگذارید.</div>
              </div>
            ) : null}

            {error ? <div className="alert alert-danger">{error}</div> : null}

            <button type="submit" className="btn btn-primary me-sm-3 me-1" disabled={submitting}>
              {submitting ? "در حال ثبت..." : "ثبت"}
            </button>

            <button type="button" className="btn btn-label-secondary" onClick={onClose} disabled={submitting}>
              انصراف
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
