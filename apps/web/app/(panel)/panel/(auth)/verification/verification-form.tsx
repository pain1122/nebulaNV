"use client"

declare global {
  interface Window {
    moveToNext?: (index: number, ev: KeyboardEvent) => void
  }
}

export default function VerificationForm() {
  return (
    <div className="row">
      <div className="col-3">
        <div className="mb-3">
          <label htmlFor="digit4-input" className="visually-hidden">
            رقم 4
          </label>
          <input type="text" className="form-control form-control-lg bg-light border-light text-center" maxLength={1} id="digit4-input" onKeyUp={(e) => window.moveToNext?.(4, e.nativeEvent)} required />
        </div>
      </div>

      <div className="col-3">
        <div className="mb-3">
          <label htmlFor="digit3-input" className="visually-hidden">
            رقم 3
          </label>
          <input type="text" className="form-control form-control-lg bg-light border-light text-center" maxLength={1} id="digit3-input" onKeyUp={(e) => window.moveToNext?.(3, e.nativeEvent)} required />
        </div>
      </div>

      <div className="col-3">
        <div className="mb-3">
          <label htmlFor="digit2-input" className="visually-hidden">
            رقم 2
          </label>
          <input type="text" className="form-control form-control-lg bg-light border-light text-center" maxLength={1} id="digit2-input" onKeyUp={(e) => window.moveToNext?.(2, e.nativeEvent)} required />
        </div>
      </div>

      <div className="col-3">
        <div className="mb-3">
          <label htmlFor="digit1-input" className="visually-hidden">
            رقم 1
          </label>
          <input type="text" className="form-control form-control-lg bg-light border-light text-center" maxLength={1} id="digit1-input" onKeyUp={(e) => window.moveToNext?.(1, e.nativeEvent)} required  />
        </div>
      </div>
    </div>
  )
}
