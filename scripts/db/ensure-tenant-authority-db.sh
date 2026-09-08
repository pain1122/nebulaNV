#!/usr/bin/env bash
set -euo pipefail

if [ -z "${POSTGRES_USER:-}" ] || [ -z "${PGPASSWORD:-}" ]; then
  echo "authority database provisioning requires the migration administrator" >&2
  exit 1
fi

if [ -z "${AUTHORITY_DB_RUNTIME_PASSWORD:-}" ]; then
  echo "AUTHORITY_DB_RUNTIME_PASSWORD is required" >&2
  exit 1
fi

if ! [[ "$AUTHORITY_DB_RUNTIME_PASSWORD" =~ ^[A-Za-z0-9_-]{32,128}$ ]]; then
  echo "AUTHORITY_DB_RUNTIME_PASSWORD must be a 32-128 character URL-safe random value" >&2
  exit 1
fi

psql \
  --host postgres \
  --username "$POSTGRES_USER" \
  --dbname postgres \
  --set=ON_ERROR_STOP=1 \
  --set=authority_runtime_password="$AUTHORITY_DB_RUNTIME_PASSWORD" <<'EOSQL'
SELECT 'CREATE DATABASE nebula_authority'
WHERE NOT EXISTS (
  SELECT 1 FROM pg_database WHERE datname = 'nebula_authority'
) \gexec

SELECT format(
  'CREATE ROLE nebula_authority_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD %L',
  :'authority_runtime_password'
)
WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles WHERE rolname = 'nebula_authority_runtime'
) \gexec

SELECT format(
  'ALTER ROLE nebula_authority_runtime WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD %L',
  :'authority_runtime_password'
) \gexec

REVOKE ALL ON DATABASE nebula_authority FROM PUBLIC;
GRANT CONNECT ON DATABASE nebula_authority TO nebula_authority_runtime;

\connect nebula_authority

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO nebula_authority_runtime;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public
  TO nebula_authority_runtime;
REVOKE DELETE ON ALL TABLES IN SCHEMA public
  FROM nebula_authority_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public
  TO nebula_authority_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE ON TABLES
  TO nebula_authority_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE DELETE ON TABLES
  FROM nebula_authority_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES
  TO nebula_authority_runtime;

DO $block$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    EXECUTE 'REVOKE INSERT, UPDATE, DELETE ON TABLE public._prisma_migrations FROM nebula_authority_runtime';
    EXECUTE 'GRANT SELECT ON TABLE public._prisma_migrations TO nebula_authority_runtime';
  END IF;
END
$block$;
EOSQL
