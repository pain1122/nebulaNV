export default function logout() {
  return (
    <div className="col-lg-6">
      <div className="p-lg-5 p-4 text-center">
        <lord-icon src="https://cdn.lordicon.com/hzomhqxz.json" trigger="loop" colors="primary:#405189,secondary:#08a88a" style="width:180px;height:180px"></lord-icon>

        <div className="mt-4 pt-2">
          <h5>شما از سیستم خارج شده اید</h5>
          <p className="text-muted">
            با تشکر از شما برای استفاده<span className="fw-semibold"> ولزون </span>قالب مدیریت
          </p>
          <div className="mt-4">
            <a href="auth-signin-basic.html" className="btn btn-info w-100">
              وارد شوید
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
