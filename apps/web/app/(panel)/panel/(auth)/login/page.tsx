export default function Login() {
  return (
      <div className="col-lg-6">
        <div className="p-lg-5 p-4">
          <div>
            <h5 className="text-primary">برگشت خوش آمدید!</h5>
            <p className="text-muted">برای ادامه به Velzon وارد شوید.</p>
          </div>

          <div className="mt-4">
            <form action="index.html">
              <div className="mb-3">
                <label htmlFor="username" className="form-label">
                  نام کاربری
                </label>
                <input type="text" className="form-control" id="username" placeholder="نام کاربری را وارد کنید" required />
              </div>

              <div className="mb-3">
                <div className="float-end">
                  <a href="auth-pass-reset-cover.html" className="text-muted">
                    رمز عبور را فراموش کرده اید؟
                  </a>
                </div>
                <label className="form-label" htmlFor="password-input">
                  رمز عبور
                </label>
                <div className="position-relative auth-pass-inputgroup mb-3">
                  <input type="password" className="form-control pe-5 password-input" placeholder="رمز عبور را وارد کنید" id="password-input" />
                  <button className="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted password-addon" type="button" id="password-addon">
                    <i className="ri-eye-fill align-middle"></i>
                  </button>
                </div>
              </div>

              <div className="form-check">
                <input className="form-check-input" type="checkbox" value="" id="auth-remember-check" />
                <label className="form-check-label" htmlFor="auth-remember-check">
                  مرا به خاطر بسپار
                </label>
              </div>

              <div className="mt-4">
                <button className="btn btn-info w-100" type="submit">
                  وارد شوید
                </button>
              </div>

              <div className="mt-4 text-center">
                <div className="signin-other-title">
                  <h5 className="fs-13 mb-4 title">وارد شوید با</h5>
                </div>

                <div>
                  <button type="button" className="btn btn-primary btn-icon waves-effect waves-light">
                    <i className="ri-facebook-fill fs-16"></i>
                  </button>
                  <button type="button" className="btn btn-danger btn-icon waves-effect waves-light">
                    <i className="ri-google-fill fs-16"></i>
                  </button>
                  <button type="button" className="btn btn-dark btn-icon waves-effect waves-light">
                    <i className="ri-github-fill fs-16"></i>
                  </button>
                  <button type="button" className="btn btn-info btn-icon waves-effect waves-light">
                    <i className="ri-twitter-fill fs-16"></i>
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="mt-5 text-center">
            <p className="mb-0">
              حساب کاربری ندارید؟
              <a href="auth-signup-cover.html" className="fw-semibold text-primary text-decoration-underline">
                ثبت نام کنید
              </a>{" "}
            </p>
          </div>
        </div>
      </div>
  )
}
