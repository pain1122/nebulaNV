import Image from "next/image"

export default function Header() {
  return (
    <>
      <header id="page-topbar">
        <div className="layout-width">
          <div className="navbar-header">
            <div className="d-flex">
              {/* LOGO */}
              <div className="navbar-brand-box horizontal-logo">
                <a href="/panel" className="logo logo-dark">
                  <span className="logo-sm">
                    <Image src="/assets/images/logo-sm.png" alt="" width={80} height={80} />
                  </span>
                  <span className="logo-lg">
                    <Image src="/assets/images/logo-dark.png" alt="" width={187} height={32} />
                  </span>
                </a>

                <a href="/panel" className="logo logo-light">
                  <span className="logo-sm">
                    <Image src="/assets/images/logo-sm.png" alt="" width={80} height={80} />
                  </span>
                  <span className="logo-lg">
                    <Image src="/assets/images/logo-light.png" alt="" width={187} height={32} />
                  </span>
                </a>
              </div>

              <button type="button" className="btn btn-sm px-3 fs-16 header-item vertical-menu-btn topnav-hamburger" id="topnav-hamburger-icon">
                <span className="hamburger-icon">
                  <span />
                  <span />
                  <span />
                </span>
              </button>

              {/* App Search */}
              <form className="app-search d-none d-md-block">
                <div className="position-relative">
                  <input type="text" className="form-control" placeholder="جستجو..." autoComplete="off" id="search-options" />
                  <span className="mdi mdi-magnify search-widget-icon" />
                  <span className="mdi mdi-close-circle search-widget-icon search-widget-icon-close d-none" id="search-close-options" />
                </div>
                <div className="dropdown-menu dropdown-menu-lg" id="search-dropdown">
                  <div data-simplebar="" style={{maxHeight: 320}}>
                    {/* item */}
                    <div className="dropdown-header">
                      <h6 className="text-overflow text-muted mb-0 text-uppercase">جستجوهای اخیر</h6>
                    </div>

                    <div className="dropdown-item bg-transparent text-wrap">
                      <a href="/panel" className="btn btn-soft-secondary btn-sm rounded-pill">
                        نحوه راه اندازی
                        <i className="mdi mdi-magnify ms-1" />
                      </a>
                      <a href="/panel" className="btn btn-soft-secondary btn-sm rounded-pill">
                        دکمه ها
                        <i className="mdi mdi-magnify ms-1" />
                      </a>
                    </div>

                    {/* item */}
                    <div className="dropdown-header mt-2">
                      <h6 className="text-overflow text-muted mb-1 text-uppercase">صفحات</h6>
                    </div>

                    {/* item */}
                    <a href="javascript:void(0);" className="dropdown-item notify-item">
                      <i className="ri-bubble-chart-line align-middle fs-18 text-muted me-2" />
                      <span>داشبورد تجزیه و تحلیل</span>
                    </a>

                    {/* item */}
                    <a href="javascript:void(0);" className="dropdown-item notify-item">
                      <i className="ri-lifebuoy-line align-middle fs-18 text-muted me-2" />
                      <span>مرکز راهنمایی</span>
                    </a>

                    {/* item */}
                    <a href="javascript:void(0);" className="dropdown-item notify-item">
                      <i className="ri-user-settings-line align-middle fs-18 text-muted me-2" />
                      <span>تنظیمات حساب من</span>
                    </a>

                    {/* item */}
                    <div className="dropdown-header mt-2">
                      <h6 className="text-overflow text-muted mb-2 text-uppercase">اعضا</h6>
                    </div>

                    <div className="notification-list">
                      {/* item */}
                      <a href="javascript:void(0);" className="dropdown-item notify-item py-2">
                        <div className="d-flex">
                          <Image src="/assets/images/users/avatar-2.jpg" width={200} height={200} className="me-3 rounded-circle avatar-xs" alt="کاربر-عکس" />
                          <div className="flex-grow-1">
                            <h6 className="m-0">آنجلا برنیر</h6>
                            <span className="fs-11 mb-0 text-muted">مدیر</span>
                          </div>
                        </div>
                      </a>

                      {/* item */}
                      <a href="javascript:void(0);" className="dropdown-item notify-item py-2">
                        <div className="d-flex">
                          <Image src="/assets/images/users/avatar-3.jpg" width={200} height={200} className="me-3 rounded-circle avatar-xs" alt="کاربر-عکس" />
                          <div className="flex-grow-1">
                            <h6 className="m-0">دیوید گراسو</h6>
                            <span className="fs-11 mb-0 text-muted">طراح وب</span>
                          </div>
                        </div>
                      </a>

                      {/* item */}
                      <a href="javascript:void(0);" className="dropdown-item notify-item py-2">
                        <div className="d-flex">
                          <Image src="/assets/images/users/avatar-5.jpg" width={200} height={200} className="me-3 rounded-circle avatar-xs" alt="کاربر-عکس" />
                          <div className="flex-grow-1">
                            <h6 className="m-0">مایک باچ</h6>
                            <span className="fs-11 mb-0 text-muted">React Developer</span>
                          </div>
                        </div>
                      </a>
                    </div>
                  </div>

                  <div className="text-center pt-3 pb-1">
                    <a href="pages-search-results.html" className="btn btn-primary btn-sm">
                      مشاهده همه نتایج
                      <i className="ri-arrow-left-line ms-1" />
                    </a>
                  </div>
                </div>
              </form>
            </div>

            <div className="d-flex align-items-center">
              {/* Mobile search */}
              <div className="dropdown d-md-none topbar-head-dropdown header-item">
                <button type="button" className="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle" id="page-header-search-dropdown" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                  <i className="bx bx-search fs-22" />
                </button>
                <div className="dropdown-menu dropdown-menu-lg dropdown-menu-end p-0" aria-labelledby="page-header-search-dropdown">
                  {/* App Search */}
                  <form className="app-search d-none d-md-block">
                    <div className="position-relative">
                      <input type="text" className="form-control" placeholder="جستجو ..." aria-label="Recipient's username" /> <span className="mdi mdi-magnify search-widget-icon"></span>
                      <span className="mdi mdi-close-circle search-widget-icon search-widget-icon-close d-none" id="search-close-options"></span>
                    </div>
                    <div className="dropdown-menu dropdown-menu-lg" id="search-dropdown">
                      <div data-simplebar style={{maxHeight: 320}}>
                        {/* item */}
                        <div className="dropdown-header">
                          <h6 className="text-overflow text-muted mb-0 text-uppercase">جستجوهای اخیر</h6>
                        </div>

                        <div className="dropdown-item bg-transparent text-wrap">
                          <a href="index.html" className="btn btn-soft-secondary btn-sm rounded-pill">
                            نحوه راه اندازی<i className="mdi mdi-magnify ms-1"></i>
                          </a>
                          <a href="index.html" className="btn btn-soft-secondary btn-sm rounded-pill">
                            دکمه ها<i className="mdi mdi-magnify ms-1"></i>
                          </a>
                        </div>
                        {/* item */}
                        <div className="dropdown-header mt-2">
                          <h6 className="text-overflow text-muted mb-1 text-uppercase">صفحات</h6>
                        </div>

                        {/* item */}
                        <a href="javascript:void(0);" className="dropdown-item notify-item">
                          <i className="ri-bubble-chart-line align-middle fs-18 text-muted me-2"></i>
                          <span>داشبورد تجزیه و تحلیل</span>
                        </a>

                        {/* item */}
                        <a href="javascript:void(0);" className="dropdown-item notify-item">
                          <i className="ri-lifebuoy-line align-middle fs-18 text-muted me-2"></i>
                          <span>مرکز راهنمایی</span>
                        </a>

                        {/* item */}
                        <a href="javascript:void(0);" className="dropdown-item notify-item">
                          <i className="ri-user-settings-line align-middle fs-18 text-muted me-2"></i>
                          <span>تنظیمات حساب من</span>
                        </a>

                        {/* item */}
                        <div className="dropdown-header mt-2">
                          <h6 className="text-overflow text-muted mb-2 text-uppercase">اعضا</h6>
                        </div>

                        <div className="notification-list">
                          {/* item */}
                          <a href="javascript:void(0);" className="dropdown-item notify-item py-2">
                            <div className="d-flex">
                              <img src="../../assets/images/users/avatar-2.jpg" className="me-3 rounded-circle avatar-xs" alt="کاربر-عکس" />
                              <div className="flex-grow-1">
                                <h6 className="m-0">آنجلا برنیر</h6>
                                <span className="fs-11 mb-0 text-muted">مدیر</span>
                              </div>
                            </div>
                          </a>
                          {/* item */}
                          <a href="javascript:void(0);" className="dropdown-item notify-item py-2">
                            <div className="d-flex">
                              <img src="../../assets/images/users/avatar-3.jpg" className="me-3 rounded-circle avatar-xs" alt="کاربر-عکس" />
                              <div className="flex-grow-1">
                                <h6 className="m-0">دیوید گراسو</h6>
                                <span className="fs-11 mb-0 text-muted">طراح وب</span>
                              </div>
                            </div>
                          </a>
                          {/* item */}
                          <a href="javascript:void(0);" className="dropdown-item notify-item py-2">
                            <div className="d-flex">
                              <img src="../../assets/images/users/avatar-5.jpg" className="me-3 rounded-circle avatar-xs" alt="کاربر-عکس" />
                              <div className="flex-grow-1">
                                <h6 className="m-0">مایک باچ</h6>
                                <span className="fs-11 mb-0 text-muted">React Developer</span>
                              </div>
                            </div>
                          </a>
                        </div>
                      </div>

                      <div className="text-center pt-3 pb-1">
                        <a href="pages-search-results.html" className="btn btn-primary btn-sm">
                          مشاهده همه نتایج<i className="ri-arrow-left-line ms-1"></i>
                        </a>
                      </div>
                    </div>
                  </form>
                </div>
              </div>

              {/* Apps dropdown */}
              <div className="dropdown topbar-head-dropdown ms-1 header-item">
                <button type="button" className="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                  <i className="bx bx-category-alt fs-22" />
                </button>
                <div className="dropdown-menu dropdown-menu-lg p-0 dropdown-menu-end">
                  <div className="p-3 border-top-0 border-start-0 border-end-0 border-dashed border">
                    <div className="row align-items-center">
                      <div className="col">
                        <h6 className="m-0 fw-semibold fs-15">برنامه های وب</h6>
                      </div>
                      <div className="col-auto">
                        <a href="#!" className="btn btn-sm btn-soft-info">
                          مشاهده همه برنامه ها
                          <i className="ri-arrow-right-s-line align-middle" />
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <div className="row g-0">
                      <div className="col">
                        <a className="dropdown-icon-item" href="#!">
                          <Image src="/assets/images/brands/github.png" width={35} height={30} alt="Github" />
                          <span>GitHub</span>
                        </a>
                      </div>
                      <div className="col">
                        <a className="dropdown-icon-item" href="#!">
                          <Image src="/assets/images/brands/bitbucket.png" width={35} height={30} alt="بیت سطل" />
                          <span>بیت باکت</span>
                        </a>
                      </div>
                      <div className="col">
                        <a className="dropdown-icon-item" href="#!">
                          <Image src="/assets/images/brands/dribbble.png" width={35} height={30} alt="دریبل زدن" />
                          <span>دریبل زدن</span>
                        </a>
                      </div>
                    </div>

                    <div className="row g-0">
                      <div className="col">
                        <a className="dropdown-icon-item" href="#!">
                          <Image src="/assets/images/brands/dropbox.png" width={35} height={30} alt="دراپ باکس" />
                          <span>دراپ باکس</span>
                        </a>
                      </div>
                      <div className="col">
                        <a className="dropdown-icon-item" href="#!">
                          <Image src="/assets/images/brands/mail_chimp.png" width={35} height={30} alt="mailchimp" />
                          <span>Mailchimp</span>
                        </a>
                      </div>
                      <div className="col">
                        <a className="dropdown-icon-item" href="#!">
                          <Image src="/assets/images/brands/slack.png" width={35} height={30} alt="سستی" />
                          <span>سستی</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cart dropdown */}
              <div className="dropdown topbar-head-dropdown ms-1 header-item">
                <button type="button" className="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle" id="page-header-cart-dropdown" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-haspopup="true" aria-expanded="false">
                  <i className="bx bx-shopping-bag fs-22"></i>
                  <span className="position-absolute topbar-badge cartitem-badge fs-10 translate-middle badge rounded-pill bg-info">5</span>
                </button>
                <div className="dropdown-menu dropdown-menu-xl dropdown-menu-end p-0 dropdown-menu-cart" aria-labelledby="page-header-cart-dropdown">
                  <div className="p-3 border-top-0 border-start-0 border-end-0 border-dashed border">
                    <div className="row align-items-center">
                      <div className="col">
                        <h6 className="m-0 fs-16 fw-semibold">سبد خرید من</h6>
                      </div>
                      <div className="col-auto">
                        <span className="badge bg-warning-subtle text-warning fs-13">
                          <span className="cartitem-badge">7</span>موارد
                        </span>
                      </div>
                    </div>
                  </div>
                  <div data-simplebar style={{maxHeight: 300}}>
                    <div className="p-2">
                      <div className="text-center empty-cart" id="empty-cart">
                        <div className="avatar-md mx-auto my-3">
                          <div className="avatar-title bg-info-subtle text-info fs-36 rounded-circle">
                            <i className="bx bx-cart"></i>
                          </div>
                        </div>
                        <h5 className="mb-3">سبد خرید شما خالی است!</h5>
                        <a href="apps-ecommerce-products.html" className="btn btn-success w-md mb-3">
                          اکنون خرید کنید
                        </a>
                      </div>
                      <div className="d-block dropdown-item dropdown-item-cart text-wrap px-3 py-2">
                        <div className="d-flex align-items-center">
                          <img src="../../assets/images/products/img-1.png" className="me-3 rounded-circle avatar-sm p-2 bg-light" alt="کاربر-عکس" />
                          <div className="flex-grow-1">
                            <h6 className="mt-0 mb-1 fs-14">
                              <a href="apps-ecommerce-product-details.html" className="text-reset">
                                مارک دار تی شرت
                              </a>
                            </h6>
                            <p className="mb-0 fs-12 text-muted">
                              مقدار:<span>10×32 دلار</span>
                            </p>
                          </div>
                          <div className="px-2">
                            <h5 className="m-0 fw-normal">
                              $<span className="cart-item-price">320</span>
                            </h5>
                          </div>
                          <div className="ps-2">
                            <button type="button" className="btn btn-icon btn-sm btn-ghost-secondary remove-item-btn">
                              <i className="ri-close-fill fs-16"></i>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="d-block dropdown-item dropdown-item-cart text-wrap px-3 py-2">
                        <div className="d-flex align-items-center">
                          <img src="../../assets/images/products/img-2.png" className="me-3 rounded-circle avatar-sm p-2 bg-light" alt="کاربر-عکس" />
                          <div className="flex-grow-1">
                            <h6 className="mt-0 mb-1 fs-14">
                              <a href="apps-ecommerce-product-details.html" className="text-reset">
                                صندلی بنتوود
                              </a>
                            </h6>
                            <p className="mb-0 fs-12 text-muted">
                              مقدار:<span>5 x 18 دلار</span>
                            </p>
                          </div>
                          <div className="px-2">
                            <h5 className="m-0 fw-normal">
                              $<span className="cart-item-price">89</span>
                            </h5>
                          </div>
                          <div className="ps-2">
                            <button type="button" className="btn btn-icon btn-sm btn-ghost-secondary remove-item-btn">
                              <i className="ri-close-fill fs-16"></i>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="d-block dropdown-item dropdown-item-cart text-wrap px-3 py-2">
                        <div className="d-flex align-items-center">
                          <img src="../../assets/images/products/img-3.png" className="me-3 rounded-circle avatar-sm p-2 bg-light" alt="کاربر-عکس" />
                          <div className="flex-grow-1">
                            <h6 className="mt-0 mb-1 fs-14">
                              <a href="apps-ecommerce-product-details.html" className="text-reset">
                                لیوان کاغذی بوروسیل
                              </a>
                            </h6>
                            <p className="mb-0 fs-12 text-muted">
                              مقدار:<span>3×250 دلار</span>
                            </p>
                          </div>
                          <div className="px-2">
                            <h5 className="m-0 fw-normal">
                              $<span className="cart-item-price">750</span>
                            </h5>
                          </div>
                          <div className="ps-2">
                            <button type="button" className="btn btn-icon btn-sm btn-ghost-secondary remove-item-btn">
                              <i className="ri-close-fill fs-16"></i>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="d-block dropdown-item dropdown-item-cart text-wrap px-3 py-2">
                        <div className="d-flex align-items-center">
                          <img src="../../assets/images/products/img-6.png" className="me-3 rounded-circle avatar-sm p-2 bg-light" alt="کاربر-عکس" />
                          <div className="flex-grow-1">
                            <h6 className="mt-0 mb-1 fs-14">
                              <a href="apps-ecommerce-product-details.html" className="text-reset">
                                خاکستری تی شرت مدل دار
                              </a>
                            </h6>
                            <p className="mb-0 fs-12 text-muted">
                              مقدار:<span>1×1250 دلار</span>
                            </p>
                          </div>
                          <div className="px-2">
                            <h5 className="m-0 fw-normal">
                              $<span className="cart-item-price">1250</span>
                            </h5>
                          </div>
                          <div className="ps-2">
                            <button type="button" className="btn btn-icon btn-sm btn-ghost-secondary remove-item-btn">
                              <i className="ri-close-fill fs-16"></i>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="d-block dropdown-item dropdown-item-cart text-wrap px-3 py-2">
                        <div className="d-flex align-items-center">
                          <img src="../../assets/images/products/img-5.png" className="me-3 rounded-circle avatar-sm p-2 bg-light" alt="کاربر-عکس" />
                          <div className="flex-grow-1">
                            <h6 className="mt-0 mb-1 fs-14">
                              <a href="apps-ecommerce-product-details.html" className="text-reset">
                                کلاه ایمنی فولادی
                              </a>
                            </h6>
                            <p className="mb-0 fs-12 text-muted">
                              مقدار:<span>2×495 دلار</span>
                            </p>
                          </div>
                          <div className="px-2">
                            <h5 className="m-0 fw-normal">
                              $<span className="cart-item-price">990</span>
                            </h5>
                          </div>
                          <div className="ps-2">
                            <button type="button" className="btn btn-icon btn-sm btn-ghost-secondary remove-item-btn">
                              <i className="ri-close-fill fs-16"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 border-bottom-0 border-start-0 border-end-0 border-dashed border" id="checkout-elem">
                    <div className="d-flex justify-content-between align-items-center pb-3">
                      <h5 className="m-0 text-muted">مجموع:</h5>
                      <div className="px-2">
                        <h5 className="m-0" id="cart-item-total">
                          1258.58 دلار
                        </h5>
                      </div>
                    </div>

                    <a href="apps-ecommerce-checkout.html" className="btn btn-success text-center w-100">
                      تسویه حساب
                    </a>
                  </div>
                </div>
              </div>

              {/* Light/dark mode button */}
              <div className="ms-1 header-item d-none d-sm-flex">
                <button type="button" className="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle light-dark-mode">
                  <i className="bx bx-moon fs-22" />
                </button>
              </div>

              {/* Notifications dropdown */}
              <div className="dropdown topbar-head-dropdown ms-1 header-item" id="notificationDropdown">
                <button type="button" className="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle" id="page-header-notifications-dropdown" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-haspopup="true" aria-expanded="false">
                  <i className="bx bx-bell fs-22"></i>
                  <span className="position-absolute topbar-badge fs-10 translate-middle badge rounded-pill bg-danger">
                    3<span className="visually-hidden">پیام های خوانده نشده</span>
                  </span>
                </button>
                <div className="dropdown-menu dropdown-menu-lg dropdown-menu-end p-0" aria-labelledby="page-header-notifications-dropdown">
                  <div className="dropdown-head bg-primary bg-pattern rounded-top">
                    <div className="p-3">
                      <div className="row align-items-center">
                        <div className="col">
                          <h6 className="m-0 fs-16 fw-semibold text-white">اطلاعیه ها</h6>
                        </div>
                        <div className="col-auto dropdown-tabs">
                          <span className="badge bg-light-subtle text-body fs-13">4 جدید</span>
                        </div>
                      </div>
                    </div>

                    <div className="px-2 pt-2">
                      <ul className="nav nav-tabs dropdown-tabs nav-tabs-custom" data-dropdown-tabs="true" id="notificationItemsTab" role="tablist">
                        <li className="nav-item waves-effect waves-light">
                          <a className="nav-link active" data-bs-toggle="tab" href="#all-noti-tab" role="tab" aria-selected="true">
                            همه (4)
                          </a>
                        </li>
                        <li className="nav-item waves-effect waves-light">
                          <a className="nav-link" data-bs-toggle="tab" href="#messages-tab" role="tab" aria-selected="false">
                            پیام ها
                          </a>
                        </li>
                        <li className="nav-item waves-effect waves-light">
                          <a className="nav-link" data-bs-toggle="tab" href="#alerts-tab" role="tab" aria-selected="false">
                            هشدارها
                          </a>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="tab-content position-relative" id="notificationItemsTabContent">
                    <div className="tab-pane fade show active py-2 ps-2" id="all-noti-tab" role="tabpanel">
                      <div data-simplebar style={{maxHeight: 300}} className="pe-2">
                        <div className="text-reset notification-item d-block dropdown-item position-relative">
                          <div className="d-flex">
                            <div className="avatar-xs me-3 flex-shrink-0">
                              <span className="avatar-title bg-info-subtle text-info rounded-circle fs-16">
                                <i className="bx bx-badge-check"></i>
                              </span>
                            </div>
                            <div className="flex-grow-1">
                              <a href="#!" className="stretched-link">
                                <h6 className="mt-0 mb-2 lh-base">
                                  شما<b> نخبگان </b>گرافیک نویسنده بهینه سازی<span className="text-secondary"> پاداش </span>است آماده!
                                </h6>
                              </a>
                              <p className="mb-0 fs-11 fw-medium text-uppercase text-muted">
                                <span>
                                  <i className="mdi mdi-clock-outline"></i>فقط 30 ثانیه پیش
                                </span>
                              </p>
                            </div>
                            <div className="px-2 fs-15">
                              <div className="form-check notification-check">
                                <input className="form-check-input" type="checkbox" id="all-notification-check01" />
                                <label className="form-check-label" htmlFor="all-notification-check01"></label>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="text-reset notification-item d-block dropdown-item position-relative">
                          <div className="d-flex">
                            <img src="../../assets/images/users/avatar-2.jpg" className="me-3 rounded-circle avatar-xs" alt="کاربر-عکس" />
                            <div className="flex-grow-1">
                              <a href="#!" className="stretched-link">
                                <h6 className="mt-0 mb-1 fs-13 fw-semibold">آنجلا برنیر</h6>
                              </a>
                              <div className="fs-13 text-muted">
                                <p className="mb-1">به نظر شما در مورد پیش بینی جریان نقدی پاسخ داده شد نمودار 🔔.</p>
                              </div>
                              <p className="mb-0 fs-11 fw-medium text-uppercase text-muted">
                                <span>
                                  <i className="mdi mdi-clock-outline"></i>48 دقیقه پیش
                                </span>
                              </p>
                            </div>
                            <div className="px-2 fs-15">
                              <div className="form-check notification-check">
                                <input className="form-check-input" type="checkbox" id="all-notification-check02" />
                                <label className="form-check-label" htmlFor="all-notification-check02"></label>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="text-reset notification-item d-block dropdown-item position-relative">
                          <div className="d-flex">
                            <div className="avatar-xs me-3">
                              <span className="avatar-title bg-danger-subtle text-danger rounded-circle fs-16">
                                <i className="bx bx-message-square-dots"></i>
                              </span>
                            </div>
                            <div className="flex-grow-1">
                              <a href="#!" className="stretched-link">
                                <h6 className="mt-0 mb-2 fs-13 lh-base">
                                  دریافت کرده اید <b className="text-success">20 </b>پیام های جدید در مکالمه
                                </h6>
                              </a>
                              <p className="mb-0 fs-11 fw-medium text-uppercase text-muted">
                                <span>
                                  <i className="mdi mdi-clock-outline"></i>2 ساعت پیش
                                </span>
                              </p>
                            </div>
                            <div className="px-2 fs-15">
                              <div className="form-check notification-check">
                                <input className="form-check-input" type="checkbox" id="all-notification-check03" />
                                <label className="form-check-label" htmlFor="all-notification-check03"></label>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="text-reset notification-item d-block dropdown-item position-relative">
                          <div className="d-flex">
                            <img src="../../assets/images/users/avatar-8.jpg" className="me-3 rounded-circle avatar-xs" alt="کاربر-عکس" />
                            <div className="flex-grow-1">
                              <a href="#!" className="stretched-link">
                                <h6 className="mt-0 mb-1 fs-13 fw-semibold">مورین گیبسون</h6>
                              </a>
                              <div className="fs-13 text-muted">
                                <p className="mb-1">ما در مورد پروژه ای در لینکدین صحبت کردیم.</p>
                              </div>
                              <p className="mb-0 fs-11 fw-medium text-uppercase text-muted">
                                <span>
                                  <i className="mdi mdi-clock-outline"></i>4 ساعت پیش
                                </span>
                              </p>
                            </div>
                            <div className="px-2 fs-15">
                              <div className="form-check notification-check">
                                <input className="form-check-input" type="checkbox" id="all-notification-check04" />
                                <label className="form-check-label" htmlFor="all-notification-check04"></label>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="my-3 text-center view-all">
                          <button type="button" className="btn btn-soft-success waves-effect waves-light">
                            مشاهده کنید همه اعلان ها<i className="ri-arrow-left-line align-middle"></i>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="tab-pane fade py-2 ps-2" id="messages-tab" role="tabpanel" aria-labelledby="messages-tab">
                      <div data-simplebar style={{maxHeight: 300}} className="pe-2">
                        <div className="text-reset notification-item d-block dropdown-item">
                          <div className="d-flex">
                            <img src="../../assets/images/users/avatar-3.jpg" className="me-3 rounded-circle avatar-xs" alt="کاربر-عکس" />
                            <div className="flex-grow-1">
                              <a href="#!" className="stretched-link">
                                <h6 className="mt-0 mb-1 fs-13 fw-semibold">جیمز لمیر</h6>
                              </a>
                              <div className="fs-13 text-muted">
                                <p className="mb-1">ما در مورد پروژه ای در لینکدین صحبت کردیم.</p>
                              </div>
                              <p className="mb-0 fs-11 fw-medium text-uppercase text-muted">
                                <span>
                                  <i className="mdi mdi-clock-outline"></i>30 دقیقه پیش
                                </span>
                              </p>
                            </div>
                            <div className="px-2 fs-15">
                              <div className="form-check notification-check">
                                <input className="form-check-input" type="checkbox" id="messages-notification-check01" />
                                <label className="form-check-label" htmlFor="messages-notification-check01"></label>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="text-reset notification-item d-block dropdown-item">
                          <div className="d-flex">
                            <img src="../../assets/images/users/avatar-2.jpg" className="me-3 rounded-circle avatar-xs" alt="کاربر-عکس" />
                            <div className="flex-grow-1">
                              <a href="#!" className="stretched-link">
                                <h6 className="mt-0 mb-1 fs-13 fw-semibold">آنجلا برنیر</h6>
                              </a>
                              <div className="fs-13 text-muted">
                                <p className="mb-1">به نظر شما در مورد پیش بینی جریان نقدی پاسخ داده شد نمودار 🔔.</p>
                              </div>
                              <p className="mb-0 fs-11 fw-medium text-uppercase text-muted">
                                <span>
                                  <i className="mdi mdi-clock-outline"></i>2 ساعت پیش
                                </span>
                              </p>
                            </div>
                            <div className="px-2 fs-15">
                              <div className="form-check notification-check">
                                <input className="form-check-input" type="checkbox" id="messages-notification-check02" />
                                <label className="form-check-label" htmlFor="messages-notification-check02"></label>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="text-reset notification-item d-block dropdown-item">
                          <div className="d-flex">
                            <img src="../../assets/images/users/avatar-6.jpg" className="me-3 rounded-circle avatar-xs" alt="کاربر-عکس" />
                            <div className="flex-grow-1">
                              <a href="#!" className="stretched-link">
                                <h6 className="mt-0 mb-1 fs-13 fw-semibold">کنت براون</h6>
                              </a>
                              <div className="fs-13 text-muted">
                                <p className="mb-1">از شما در کامنت خود در 📃 فاکتور شماره 12501 نام برده است.</p>
                              </div>
                              <p className="mb-0 fs-11 fw-medium text-uppercase text-muted">
                                <span>
                                  <i className="mdi mdi-clock-outline"></i>10 ساعت پیش
                                </span>
                              </p>
                            </div>
                            <div className="px-2 fs-15">
                              <div className="form-check notification-check">
                                <input className="form-check-input" type="checkbox" id="messages-notification-check03" />
                                <label className="form-check-label" htmlFor="messages-notification-check03"></label>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="text-reset notification-item d-block dropdown-item">
                          <div className="d-flex">
                            <img src="../../assets/images/users/avatar-8.jpg" className="me-3 rounded-circle avatar-xs" alt="کاربر-عکس" />
                            <div className="flex-grow-1">
                              <a href="#!" className="stretched-link">
                                <h6 className="mt-0 mb-1 fs-13 fw-semibold">مورین گیبسون</h6>
                              </a>
                              <div className="fs-13 text-muted">
                                <p className="mb-1">ما در مورد پروژه ای در لینکدین صحبت کردیم.</p>
                              </div>
                              <p className="mb-0 fs-11 fw-medium text-uppercase text-muted">
                                <span>
                                  <i className="mdi mdi-clock-outline"></i>3 روز پیش
                                </span>
                              </p>
                            </div>
                            <div className="px-2 fs-15">
                              <div className="form-check notification-check">
                                <input className="form-check-input" type="checkbox" id="messages-notification-check04" />
                                <label className="form-check-label" htmlFor="messages-notification-check04"></label>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="my-3 text-center view-all">
                          <button type="button" className="btn btn-soft-success waves-effect waves-light">
                            مشاهده کنید همه پیام ها<i className="ri-arrow-left-line align-middle"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="tab-pane fade p-4" id="alerts-tab" role="tabpanel" aria-labelledby="alerts-tab"></div>

                    <div className="notification-actions" id="notification-actions">
                      <div className="d-flex text-muted justify-content-center">
                        انتخاب کنید
                        <div id="select-content" className="text-body fw-semibold px-1">
                          0
                        </div>
                        نتیجه
                        <button type="button" className="btn btn-link link-danger p-0 ms-3" data-bs-toggle="modal" data-bs-target="#removeNotificationModal">
                          حذف کنید
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* User dropdown */}
              <div className="dropdown ms-sm-3 header-item topbar-user">
                <button type="button" className="btn" id="page-header-user-dropdown" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                  <span className="d-flex align-items-center">
                    <Image className="rounded-circle header-profile-user" src="/assets/images/users/avatar-1.jpg" width={200} height={200} alt="آواتار سرصفحه" />
                    <span className="text-start ms-xl-2">
                      <span className="d-none d-xl-inline-block ms-1 fw-semibold user-name-text">آنا آدام</span>
                      <span className="d-none d-xl-block ms-1 fs-13 user-name-sub-text">بنیانگذار</span>
                    </span>
                  </span>
                </button>
                <div className="dropdown-menu dropdown-menu-end">
                  <h6 className="dropdown-header">خوش آمدی آنا!</h6>
                  <a className="dropdown-item" href="pages-profile.html">
                    <i className="mdi mdi-account-circle text-muted fs-16 align-middle me-1" /> <span className="align-middle">نمایه</span>
                  </a>
                  <a className="dropdown-item" href="apps-chat.html">
                    <i className="mdi mdi-message-text-outline text-muted fs-16 align-middle me-1" /> <span className="align-middle">پیام ها</span>
                  </a>
                  <a className="dropdown-item" href="apps-tasks-kanban.html">
                    <i className="mdi mdi-calendar-check-outline text-muted fs-16 align-middle me-1" /> <span className="align-middle">تابلوی وظیفه</span>
                  </a>
                  <a className="dropdown-item" href="pages-faqs.html">
                    <i className="mdi mdi-lifebuoy text-muted fs-16 align-middle me-1" /> <span className="align-middle">کمک کنید</span>
                  </a>
                  <div className="dropdown-divider" />
                  <a className="dropdown-item" href="pages-profile.html">
                    <i className="mdi mdi-wallet text-muted fs-16 align-middle me-1" />{" "}
                    <span className="align-middle">
                      تعادل:<b> 5971.67 دلار </b>
                    </span>
                  </a>
                  <a className="dropdown-item" href="pages-profile-settings.html">
                    <span className="badge bg-success-subtle text-success mt-1 float-end">جدید</span>
                    <i className="mdi mdi-cog-outline text-muted fs-16 align-middle me-1" /> <span className="align-middle">تنظیمات</span>
                  </a>
                  <a className="dropdown-item" href="auth-lockscreen-basic.html">
                    <i className="mdi mdi-lock text-muted fs-16 align-middle me-1" /> <span className="align-middle">صفحه قفل</span>
                  </a>
                  <a className="dropdown-item" href="auth-logout-basic.html">
                    <i className="mdi mdi-logout text-muted fs-16 align-middle me-1" />{" "}
                    <span className="align-middle" data-key="t-logout">
                      خروج از سیستم
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      {/* removeNotificationModal */}
      <div id="removeNotificationModal" className="modal fade zoomIn" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" id="NotificationModalbtn-close" />
            </div>
            <div className="modal-body">
              <div className="mt-2 text-center">
                <div className="mt-4 pt-2 fs-15 mx-4 mx-sm-5">
                  <h4>مطمئنی؟</h4>
                  <p className="text-muted mx-4 mb-0">آیا مطمئن هستید که می خواهید این اعلان را حذف کنید؟</p>
                </div>
              </div>
              <div className="d-flex gap-2 justify-content-center mt-4 mb-2">
                <button type="button" className="btn w-sm btn-light" data-bs-dismiss="modal">
                  بستن
                </button>
                <button type="button" className="btn w-sm btn-danger" id="delete-notification">
                  بله، آن را حذف کنید!
                </button>
              </div>
            </div>
          </div>
          {/* /.modal-content */}
        </div>
        {/* /.modal-dialog */}
      </div>
      {/* /.modal */}
    </>
  )
}
