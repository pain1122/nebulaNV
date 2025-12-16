import Image from "next/image"

export default function Navbar() {
    return (
      <>
        {/* ========== App Menu ========== */}
        <div className="app-menu navbar-menu">
          {/* LOGO */}
          <div className="navbar-brand-box">
            {/* Dark Logo */}
            <a href="/panel" className="logo logo-dark">
              <span className="logo-sm">
                <Image src="/assets/images/logo-sm.png" alt="" width={22} height={22} />
              </span>
              <span className="logo-lg">
                <Image src="/assets/images/logo-dark.png" alt="" width={99} height={17} />
              </span>
            </a>
            {/* Light Logo */}
            <a href="/panel" className="logo logo-light">
              <span className="logo-sm">
                <Image src="/assets/images/logo-sm.png" alt=""  width={22} height={22} />
              </span>
              <span className="logo-lg">
                <Image src="/assets/images/logo-light.png" alt="" width={99} height={17} />
              </span>
            </a>
            <button
              type="button"
              className="btn btn-sm p-0 fs-20 header-item float-end btn-vertical-sm-hover"
              id="vertical-hover"
            >
              <i className="ri-record-circle-line" />
            </button>
          </div>
  
          <div id="scrollbar">
            <div className="container-fluid">
              <div id="two-column-menu" />
              <ul className="navbar-nav" id="navbar-nav">
                <li className="menu-title">
                  <span data-key="t-menu">منو</span>
                </li>
  
                {/* Dashboards */}
                <li className="nav-item">
                  <a
                    className="nav-link menu-link"
                    href="#sidebarDashboards"
                    data-bs-toggle="collapse"
                    role="button"
                    aria-expanded="false"
                    aria-controls="sidebarDashboards"
                  >
                    <i className="ri-dashboard-2-line" />{" "}
                    <span data-key="t-dashboards">داشبوردها</span>
                  </a>
                  <div className="collapse menu-dropdown" id="sidebarDashboards">
                    <ul className="nav nav-sm flex-column">
                      <li className="nav-item">
                        <a
                          href="dashboard-analytics.html"
                          className="nav-link"
                          data-key="t-analytics"
                        >
                          تجزیه و تحلیل
                        </a>
                      </li>
                      <li className="nav-item">
                        <a
                          href="dashboard-crm.html"
                          className="nav-link"
                          data-key="t-crm"
                        >
                          CRM
                        </a>
                      </li>
                      <li className="nav-item">
                        <a
                          href="index.html"
                          className="nav-link"
                          data-key="t-ecommerce"
                        >
                          تجارت الکترونیک
                        </a>
                      </li>
                      <li className="nav-item">
                        <a
                          href="dashboard-crypto.html"
                          className="nav-link"
                          data-key="t-crypto"
                        >
                          رمزنگاری
                        </a>
                      </li>
                      <li className="nav-item">
                        <a
                          href="dashboard-projects.html"
                          className="nav-link"
                          data-key="t-projects"
                        >
                          پروژه ها
                        </a>
                      </li>
                      <li className="nav-item">
                        <a
                          href="dashboard-nft.html"
                          className="nav-link"
                          data-key="t-nft"
                        >
                          NFT
                        </a>
                      </li>
                      <li className="nav-item">
                        <a
                          href="dashboard-job.html"
                          className="nav-link"
                          data-key="t-job"
                        >
                          شغل
                        </a>
                      </li>
                      <li className="nav-item">
                        <a href="dashboard-blog.html" className="nav-link">
                          <span data-key="t-blog">وبلاگ</span>{" "}
                          <span
                            className="badge bg-success"
                            data-key="t-new"
                          >
                            جدید
                          </span>
                        </a>
                      </li>
                    </ul>
                  </div>
                </li>
                {/* end Dashboard Menu */}
  
                {/* Apps */}
                <li className="nav-item">
                  <a
                    className="nav-link menu-link"
                    href="#sidebarApps"
                    data-bs-toggle="collapse"
                    role="button"
                    aria-expanded="false"
                    aria-controls="sidebarApps"
                  >
                    <i className="ri-apps-2-line" />{" "}
                    <span data-key="t-apps">برنامه ها</span>
                  </a>
                  <div className="collapse menu-dropdown" id="sidebarApps">
                    <ul className="nav nav-sm flex-column">
                      {/* Calendar */}
                      <li className="nav-item">
                        <a
                          href="#sidebarCalendar"
                          className="nav-link"
                          data-bs-toggle="collapse"
                          role="button"
                          aria-expanded="false"
                          aria-controls="sidebarCalendar"
                          data-key="t-calender"
                        >
                          تقویم
                        </a>
                        <div
                          className="collapse menu-dropdown"
                          id="sidebarCalendar"
                        >
                          <ul className="nav nav-sm flex-column">
                            <li className="nav-item">
                              <a
                                href="apps-calendar.html"
                                className="nav-link"
                                data-key="t-main-calender"
                              >
                                تقویم اصلی
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-calendar-month-grid.html"
                                className="nav-link"
                                data-key="t-month-grid"
                              >
                                ماه شبکه
                              </a>
                            </li>
                          </ul>
                        </div>
                      </li>
  
                      {/* Chat */}
                      <li className="nav-item">
                        <a
                          href="apps-chat.html"
                          className="nav-link"
                          data-key="t-chat"
                        >
                          چت کنید
                        </a>
                      </li>
  
                      {/* Email */}
                      <li className="nav-item">
                        <a
                          href="#sidebarEmail"
                          className="nav-link"
                          data-bs-toggle="collapse"
                          role="button"
                          aria-expanded="false"
                          aria-controls="sidebarEmail"
                          data-key="t-email"
                        >
                          ایمیل
                        </a>
                        <div
                          className="collapse menu-dropdown"
                          id="sidebarEmail"
                        >
                          <ul className="nav nav-sm flex-column">
                            <li className="nav-item">
                              <a
                                href="apps-mailbox.html"
                                className="nav-link"
                                data-key="t-mailbox"
                              >
                                صندوق پستی
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="#sidebaremailTemplates"
                                className="nav-link"
                                data-bs-toggle="collapse"
                                role="button"
                                aria-expanded="false"
                                aria-controls="sidebaremailTemplates"
                                data-key="t-email-templates"
                              >
                                قالب های ایمیل
                              </a>
                              <div
                                className="collapse menu-dropdown"
                                id="sidebaremailTemplates"
                              >
                                <ul className="nav nav-sm flex-column">
                                  <li className="nav-item">
                                    <a
                                      href="apps-email-basic.html"
                                      className="nav-link"
                                      data-key="t-basic-action"
                                    >
                                      اقدام اساسی
                                    </a>
                                  </li>
                                  <li className="nav-item">
                                    <a
                                      href="apps-email-ecommerce.html"
                                      className="nav-link"
                                      data-key="t-ecommerce-action"
                                    >
                                      اقدام تجارت الکترونیک
                                    </a>
                                  </li>
                                </ul>
                              </div>
                            </li>
                          </ul>
                        </div>
                      </li>
  
                      {/* Ecommerce */}
                      <li className="nav-item">
                        <a
                          href="#sidebarEcommerce"
                          className="nav-link"
                          data-bs-toggle="collapse"
                          role="button"
                          aria-expanded="false"
                          aria-controls="sidebarEcommerce"
                          data-key="t-ecommerce"
                        >
                          تجارت الکترونیک
                        </a>
                        <div
                          className="collapse menu-dropdown"
                          id="sidebarEcommerce"
                        >
                          <ul className="nav nav-sm flex-column">
                            <li className="nav-item">
                              <a
                                href="apps-ecommerce-products.html"
                                className="nav-link"
                                data-key="t-products"
                              >
                                محصولات
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-ecommerce-product-details.html"
                                className="nav-link"
                                data-key="t-product-Details"
                              >
                                جزئیات محصول
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-ecommerce-add-product.html"
                                className="nav-link"
                                data-key="t-create-product"
                              >
                                ایجاد محصول
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-ecommerce-orders.html"
                                className="nav-link"
                                data-key="t-orders"
                              >
                                سفارشات
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-ecommerce-order-details.html"
                                className="nav-link"
                                data-key="t-order-details"
                              >
                                جزئیات سفارش
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-ecommerce-customers.html"
                                className="nav-link"
                                data-key="t-customers"
                              >
                                مشتریان
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-ecommerce-cart.html"
                                className="nav-link"
                                data-key="t-shopping-cart"
                              >
                                سبد خرید
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-ecommerce-checkout.html"
                                className="nav-link"
                                data-key="t-checkout"
                              >
                                تسویه حساب
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-ecommerce-sellers.html"
                                className="nav-link"
                                data-key="t-sellers"
                              >
                                فروشندگان
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-ecommerce-seller-details.html"
                                className="nav-link"
                                data-key="t-sellers-details"
                              >
                                مشخصات فروشنده
                              </a>
                            </li>
                          </ul>
                        </div>
                      </li>
  
                      {/* Projects */}
                      <li className="nav-item">
                        <a
                          href="#sidebarProjects"
                          className="nav-link"
                          data-bs-toggle="collapse"
                          role="button"
                          aria-expanded="false"
                          aria-controls="sidebarProjects"
                          data-key="t-projects"
                        >
                          پروژه ها
                        </a>
                        <div
                          className="collapse menu-dropdown"
                          id="sidebarProjects"
                        >
                          <ul className="nav nav-sm flex-column">
                            <li className="nav-item">
                              <a
                                href="apps-projects-list.html"
                                className="nav-link"
                                data-key="t-list"
                              >
                                فهرست کنید
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-projects-overview.html"
                                className="nav-link"
                                data-key="t-overview"
                              >
                                نمای کلی
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-projects-create.html"
                                className="nav-link"
                                data-key="t-create-project"
                              >
                                ایجاد پروژه
                              </a>
                            </li>
                          </ul>
                        </div>
                      </li>
  
                      {/* Tasks */}
                      <li className="nav-item">
                        <a
                          href="#sidebarTasks"
                          className="nav-link"
                          data-bs-toggle="collapse"
                          role="button"
                          aria-expanded="false"
                          aria-controls="sidebarTasks"
                          data-key="t-tasks"
                        >
                          وظایف
                        </a>
                        <div className="collapse menu-dropdown" id="sidebarTasks">
                          <ul className="nav nav-sm flex-column">
                            <li className="nav-item">
                              <a
                                href="apps-tasks-kanban.html"
                                className="nav-link"
                                data-key="t-kanbanboard"
                              >
                                هیئت کانبان
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-tasks-list-view.html"
                                className="nav-link"
                                data-key="t-list-view"
                              >
                                نمایش لیست
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-tasks-details.html"
                                className="nav-link"
                                data-key="t-task-details"
                              >
                                جزئیات کار
                              </a>
                            </li>
                          </ul>
                        </div>
                      </li>
  
                      {/* CRM */}
                      <li className="nav-item">
                        <a
                          href="#sidebarCRM"
                          className="nav-link"
                          data-bs-toggle="collapse"
                          role="button"
                          aria-expanded="false"
                          aria-controls="sidebarCRM"
                          data-key="t-crm"
                        >
                          CRM
                        </a>
                        <div className="collapse menu-dropdown" id="sidebarCRM">
                          <ul className="nav nav-sm flex-column">
                            <li className="nav-item">
                              <a
                                href="apps-crm-contacts.html"
                                className="nav-link"
                                data-key="t-contacts"
                              >
                                مخاطبین
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-crm-companies.html"
                                className="nav-link"
                                data-key="t-companies"
                              >
                                شرکت ها
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-crm-deals.html"
                                className="nav-link"
                                data-key="t-deals"
                              >
                                معاملات
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-crm-leads.html"
                                className="nav-link"
                                data-key="t-leads"
                              >
                                منجر می شود
                              </a>
                            </li>
                          </ul>
                        </div>
                      </li>
  
                      {/* Crypto */}
                      <li className="nav-item">
                        <a
                          href="#sidebarCrypto"
                          className="nav-link"
                          data-bs-toggle="collapse"
                          role="button"
                          aria-expanded="false"
                          aria-controls="sidebarCrypto"
                          data-key="t-crypto"
                        >
                          رمزنگاری
                        </a>
                        <div
                          className="collapse menu-dropdown"
                          id="sidebarCrypto"
                        >
                          <ul className="nav nav-sm flex-column">
                            <li className="nav-item">
                              <a
                                href="apps-crypto-transactions.html"
                                className="nav-link"
                                data-key="t-transactions"
                              >
                                معاملات
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-crypto-buy-sell.html"
                                className="nav-link"
                                data-key="t-buy-sell"
                              >
                                خرید و فروش
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-crypto-orders.html"
                                className="nav-link"
                                data-key="t-orders"
                              >
                                سفارشات
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-crypto-wallet.html"
                                className="nav-link"
                                data-key="t-my-wallet"
                              >
                                کیف پول من
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-crypto-ico.html"
                                className="nav-link"
                                data-key="t-ico-list"
                              >
                                لیست ICO
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-crypto-kyc.html"
                                className="nav-link"
                                data-key="t-kyc-application"
                              >
                                برنامه KYC
                              </a>
                            </li>
                          </ul>
                        </div>
                      </li>
  
                      {/* Invoices */}
                      <li className="nav-item">
                        <a
                          href="#sidebarInvoices"
                          className="nav-link"
                          data-bs-toggle="collapse"
                          role="button"
                          aria-expanded="false"
                          aria-controls="sidebarInvoices"
                          data-key="t-invoices"
                        >
                          فاکتورها
                        </a>
                        <div
                          className="collapse menu-dropdown"
                          id="sidebarInvoices"
                        >
                          <ul className="nav nav-sm flex-column">
                            <li className="nav-item">
                              <a
                                href="apps-invoices-list.html"
                                className="nav-link"
                                data-key="t-list-view"
                              >
                                نمایش لیست
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-invoices-details.html"
                                className="nav-link"
                                data-key="t-details"
                              >
                                جزئیات
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-invoices-create.html"
                                className="nav-link"
                                data-key="t-create-invoice"
                              >
                                ایجاد فاکتور
                              </a>
                            </li>
                          </ul>
                        </div>
                      </li>
  
                      {/* Tickets */}
                      <li className="nav-item">
                        <a
                          href="#sidebarTickets"
                          className="nav-link"
                          data-bs-toggle="collapse"
                          role="button"
                          aria-expanded="false"
                          aria-controls="sidebarTickets"
                          data-key="t-supprt-tickets"
                        >
                          بلیط های پشتیبانی
                        </a>
                        <div
                          className="collapse menu-dropdown"
                          id="sidebarTickets"
                        >
                          <ul className="nav nav-sm flex-column">
                            <li className="nav-item">
                              <a
                                href="apps-tickets-list.html"
                                className="nav-link"
                                data-key="t-list-view"
                              >
                                نمایش لیست
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-tickets-details.html"
                                className="nav-link"
                                data-key="t-ticket-details"
                              >
                                جزئیات بلیط
                              </a>
                            </li>
                          </ul>
                        </div>
                      </li>
  
                      {/* NFT */}
                      <li className="nav-item">
                        <a
                          href="#sidebarnft"
                          className="nav-link"
                          data-bs-toggle="collapse"
                          role="button"
                          aria-expanded="false"
                          aria-controls="sidebarnft"
                          data-key="t-nft-marketplace"
                        >
                          بازار NFT
                        </a>
                        <div className="collapse menu-dropdown" id="sidebarnft">
                          <ul className="nav nav-sm flex-column">
                            <li className="nav-item">
                              <a
                                href="apps-nft-marketplace.html"
                                className="nav-link"
                                data-key="t-marketplace"
                              >
                                بازار
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-nft-explore.html"
                                className="nav-link"
                                data-key="t-explore-now"
                              >
                                اکنون کاوش کنید
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-nft-auction.html"
                                className="nav-link"
                                data-key="t-live-auction"
                              >
                                حراج زنده
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-nft-item-details.html"
                                className="nav-link"
                                data-key="t-item-details"
                              >
                                جزئیات مورد
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-nft-collections.html"
                                className="nav-link"
                                data-key="t-collections"
                              >
                                مجموعه ها
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-nft-creators.html"
                                className="nav-link"
                                data-key="t-creators"
                              >
                                سازندگان
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-nft-ranking.html"
                                className="nav-link"
                                data-key="t-ranking"
                              >
                                رتبه بندی
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-nft-wallet.html"
                                className="nav-link"
                                data-key="t-wallet-connect"
                              >
                                Wallet Connect
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-nft-create.html"
                                className="nav-link"
                                data-key="t-create-nft"
                              >
                                NFT ایجاد کنید
                              </a>
                            </li>
                          </ul>
                        </div>
                      </li>
  
                      {/* File manager */}
                      <li className="nav-item">
                        <a href="apps-file-manager.html" className="nav-link">
                          <span data-key="t-file-manager">مدیر فایل</span>
                        </a>
                      </li>
  
                      {/* Todo */}
                      <li className="nav-item">
                        <a href="apps-todo.html" className="nav-link">
                          <span data-key="t-to-do">برای انجام</span>
                        </a>
                      </li>
  
                      {/* Jobs */}
                      <li className="nav-item">
                        <a
                          href="#sidebarjobs"
                          className="nav-link"
                          data-bs-toggle="collapse"
                          role="button"
                          aria-expanded="false"
                          aria-controls="sidebarjobs"
                          data-key="t-jobs"
                        >
                          مشاغل
                        </a>
                        <div className="collapse menu-dropdown" id="sidebarjobs">
                          <ul className="nav nav-sm flex-column">
                            <li className="nav-item">
                              <a
                                href="apps-job-statistics.html"
                                className="nav-link"
                                data-key="t-statistics"
                              >
                                آمار
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="#sidebarJoblists"
                                className="nav-link"
                                data-bs-toggle="collapse"
                                role="button"
                                aria-expanded="false"
                                aria-controls="sidebarJoblists"
                                data-key="t-job-lists"
                              >
                                لیست های شغلی
                              </a>
                              <div
                                className="collapse menu-dropdown"
                                id="sidebarJoblists"
                              >
                                <ul className="nav nav-sm flex-column">
                                  <li className="nav-item">
                                    <a
                                      href="apps-job-lists.html"
                                      className="nav-link"
                                      data-key="t-list"
                                    >
                                      فهرست کنید
                                    </a>
                                  </li>
                                  <li className="nav-item">
                                    <a
                                      href="apps-job-grid-lists.html"
                                      className="nav-link"
                                      data-key="t-grid"
                                    >
                                      شبکه
                                    </a>
                                  </li>
                                  <li className="nav-item">
                                    <a
                                      href="apps-job-details.html"
                                      className="nav-link"
                                      data-key="t-overview"
                                    >
                                      نمای کلی
                                    </a>
                                  </li>
                                </ul>
                              </div>
                            </li>
                            <li className="nav-item">
                              <a
                                href="#sidebarCandidatelists"
                                className="nav-link"
                                data-bs-toggle="collapse"
                                role="button"
                                aria-expanded="false"
                                aria-controls="sidebarCandidatelists"
                                data-key="t-candidate-lists"
                              >
                                لیست های نامزدها
                              </a>
                              <div
                                className="collapse menu-dropdown"
                                id="sidebarCandidatelists"
                              >
                                <ul className="nav nav-sm flex-column">
                                  <li className="nav-item">
                                    <a
                                      href="apps-job-candidate-lists.html"
                                      className="nav-link"
                                      data-key="t-list-view"
                                    >
                                      نمایش لیست
                                    </a>
                                  </li>
                                  <li className="nav-item">
                                    <a
                                      href="apps-job-candidate-grid.html"
                                      className="nav-link"
                                      data-key="t-grid-view"
                                    >
                                      نمای شبکه
                                    </a>
                                  </li>
                                </ul>
                              </div>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-job-application.html"
                                className="nav-link"
                                data-key="t-application"
                              >
                                برنامه
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-job-new.html"
                                className="nav-link"
                                data-key="t-new-job"
                              >
                                شغل جدید
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-job-companies-lists.html"
                                className="nav-link"
                                data-key="t-companies-list"
                              >
                                فهرست شرکت ها
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="apps-job-categories.html"
                                className="nav-link"
                                data-key="t-job-categories"
                              >
                                دسته بندی های شغلی
                              </a>
                            </li>
                          </ul>
                        </div>
                      </li>
  
                      {/* API key */}
                      <li className="nav-item">
                        <a
                          href="apps-api-key.html"
                          className="nav-link"
                          data-key="t-api-key"
                        >
                          کلید API
                        </a>
                      </li>
                    </ul>
                  </div>
                </li>
  
                {/* Pages section title */}
                <li className="menu-title">
                  <i className="ri-more-fill" />{" "}
                  <span data-key="t-pages">صفحات</span>
                </li>
  
                {/* Auth pages */}
                <li className="nav-item">
                  <a
                    className="nav-link menu-link"
                    href="#sidebarAuth"
                    data-bs-toggle="collapse"
                    role="button"
                    aria-expanded="false"
                    aria-controls="sidebarAuth"
                  >
                    <i className="ri-account-circle-line" />{" "}
                    <span data-key="t-authentication">احراز هویت</span>
                  </a>
                  <div className="collapse menu-dropdown" id="sidebarAuth">
                    <ul className="nav nav-sm flex-column">
                      {/* Sign in */}
                      <li className="nav-item">
                        <a
                          href="#sidebarSignIn"
                          className="nav-link"
                          data-bs-toggle="collapse"
                          role="button"
                          aria-expanded="false"
                          aria-controls="sidebarSignIn"
                          data-key="t-signin"
                        >
                          وارد شوید
                        </a>
                        <div
                          className="collapse menu-dropdown"
                          id="sidebarSignIn"
                        >
                          <ul className="nav nav-sm flex-column">
                            <li className="nav-item">
                              <a
                                href="auth-signin-basic.html"
                                className="nav-link"
                                data-key="t-basic"
                              >
                                اساسی
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="auth-signin-cover.html"
                                className="nav-link"
                                data-key="t-cover"
                              >
                                پوشش
                              </a>
                            </li>
                          </ul>
                        </div>
                      </li>
  
                      {/* Sign up */}
                      <li className="nav-item">
                        <a
                          href="#sidebarSignUp"
                          className="nav-link"
                          data-bs-toggle="collapse"
                          role="button"
                          aria-expanded="false"
                          aria-controls="sidebarSignUp"
                          data-key="t-signup"
                        >
                          ثبت نام کنید
                        </a>
                        <div
                          className="collapse menu-dropdown"
                          id="sidebarSignUp"
                        >
                          <ul className="nav nav-sm flex-column">
                            <li className="nav-item">
                              <a
                                href="auth-signup-basic.html"
                                className="nav-link"
                                data-key="t-basic"
                              >
                                اساسی
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="auth-signup-cover.html"
                                className="nav-link"
                                data-key="t-cover"
                              >
                                پوشش
                              </a>
                            </li>
                          </ul>
                        </div>
                      </li>
  
                      {/* Reset password */}
                      <li className="nav-item">
                        <a
                          href="#sidebarResetPass"
                          className="nav-link"
                          data-bs-toggle="collapse"
                          role="button"
                          aria-expanded="false"
                          aria-controls="sidebarResetPass"
                          data-key="t-password-reset"
                        >
                          بازنشانی رمز عبور
                        </a>
                        <div
                          className="collapse menu-dropdown"
                          id="sidebarResetPass"
                        >
                          <ul className="nav nav-sm flex-column">
                            <li className="nav-item">
                              <a
                                href="auth-pass-reset-basic.html"
                                className="nav-link"
                                data-key="t-basic"
                              >
                                اساسی
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="auth-pass-reset-cover.html"
                                className="nav-link"
                                data-key="t-cover"
                              >
                                پوشش
                              </a>
                            </li>
                          </ul>
                        </div>
                      </li>
  
                      {/* Create password */}
                      <li className="nav-item">
                        <a
                          href="#sidebarchangePass"
                          className="nav-link"
                          data-bs-toggle="collapse"
                          role="button"
                          aria-expanded="false"
                          aria-controls="sidebarchangePass"
                          data-key="t-password-create"
                        >
                          ایجاد رمز عبور
                        </a>
                        <div
                          className="collapse menu-dropdown"
                          id="sidebarchangePass"
                        >
                          <ul className="nav nav-sm flex-column">
                            <li className="nav-item">
                              <a
                                href="auth-pass-change-basic.html"
                                className="nav-link"
                                data-key="t-basic"
                              >
                                اساسی
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="auth-pass-change-cover.html"
                                className="nav-link"
                                data-key="t-cover"
                              >
                                پوشش
                              </a>
                            </li>
                          </ul>
                        </div>
                      </li>
  
                      {/* Lock screen */}
                      <li className="nav-item">
                        <a
                          href="#sidebarLockScreen"
                          className="nav-link"
                          data-bs-toggle="collapse"
                          role="button"
                          aria-expanded="false"
                          aria-controls="sidebarLockScreen"
                          data-key="t-lock-screen"
                        >
                          صفحه قفل
                        </a>
                        <div
                          className="collapse menu-dropdown"
                          id="sidebarLockScreen"
                        >
                          <ul className="nav nav-sm flex-column">
                            <li className="nav-item">
                              <a
                                href="auth-lockscreen-basic.html"
                                className="nav-link"
                                data-key="t-basic"
                              >
                                اساسی
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="auth-lockscreen-cover.html"
                                className="nav-link"
                                data-key="t-cover"
                              >
                                پوشش
                              </a>
                            </li>
                          </ul>
                        </div>
                      </li>
  
                      {/* Logout */}
                      <li className="nav-item">
                        <a
                          href="#sidebarLogout"
                          className="nav-link"
                          data-bs-toggle="collapse"
                          role="button"
                          aria-expanded="false"
                          aria-controls="sidebarLogout"
                          data-key="t-logout"
                        >
                          خروج از سیستم
                        </a>
                        <div
                          className="collapse menu-dropdown"
                          id="sidebarLogout"
                        >
                          <ul className="nav nav-sm flex-column">
                            <li className="nav-item">
                              <a
                                href="auth-logout-basic.html"
                                className="nav-link"
                                data-key="t-basic"
                              >
                                اساسی
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="auth-logout-cover.html"
                                className="nav-link"
                                data-key="t-cover"
                              >
                                پوشش
                              </a>
                            </li>
                          </ul>
                        </div>
                      </li>
  
                      {/* Success message */}
                      <li className="nav-item">
                        <a
                          href="#sidebarSuccessMsg"
                          className="nav-link"
                          data-bs-toggle="collapse"
                          role="button"
                          aria-expanded="false"
                          aria-controls="sidebarSuccessMsg"
                          data-key="t-success-message"
                        >
                          پیام موفقیت
                        </a>
                        <div
                          className="collapse menu-dropdown"
                          id="sidebarSuccessMsg"
                        >
                          <ul className="nav nav-sm flex-column">
                            <li className="nav-item">
                              <a
                                href="auth-success-msg-basic.html"
                                className="nav-link"
                                data-key="t-basic"
                              >
                                اساسی
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="auth-success-msg-cover.html"
                                className="nav-link"
                                data-key="t-cover"
                              >
                                پوشش
                              </a>
                            </li>
                          </ul>
                        </div>
                      </li>
  
                      {/* Two-step */}
                      <li className="nav-item">
                        <a
                          href="#sidebarTwoStep"
                          className="nav-link"
                          data-bs-toggle="collapse"
                          role="button"
                          aria-expanded="false"
                          aria-controls="sidebarTwoStep"
                          data-key="t-two-step-verification"
                        >
                          تایید دو مرحله ای
                        </a>
                        <div
                          className="collapse menu-dropdown"
                          id="sidebarTwoStep"
                        >
                          <ul className="nav nav-sm flex-column">
                            <li className="nav-item">
                              <a
                                href="auth-twostep-basic.html"
                                className="nav-link"
                                data-key="t-basic"
                              >
                                اساسی
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="auth-twostep-cover.html"
                                className="nav-link"
                                data-key="t-cover"
                              >
                                پوشش
                              </a>
                            </li>
                          </ul>
                        </div>
                      </li>
  
                      {/* Errors */}
                      <li className="nav-item">
                        <a
                          href="#sidebarErrors"
                          className="nav-link"
                          data-bs-toggle="collapse"
                          role="button"
                          aria-expanded="false"
                          aria-controls="sidebarErrors"
                          data-key="t-errors"
                        >
                          خطاها
                        </a>
                        <div
                          className="collapse menu-dropdown"
                          id="sidebarErrors"
                        >
                          <ul className="nav nav-sm flex-column">
                            <li className="nav-item">
                              <a
                                href="auth-404-basic.html"
                                className="nav-link"
                                data-key="t-404-basic"
                              >
                                404 پایه
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="auth-404-cover.html"
                                className="nav-link"
                                data-key="t-404-cover"
                              >
                                404 جلد
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="auth-404-alt.html"
                                className="nav-link"
                                data-key="t-404-alt"
                              >
                                404 Alt
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="auth-500.html"
                                className="nav-link"
                                data-key="t-500"
                              >
                                500
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="auth-offline.html"
                                className="nav-link"
                                data-key="t-offline-page"
                              >
                                صفحه آفلاین
                              </a>
                            </li>
                          </ul>
                        </div>
                      </li>
                    </ul>
                  </div>
                </li>
  
                {/* Pages menu (second block) */}
                <li className="nav-item">
                  <a
                    className="nav-link menu-link"
                    href="#sidebarPages"
                    data-bs-toggle="collapse"
                    role="button"
                    aria-expanded="false"
                    aria-controls="sidebarPages"
                  >
                    <i className="ri-pages-line" />{" "}
                    <span data-key="t-pages">صفحات</span>
                  </a>
                  <div className="collapse menu-dropdown" id="sidebarPages">
                    <ul className="nav nav-sm flex-column">
                      <li className="nav-item">
                        <a
                          href="pages-starter.html"
                          className="nav-link"
                          data-key="t-starter"
                        >
                          استارتر
                        </a>
                      </li>
                      <li className="nav-item">
                        <a
                          href="#sidebarProfile"
                          className="nav-link"
                          data-bs-toggle="collapse"
                          role="button"
                          aria-expanded="false"
                          aria-controls="sidebarProfile"
                          data-key="t-profile"
                        >
                          نمایه
                        </a>
                        <div
                          className="collapse menu-dropdown"
                          id="sidebarProfile"
                        >
                          <ul className="nav nav-sm flex-column">
                            <li className="nav-item">
                              <a
                                href="pages-profile.html"
                                className="nav-link"
                                data-key="t-simple-page"
                              >
                                صفحه ساده
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="pages-profile-settings.html"
                                className="nav-link"
                                data-key="t-settings"
                              >
                                تنظیمات
                              </a>
                            </li>
                          </ul>
                        </div>
                      </li>
  
                      <li className="nav-item">
                        <a
                          href="pages-team.html"
                          className="nav-link"
                          data-key="t-team"
                        >
                          تیم
                        </a>
                      </li>
                      <li className="nav-item">
                        <a
                          href="pages-timeline.html"
                          className="nav-link"
                          data-key="t-timeline"
                        >
                          جدول زمانی
                        </a>
                      </li>
                      <li className="nav-item">
                        <a
                          href="pages-faqs.html"
                          className="nav-link"
                          data-key="t-faqs"
                        >
                          سوالات متداول
                        </a>
                      </li>
                      <li className="nav-item">
                        <a
                          href="pages-pricing.html"
                          className="nav-link"
                          data-key="t-pricing"
                        >
                          قیمت گذاری
                        </a>
                      </li>
                      <li className="nav-item">
                        <a
                          href="pages-gallery.html"
                          className="nav-link"
                          data-key="t-gallery"
                        >
                          گالری
                        </a>
                      </li>
                      <li className="nav-item">
                        <a
                          href="pages-maintenance.html"
                          className="nav-link"
                          data-key="t-maintenance"
                        >
                          تعمیر و نگهداری
                        </a>
                      </li>
                      <li className="nav-item">
                        <a
                          href="pages-coming-soon.html"
                          className="nav-link"
                          data-key="t-coming-soon"
                        >
                          به زودی
                        </a>
                      </li>
                      <li className="nav-item">
                        <a
                          href="pages-sitemap.html"
                          className="nav-link"
                          data-key="t-sitemap"
                        >
                          نقشه سایت
                        </a>
                      </li>
                      <li className="nav-item">
                        <a
                          href="pages-search-results.html"
                          className="nav-link"
                          data-key="t-search-results"
                        >
                          نتایج جستجو
                        </a>
                      </li>
                      <li className="nav-item">
                        <a
                          href="pages-privacy-policy.html"
                          className="nav-link"
                          data-key="t-privacy-policy"
                        >
                          سیاست حفظ حریم خصوصی
                        </a>
                      </li>
                      <li className="nav-item">
                        <a
                          href="pages-term-conditions.html"
                          className="nav-link"
                          data-key="t-term-conditions"
                        >
                          مدت و شرایط
                        </a>
                      </li>
  
                      {/* Blog pages */}
                      <li className="nav-item">
                        <a
                          href="#sidebarBlogs"
                          className="nav-link"
                          data-bs-toggle="collapse"
                          role="button"
                          aria-expanded="false"
                          aria-controls="sidebarBlogs"
                        >
                          <span data-key="t-blogs">وبلاگ ها</span>{" "}
                          <span
                            className="badge badge-pill bg-success"
                            data-key="t-new"
                          >
                            جدید
                          </span>
                        </a>
                        <div
                          className="collapse menu-dropdown"
                          id="sidebarBlogs"
                        >
                          <ul className="nav nav-sm flex-column">
                            <li className="nav-item">
                              <a
                                href="pages-blog-list.html"
                                className="nav-link"
                                data-key="t-list-view"
                              >
                                نمایش لیست
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="pages-blog-grid.html"
                                className="nav-link"
                                data-key="t-grid-view"
                              >
                                نمای شبکه
                              </a>
                            </li>
                            <li className="nav-item">
                              <a
                                href="pages-blog-overview.html"
                                className="nav-link"
                                data-key="t-overview"
                              >
                                نمای کلی
                              </a>
                            </li>
                          </ul>
                        </div>
                      </li>
                    </ul>
                  </div>
                </li>
              </ul>
            </div>
            {/* Sidebar */}
          </div>
  
          <div className="sidebar-background" />
        </div>
        {/* Left Sidebar End */}
  
        {/* Vertical Overlay */}
        <div className="vertical-overlay" />
      </>
    )
  }
  