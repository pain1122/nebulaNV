import type {Metadata} from "next"
import Header from "./Header"
import Navbar from "./Navbar"

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
    <div id="layout-wrapper">
      <Header />
      <Navbar />

      <div className="main-content">
        <div className="page-content">
          <div className="container-fluid">
            {/* Title */}
            <div className="row">
              <div className="col-12">
                <div className="page-title-box d-sm-flex align-items-center justify-content-between">
                  <h4 className="mb-sm-0">عمودی شناور شد</h4>
                  <div className="page-title-right">
                    <ol className="breadcrumb m-0">
                      <li className="breadcrumb-item">
                        <a href="#">طرح بندی ها</a>
                      </li>
                      <li className="breadcrumb-item active">عمودی شناور شد</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            {children}
          </div>
        </div>

        <footer className="footer">
          <div className="container-fluid">
            <div className="row">
              <div className="col-sm-6">{YEAR} © NebulaNV.</div>
              <div className="col-sm-6">
                <div className="text-sm-end d-none d-sm-block">طراحی و توسعه توسط سالار</div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
