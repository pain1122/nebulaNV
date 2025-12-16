import type {Metadata} from "next"
import Script from "next/script"
import "./globals.css"
import PanelClientShell from "./PanelClientShell" // 👈 we’ll create this

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
    <html
      lang="fa"
      dir="rtl"
      // let client own these, don’t fight it
      data-theme="interactive"
      data-layout="vertical"
      data-layout-style="default"
      data-layout-position="fixed"
      data-topbar="light"
      data-sidebar="dark"
      data-sidebar-size="sm-hover"
      data-layout-width="fluid"
      suppressHydrationWarning // 👈 important
    >
      <head>
        <link rel="stylesheet" href="/assets/libs/swiper/swiper-bundle.min.css" />
        <link rel="stylesheet" href="/assets/css/bootstrap-rtl.min.css" />
        <link rel="stylesheet" href="/assets/css/icons.min.css" />
        <link rel="stylesheet" href="/assets/css/app-rtl.min.css" />
        <link rel="stylesheet" href="/assets/css/custom-rtl.min.css" />
      </head>
      <body>
        {/* Client shell will handle DOM-side behavior */}
        <PanelClientShell>
          {children}

          {/* back-to-top */}
          <button className="btn btn-danger btn-icon" id="back-to-top" type="button">
            <i className="ri-arrow-up-line" />
          </button>

          {/* preloader */}
          <div id="preloader">
            <div id="status">
              <div className="spinner-border text-primary avatar-sm" role="status">
                <span className="visually-hidden">در حال بارگذاری...</span>
              </div>
            </div>
          </div>
        </PanelClientShell>

        {/* JS libs (NO layout.js / app.js) */}
        <Script src="/assets/libs/bootstrap/js/bootstrap.bundle.min.js" strategy="afterInteractive" />
        <Script src="/assets/libs/simplebar/simplebar.min.js" strategy="afterInteractive" />
        <Script src="/assets/libs/node-waves/waves.min.js" strategy="afterInteractive" />
        <Script src="/assets/libs/feather-icons/feather.min.js" strategy="afterInteractive" />
        <Script src="/assets/js/pages/plugins/lord-icon-2.1.0.js" strategy="afterInteractive" />
        <Script src="/assets/libs/apexcharts/apexcharts.min.js" strategy="afterInteractive" />
        <Script src="/assets/libs/swiper/swiper-bundle.min.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}
