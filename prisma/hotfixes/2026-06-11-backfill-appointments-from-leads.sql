-- Hotfix 2026-06-11: back-fill Appointment rows from existing Lead.appointmentAt.
-- Each lead with a set appointment becomes an Appointment row, keeping provenance
-- (leadId) and carrying medmundusId when the lead originated from MedMundus.
-- Past appointments are marked 'completed', future ones 'booked'.
-- Idempotent: re-running skips leads that already have an appointment (matched by leadId).
-- Run AFTER 2026-06-11-add-appointments.sql. Apply on dev via DIRECT_URL,
-- on client prod via a temporary admin endpoint.

BEGIN;

INSERT INTO "appointments"
  ("id", "medmundusId", "patientId", "doctorId", "clinicId", "leadId",
   "startAt", "endAt", "status", "notes", "source", "syncVersion", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  l."medmundusAppointmentId",
  l."patientId",
  l."doctorId",
  l."clinicId",
  l."id",
  l."appointmentAt",
  NULL,
  (CASE WHEN l."appointmentAt" < now() THEN 'completed' ELSE 'booked' END)::"AppointmentStatus",
  l."appointmentNotes",
  (CASE WHEN l."medmundusAppointmentId" IS NOT NULL THEN 'medmundus' ELSE 'lensflow' END),
  0,
  now(),
  now()
FROM "leads" l
WHERE l."appointmentAt" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "appointments" a WHERE a."leadId" = l."id");

COMMIT;
