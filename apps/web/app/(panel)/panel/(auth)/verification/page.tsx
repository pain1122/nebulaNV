import Script from "next/script"
import VerificationForm from "./verification-form"
export default function Verification() {
  return (
    <>
      <Script src="/assets/js/pages/two-step-verification.init.js" strategy="afterInteractive" />

      <div className="col-lg-6">
        <div className="p-lg-5 p-4">
          <div className="mb-4">
            <div className="avatar-lg mx-auto">
              <div className="avatar-title bg-light text-primary display-5 rounded-circle">
                <i className="ri-mail-line" />
              </div>
            </div>
          </div>

          <div className="text-muted text-center mx-lg-3">
            <h4>ایمیل خود را تأیید کنید</h4>
            <p>
              لطفا کد 4 رقمی ارسال شده به <span className="fw-semibold">example@abc.com</span>
            </p>
          </div>

          <div className="mt-4">
            <form autoComplete="off">
              <VerificationForm />

              <div className="mt-3">
                <button type="submit" className="btn btn-info w-100">
                  تایید کنید
                </button>
              </div>
            </form>
          </div>

          <div className="mt-5 text-center">
            <p className="mb-0">
              کدی دریافت نکردید؟
              <a href="auth-pass-reset-cover.html" className="fw-semibold text-primary text-decoration-underline">
                ارسال مجدد
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
