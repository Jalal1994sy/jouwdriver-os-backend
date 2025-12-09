-- JOUW TAXI OS 26 SaaS - PostgreSQL schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS companies (
  id                  SERIAL PRIMARY KEY,
  name                VARCHAR(255) NOT NULL,
  kbo                 VARCHAR(50)  NOT NULL UNIQUE,
  address             TEXT,
  phone               VARCHAR(50),
  email               VARCHAR(255),
  chiron_client_id    VARCHAR(255),
  chiron_secret       VARCHAR(255),
  chiron_test_id      VARCHAR(255),
  chiron_test_secret  VARCHAR(255),
  vat                 NUMERIC(4,2) DEFAULT 6.00,
  created_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_kbo ON companies(kbo);

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  company_id    INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL CHECK (role IN ('admin', 'driver')),
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_role    ON users(role);

CREATE TABLE IF NOT EXISTS vehicles (
  id          SERIAL PRIMARY KEY,
  company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plate       VARCHAR(50) NOT NULL,
  driver_pass VARCHAR(50),
  active      BOOLEAN DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_company_plate
  ON vehicles(company_id, plate);

CREATE TABLE IF NOT EXISTS trips (
  id              SERIAL PRIMARY KEY,
  company_id      INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vehicle_id      INTEGER REFERENCES vehicles(id),
  driver_id       INTEGER REFERENCES users(id),
  ritnummer       VARCHAR(100),
  start_time      TIMESTAMP,
  end_time        TIMESTAMP,
  price           NUMERIC(10,2),
  json_log        JSONB,
  chiron_status   VARCHAR(50),
  chiron_response JSONB,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trips_company    ON trips(company_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver     ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle    ON trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_created_at ON trips(created_at DESC);
