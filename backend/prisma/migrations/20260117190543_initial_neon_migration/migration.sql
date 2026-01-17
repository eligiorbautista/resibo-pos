/*
  Warnings:

  - The values [XENDIT] on the enum `PaymentProvider` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `invoiceId` on the `PaymentIntent` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceUrl` on the `PaymentIntent` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[paymongoPaymentIntentId]` on the table `PaymentIntent` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PaymentProvider_new" AS ENUM ('PAYMONGO');
ALTER TABLE "PaymentIntent" ALTER COLUMN "provider" TYPE "PaymentProvider_new" USING ("provider"::text::"PaymentProvider_new");
ALTER TYPE "PaymentProvider" RENAME TO "PaymentProvider_old";
ALTER TYPE "PaymentProvider_new" RENAME TO "PaymentProvider";
DROP TYPE "PaymentProvider_old";
COMMIT;

-- DropIndex
DROP INDEX "PaymentIntent_invoiceId_key";

-- AlterTable
ALTER TABLE "PaymentIntent" DROP COLUMN "invoiceId",
DROP COLUMN "invoiceUrl",
ADD COLUMN     "paymongoPaymentIntentId" TEXT,
ADD COLUMN     "paymongoPaymentMethodId" TEXT,
ADD COLUMN     "paymongoRedirectUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PaymentIntent_paymongoPaymentIntentId_key" ON "PaymentIntent"("paymongoPaymentIntentId");
