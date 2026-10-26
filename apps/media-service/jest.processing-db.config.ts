import unitConfig from "./jest.unit.config";

process.env.MEDIA_PROCESSING_DB_PROOF = "1";
export default {
  ...unitConfig,
  testMatch: [
    "**/media-processing.database.spec.ts",
    "**/media-derivatives.database.spec.ts",
  ],
};
