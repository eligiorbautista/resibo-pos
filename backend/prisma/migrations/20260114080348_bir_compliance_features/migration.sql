-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "officialInvoiceNumber" INTEGER;

-- CreateTable
CREATE TABLE "SystemCounter" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "grandTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "lastInvoiceNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyZReading" (
    "id" TEXT NOT NULL,
    "businessDate" TIMESTAMP(3) NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedById" TEXT NOT NULL,
    "openingGrandTotal" DECIMAL(18,2) NOT NULL,
    "closingGrandTotal" DECIMAL(18,2) NOT NULL,
    "totalGrossSales" DECIMAL(18,2) NOT NULL,
    "totalVatSales" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalVatExempt" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalDiscounts" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalServiceCharge" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalVoidAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalTransactions" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "DailyZReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EInvoicePayload" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "EInvoicePayload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_employeeId_idx" ON "AuditLog"("employeeId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "DailyZReading_generatedById_idx" ON "DailyZReading"("generatedById");

-- CreateIndex
CREATE UNIQUE INDEX "DailyZReading_businessDate_key" ON "DailyZReading"("businessDate");

-- CreateIndex
CREATE UNIQUE INDEX "EInvoicePayload_transactionId_key" ON "EInvoicePayload"("transactionId");

-- CreateIndex
CREATE INDEX "EInvoicePayload_transactionId_idx" ON "EInvoicePayload"("transactionId");

-- CreateIndex
CREATE INDEX "EInvoicePayload_status_idx" ON "EInvoicePayload"("status");

-- CreateIndex
CREATE INDEX "EInvoicePayload_createdAt_idx" ON "EInvoicePayload"("createdAt");

-- CreateIndex
CREATE INDEX "Transaction_officialInvoiceNumber_idx" ON "Transaction"("officialInvoiceNumber");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyZReading" ADD CONSTRAINT "DailyZReading_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EInvoicePayload" ADD CONSTRAINT "EInvoicePayload_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
