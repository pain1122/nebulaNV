"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setTokens } from "@/lib/auth/tokens"

export default function Login() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false); // UI only for now

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier, password, remember }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || `Login failed (${res.status})`);
      }

      setTokens(json.accessToken)

      router.replace("/panel/products/list-products");
    } catch (err: any) {
      setError(err?.message || "خطای ورود");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="col-lg-6">
      <div className="p-lg-5 p-4">
        <div>
          <h5 className="text-primary">برگشت خوش آمدید!</h5>
          <p className="text-muted">برای ادامه وارد شوید.</p>
        </div>

        <div className="mt-4">
          {error ? <div className="alert alert-danger">{error}</div> : null}

          <form onSubmit={onSubmit}>
            <div className="mb-3">
              <label htmlFor="username" className="form-label">
                ایمیل / نام کاربری
              </label>
              <input
                type="text"
                className="form-control"
                id="username"
                placeholder="ایمیل یا شماره را وارد کنید"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>

            <div className="mb-3">
              <label className="form-label" htmlFor="password-input">
                رمز عبور
              </label>
              <div className="position-relative auth-pass-inputgroup mb-3">
                <input
                  type="password"
                  className="form-control pe-5 password-input"
                  placeholder="رمز عبور را وارد کنید"
                  id="password-input"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="auth-remember-check"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="auth-remember-check">
                مرا به خاطر بسپار
              </label>
            </div>

            <div className="mt-4">
              <button className="btn btn-info w-100" type="submit" disabled={loading}>
                {loading ? "در حال ورود..." : "وارد شوید"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
