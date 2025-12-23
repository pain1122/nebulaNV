"use client"

import {useMemo, useState} from "react"

export default function useSeoCounter(max: number, initial = "") {
  const [value, setValue] = useState(initial)
  const len = value.length

  const color = useMemo(() => {
    if (len > max) return "red"
    if (len >= max - 10 && len <= max) return "green"
    return "inherit"
  }, [len, max])

  return {value, setValue, len, max, color}
}
