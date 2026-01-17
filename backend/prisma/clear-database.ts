import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

/**
 * Script to delete all data from all tables in the database.
 *
 * WARNING: This will permanently delete ALL data from the database.
 * Use with caution! This is useful for clearing test/seed data.
 *
 * Usage:
 *   npm run clear-db
 *   or
 *   ts-node prisma/clear-database.ts
 */
async function clearDatabase() {
  console.log("🗑️  Starting database cleanup...");
  console.log("⚠️  WARNING: This will delete ALL data from ALL tables!");

  try {
    // Delete in order to respect foreign key constraints
    // Start with child records (those with foreign keys)

    console.log("Deleting TransactionItemModifier...");
    await prisma.transactionItemModifier.deleteMany();

    console.log("Deleting TransactionItem...");
    await prisma.transactionItem.deleteMany();

    console.log("Deleting Payment...");
    await prisma.payment.deleteMany();

    console.log("Deleting PaymentIntent...");
    await prisma.paymentIntent.deleteMany();

    console.log("Deleting EInvoicePayload...");
    await prisma.eInvoicePayload.deleteMany();

    console.log("Deleting Transaction...");
    await prisma.transaction.deleteMany();

    console.log("Deleting BreakRecord...");
    await prisma.breakRecord.deleteMany();

    console.log("Deleting TimeRecord...");
    await prisma.timeRecord.deleteMany();

    console.log("Deleting PayrollPayment...");
    await prisma.payrollPayment.deleteMany();

    console.log("Deleting ShiftSchedule...");
    await prisma.shiftSchedule.deleteMany();

    console.log("Deleting ShiftNote...");
    await prisma.shiftNote.deleteMany();

    console.log("Deleting CashDrawerTransaction...");
    await prisma.cashDrawerTransaction.deleteMany();

    console.log("Deleting CashDrop...");
    await prisma.cashDrop.deleteMany();

    console.log("Deleting CashPickup...");
    await prisma.cashPickup.deleteMany();

    console.log("Deleting CashDrawer...");
    await prisma.cashDrawer.deleteMany();

    console.log("Deleting SuspendedCart...");
    await prisma.suspendedCart.deleteMany();

    console.log("Deleting TableReservation...");
    await prisma.tableReservation.deleteMany();

    console.log("Deleting WaitlistItem...");
    await prisma.waitlistItem.deleteMany();

    console.log("Deleting VerifiedDiscountID...");
    await prisma.verifiedDiscountID.deleteMany();

    console.log("Deleting CustomerNote...");
    await prisma.customerNote.deleteMany();

    console.log("Deleting CustomerTag...");
    await prisma.customerTag.deleteMany();

    console.log("Deleting Modifier...");
    await prisma.modifier.deleteMany();

    console.log("Deleting ModifierGroup...");
    await prisma.modifierGroup.deleteMany();

    console.log("Deleting ProductVariant...");
    await prisma.productVariant.deleteMany();

    console.log("Deleting Product...");
    await prisma.product.deleteMany();

    console.log("Deleting Table...");
    await prisma.table.deleteMany();

    console.log("Deleting Customer...");
    await prisma.customer.deleteMany();

    console.log("Deleting AuditLog...");
    await prisma.auditLog.deleteMany();

    console.log("Deleting DailyZReading...");
    await prisma.dailyZReading.deleteMany();

    console.log("Deleting Employee...");
    await prisma.employee.deleteMany();

    console.log("Deleting SystemCounter...");
    await prisma.systemCounter.deleteMany();

    console.log("✅ Database cleared successfully!");
    console.log("📊 All tables are now empty.");

    // Create dev accounts
    console.log("\n👥 Creating dev accounts...");

    // Hash PINs
    const hashedPin0000 = await bcrypt.hash("0000", 10); // Manager PIN
    const hashedPin1234 = await bcrypt.hash("1234", 10); // Cashier PIN
    const hashedPin5678 = await bcrypt.hash("5678", 10); // Server PIN

    // Create Manager: Eli Dev Account
    const manager = await prisma.employee.create({
      data: {
        name: "Eli Dev Account",
        role: Role.MANAGER,
        pin: hashedPin0000,
        status: "OUT",
        hourlyRate: 250.0,
      },
    });
    console.log(`✅ Created Manager: ${manager.name} (PIN: 0000)`);

    // Create Cashier: Micaela Hernandez
    const cashier = await prisma.employee.create({
      data: {
        name: "Micaela Hernandez",
        role: Role.CASHIER,
        pin: hashedPin1234,
        status: "OUT",
        hourlyRate: 150.0,
      },
    });
    console.log(`✅ Created Cashier: ${cashier.name} (PIN: 1234)`);

    // Create Server: Luna Lovegood
    const server = await prisma.employee.create({
      data: {
        name: "Luna Lovegood",
        role: Role.SERVER,
        pin: hashedPin5678,
        status: "OUT",
        hourlyRate: 120.0,
      },
    });
    console.log(`✅ Created Server: ${server.name} (PIN: 5678)`);

    console.log("\n✅ Dev accounts created successfully!");
    console.log("\n📝 Login Credentials:");
    console.log("   Manager:  PIN 0000");
    console.log("   Cashier:  PIN 1234");
    console.log("   Server:   PIN 5678");
  } catch (error) {
    console.error("❌ Error clearing database:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
clearDatabase().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
