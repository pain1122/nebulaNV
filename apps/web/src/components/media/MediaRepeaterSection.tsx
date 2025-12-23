"use client"

import type {MediaItem} from "@/hooks/useMediaRepeater"

type Props = {
  title: string
  nameUrl: string          // e.g. "post_gallery[]"
  nameAlt: string          // e.g. "post_gallery_alt[]"
  items: MediaItem[]
  onAdd: () => void
  onRemove: (id: number) => void
  onAltChange: (id: number, alt: string) => void
  onPickUrl?: (id: number) => void // you can wire later
}

export default function MediaRepeaterSection(props: Props) {
  return (
    <div className="card mb-4">
      <h5 className="card-header d-flex align-items-center">{props.title}</h5>

      {props.items.map((it) => (
        <div key={it.id} className="card-body">
          <button
            type="button"
            className="btn-close text-reset ml-2"
            onClick={() => props.onRemove(it.id)}
          />

          <div className="d-flex flex-wrap align-items-center">
            <label className="form-label">متن جایگزین</label>

            <button
              type="button"
              className="btn btn-sm btn-success ms-auto mb-2"
              onClick={() => props.onPickUrl?.(it.id)}
            >
              انتخاب عکس
            </button>

            <input
              className="form-control input-air-primary"
              type="text"
              placeholder=" (alt text)نوشته جایگزین"
              name={props.nameAlt}
              value={it.alt}
              onChange={(e) => props.onAltChange(it.id, e.target.value)}
            />
          </div>

          <div className="mb-3">
            <input hidden type="text" name={props.nameUrl} value={it.url ?? ""} readOnly />

            {/* IMPORTANT: never render <img src=""> */}
            {it.url ? (
              <img src={it.url} alt={it.alt || ""} height={150} className="mt-3 mx-auto d-block mw-100" />
            ) : null}
          </div>
        </div>
      ))}

      <div className="d-flex p-4">
        <button type="button" className="btn btn-primary ml-3" onClick={props.onAdd}>
          اضافه کردن
        </button>
      </div>
    </div>
  )
}
