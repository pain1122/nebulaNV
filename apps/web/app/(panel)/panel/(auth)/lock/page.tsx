import Image from "next/image"

export default function lock(){
    return(
        <div className="col-lg-6">
            <div className="p-lg-5 p-4">
                <div>
                    <h5 className="text-primary">صفحه قفل</h5>
                    <p className="text-muted">رمز عبور خود را وارد کنید تا قفل صفحه باز شود!</p>
                </div>
                <div className="user-thumb text-center">
                    <Image src="/assets/images/users/avatar-1.jpg" className="rounded-circle img-thumbnail avatar-lg" alt="تصویر کوچک" width={96} height={96} />
                    <h5 className="fs-17 mt-3">آنا آدام</h5>
                </div>

                <div className="mt-4">
                    <form>
                        <div className="mb-3">
                            <label className="form-label" htmlFor="userpassword">رمز عبور</label>
                            <input type="password" className="form-control" id="userpassword" placeholder="رمز عبور را وارد کنید" required />
                        </div>
                        <div className="mb-2 mt-4">
                            <button className="btn btn-info w-100" type="submit">باز کردن قفل</button>
                        </div>
                    </form>
                    {/* end form */}
                </div>

                <div className="mt-5 text-center">
                    <p className="mb-0">نه تو؟ بازگشت<a href="auth-signin-cover.html" className="fw-semibold text-primary text-decoration-underline">وارد شوید</a></p>
                </div>
            </div>
        </div>
    )
}