-- Add patientId to sales table
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "patientId" TEXT;

-- Add foreign key constraint
ALTER TABLE "sales"
    ADD CONSTRAINT "sales_patientId_fkey"
    FOREIGN KEY ("patientId")
    REFERENCES "patients"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- Add index
CREATE INDEX IF NOT EXISTS "sales_patientId_idx" ON "sales"("patientId");

-- Add patientId to leads table
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "patientId" TEXT;

ALTER TABLE "leads"
    ADD CONSTRAINT "leads_patientId_fkey"
    FOREIGN KEY ("patientId")
    REFERENCES "patients"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "leads_patientId_idx" ON "leads"("patientId");
