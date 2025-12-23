"use client"

import {useState, useEffect} from "react"

export default function ListProductClient() {

  return (
    <div className="row">
      <div className="col-xl-3 col-lg-4">
        <div className="card">
          <div className="card-header">
            <div className="d-flex mb-3">
              <div className="flex-grow-1">
                <h5 className="fs-16">فیلترها</h5>
              </div>
              <div className="flex-shrink-0">
                <a href="#" className="text-decoration-underline" id="clearall">پاک کردن همه</a>
              </div>
            </div>
            <div className="filter-choices-input">
              <input className="form-control" data-choices data-choices-removeitem type="text" id="filter-choices-input" defaultValue="تی شرت" />
            </div>
          </div>
          <div className="accordion accordion-flush filter-accordion">
            <div className="card-body border-bottom">
              <div>
                <p className="text-muted text-uppercase fs-12 fw-medium mb-2">محصولات</p>
                <ul className="list-unstyled mb-0 filter-list">
                  <li>
                    <a href="#" className="d-flex py-1 align-items-center">
                      <div className="flex-grow-1">
                        <h5 className="fs-13 mb-0 listname">خواربار فروشی</h5>
                      </div>
                    </a>
                  </li>
                  <li>
                    <a href="#" className="d-flex py-1 align-items-center">
                      <div className="flex-grow-1">
                        <h5 className="fs-13 mb-0 listname">مد</h5>
                      </div>
                      <div className="flex-shrink-0 ms-2">
                        <span className="badge bg-light text-muted">5</span>
                      </div>
                    </a>
                  </li>
                  <li>
                    <a href="#" className="d-flex py-1 align-items-center">
                      <div className="flex-grow-1">
                        <h5 className="fs-13 mb-0 listname">ساعت</h5>
                      </div>
                    </a>
                  </li>
                  <li>
                    <a href="#" className="d-flex py-1 align-items-center">
                      <div className="flex-grow-1">
                        <h5 className="fs-13 mb-0 listname">الکترونیک</h5>
                      </div>
                      <div className="flex-shrink-0 ms-2">
                        <span className="badge bg-light text-muted">5</span>
                      </div>
                    </a>
                  </li>
                  <li>
                    <a href="#" className="d-flex py-1 align-items-center">
                      <div className="flex-grow-1">
                        <h5 className="fs-13 mb-0 listname">مبلمان</h5>
                      </div>
                      <div className="flex-shrink-0 ms-2">
                        <span className="badge bg-light text-muted">6</span>
                      </div>
                    </a>
                  </li>
                  <li>
                    <a href="#" className="d-flex py-1 align-items-center">
                      <div className="flex-grow-1">
                        <h5 className="fs-13 mb-0 listname">لوازم جانبی خودرو</h5>
                      </div>
                    </a>
                  </li>
                  <li>
                    <a href="#" className="d-flex py-1 align-items-center">
                      <div className="flex-grow-1">
                        <h5 className="fs-13 mb-0 listname">لوازم خانگی</h5>
                      </div>
                      <div className="flex-shrink-0 ms-2">
                        <span className="badge bg-light text-muted">7</span>
                      </div>
                    </a>
                  </li>
                  <li>
                    <a href="#" className="d-flex py-1 align-items-center">
                      <div className="flex-grow-1">
                        <h5 className="fs-13 mb-0 listname">بچه ها</h5>
                      </div>
                    </a>
                  </li>
                </ul>
              </div>
            </div>
            <div className="card-body border-bottom">
              <p className="text-muted text-uppercase fs-12 fw-medium mb-4">قیمت</p>
              <div id="product-price-range" />
              <div className="formCost d-flex gap-2 align-items-center mt-3">
                <input className="form-control form-control-sm" type="text" id="minCost" defaultValue={0} /> <span className="fw-semibold text-muted">به</span> <input className="form-control form-control-sm" type="text" id="maxCost" defaultValue={1000} />
              </div>
            </div>
            <div className="accordion-item">
              <h2 className="accordion-header" id="flush-headingBrands">
                <button className="accordion-button bg-transparent shadow-none" type="button" data-bs-toggle="collapse" data-bs-target="#flush-collapseBrands" aria-expanded="true" aria-controls="flush-collapseBrands">
                  <span className="text-muted text-uppercase fs-12 fw-medium">برندها</span> <span className="badge bg-info rounded-pill align-middle ms-1 filter-badge" />
                </button>
              </h2>
              <div id="flush-collapseBrands" className="accordion-collapse collapse show" aria-labelledby="flush-headingBrands">
                <div className="accordion-body text-body pt-0">
                  <div className="search-box search-box-sm">
                    <input type="text" className="form-control bg-light border-0" id="searchBrandsList" placeholder="جستجوی برندها..." />
                    <i className="ri-search-line search-icon" />
                  </div>
                  <div className="d-flex flex-column gap-2 mt-3 filter-check">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" defaultValue="قایق" id="productBrandRadio5" defaultChecked />
                      <label className="form-check-label" htmlFor="productBrandRadio5">قایق</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" defaultValue="وان پلاس" id="productBrandRadio4" />
                      <label className="form-check-label" htmlFor="productBrandRadio4">وان پلاس</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" defaultValue="Realme" id="productBrandRadio3" />
                      <label className="form-check-label" htmlFor="productBrandRadio3">Realme</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" defaultValue="سونی" id="productBrandRadio2" />
                      <label className="form-check-label" htmlFor="productBrandRadio2">سونی</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" defaultValue="JBL" id="productBrandRadio1" defaultChecked />
                      <label className="form-check-label" htmlFor="productBrandRadio1">JBL</label>
                    </div>
                    <div>
                      <button type="button" className="btn btn-link text-decoration-none text-uppercase fw-medium p-0">1,235
                        بیشتر</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* end accordion-item */}
            <div className="accordion-item">
              <h2 className="accordion-header" id="flush-headingDiscount">
                <button className="accordion-button bg-transparent shadow-none collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#flush-collapseDiscount" aria-expanded="true" aria-controls="flush-collapseDiscount">
                  <span className="text-muted text-uppercase fs-12 fw-medium">تخفیف</span> <span className="badge bg-info rounded-pill align-middle ms-1 filter-badge" />
                </button>
              </h2>
              <div id="flush-collapseDiscount" className="accordion-collapse collapse" aria-labelledby="flush-headingDiscount">
                <div className="accordion-body text-body pt-1">
                  <div className="d-flex flex-column gap-2 filter-check">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" defaultValue="50 درصد یا بیشتر" id="productdiscountRadio6" />
                      <label className="form-check-label" htmlFor="productdiscountRadio6">50 درصد یا بیشتر</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" defaultValue="40 درصد یا بیشتر" id="productdiscountRadio5" />
                      <label className="form-check-label" htmlFor="productdiscountRadio5">40 درصد یا بیشتر</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" defaultValue="30 درصد یا بیشتر" id="productdiscountRadio4" />
                      <label className="form-check-label" htmlFor="productdiscountRadio4">30 درصد یا بیشتر</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" defaultValue="20 درصد یا بیشتر" id="productdiscountRadio3" defaultChecked />
                      <label className="form-check-label" htmlFor="productdiscountRadio3">20 درصد یا بیشتر</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" defaultValue="10 درصد یا بیشتر" id="productdiscountRadio2" />
                      <label className="form-check-label" htmlFor="productdiscountRadio2">10 درصد یا بیشتر</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" defaultValue="کمتر از 10%" id="productdiscountRadio1" />
                      <label className="form-check-label" htmlFor="productdiscountRadio1">کمتر از 10%</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* end accordion-item */}
            <div className="accordion-item">
              <h2 className="accordion-header" id="flush-headingRating">
                <button className="accordion-button bg-transparent shadow-none collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#flush-collapseRating" aria-expanded="false" aria-controls="flush-collapseRating">
                  <span className="text-muted text-uppercase fs-12 fw-medium">رتبه بندی</span> <span className="badge bg-info rounded-pill align-middle ms-1 filter-badge" />
                </button>
              </h2>
              <div id="flush-collapseRating" className="accordion-collapse collapse" aria-labelledby="flush-headingRating">
                <div className="accordion-body text-body">
                  <div className="d-flex flex-column gap-2 filter-check">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" defaultValue="4 و بالاتر از ستاره" id="productratingRadio4" defaultChecked />
                      <label className="form-check-label" htmlFor="productratingRadio4">
                        <span className="text-muted">
                          <i className="mdi mdi-star text-warning" />
                          <i className="mdi mdi-star text-warning" />
                          <i className="mdi mdi-star text-warning" />
                          <i className="mdi mdi-star text-warning" />
                          <i className="mdi mdi-star" />
                        </span>4 و بالاتر</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" defaultValue="3 و بالاتر از ستاره" id="productratingRadio3" />
                      <label className="form-check-label" htmlFor="productratingRadio3">
                        <span className="text-muted">
                          <i className="mdi mdi-star text-warning" />
                          <i className="mdi mdi-star text-warning" />
                          <i className="mdi mdi-star text-warning" />
                          <i className="mdi mdi-star" />
                          <i className="mdi mdi-star" />
                        </span>3 و بالاتر</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" defaultValue="2 و بالاتر از ستاره" id="productratingRadio2" />
                      <label className="form-check-label" htmlFor="productratingRadio2">
                        <span className="text-muted">
                          <i className="mdi mdi-star text-warning" />
                          <i className="mdi mdi-star text-warning" />
                          <i className="mdi mdi-star" />
                          <i className="mdi mdi-star" />
                          <i className="mdi mdi-star" />
                        </span>2 و بالاتر</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" defaultValue="1 ستاره" id="productratingRadio1" />
                      <label className="form-check-label" htmlFor="productratingRadio1">
                        <span className="text-muted">
                          <i className="mdi mdi-star text-warning" />
                          <i className="mdi mdi-star" />
                          <i className="mdi mdi-star" />
                          <i className="mdi mdi-star" />
                          <i className="mdi mdi-star" />
                        </span>1</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* end accordion-item */}
          </div>
        </div>
        {/* end card */}
      </div>
      {/* end col */}
      <div className="col-xl-9 col-lg-8">
        <div>
          <div className="card">
            <div className="card-header border-0">
              <div className="row g-4">
                <div className="col-sm-auto">
                  <div>
                    <a href="apps-ecommerce-add-product.html" className="btn btn-info" id="addproduct-btn"><i className="ri-add-line align-bottom me-1" />افزودن محصول</a>
                  </div>
                </div>
                <div className="col-sm">
                  <div className="d-flex justify-content-sm-end">
                    <div className="search-box ms-2">
                      <input type="text" className="form-control" id="searchProductList" placeholder="جستجوی محصولات..." />
                      <i className="ri-search-line search-icon" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="card-header">
              <div className="row align-items-center">
                <div className="col">
                  <ul className="nav nav-tabs-custom card-header-tabs border-bottom-0" role="tablist">
                    <li className="nav-item">
                      <a className="nav-link text-body active fw-semibold" data-bs-toggle="tab" href="#productnav-all" role="tab">همه<span className="badge bg-danger-subtle text-danger align-middle rounded-pill ms-1">12</span>
                      </a>
                    </li>
                    <li className="nav-item">
                      <a className="nav-link text-body fw-semibold" data-bs-toggle="tab" href="#productnav-published" role="tab">منتشر شد<span className="badge bg-danger-subtle text-danger align-middle rounded-pill ms-1">5</span>
                      </a>
                    </li>
                    <li className="nav-item">
                      <a className="nav-link text-body fw-semibold" data-bs-toggle="tab" href="#productnav-draft" role="tab">پیش نویس</a>
                    </li>
                  </ul>
                </div>
                <div className="col-auto">
                  <div id="selection-element">
                    <div className="my-n1 d-flex align-items-center text-muted">انتخاب کنید<div id="select-content" className="text-body fw-semibold px-1" />نتیجه<button type="button" className="btn btn-link link-danger p-0 ms-3" data-bs-toggle="modal" data-bs-target="#removeItemModal">حذف کنید</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* end card header */}
            <div className="card-body">
              <div className="tab-content text-muted">
                <div className="tab-pane active" id="productnav-all" role="tabpanel">
                  <div id="table-product-list-all" className="table-card gridjs-border-none" />
                </div>
                {/* end tab pane */}
                <div className="tab-pane" id="productnav-published" role="tabpanel">
                  <div id="table-product-list-published" className="table-card gridjs-border-none" />
                </div>
                {/* end tab pane */}
                <div className="tab-pane" id="productnav-draft" role="tabpanel">
                  <div className="py-4 text-center">
                    <lord-icon src="https://cdn.lordicon.com/msoeawqm.json" trigger="loop" colors="primary:#405189,secondary:#0ab39c" style={{width: 72, height: 72}}>
                    </lord-icon>
                    <h5 className="mt-4">متاسفم! هیچ نتیجه ای یافت نشد</h5>
                  </div>
                </div>
                {/* end tab pane */}
              </div>
              {/* end tab content */}
            </div>
            {/* end card body */}
          </div>
          {/* end card */}
        </div>
      </div>
      {/* end col */}
    </div>
  )
}
