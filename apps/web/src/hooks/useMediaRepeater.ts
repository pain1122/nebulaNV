"use client"

import {useCallback, useMemo, useState} from "react"

export type MediaItem = {
  id: number
  url: string | null
  alt: string
}

export function useMediaRepeater() {
  const [items, setItems] = useState<MediaItem[]>([])

  const add = useCallback(() => {
    setItems(prev => {
      const nextId = prev.length ? Math.max(...prev.map(x => x.id)) + 1 : 0
      return [...prev, {id: nextId, url: null, alt: ""}]
    })
  }, [])

  const remove = useCallback((id: number) => {
    setItems(prev => prev.filter(x => x.id !== id))
  }, [])

  const setAlt = useCallback((id: number, alt: string) => {
    setItems(prev => prev.map(x => (x.id === id ? {...x, alt} : x)))
  }, [])

  const setUrl = useCallback((id: number, url: string | null) => {
    setItems(prev => prev.map(x => (x.id === id ? {...x, url} : x)))
  }, [])

  const urlsCsv = useMemo(() => items.map(x => x.url).filter(Boolean).join(","), [items])

  return {items, add, remove, setAlt, setUrl, urlsCsv}
}
