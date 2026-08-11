import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api/apiFetch";
import { asRecord } from "@/lib/unknown";

export type ProductSearchItem = {
  id: string;
  title: string;
  img?: string | null;
  price?: number | null;
  salePrice?: number | null;
};

type UseProductPickerOpts = {
  type: "complementaries" | "replacements";
  debounceMs?: number;
  endpoint?: (q: string) => string;
};

export type ProductPickerController = {
  query: string;
  setQuery: (value: string) => void;
  open: boolean;
  setOpen: (value: boolean) => void;
  loading: boolean;
  results: ProductSearchItem[];
  items: ProductSearchItem[];
  add: (product: ProductSearchItem) => void;
  remove: (id: string) => void;
  hiddenValue: string;
};

export default function useProductPicker(opts: UseProductPickerOpts) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProductSearchItem[]>([]);
  const [items, setItems] = useState<ProductSearchItem[]>([]);

  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Keep the endpoint in a ref so a changing function identity does not restart the debounce loop.
  const endpointRef = useRef(opts.endpoint);
  useEffect(() => {
    endpointRef.current = opts.endpoint;
  }, [opts.endpoint]);

  // debounceMs is a primitive and is safe to use as an effect dependency.
  const debounceMs = opts.debounceMs ?? 350;

  const hiddenValue = useMemo(() => items.map((x) => x.id).join(","), [items]);

  function add(p: ProductSearchItem) {
    setItems((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, p]));
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  function updateQuery(value: string) {
    setQuery(value);
    if (value.trim()) {
      setLoading(true);
      setOpen(true);
      return;
    }

    setOpen(false);
    setResults([]);
    setLoading(false);
  }

  // Debounced search; the endpoint ref deliberately stays outside the dependency list.
  useEffect(() => {
    const q = query.trim();

    if (!q) return;

    const t = setTimeout(async () => {
      try {
        const url =
          endpointRef.current?.(q) ??
          `/api/search?q=${encodeURIComponent(q)}&type=product`;

        const res = await apiFetch(url);
        const json = asRecord(await res.json());
        setResults(
          Array.isArray(json.data) ? (json.data as ProductSearchItem[]) : [],
        );
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(t);
  }, [query, debounceMs]);

  // click outside closes dropdown
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const controller: ProductPickerController = {
    query,
    setQuery: updateQuery,
    open,
    setOpen,
    loading,
    results,
    items,
    add,
    remove,
    hiddenValue,
  };

  return {
    type: opts.type,
    wrapRef,
    controller,
  };
}
