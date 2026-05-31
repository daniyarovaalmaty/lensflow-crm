-- Migration: add_suppliers_and_document_lines
-- Adds Supplier model, StockDocumentLine model, and supplierId FK on stock_documents

-- ==================== Supplier ====================
CREATE TABLE "suppliers" (
    "id"              TEXT NOT NULL,
    "organizationId"  TEXT NOT NULL,
    "name"            TEXT NOT NULL,
    "inn"             TEXT,
    "phone"           TEXT,
    "email"           TEXT,
    "contactPerson"   TEXT,
    "isActive"        BOOLEAN NOT NULL DEFAULT true,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "suppliers_organizationId_idx" ON "suppliers"("organizationId");

ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ==================== StockDocument: add supplierId ====================
ALTER TABLE "stock_documents" ADD COLUMN "supplierId" TEXT;

ALTER TABLE "stock_documents" ADD CONSTRAINT "stock_documents_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ==================== StockDocumentLine ====================
CREATE TABLE "stock_document_lines" (
    "id"            TEXT NOT NULL,
    "documentId"    TEXT NOT NULL,
    "productId"     TEXT NOT NULL,
    "quantity"      INTEGER NOT NULL,
    "unitPrice"     INTEGER NOT NULL DEFAULT 0,
    "totalPrice"    INTEGER NOT NULL DEFAULT 0,
    "serialNumbers" JSONB,
    "batchNumber"   TEXT,
    "expiryDate"    TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_document_lines_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "stock_document_lines" ADD CONSTRAINT "stock_document_lines_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "stock_documents"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "stock_document_lines" ADD CONSTRAINT "stock_document_lines_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "optic_products"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
