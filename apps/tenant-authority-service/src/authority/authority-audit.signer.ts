import { Injectable } from "@nestjs/common";
import { createHmac } from "node:crypto";

export type CanonicalJson =
  | null
  | boolean
  | number
  | string
  | readonly CanonicalJson[]
  | { readonly [key: string]: CanonicalJson };

function canonicalJson(value: CanonicalJson): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${canonicalJson(
          (value as Record<string, CanonicalJson>)[key] ?? null,
        )}`,
    )
    .join(",")}}`;
}

@Injectable()
export class AuthorityAuditSigner {
  readonly keyId: string;
  private readonly secret: string;

  constructor() {
    this.keyId = process.env.AUTHORITY_AUDIT_HMAC_KEY_ID?.trim() ?? "";
    this.secret = process.env.AUTHORITY_AUDIT_HMAC_KEY ?? "";
    if (!/^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,127}$/.test(this.keyId)) {
      throw new Error("authority_audit_hmac_key_id_invalid");
    }
    if (Buffer.byteLength(this.secret, "utf8") < 32) {
      throw new Error("authority_audit_hmac_key_too_short");
    }
  }

  sign(event: CanonicalJson): string {
    return createHmac("sha256", this.secret)
      .update(canonicalJson(event), "utf8")
      .digest("hex");
  }
}
