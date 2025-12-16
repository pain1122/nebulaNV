export default function success() {
  return (
    <div className="col-lg-6">
      <div className="p-lg-5 p-4 text-center">
        <div className="avatar-lg mx-auto mt-2">
          <div className="avatar-title bg-light text-success display-3 rounded-circle">
            <i className="ri-checkbox-circle-fill"></i>
          </div>
        </div>
        <div className="mt-4 pt-2">
          <h4>آفرین !</h4>
          <p className="text-muted mx-4">اوه بله، شما با موفقیت این پیام مهم را خواندید.</p>
          <div className="mt-4">
            <a href="auth-signin-basic.html" className="btn btn-info w-100">
              بازگشت به داشبورد
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
