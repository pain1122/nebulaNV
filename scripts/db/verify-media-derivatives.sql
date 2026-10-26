BEGIN;
CREATE FUNCTION pg_temp.expect_derivative_constraint(command TEXT, expected TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE actual TEXT;
BEGIN
  BEGIN
    EXECUTE command;
  EXCEPTION WHEN check_violation OR foreign_key_violation OR unique_violation THEN
    GET STACKED DIAGNOSTICS actual = CONSTRAINT_NAME;
    IF actual <> expected THEN RAISE EXCEPTION 'unexpected_derivative_constraint: % wanted %', actual, expected; END IF;
    RETURN;
  END;
  RAISE EXCEPTION 'missing_derivative_constraint: %', expected;
END $$;
INSERT INTO "Media" ("id", "storage", "path", "filename", "mimeType", "sizeBytes", "updatedAt")
VALUES ('f7000000-0000-4000-8000-000000000001', 's3', 'uploads/derivative-contract.png', 'contract.png', 'image/png', 100, CURRENT_TIMESTAMP),
('f7000000-0000-4000-8000-000000000002', 's3', 'uploads/derivative-contract2.png', 'contract2.png', 'image/png', 100, CURRENT_TIMESTAMP);
INSERT INTO "MediaDerivativeGeneration" ("id", "mediaId", "requestHash", "sourceSha256", "recipes", "watermarks", "updatedAt")
VALUES ('f7000000-0000-4000-8000-000000000003', 'f7000000-0000-4000-8000-000000000001', repeat('a',64), repeat('b',64), '[{}]', '[]', CURRENT_TIMESTAMP);
SELECT pg_temp.expect_derivative_constraint(
  'UPDATE "MediaDerivativeGeneration" SET "leaseToken"=''f7000000-0000-4000-8000-000000000004''', 'derivative_generation_lease');
SELECT pg_temp.expect_derivative_constraint(
  'UPDATE "MediaDerivativeGeneration" SET "status"=''PROCESSING''', 'derivative_generation_lease');
SELECT pg_temp.expect_derivative_constraint(
  'UPDATE "MediaDerivativeGeneration" SET "maxAttempts"=6', 'derivative_generation_attempts');
SELECT pg_temp.expect_derivative_constraint(
  'UPDATE "MediaDerivativeGeneration" SET "recipes"=''[{}, {}, {}, {}, {}]''', 'derivative_generation_recipes');
SELECT pg_temp.expect_derivative_constraint(
  'UPDATE "MediaDerivativeGeneration" SET "sourceSha256"=repeat(''A'',64)', 'derivative_generation_hashes');
SELECT pg_temp.expect_derivative_constraint(
  'INSERT INTO "MediaDerivativeState" ("mediaId", "desiredGenerationId", "updatedAt") VALUES
  (''f7000000-0000-4000-8000-000000000002'', ''f7000000-0000-4000-8000-000000000003'', CURRENT_TIMESTAMP)',
  'MediaDerivativeState_desiredGenerationId_mediaId_fkey');
INSERT INTO "MediaDerivative" ("id", "mediaId", "generationId", "view", "recipe", "recipeHash", "processorVersion",
  "sourceSha256", "bucket", "path", "sha256", "mimeType", "width", "height", "sizeBytes")
VALUES ('f7000000-0000-4000-8000-000000000005', 'f7000000-0000-4000-8000-000000000001',
  'f7000000-0000-4000-8000-000000000003', 'card', '{}', repeat('a',64), 'fixture',
  repeat('b',64), 'media', 'private/derivative-contract.png', repeat('c',64), 'image/png', 8, 8, 100);
SELECT pg_temp.expect_derivative_constraint(
  'UPDATE "MediaDerivative" SET "width"=4097', 'derivative_saved_geometry');
SELECT pg_temp.expect_derivative_constraint(
  'UPDATE "MediaDerivative" SET "view"=''original''', 'derivative_saved_type');
SELECT pg_temp.expect_derivative_constraint(
  'UPDATE "MediaDerivative" SET "watermarkSha256"=repeat(''a'',64)', 'derivative_watermark_facts');
ROLLBACK;
