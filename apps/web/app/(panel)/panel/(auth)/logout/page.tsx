"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { logoutSession } from "@/lib/auth/logout";

export default function Logout() {
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    void logoutSession().finally(() => setComplete(true));
  }, []);

  return (
    <div className="col-lg-6">
      <div className="p-lg-5 p-4 text-center">
        <lord-icon
          src="https://cdn.lordicon.com/hzomhqxz.json"
          trigger="loop"
          colors="primary:#405189,secondary:#08a88a"
          style={{ width: "180px", height: "180px" }}
        />
        <div className="mt-4 pt-2">
          <h5>{complete ? "از سیستم خارج شدید" : "در حال خروج..."}</h5>
          <p className="text-muted">
            اطلاعات ورود محلی پاک می‌شود، حتی اگر نشست سرور قبلاً منقضی شده باشد.
          </p>
          <div className="mt-4">
            <Link href="/panel/login" className="btn btn-info w-100">
              ورود دوباره
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
