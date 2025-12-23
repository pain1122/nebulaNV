"use client"

import {useCallback, useState} from "react"

export type VariableRow = {
  id: number
  thumbnail: string | null
  price: string
  salePrice: string
  stockStatus: "instock" | "outofstock" | "call"
  stock: string

  // attribute pairs (name/value) like your old var[0][attr-name] / var[0][attr-value]
  attrs: Array<{nameId: string; valueId: string}>
}

export function useVariableRows() {
  const [rows, setRows] = useState<VariableRow[]>([])

  const addRow = useCallback(() => {
    setRows(prev => {
      const nextId = prev.length ? Math.max(...prev.map(r => r.id)) + 1 : 0
      return [
        ...prev,
        {
          id: nextId,
          thumbnail: null,
          price: "",
          salePrice: "",
          stockStatus: "instock",
          stock: "",
          attrs: [{nameId: "delete", valueId: "delete"}],
        },
      ]
    })
  }, [])

  const removeRow = useCallback((rowId: number) => {
    setRows(prev => prev.filter(r => r.id !== rowId))
  }, [])

  const clearRowImage = useCallback((rowId: number) => {
    setRows(prev => prev.map(r => (r.id === rowId ? {...r, thumbnail: null} : r)))
  }, [])

  const setRow = useCallback((rowId: number, patch: Partial<VariableRow>) => {
    setRows(prev => prev.map(r => (r.id === rowId ? {...r, ...patch} : r)))
  }, [])

  return {rows, addRow, removeRow, clearRowImage, setRow}
}
