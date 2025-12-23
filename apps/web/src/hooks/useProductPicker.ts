import {useEffect, useMemo, useRef, useState} from "react"

export type ProductSearchItem = {
  id: string
  title: string
  img?: string | null
  price?: number | null
  salePrice?: number | null
}

type UseProductPickerOpts = {
  type: "complementaries" | "replacements"
  debounceMs?: number
  endpoint?: (q: string) => string
}

export default function useProductPicker(opts: UseProductPickerOpts) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ProductSearchItem[]>([])
  const [items, setItems] = useState<ProductSearchItem[]>([])

  const wrapRef = useRef<HTMLDivElement | null>(null)

  // ✅ keep endpoint in a ref so changing function identity won't retrigger the effect loop
  const endpointRef = useRef(opts.endpoint)
  useEffect(() => {
    endpointRef.current = opts.endpoint
  }, [opts.endpoint])

  // ✅ debounceMs is a primitive, safe
  const debounceMs = opts.debounceMs ?? 350

  const hiddenValue = useMemo(() => items.map((x) => x.id).join(","), [items])

  function add(p: ProductSearchItem) {
    setItems((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, p]))
    setOpen(false)
    setQuery("")
    setResults([])
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id))
  }

  // ✅ debounced search (NO opts in deps)
  useEffect(() => {
    const q = query.trim()

    if (!q) {
      // avoid useless setState spam
      setOpen(false)
      if (results.length) setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    setOpen(true)

    const t = setTimeout(async () => {
      try {
        const url =
          endpointRef.current?.(q) ??
          `/api/search?q=${encodeURIComponent(q)}&type=product`

        const res = await fetch(url)
        const json = await res.json()
        setResults(Array.isArray(json?.data) ? json.data : [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, debounceMs)

    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, debounceMs]) // ✅ only primitives

  // click outside closes dropdown
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDocMouseDown)
    return () => document.removeEventListener("mousedown", onDocMouseDown)
  }, [])

  return {
    type: opts.type,
    wrapRef,
    query,
    setQuery,
    open,
    setOpen,
    loading,
    results,
    items,
    add,
    remove,
    hiddenValue,
  }
}
