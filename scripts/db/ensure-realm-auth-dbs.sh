#!/usr/bin/env bash
set -euo pipefail

if [ -z "${POSTGRES_USER:-}" ] || [ -z "${PGPASSWORD:-}" ]; then
  echo "realm Auth database provisioning requires the migration administrator" >&2
  exit 1
fi

for variable in REALM_AUTH_DEFAULT_DB_RUNTIME_PASSWORD REALM_AUTH_OPERATOR_DB_RUNTIME_PASSWORD; do
  value="${!variable:-}"
  if ! [[ "$value" =~ ^[A-Za-z0-9_-]{32,128}$ ]]; then
    echo "$variable must be a 32-128 character URL-safe random value" >&2
    exit 1
  fi
done

psql \
  --host postgres \
  --username "$POSTGRES_USER" \
  --dbname postgres \
  --set=ON_ERROR_STOP=1 \
  --set=default_password="$REALM_AUTH_DEFAULT_DB_RUNTIME_PASSWORD" \
  --set=operator_password="$REALM_AUTH_OPERATOR_DB_RUNTIME_PASSWORD" <<'EOSQL'
SELECT 'CREATE DATABASE nebula_realm_auth_default'
WHERE NOT EXISTS (
  SELECT 1 FROM pg_database WHERE datname = 'nebula_realm_auth_default'
) \gexec

SELECT 'CREATE DATABASE nebula_realm_auth_operator'
WHERE NOT EXISTS (
  SELECT 1 FROM pg_database WHERE datname = 'nebula_realm_auth_operator'
) \gexec

SELECT format(
  'CREATE ROLE nebula_realm_auth_default_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD %L',
  :'default_password'
)
WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles WHERE rolname = 'nebula_realm_auth_default_runtime'
) \gexec

SELECT format(
  'ALTER ROLE nebula_realm_auth_default_runtime WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD %L',
  :'default_password'
) \gexec

SELECT format(
  'CREATE ROLE nebula_realm_auth_operator_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD %L',
  :'operator_password'
)
WHERE NOT EXISTS (
  SELECT 1 FROM pg_roles WHERE rolname = 'nebula_realm_auth_operator_runtime'
) \gexec

SELECT format(
  'ALTER ROLE nebula_realm_auth_operator_runtime WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD %L',
  :'operator_password'
) \gexec

REVOKE ALL ON DATABASE nebula_realm_auth_default FROM PUBLIC;
REVOKE ALL ON DATABASE nebula_realm_auth_operator FROM PUBLIC;
GRANT CONNECT ON DATABASE nebula_realm_auth_default TO nebula_realm_auth_default_runtime;
GRANT CONNECT ON DATABASE nebula_realm_auth_operator TO nebula_realm_auth_operator_runtime;
EOSQL

provision_schema() {
  local database="$1"
  local runtime_role="$2"
  psql \
    --host postgres \
    --username "$POSTGRES_USER" \
    --dbname "$database" \
    --set=ON_ERROR_STOP=1 \
    --set=runtime_role="$runtime_role" <<'EOSQL'
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'runtime_role') \gexec
SELECT format(
  'GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO %I',
  :'runtime_role'
) \gexec
SELECT format(
  'REVOKE DELETE ON ALL TABLES IN SCHEMA public FROM %I',
  :'runtime_role'
) \gexec
SELECT format(
  'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I',
  :'runtime_role'
) \gexec
SELECT format(
  'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE ON TABLES TO %I',
  :'runtime_role'
) \gexec
SELECT format(
  'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE DELETE ON TABLES FROM %I',
  :'runtime_role'
) \gexec
SELECT format(
  'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I',
  :'runtime_role'
) \gexec

SELECT format(
  'REVOKE INSERT, UPDATE, DELETE ON TABLE public._prisma_migrations FROM %I',
  :'runtime_role'
)
WHERE to_regclass('public._prisma_migrations') IS NOT NULL \gexec
SELECT format(
  'GRANT SELECT ON TABLE public._prisma_migrations TO %I',
  :'runtime_role'
)
WHERE to_regclass('public._prisma_migrations') IS NOT NULL \gexec
EOSQL
}

provision_schema nebula_realm_auth_default nebula_realm_auth_default_runtime
provision_schema nebula_realm_auth_operator nebula_realm_auth_operator_runtime
