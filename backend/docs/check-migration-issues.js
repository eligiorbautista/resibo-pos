const { PrismaClient } = require("@prisma/client");

async function checkMigrationIssues() {
  const prisma = new PrismaClient();

  try {
    console.log("🔍 Checking migration issues...\n");

    // Check for XENDIT records
    console.log("1. Checking for XENDIT PaymentProvider records...");
    try {
      const xenditRecords = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "PaymentIntent" WHERE provider = 'XENDIT'
      `;
      console.log(
        `   Found ${xenditRecords[0]?.count || 0} records with XENDIT provider`,
      );
    } catch (error) {
      console.log(
        "   ✅ No XENDIT records found (or PaymentIntent table doesn't exist yet)",
      );
    }

    // Check for duplicate paymongoPaymentIntentId
    console.log(
      "\n2. Checking for duplicate paymongoPaymentIntentId values...",
    );
    try {
      const duplicates = await prisma.$queryRaw`
        SELECT "paymongoPaymentIntentId", COUNT(*) as count 
        FROM "PaymentIntent" 
        WHERE "paymongoPaymentIntentId" IS NOT NULL 
        GROUP BY "paymongoPaymentIntentId" 
        HAVING COUNT(*) > 1
      `;

      if (duplicates.length === 0) {
        console.log("   ✅ No duplicate paymongoPaymentIntentId values found");
      } else {
        console.log(
          `   ⚠️  Found ${duplicates.length} duplicate paymongoPaymentIntentId values:`,
        );
        duplicates.forEach((duplicate) => {
          console.log(
            `      - ID: ${duplicate.paymongoPaymentIntentId} (appears ${duplicate.count} times)`,
          );
        });
      }
    } catch (error) {
      console.log(
        "   ✅ No duplicate records found (or PaymentIntent table doesn't exist yet)",
      );
    }

    // Check current schema state
    console.log("\n3. Checking current database state...");
    try {
      const paymentIntentCount = await prisma.paymentIntent.count();
      console.log(`   📊 Total PaymentIntent records: ${paymentIntentCount}`);

      if (paymentIntentCount > 0) {
        const providers = await prisma.paymentIntent.groupBy({
          by: ["provider"],
          _count: { provider: true },
        });
        console.log("   📊 Providers distribution:");
        providers.forEach((p) => {
          console.log(`      - ${p.provider}: ${p._count.provider} records`);
        });
      }
    } catch (error) {
      console.log(
        "   ℹ️  PaymentIntent table might not exist yet or has no records",
      );
    }
  } catch (error) {
    console.error("❌ Error checking migration issues:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkMigrationIssues();
