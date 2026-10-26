import path from "node:path";
import { createHash } from "node:crypto";
import { processingPolicy } from "./processing-policy";

export const SERVER_IMAGE_FONT = Object.freeze({
  family: "Vazirmatn",
  file: path.resolve(__dirname, "../../assets/fonts/Vazirmatn-Regular.ttf"),
  sha256: "b69fd4c680b8f3f225feabcc655a2c585d97627b8f5f5c0f9985e894069f3a56",
});
export const DERIVATIVE_LEASE_MS = 1_200_000;
export const derivativeRequestHash = (facts: unknown) =>
  createHash("sha256").update(JSON.stringify(facts)).digest("hex");
export const derivativesEnabled = () =>
  processingPolicy().enabled &&
  process.env.MEDIA_DERIVATIVES_ENABLED !== "false" &&
  process.env.MEDIA_STORAGE_DRIVER !== "local";
