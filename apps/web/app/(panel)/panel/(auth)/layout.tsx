import type {Metadata} from "next"
import Image from "next/image"

const YEAR = new Date().getFullYear()

export const metadata: Metadata = {
  title: "طرح بندی معلق عمودی | NebulaNV - قالب مدیریت و داشبورد",
  description: "Premium Multipurpose Admin & Dashboard Template",
  authors: [{name: "Salar"}],
  icons: {
    icon: "/assets/images/favicon.ico",
  },
}

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return (
    <div className="auth-page-wrapper auth-bg-cover py-5 d-flex justify-content-center align-items-center min-vh-100">
      <div className="bg-overlay"></div>
      {/* auth-page content */}
      <div className="auth-page-content overflow-hidden pt-lg-5">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="card overflow-hidden">
                <div className="row g-0">
                  <div className="col-lg-6">
                    <div className="p-lg-5 p-4 auth-one-bg h-100">
                      <div className="bg-overlay"></div>
                      <div className="position-relative h-100 d-flex flex-column">
                        <div className="mb-4">
                          <a href="index.html" className="d-block">
                            <Image src="/assets/images/logo-light.png" alt="" width={187} height={32} />
                          </a>
                        </div>
                        <div className="mt-auto">
                          <div className="mb-3">
                            <i className="ri-double-quotes-l display-4 text-success"></i>
                          </div>

                          <div id="qoutescarouselIndicators" className="carousel slide" data-bs-ride="carousel">
                            <div className="carousel-indicators">
                              <button type="button" data-bs-target="#qoutescarouselIndicators" data-bs-slide-to="0" className="active" aria-current="true" aria-label="Slide 1"></button>
                              <button type="button" data-bs-target="#qoutescarouselIndicators" data-bs-slide-to="1" aria-label="Slide 2"></button>
                              <button type="button" data-bs-target="#qoutescarouselIndicators" data-bs-slide-to="2" aria-label="Slide 3"></button>
                            </div>
                            <div className="carousel-inner text-center text-white-50 pb-5">
                              <div className="carousel-item active">
                                <p className="fs-15 fst-italic">"عالی! کد تمیز، طراحی تمیز، سفارشی سازی آسان. بسیار متشکرم!"</p>
                              </div>
                              <div className="carousel-item">
                                <p className="fs-15 fst-italic">"موضوع با پشتیبانی شگفت انگیز مشتری واقعا عالی است."</p>
                              </div>
                              <div className="carousel-item">
                                <p className="fs-15 fst-italic">"عالی! کد تمیز، طراحی تمیز، سفارشی سازی آسان. بسیار متشکرم!"</p>
                              </div>
                            </div>
                          </div>
                          {/* end carousel */}
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* end col */}
                  {children}
                </div>
                {/* end row  */}
              </div>
              {/* end card  */}
            </div>
            {/* end col */}
          </div>
          {/* end row */}
        </div>
        {/* end container */}
      </div>
      {/* end auth page content  */}

      {/* footer */}
      <footer className="footer">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="text-center">
                <p className="mb-0 text-center">
                  {YEAR} © NebulaNV. نبیولا ساخته شده با <i className="mdi mdi-heart text-danger"></i> توسط سالار
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
      {/* end Footer */}
    </div>
  )
}
