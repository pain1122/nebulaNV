"use client"

import {useState, useEffect} from "react"
import TagifyInput, {type TagItem} from "@/components/forms/TagifyInput"
import RichTextEditor from "@/components/editor/RichTextEditor"
import ProductPickerField from "@/components/products/ProductPickerField"
import {useTaxonomyModal} from "@/hooks/useTaxonomyModal"
import {useMediaRepeater} from "@/hooks/useMediaRepeater"
import {useVariableRows} from "@/hooks/useVariableRows"
import useSeoCounter from "@/hooks/useSeoCounter"
import MediaRepeaterSection from "@/components/media/MediaRepeaterSection"

import AddTaxonomyOffcanvas from "@/components/taxonomy/AddTaxonomyOffcanvas"

import useProductPicker from "@/hooks/useProductPicker"
type AttrOption = {id: string; title: string}
type AttrValueOption = {id: string; title: string}

type AttributeRow = {
  id: number
  parentAttrId: string // selected parent taxonomy id
  valueId: string // selected child taxonomy id
  values: AttrValueOption[] // options for the second select
  loadingValues?: boolean
}

export default function AddProductClient() {
  const [content, setContent] = useState("")
  const [excerpt, setExcerpt] = useState("")

  const [productType, setProductType] = useState<"simple" | "variable">("simple")

  const [categories, setCategories] = useState<TagItem[]>([])
  const [tags, setTags] = useState<TagItem[]>([])
  const vars = useVariableRows()

  const [categoryWhitelist, setCategoryWhitelist] = useState<TagItem[]>([])
  const [tagWhitelist, setTagWhitelist] = useState<TagItem[]>([])
  const [attributeWhitelist, setAttributeWhitelist] = useState<TagItem[]>([])
  const [variableWhitelist, setVariableWhitelist] = useState<TagItem[]>([])

  const [attributeRows, setAttributeRows] = useState<AttributeRow[]>([])
  const attributeParents: AttrOption[] = attributeWhitelist.filter((x) => x.id).map((x) => ({id: x.id as string, title: x.value}))

  const taxonomyModal = useTaxonomyModal()

  const seoTitle = useSeoCounter(65)
  const seoDesc = useSeoCounter(165)

  const gallery = useMediaRepeater()
  const exview = useMediaRepeater()

  const complementariesPicker = useProductPicker({
    type: "complementaries",
    endpoint: (q) => `/api/search?q=${encodeURIComponent(q)}&type=product`,
  })

  const replacementsPicker = useProductPicker({
    type: "replacements",
    endpoint: (q) => `/api/search?q=${encodeURIComponent(q)}&type=product`,
  })

  function activateTab(id: "tab-general" | "tab-attributes" | "tab-variables") {
    const btn = document.querySelector<HTMLButtonElement>(`button[data-bs-target="#${id}"]`)
    btn?.click()
  }

  function addAttributeRow() {
    setAttributeRows((prev) => {
      const nextId = prev.length ? Math.max(...prev.map((r) => r.id)) + 1 : 0
      return [
        ...prev,
        {
          id: nextId,
          parentAttrId: "delete",
          valueId: "delete",
          values: [],
        },
      ]
    })
  }

  // UI-only hook for loading children after parent is selected.
  // Replace the internals with your actual panel fetch (or temporary mock).
  async function loadAttributeValues(parentAttrId: string): Promise<AttrValueOption[]> {
    if (!parentAttrId || parentAttrId === "delete") return []
    // TODO: replace with your real API route in panel that returns children for parentAttrId
    // const res = await fetch(`/api/taxonomy/children?parentId=${encodeURIComponent(parentAttrId)}`)
    // const json = await res.json()
    // return json.data.map((x:any) => ({ id: x.id, title: x.title }))

    return [] // panel-only placeholder
  }

  async function onChangeAttributeParent(rowId: number, parentAttrId: string) {
    // set parent + reset value + mark loading
    setAttributeRows((prev) => prev.map((r) => (r.id === rowId ? {...r, parentAttrId, valueId: "delete", values: [], loadingValues: true} : r)))

    const values = await loadAttributeValues(parentAttrId)

    setAttributeRows((prev) => prev.map((r) => (r.id === rowId ? {...r, values, loadingValues: false} : r)))
  }

  function onChangeAttributeValue(rowId: number, valueId: string) {
    setAttributeRows((prev) => prev.map((r) => (r.id === rowId ? {...r, valueId} : r)))
  }

  useEffect(() => {
    if (productType === "variable") {
      // hide General + Stock, show Variables, and go to Attributes first (exactly like old script)
      activateTab("tab-attributes")
    } else {
      // show General + Stock, hide Variables, and go to General
      activateTab("tab-general")
    }
  }, [productType])

  function onTaxonomyCreated(t: {id: string; name: string; kind: string}) {
    const newItem: TagItem = {id: t.id, value: t.name}

    if (t.kind === "product_cat") {
      setCategoryWhitelist((p) => (p.some((x) => x.id === newItem.id) ? p : [newItem, ...p]))
      setCategories([newItem])
    }

    if (t.kind === "product_tag") {
      setTagWhitelist((p) => (p.some((x) => x.id === newItem.id) ? p : [newItem, ...p]))
      setTags((p) => (p.some((x) => x.id === newItem.id) ? p : [newItem, ...p]))
    }

    if (t.kind === "product_attribute") {
      setAttributeWhitelist((p) => (p.some((x) => x.id === newItem.id) ? p : [newItem, ...p]))
    }

    if (t.kind === "product_variable") {
      setVariableWhitelist((p) => (p.some((x) => x.id === newItem.id) ? p : [newItem, ...p]))
    }
  }

  return (
    <>
      <form action="" method="post" encType="multipart/form-data" className="row g-3">
        <div className="col-12 col-lg-7">
          <div className="card mb-4">
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">عنوان محصول</label>
                <input type="text" name="post_title" defaultValue="" className="form-control" placeholder="عنوان محصول خود را وارد کنید" />
              </div>
              <div>
                <label className="form-label">نامک</label>
                <input type="text" name="post_guid" id="post_guid" defaultValue="" className="form-control" placeholder="نامک خود را وارد کنید" />
              </div>
            </div>
          </div>

          <div className="card mb-4">
            <div className="nav-align-top">
              <ul className="nav nav-pills mb-3 p-4 justify-content-between justify-content-sm-start" role="tablist">
                <li>
                  <button type="button" className="nav-link px-2 px-md-4 active" role="tab" data-bs-toggle="tab" data-bs-target="#product-content" aria-controls="product-content" aria-selected="true">
                    توضیحات محصول
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button type="button" className="nav-link px-2 px-md-4" role="tab" data-bs-toggle="tab" data-bs-target="#product-excerpt" aria-controls="product-excerpt" aria-selected="false" tabIndex={-1}>
                    توضیحات کوتاه
                  </button>
                </li>
              </ul>

              <div className="tab-pane fade px-4 active show" id="product-content" role="tabpanel">
                <div className="ck-wrap pb-3">
                  <RichTextEditor value={content} onChange={setContent} placeholder="توضیحات محصول را وارد کنید" />
                </div>

                {/* keep a hidden input so your <form> still has a value if you submit traditionally */}
                <input type="hidden" name="post_content" value={content} />
              </div>

              <div className="tab-pane fade px-4" id="product-excerpt" role="tabpanel">
                <div className="ck-wrap pb-3">
                  <RichTextEditor value={excerpt} onChange={setExcerpt} placeholder="توضیحات کوتاه را وارد کنید" />
                </div>

                <input type="hidden" name="description" value={excerpt} />
              </div>
            </div>
          </div>

          <div className="accordion mb-4" id="collapsibleSection">
            <div className="card">
              <div className="card-header d-flex align-items-center">
                <h5 className="mb-0 me-3">نوع محصول</h5>
                <input name="product_type" className="form-check-input mt-0 me-1" id="type-simple" type="radio" value="simple" checked={productType === "simple"} onChange={() => setProductType("simple")} />
                <label className="form-check-label me-3" htmlFor="type-simple">
                  ساده
                </label>
                <input name="product_type" className="form-check-input mt-0 me-1" id="type-variable" type="radio" value="variable" checked={productType === "variable"} onChange={() => setProductType("variable")} />
                <label className="form-check-label" htmlFor="type-variable">
                  متغییر
                </label>
              </div>

              <div className="nav-align-left">
                <ul className="nav nav-tabs tabs-line border-end" role="tablist">
                  <li className={`nav-item ${productType === "variable" ? "d-none" : ""}`} role="presentation">
                    <button type="button" className="nav-link d-flex align-items-center active" data-bs-toggle="tab" data-bs-target="#tab-general" aria-selected="false" role="tab" tabIndex={-1}>
                      <i className="fa-solid fa-gears ml-1" />
                      همگانی
                    </button>
                  </li>

                  <li className={`nav-item ${productType === "variable" ? "d-none" : ""}`} role="presentation">
                    <button type="button" className="nav-link d-flex align-items-center" data-bs-toggle="tab" data-bs-target="#tab-stock" aria-selected="false" role="tab" tabIndex={-1}>
                      <i className="fa-regular fa-boxes-stacked ml-1" />
                      موجودی
                    </button>
                  </li>

                  <li className="nav-item" role="presentation">
                    <button type="button" className="nav-link d-flex align-items-center" data-bs-toggle="tab" data-bs-target="#tab-attributes" aria-selected="true" role="tab">
                      <i className="fa-solid fa-clipboard-list ml-1" />
                      ویژگی ها
                    </button>
                  </li>

                  <li className={`nav-item ${productType === "variable" ? "" : "d-none"}`} role="presentation">
                    <button type="button" className="nav-link d-flex align-items-center" data-bs-toggle="tab" data-bs-target="#tab-variables" aria-selected="false" tabIndex={-1} role="tab">
                      <i className="fa-solid fa-dice ml-1" />
                      متغییرها
                    </button>
                  </li>
                </ul>

                <div className="tab-content shadow-none p-3">
                  <div className="tab-pane fade active show" id="tab-general" role="tabpanel">
                    <label className="form-label">قیمت محصول</label>
                    <input type="text" name="price" defaultValue="" className="form-control mb-3" placeholder="قیمت محصول خود را وارد کنید" />

                    <label className="form-label">قیمت تخفیف خورده</label>
                    <input type="text" name="sale_price" defaultValue="" className="form-control mb-3" placeholder="قیمت تخفیف خورده خود را وارد کنید" />

                    <label className="form-label">انتخاب بازه تخفیف</label>
                    <input type="hidden" name="sale_date" className="form-control flatpickr-input" placeholder="YYYY/MM/DD تا YYYY/MM/DD" id="flatpickr-range" />
                    <input className="form-control form-control input" placeholder="YYYY/MM/DD تا YYYY/MM/DD" tabIndex={0} type="text" readOnly />
                  </div>

                  <div className="tab-pane fade" id="tab-stock" role="tabpanel">
                    <label className="form-label">وضعیت موجودی</label>
                    <div className="position-relative">
                      <select className="select2 form-select form-select-lg" name="stock_status" data-allow-clear="true" defaultValue="instock">
                        <option value="instock">موجود</option>
                        <option value="outofstock">ناموجود</option>
                        <option value="call">تماس بگیرید</option>
                      </select>
                    </div>

                    <label className="form-label mt-3">موجودی انبار</label>
                    <input type="number" name="stock" defaultValue={0} className="form-control mb-3" placeholder="موجودی انبار خود را وارد کنید" />

                    <label className="form-label">محدودیت خرید</label>
                    <input type="number" name="limit" defaultValue={0} className="form-control" placeholder="محدودیت خرید محصول را وارد کنید" />
                  </div>

                  <div className="tab-pane fade" id="tab-attributes" role="tabpanel">
                    <div id="attribute_container">
                      {attributeRows.length === 0 ? <div className="alert alert-warning mb-4">هنوز ویژگی ای اضافه نشده. روی + بزنید تا اولین ویژگی ساخته شود.</div> : null}

                      {attributeRows.map((row) => (
                        <div key={row.id} id={`div-${row.id}`} className="row mb-3">
                          <div className="col-12 col-md-6">
                            <div className="position-relative">
                              <select id={`mainselect-${row.id}`} className="form-select" value={row.parentAttrId} onChange={(e) => void onChangeAttributeParent(row.id, e.target.value)}>
                                <option value="delete">حذف</option>
                                {attributeParents.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.title}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="col-12 col-md-6">
                            <div className="position-relative">
                              <select id={`select${row.id}`} className="form-select" name="product_attributes[]" value={row.valueId} onChange={(e) => onChangeAttributeValue(row.id, e.target.value)} disabled={row.parentAttrId === "delete" || row.loadingValues}>
                                <option value="delete">{row.loadingValues ? "در حال بارگذاری..." : "حذف"}</option>

                                {row.values.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    {v.title}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button id="add-attribute" type="button" className="btn btn-primary" onClick={addAttributeRow}>
                      <i className="fa fa-plus-square" />
                    </button>

                    <div className="d-block mt-3">
                      <button
                        type="button"
                        className="btn btn-primary"
                        id="add-new-attribute"
                        onClick={() =>
                          taxonomyModal.show({
                            kind: "product_attribute",
                            title: "ویژگی",
                            parentOptions: attributeWhitelist,
                          })
                        }
                      >
                        تعریف ویژگی
                      </button>
                    </div>
                  </div>
                  <div className="tab-pane fade" id="tab-variables" role="tabpanel">
                    <div id="variables_container" className="list-group mb-3">
                      <h4 className="mb-1">ویژگی های متغییر</h4>

                      {vars.rows.length === 0 ? <div className="alert alert-warning mb-4">هنوز متغییری اضافه نشده. روی + بزنید تا اولین متغییر ساخته شود.</div> : null}

                      {vars.rows.map((row) => (
                        <ul key={row.id} className="list-group-item p-3 mb-0" id={`main-variable${row.id}`}>
                          <button type="button" className="btn-close position-absolute top-0 end-0 m-2" title="حذف متغییر" onClick={() => vars.removeRow(row.id)} />
                          <li className="row variable-attribute-container mt-4">
                            <div className="col-12 col-md-5 mb-3">
                              <div className="position-relative">
                                <select name={`var[${row.id}][attr-name][]`} className="select2 form-select" id={`var${row.id}-name-0`}>
                                  <option value="delete">حذف</option>
                                  <option value="874">رنگ دیزاین</option>
                                </select>
                              </div>
                            </div>

                            <div className="col-12 col-md-5 mb-3">
                              <div className="position-relative">
                                <select name={`var[${row.id}][attr-value][]`} className="select2 form-select" id={`var${row.id}-value-0`}>
                                  <option value="delete">حذف</option>
                                </select>
                              </div>
                            </div>

                            <div className="col-2 mb-3">
                              <button type="button" className="btn btn-primary w-100 text-center px-0 add-var-attr">
                                <i className="fa fa-plus-square" />
                              </button>
                            </div>
                          </li>

                          <li className="row">
                            <div className="col-12 col-md-6">
                              <div className="d-flex flex-wrap align-items-center">
                                <button type="button" className="btn-close text-reset ml-2 remove-var-image" title="حذف تصویر" onClick={() => vars.clearRowImage(row.id)} />
                                <label className="form-label">تصویر متغییر</label>

                                <button type="button" className="btn btn-sm btn-success mr-auto mb-2 ms-auto">
                                  انتخاب تصویر
                                </button>

                                <input hidden type="text" name={`var[${row.id}][thumbnail]`} value={row.thumbnail ?? ""} readOnly />

                                <div className="w-100">{row.thumbnail ? <img src={row.thumbnail} height={150} className="mt-3 mx-auto d-block mw-100" alt="" /> : null}</div>
                              </div>
                            </div>

                            <div className="col-12 col-md-6">
                              <div className="row">
                                <div className="col-12">
                                  <label className="form-label">قیمت : </label>
                                  <input type="number" name={`var[${row.id}][price]`} defaultValue="" className="form-control" placeholder="قیمت متغییر را وارد کنید" />
                                </div>

                                <div className="col-12">
                                  <label className="form-label mt-3">قیمت تخفیف : </label>
                                  <input type="number" name={`var[${row.id}][sale_price]`} defaultValue="" className="form-control" placeholder="قیمت تخفیف خورده را وارد کنید" />
                                </div>

                                <div className="col-12">
                                  <label className="form-label mt-3">موجودی : </label>
                                  <div className="position-relative">
                                    <select name={`var[${row.id}][stock_status]`} className="select2 form-select form-select-lg" defaultValue="instock">
                                      <option value="instock">موجود</option>
                                      <option value="outofstock">ناموجود</option>
                                      <option value="call">تماس بگیرید</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="col-12">
                                  <label className="form-label mt-3">تعداد : </label>
                                  <input type="number" name={`var[${row.id}][stock]`} defaultValue="" className="form-control" placeholder="تعداد محصول را وارد کنید" />
                                </div>
                              </div>
                            </div>
                          </li>
                        </ul>
                      ))}
                    </div>

                    <button id="add-variable" type="button" className="btn btn-primary" onClick={vars.addRow}>
                      <i className="fa fa-plus-square" />
                    </button>

                    <div className="d-block mt-3">
                      <button
                        type="button"
                        className="btn btn-primary"
                        id="add-new-variable"
                        onClick={() =>
                          taxonomyModal.show({
                            kind: "product_variable",
                            title: "متغییر",
                            parentOptions: variableWhitelist,
                          })
                        }
                      >
                        تعریف متغییر
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SEO */}
            <div className="card accordion-item">
              <h2 className="accordion-header">
                <button type="button" aria-expanded="false" className="accordion-button collapsed" data-bs-toggle="collapse" data-bs-target="#seo">
                  اطلاعات سئو
                </button>
              </h2>
              <div id="seo" className="accordion-collapse card-body collapse" data-bs-parent="#collapsibleSection">
                <div className="mb-3 position-relative">
                  <label className="form-label">متا تایتل</label>
                  <input type="text" name="seo_title" className="form-control" placeholder="متا تایتل خود را وارد کنید" value={seoTitle.value} onChange={(e) => seoTitle.setValue(e.target.value)} />
                  <div id="seo_title" style={{position: "absolute", top: 5, left: 10}}>
                    <span style={{color: seoTitle.color}}>{seoTitle.len}</span>/<span>65</span>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">متا کیوردز</label>
                  <input type="text" name="seo_keywords" defaultValue="" className="form-control" placeholder="متا کیوردز خود را وارد کنید" />
                </div>

                <div className="mb-3 position-relative">
                  <label className="form-label">متا دیسکریپشن</label>
                  <input type="text" name="seo_desc" className="form-control" placeholder="متا دیسکریپشن خود را وارد کنید" value={seoDesc.value} onChange={(e) => seoDesc.setValue(e.target.value)} />
                  <div id="seo_desc" style={{position: "absolute", top: 5, left: 10}}>
                    <span style={{color: seoDesc.color}}>{seoDesc.len}</span>/<span>165</span>
                  </div>
                </div>

                <div>
                  <label className="form-label">Canonical</label>
                  <input type="text" name="canonical" defaultValue="" className="form-control" placeholder="لینک canonical خود را وارد کنید" />
                </div>

                <div className="mt-3">
                  <label className="form-label">schema</label>
                  <input type="text" name="schema" defaultValue="" className="form-control" placeholder="لینک schema خود را وارد کنید" />
                </div>
              </div>
            </div>

            {/* Related */}
            <div className="card accordion-item">
              <h2 className="accordion-header">
                <button type="button" aria-expanded="false" className="accordion-button collapsed" data-bs-toggle="collapse" data-bs-target="#related_produtcs">
                  محصولات مکمل
                </button>
              </h2>
              <div id="related_produtcs" className="accordion-collapse card-body collapse" data-bs-parent="#collapsibleSection">
                <ProductPickerField picker={complementariesPicker} inputName="complementaries" />
              </div>
            </div>

            {/* Replacements */}
            <div className="card accordion-item">
              <h2 className="accordion-header">
                <button type="button" aria-expanded="false" className="accordion-button collapsed" data-bs-toggle="collapse" data-bs-target="#replacements_produtcs">
                  محصولات جایگزین
                </button>
              </h2>
              <div id="replacements_produtcs" className="accordion-collapse card-body collapse" data-bs-parent="#collapsibleSection">
                <ProductPickerField picker={replacementsPicker} inputName="replacements" />
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="col-12 col-lg-5">
          <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">عملیات</h5>
              <div className="form-check mr-3">
                <input className="form-check-input" type="checkbox" defaultValue="noindex,nofollow" name="noindex" />
                <label className="form-check-label"> NoIndex</label>
              </div>
            </div>
            <div className="card-body d-flex justify-content-around">
              <button type="submit" name="submit" className="btn btn-success p-2">
                <i className="fa-regular fa-pen-to-square" /> انتشار
              </button>
              <button type="submit" name="draft" className="btn btn-primary p-2">
                <i className="fa-regular fa-square-pen" /> پیش نویس
              </button>
            </div>
          </div>

          <div className="card mb-4">
            <h5 className="card-header">دسته بندی ها</h5>
            <div className="card-body">
              <label className="form-label">انتخاب دسته بندی</label>

              <TagifyInput name="category_selection" placeholder="انتخاب دسته بندی" value={categories} onChange={setCategories} whitelist={categoryWhitelist} maxTags={1} enforceWhitelist={false} dropdownEnabled={1} />

              <button
                type="button"
                className="btn btn-primary mt-3"
                onClick={() =>
                  taxonomyModal.show({
                    kind: "product_cat",
                    title: "دسته بندی",
                    parentOptions: categoryWhitelist,
                  })
                }
              >
                ایجاد دسته
              </button>
            </div>
          </div>

          <div className="card mb-4">
            <h5 className="card-header">برچسب ها</h5>
            <div className="card-body">
              <label className="form-label">انتخاب برچسب ها</label>

              <TagifyInput name="tag_selection" placeholder="انتخاب برچسب ها" value={tags} onChange={setTags} whitelist={tagWhitelist} maxTags={30} dropdownEnabled={1} enforceWhitelist={false} />

              <button
                type="button"
                className="btn btn-primary mt-3"
                onClick={() =>
                  taxonomyModal.show({
                    kind: "product_tag",
                    title: "برچسب",
                    parentOptions: [],
                  })
                }
              >
                ایجاد برچسب
              </button>
            </div>
          </div>

          <div className="card mb-4">
            <h5 className="card-header d-flex align-items-center">
              تصویر شاخص
              <button type="button" className="btn btn-sm btn-success ms-auto">
                انتخاب عکس
              </button>
            </h5>
            <div className="card-body">
              <div className="mb-3">
                <input hidden type="text" name="post_image" id="post_image_input" defaultValue="" />
                {false ? <img src="" alt="" id="post_image" width="85%" className="mt-3 mx-auto d-block" /> : null}
              </div>
              <div>
                <label className="form-label">متن جایگزین</label>
                <input className="form-control input-air-primary" type="text" placeholder="(alt text) نوشته جایگزین" defaultValue="" name="post_image_alt" />
              </div>
            </div>
          </div>

          <MediaRepeaterSection
            title="گالری محصول"
            nameUrl="post_gallery[]"
            nameAlt="post_gallery_alt[]"
            items={gallery.items}
            onAdd={gallery.add}
            onRemove={gallery.remove}
            onAltChange={gallery.setAlt}
            onPickUrl={(id) => {
              // TODO MediaPicker later -> gallery.setUrl(id, url)
            }}
          />

          <MediaRepeaterSection
            title="نمای انفجاری"
            nameUrl="post_exview[]"
            nameAlt="post_exview_alt[]"
            items={exview.items}
            onAdd={exview.add}
            onRemove={exview.remove}
            onAltChange={exview.setAlt}
            onPickUrl={(id) => {
              // TODO MediaPicker later -> exview.setUrl(id, url)
            }}
          />
        </div>
      </form>
      <AddTaxonomyOffcanvas open={taxonomyModal.open} onClose={taxonomyModal.close} kind={taxonomyModal.cfg.kind} titleLabel={taxonomyModal.cfg.title} parentOptions={taxonomyModal.cfg.parentOptions ?? []} onCreated={onTaxonomyCreated} />
    </>
  )
}
