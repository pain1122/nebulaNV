#!/usr/bin/env bash
set -e

# Wait for Postgres to accept connections (the entrypoint already does, but we’re cautious)
# This script runs only on the *first* init of the volume.

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
  CREATE DATABASE nebula_users;
  CREATE DATABASE nebula_products;
  CREATE DATABASE nebula_settings;
EOSQL
