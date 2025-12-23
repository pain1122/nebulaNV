"use client"

import React, {useEffect, useMemo, useRef} from "react"

// Tagify is not SSR-safe
type TagifyInstance = any

export type TagItem = {
  id?: string
  value: string
}

type Props = {
  name: string
  value: TagItem[]
  onChange: (items: TagItem[]) => void

  whitelist?: TagItem[]
  placeholder?: string

  maxTags?: number
  enforceWhitelist?: boolean
  dropdownEnabled?: number // 0/1 like old code
  disabled?: boolean
  readOnly?: boolean

  className?: string
}

function stableKey(items: TagItem[]) {
  // stable fingerprint for comparison (order-sensitive)
  return items
    .map((x) => `${x.id ?? ""}::${x.value}`)
    .join("||")
}

export default function TagifyInput({
  name,
  value,
  onChange,
  whitelist = [],
  placeholder,
  maxTags = 10,
  enforceWhitelist = true,
  dropdownEnabled = 0,
  disabled = false,
  readOnly = false,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const tagifyRef = useRef<TagifyInstance | null>(null)

  // prevents calling onChange while we are syncing from external props
  const syncingRef = useRef(false)

  const valueKey = useMemo(() => stableKey(value ?? []), [value])
  const whitelistKey = useMemo(() => stableKey(whitelist ?? []), [whitelist])

  // init Tagify once
  useEffect(() => {
    let disposed = false

    async function init() {
      if (!inputRef.current) return

      const {default: Tagify} = await import("@yaireo/tagify")
      await import("@yaireo/tagify/dist/tagify.css")

      if (disposed) return

      const tagify = new Tagify(inputRef.current, {
        enforceWhitelist,
        maxTags,
        dropdown: {
          enabled: dropdownEnabled,
          closeOnSelect: false,
          searchKeys: ["value"],
          classname: "tags-inline",
        },
        editTags: false,
        placeholder,
        // keep original objects so we can recover id/value
        tagTextProp: "value",
        whitelist: (whitelist ?? []).map((t) => ({...t})),
      })

      tagifyRef.current = tagify

      // initial sync
      syncingRef.current = true
      tagify.removeAllTags()
      if (value?.length) tagify.addTags(value.map((t) => ({...t})), true, true)
      syncingRef.current = false

      tagify.on("change", () => {
        if (syncingRef.current) return
        const next = (tagify.value ?? []).map((t: any) => ({
          id: t.id,
          value: t.value,
        })) as TagItem[]
        onChange(next)
      })

      // disabled/readOnly
      if (disabled) tagify.setDisabled(true)
      if (readOnly) tagify.setReadonly(true)
    }

    void init()

    return () => {
      disposed = true
      if (tagifyRef.current) {
        try {
          tagifyRef.current.destroy()
        } catch {}
        tagifyRef.current = null
      }
    }
    // init once only; other updates handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // sync external `value` -> Tagify UI
  useEffect(() => {
    const tagify = tagifyRef.current
    if (!tagify) return

    const currentKey = stableKey((tagify.value ?? []).map((t: any) => ({id: t.id, value: t.value})))
    if (currentKey === valueKey) return

    syncingRef.current = true
    tagify.removeAllTags()
    if (value?.length) tagify.addTags(value.map((t) => ({...t})), true, true)
    syncingRef.current = false
  }, [valueKey, value])

  // sync external whitelist -> Tagify whitelist
  useEffect(() => {
    const tagify = tagifyRef.current
    if (!tagify) return
    tagify.settings.whitelist = (whitelist ?? []).map((t) => ({...t}))
  }, [whitelistKey, whitelist])

  // disabled/readOnly updates
  useEffect(() => {
    const tagify = tagifyRef.current
    if (!tagify) return
    tagify.setDisabled(!!disabled)
  }, [disabled])

  useEffect(() => {
    const tagify = tagifyRef.current
    if (!tagify) return
    tagify.setReadonly(!!readOnly)
  }, [readOnly])

  return (
    <input
      ref={inputRef}
      name={name}
      className={className ?? "form-control"}
      placeholder={placeholder}
      // Tagify manages the actual UI; keep input uncontrolled
      defaultValue=""
    />
  )
}
