-- Establish a dedicated schema boundary before authority records exist.
-- Runtime table privileges are granted by deployment provisioning, not by
-- embedding a credential or environment-specific role secret in migrations.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

COMMENT ON SCHEMA public IS
  'Nebula tenant-authority-service owned schema; cross-service database access is forbidden';
