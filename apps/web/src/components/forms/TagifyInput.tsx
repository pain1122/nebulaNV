"use client"

import { useEffect, useRef } from "react"

export type TagItem = { id?: string; value: string }

type Props = {
  value: TagItem[]
  whitelist?: TagItem[]
  onChange: (v: TagItem[]) => void
  placeholder?: string
  maxTags?: number
  dropdownEnabled?: number
  enforceWhitelist?: boolean
  name?: string
}

export default function TagifyInput({
  value,
  whitelist = [],
  onChange,
  placeholder,
  maxTags,
  dropdownEnabled = 1,
  enforceWhitelist = false,
  name,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const tagifyRef = useRef<any>(null)

  useEffect(() => {
    let mounted = true

    ;(async () => {
      const { default: Tagify } = await import(
        "@yaireo/tagify/dist/tagify.esm.js"
      )

      if (!mounted || !inputRef.current) return

      const tagify = new Tagify(inputRef.current, {
        whitelist,
        maxTags,
        enforceWhitelist,
        dropdown: {
          enabled: dropdownEnabled,
          maxItems: 100,
          closeOnSelect: false,
        },
      })

      tagify.on("change", () => {
        const items = tagify.value || []
        onChange(items)
      })

      tagifyRef.current = tagify

      // 🔥 force dropdown after init
      setTimeout(() => {
        tagify.dropdown.show.call(tagify)
      }, 0)
    })()

    return () => {
      mounted = false
      tagifyRef.current?.destroy()
    }
  }, [])

  // 🔁 Sync whitelist updates
  useEffect(() => {
    const tagify = tagifyRef.current
    if (!tagify) return

    tagify.settings.whitelist = whitelist

    // 🔥 THIS is critical
    if (dropdownEnabled) {
      tagify.dropdown.show.call(tagify)
    }
  }, [whitelist, dropdownEnabled])

  // 🔁 Sync value updates
  useEffect(() => {
    const tagify = tagifyRef.current
    if (!tagify) return

    tagify.removeAllTags()
    tagify.addTags(value || [])
  }, [value])

  return <input ref={inputRef} name={name} className={"w-100"} placeholder={placeholder} />
}
