-- Hotfix 2026-06-11: add Appointment entity for the two-way MedMundus calendar.
-- Dedicated appointment table (separate from Lead) with a real status lifecycle
-- (booked/rescheduled/cancelled/completed/no_show), patient/doctor/clinic linkage,
-- optional provenance link to the originating Lead, and sync metadata
-- (source/syncVersion/syncedAt) to guard against echo-loops.
-- All statements are additive and idempotent (safe to re-run).
-- Apply on dev (Neon) via DIRECT_URL; on client prod via a temporary admin endpoint.

BEGIN;

-- Appointment status enum (idempotent create — CREATE TYPE has no IF NOT EXISTS)
DO $$ BEGIN
  CREATE TYPE "AppointmentStatus" AS ENUM ('booked', 'rescheduled', 'cancelled', 'completed', 'no_show');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Appointment table
CREATE TABLE IF NOT EXISTS "appointments" (
  "id"          TEXT NOT NULL,
  "medmundusId" TEXT,
  "patientId"   TEXT,
  "doctorId"    TEXT,
  "clinicId"    TEXT,
  "leadId"      TEXT,
  "startAt"     TIMESTAMP(3) NOT NULL,
  "endAt"       TIMESTAMP(3),
  "status"      "AppointmentStatus" NOT NULL DEFAULT 'booked',
  "notes"       TEXT,
  "source"      TEXT NOT NULL DEFAULT 'lensflow',
  "syncVersion" INTEGER NOT NULL DEFAULT 0,
  "syncedAt"    TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "appointments_medmundusId_key" ON "appointments" ("medmundusId");
CREATE INDEX IF NOT EXISTS "appointments_doctorId_startAt_idx" ON "appointments" ("doctorId", "startAt");
CREATE INDEX IF NOT EXISTS "appointments_patientId_idx" ON "appointments" ("patientId");
CREATE INDEX IF NOT EXISTS "appointments_clinicId_idx" ON "appointments" ("clinicId");

COMMIT;
