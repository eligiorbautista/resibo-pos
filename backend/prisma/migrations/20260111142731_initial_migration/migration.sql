-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MANAGER', 'CASHIER', 'SERVER', 'KITCHEN');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'GCASH', 'PAYMAYA');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('DINE_IN', 'TAKEOUT', 'DELIVERY');

-- CreateEnum
CREATE TYPE "TableStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'NEEDS_CLEANING');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'VOIDED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('NONE', 'PWD', 'SENIOR_CITIZEN');

-- CreateEnum
CREATE TYPE "BreakType" AS ENUM ('BREAK', 'LUNCH');

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'SEATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('CONFIRMED', 'SEATED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "OrderPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "pin" TEXT NOT NULL,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'OUT',
    "lastClockIn" TIMESTAMP(3),
    "totalSales" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalTips" DECIMAL(10,2),
    "hourlyRate" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "basePrice" DECIMAL(10,2) NOT NULL,
    "costPrice" DECIMAL(10,2) NOT NULL,
    "imageUrl" TEXT,
    "reorderPoint" INTEGER NOT NULL DEFAULT 0,
    "totalStock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "sku" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModifierGroup" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "maxSelections" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModifierGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Modifier" (
    "id" TEXT NOT NULL,
    "modifierGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Modifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "membershipCardNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "joinedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "birthday" TIMESTAMP(3),
    "tags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerNote" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,

    CONSTRAINT "CustomerTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Table" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" "TableStatus" NOT NULL DEFAULT 'AVAILABLE',
    "location" TEXT,
    "currentOrderId" TEXT,
    "reservationName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "customerId" TEXT,
    "serverId" TEXT,
    "tableId" TEXT,
    "orderType" "OrderType" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "serviceCharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discountTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discountType" "DiscountType" NOT NULL DEFAULT 'NONE',
    "discountCardNumber" TEXT,
    "discountVerifiedBy" TEXT,
    "discountVerifiedAt" TIMESTAMP(3),
    "tip" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "loyaltyPointsRedeemed" INTEGER DEFAULT 0,
    "loyaltyPointsDiscount" DECIMAL(10,2),
    "notes" TEXT,
    "kitchenNotes" TEXT,
    "deliveryAddress" TEXT,
    "priority" "OrderPriority" DEFAULT 'NORMAL',
    "estimatedPrepTime" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionItem" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "specialInstructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionItemModifier" (
    "id" TEXT NOT NULL,
    "transactionItemId" TEXT NOT NULL,
    "modifierId" TEXT,
    "modifierName" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "TransactionItemModifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashDrawer" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "openingAmount" DECIMAL(10,2) NOT NULL,
    "closingAmount" DECIMAL(10,2),
    "expectedAmount" DECIMAL(10,2),
    "actualAmount" DECIMAL(10,2),
    "difference" DECIMAL(10,2),
    "denominationBreakdown" JSONB,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashDrawer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashDrawerTransaction" (
    "id" TEXT NOT NULL,
    "cashDrawerId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,

    CONSTRAINT "CashDrawerTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashDrop" (
    "id" TEXT NOT NULL,
    "cashDrawerId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "droppedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashDrop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashPickup" (
    "id" TEXT NOT NULL,
    "cashDrawerId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "pickedUpAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashPickup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftNote" (
    "id" TEXT NOT NULL,
    "cashDrawerId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuspendedCart" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "tableId" TEXT,
    "serverId" TEXT,
    "customerName" TEXT,
    "orderType" "OrderType",
    "items" JSONB NOT NULL,
    "notes" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuspendedCart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "clockIn" TIMESTAMP(3) NOT NULL,
    "clockOut" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreakRecord" (
    "id" TEXT NOT NULL,
    "timeRecordId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "type" "BreakType" NOT NULL,

    CONSTRAINT "BreakRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftSchedule" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TableReservation" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "tableId" TEXT,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "partySize" INTEGER NOT NULL,
    "reservationDate" TIMESTAMP(3) NOT NULL,
    "reservationTime" TEXT NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TableReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitlistItem" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "tableId" TEXT,
    "customerName" TEXT NOT NULL,
    "partySize" INTEGER NOT NULL,
    "phone" TEXT,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerifiedDiscountID" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "discountType" "DiscountType" NOT NULL,
    "customerName" TEXT,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "VerifiedDiscountID_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Employee_pin_idx" ON "Employee"("pin");

-- CreateIndex
CREATE INDEX "Employee_role_idx" ON "Employee"("role");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_sku_key" ON "ProductVariant"("productId", "sku");

-- CreateIndex
CREATE INDEX "ModifierGroup_productId_idx" ON "ModifierGroup"("productId");

-- CreateIndex
CREATE INDEX "Modifier_modifierGroupId_idx" ON "Modifier"("modifierGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_membershipCardNumber_key" ON "Customer"("membershipCardNumber");

-- CreateIndex
CREATE INDEX "Customer_membershipCardNumber_idx" ON "Customer"("membershipCardNumber");

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "CustomerNote_customerId_idx" ON "CustomerNote"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerTag_name_key" ON "CustomerTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Table_number_key" ON "Table"("number");

-- CreateIndex
CREATE INDEX "Table_status_idx" ON "Table"("status");

-- CreateIndex
CREATE INDEX "Table_number_idx" ON "Table"("number");

-- CreateIndex
CREATE INDEX "Transaction_employeeId_idx" ON "Transaction"("employeeId");

-- CreateIndex
CREATE INDEX "Transaction_customerId_idx" ON "Transaction"("customerId");

-- CreateIndex
CREATE INDEX "Transaction_tableId_idx" ON "Transaction"("tableId");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_orderType_idx" ON "Transaction"("orderType");

-- CreateIndex
CREATE INDEX "Transaction_timestamp_idx" ON "Transaction"("timestamp");

-- CreateIndex
CREATE INDEX "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- CreateIndex
CREATE INDEX "TransactionItem_transactionId_idx" ON "TransactionItem"("transactionId");

-- CreateIndex
CREATE INDEX "TransactionItem_productId_idx" ON "TransactionItem"("productId");

-- CreateIndex
CREATE INDEX "TransactionItemModifier_transactionItemId_idx" ON "TransactionItemModifier"("transactionItemId");

-- CreateIndex
CREATE INDEX "Payment_transactionId_idx" ON "Payment"("transactionId");

-- CreateIndex
CREATE INDEX "Payment_method_idx" ON "Payment"("method");

-- CreateIndex
CREATE INDEX "CashDrawer_employeeId_idx" ON "CashDrawer"("employeeId");

-- CreateIndex
CREATE INDEX "CashDrawer_openedAt_idx" ON "CashDrawer"("openedAt");

-- CreateIndex
CREATE INDEX "CashDrawer_closedAt_idx" ON "CashDrawer"("closedAt");

-- CreateIndex
CREATE INDEX "CashDrawerTransaction_cashDrawerId_idx" ON "CashDrawerTransaction"("cashDrawerId");

-- CreateIndex
CREATE INDEX "CashDrawerTransaction_transactionId_idx" ON "CashDrawerTransaction"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "CashDrawerTransaction_cashDrawerId_transactionId_key" ON "CashDrawerTransaction"("cashDrawerId", "transactionId");

-- CreateIndex
CREATE INDEX "CashDrop_cashDrawerId_idx" ON "CashDrop"("cashDrawerId");

-- CreateIndex
CREATE INDEX "CashPickup_cashDrawerId_idx" ON "CashPickup"("cashDrawerId");

-- CreateIndex
CREATE INDEX "ShiftNote_cashDrawerId_idx" ON "ShiftNote"("cashDrawerId");

-- CreateIndex
CREATE INDEX "SuspendedCart_customerId_idx" ON "SuspendedCart"("customerId");

-- CreateIndex
CREATE INDEX "SuspendedCart_timestamp_idx" ON "SuspendedCart"("timestamp");

-- CreateIndex
CREATE INDEX "TimeRecord_employeeId_idx" ON "TimeRecord"("employeeId");

-- CreateIndex
CREATE INDEX "TimeRecord_clockIn_idx" ON "TimeRecord"("clockIn");

-- CreateIndex
CREATE INDEX "BreakRecord_timeRecordId_idx" ON "BreakRecord"("timeRecordId");

-- CreateIndex
CREATE INDEX "ShiftSchedule_employeeId_idx" ON "ShiftSchedule"("employeeId");

-- CreateIndex
CREATE INDEX "ShiftSchedule_dayOfWeek_idx" ON "ShiftSchedule"("dayOfWeek");

-- CreateIndex
CREATE INDEX "TableReservation_customerId_idx" ON "TableReservation"("customerId");

-- CreateIndex
CREATE INDEX "TableReservation_tableId_idx" ON "TableReservation"("tableId");

-- CreateIndex
CREATE INDEX "TableReservation_reservationDate_idx" ON "TableReservation"("reservationDate");

-- CreateIndex
CREATE INDEX "TableReservation_status_idx" ON "TableReservation"("status");

-- CreateIndex
CREATE INDEX "WaitlistItem_status_idx" ON "WaitlistItem"("status");

-- CreateIndex
CREATE INDEX "WaitlistItem_timestamp_idx" ON "WaitlistItem"("timestamp");

-- CreateIndex
CREATE INDEX "VerifiedDiscountID_cardNumber_idx" ON "VerifiedDiscountID"("cardNumber");

-- CreateIndex
CREATE INDEX "VerifiedDiscountID_employeeId_idx" ON "VerifiedDiscountID"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "VerifiedDiscountID_cardNumber_discountType_key" ON "VerifiedDiscountID"("cardNumber", "discountType");

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModifierGroup" ADD CONSTRAINT "ModifierGroup_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Modifier" ADD CONSTRAINT "Modifier_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "ModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerNote" ADD CONSTRAINT "CustomerNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerNote" ADD CONSTRAINT "CustomerNote_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionItem" ADD CONSTRAINT "TransactionItem_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionItem" ADD CONSTRAINT "TransactionItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionItemModifier" ADD CONSTRAINT "TransactionItemModifier_transactionItemId_fkey" FOREIGN KEY ("transactionItemId") REFERENCES "TransactionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashDrawer" ADD CONSTRAINT "CashDrawer_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashDrawerTransaction" ADD CONSTRAINT "CashDrawerTransaction_cashDrawerId_fkey" FOREIGN KEY ("cashDrawerId") REFERENCES "CashDrawer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashDrawerTransaction" ADD CONSTRAINT "CashDrawerTransaction_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashDrop" ADD CONSTRAINT "CashDrop_cashDrawerId_fkey" FOREIGN KEY ("cashDrawerId") REFERENCES "CashDrawer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashDrop" ADD CONSTRAINT "CashDrop_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashPickup" ADD CONSTRAINT "CashPickup_cashDrawerId_fkey" FOREIGN KEY ("cashDrawerId") REFERENCES "CashDrawer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashPickup" ADD CONSTRAINT "CashPickup_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftNote" ADD CONSTRAINT "ShiftNote_cashDrawerId_fkey" FOREIGN KEY ("cashDrawerId") REFERENCES "CashDrawer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftNote" ADD CONSTRAINT "ShiftNote_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuspendedCart" ADD CONSTRAINT "SuspendedCart_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuspendedCart" ADD CONSTRAINT "SuspendedCart_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeRecord" ADD CONSTRAINT "TimeRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakRecord" ADD CONSTRAINT "BreakRecord_timeRecordId_fkey" FOREIGN KEY ("timeRecordId") REFERENCES "TimeRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftSchedule" ADD CONSTRAINT "ShiftSchedule_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableReservation" ADD CONSTRAINT "TableReservation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableReservation" ADD CONSTRAINT "TableReservation_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistItem" ADD CONSTRAINT "WaitlistItem_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistItem" ADD CONSTRAINT "WaitlistItem_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerifiedDiscountID" ADD CONSTRAINT "VerifiedDiscountID_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
