-- CreateTable
CREATE TABLE "PayrollPayment" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "hoursWorked" DECIMAL(10,2) NOT NULL,
    "regularPay" DECIMAL(10,2) NOT NULL,
    "overtimePay" DECIMAL(10,2) NOT NULL,
    "paidBy" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayrollPayment_employeeId_idx" ON "PayrollPayment"("employeeId");

-- CreateIndex
CREATE INDEX "PayrollPayment_paidAt_idx" ON "PayrollPayment"("paidAt");

-- CreateIndex
CREATE INDEX "PayrollPayment_periodStart_periodEnd_idx" ON "PayrollPayment"("periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "PayrollPayment" ADD CONSTRAINT "PayrollPayment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPayment" ADD CONSTRAINT "PayrollPayment_paidBy_fkey" FOREIGN KEY ("paidBy") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
