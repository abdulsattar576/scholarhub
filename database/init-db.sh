#!/bin/bash
set -e

# Initialize distinct logical databases and service-owned users
# per Section 18.2 of the architecture specification.

echo "Initializing microservice databases and users..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- 1. Identity Service Database & User
    CREATE USER identity_user WITH PASSWORD '${IDENTITY_DB_PASSWORD:-identity_secret}';
    CREATE DATABASE identity_db OWNER identity_user;
    GRANT ALL PRIVILEGES ON DATABASE identity_db TO identity_user;

    -- 2. Scholarship Service Database & User
    CREATE USER scholarship_user WITH PASSWORD '${SCHOLARSHIP_DB_PASSWORD:-scholarship_secret}';
    CREATE DATABASE scholarship_db OWNER scholarship_user;
    GRANT ALL PRIVILEGES ON DATABASE scholarship_db TO scholarship_user;

    -- 3. Application Service Database & User
    CREATE USER application_user WITH PASSWORD '${APPLICATION_DB_PASSWORD:-application_secret}';
    CREATE DATABASE application_db OWNER application_user;
    GRANT ALL PRIVILEGES ON DATABASE application_db TO application_user;
EOSQL

echo "Databases and users successfully created."

