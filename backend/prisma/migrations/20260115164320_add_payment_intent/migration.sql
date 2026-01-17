-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('XENDIT');

-- CreateEnum
CREATE TYPE "PaymentIntentStatus" AS ENUM ('CREATED', 'PENDING', 'PAID', 'EXPIRED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "PaymentIntent" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentIntentStatus" NOT NULL DEFAULT 'CREATED',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "externalId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "invoiceUrl" TEXT,
    "expiryDate" TIMESTAMP(3),
    "transactionId" TEXT,
    "providerRaw" JSONB,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_externalId_key" ON "PaymentIntent"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_invoiceId_key" ON "PaymentIntent"("invoiceId");

-- CreateIndex
CREATE INDEX "PaymentIntent_provider_idx" ON "PaymentIntent"("provider");

-- CreateIndex
CREATE INDEX "PaymentIntent_method_idx" ON "PaymentIntent"("method");

-- CreateIndex
CREATE INDEX "PaymentIntent_status_idx" ON "PaymentIntent"("status");

-- CreateIndex
CREATE INDEX "PaymentIntent_transactionId_idx" ON "PaymentIntent"("transactionId");

-- AddForeignKey
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
