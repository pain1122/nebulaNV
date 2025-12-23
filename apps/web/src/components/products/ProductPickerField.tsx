"use client"

import type useProductPicker from "@/hooks/useProductPicker"

type Props = {
  picker: ReturnType<typeof useProductPicker>
  inputName: string
}

export default function ProductPickerField({ picker: p, inputName }: Props) {
  return (
    <>
      <div className="mb-3 search-bar" ref={p.wrapRef} style={{position: "relative"}}>
        <label className="form-label">جستوجو محصول</label>

        <input
          className="form-control product-search"
          type="text"
          placeholder="نام محصول موردنظر خود را وارد کنید"
          value={p.query}
          onChange={(e) => p.setQuery(e.target.value)}
          onFocus={() => {
            if (p.query.trim()) p.setOpen(true)
          }}
        />

        {p.open ? (
          <div className="search-results mt-3" style={{display: "block"}}>
            {p.loading ? (
              <div className="search-result">
                <p style={{fontWeight: "bold", textAlign: "center", width: "100%"}}>در حال جستجو...</p>
              </div>
            ) : p.results.length ? (
              p.results.map((x) => (
                <div key={x.id} className="search-result" onClick={() => p.add(x)} style={{cursor: "pointer"}}>
                  {x.img ? <img src={x.img} width={100} height={100} alt="" /> : null}

                  <div className="thumb-det">
                    <p>{x.title}</p>

                    <div className="thumb-price">
                      {typeof x.salePrice === "number" ? (
                        <>
                          <ins>
                            {x.salePrice} <span>تومان</span>
                          </ins>
                          {typeof x.price === "number" ? (
                            <del>
                              {x.price} <span>تومان</span>
                            </del>
                          ) : null}
                        </>
                      ) : typeof x.price === "number" ? (
                        <ins>
                          {x.price} <span>تومان</span>
                        </ins>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="search-result">
                <p style={{color: "var(--color2)", fontWeight: "bold", textAlign: "center", width: "100%"}}>محصولی پیدا نشد</p>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* hidden input (exact old behavior) */}
      <input type="hidden" name={inputName} value={p.hiddenValue} />

      {/* selected items */}
      <div className="complementaries">
        {p.items.map((x) => (
          <div key={x.id} className="complementary">
            <p>{x.title}</p>
            <span className="close" onClick={() => p.remove(x.id)}>
              ✖
            </span>
          </div>
        ))}
      </div>
    </>
  )
}