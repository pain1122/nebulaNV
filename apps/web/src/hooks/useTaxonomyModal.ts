"use client"

import {useCallback, useState} from "react"
import type {TagItem} from "@/components/forms/TagifyInput"

export type TaxonomyKind = "product_cat" | "product_tag" | "product_attribute" | "product_variable"

export type TaxonomyOpenArgs = {
  kind: TaxonomyKind
  title: string
  parentOptions?: TagItem[]
}

export function useTaxonomyModal(initial?: Partial<TaxonomyOpenArgs>) {
  const [open, setOpen] = useState(false)
  const [cfg, setCfg] = useState<TaxonomyOpenArgs>({
    kind: initial?.kind ?? "product_cat",
    title: initial?.title ?? "دسته بندی",
    parentOptions: initial?.parentOptions ?? [],
  })

  const show = useCallback((args: TaxonomyOpenArgs) => {
    setCfg({
      kind: args.kind,
      title: args.title,
      parentOptions: args.parentOptions ?? [],
    })
    setOpen(true)
  }, [])

  const close = useCallback(() => setOpen(false), [])

  return {open, cfg, show, close}
}

