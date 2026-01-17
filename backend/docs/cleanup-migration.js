const { PrismaClient } = require('@prisma/client');

async function cleanupDataForMigration() {
  const prisma = new PrismaClient();

  try {
    console.log('🧹 Running pre-migration cleanup...\n');

    // 1. Remove any XENDIT records if they exist
    console.log('1. Cleaning up XENDIT provider records...');
    const deletedXendit = await prisma.$executeRaw`
      DELETE FROM "PaymentIntent" WHERE provider = 'XENDIT'
    `;
    console.log(`   ✅ Removed ${deletedXendit} XENDIT records`);

    // 2. Handle duplicate paymongoPaymentIntentId values
    console.log('\n2. Cleaning up duplicate paymongoPaymentIntentId values...');
    const duplicates = await prisma.$queryRaw`
      SELECT "paymongoPaymentIntentId", array_agg(id) as ids
      FROM "PaymentIntent" 
      WHERE "paymongoPaymentIntentId" IS NOT NULL 
      GROUP BY "paymongoPaymentIntentId" 
      HAVING COUNT(*) > 1
    `;

    if (duplicates.length > 0) {
      for (const duplicate of duplicates) {
        const idsToKeep = duplicate.ids.slice(0, 1); // Keep first record
        const idsToDelete = duplicate.ids.slice(1); // Delete others
        
        console.log(`   🗑️  Removing duplicate paymongoPaymentIntentId: ${duplicate.paymongoPaymentIntentId}`);
        console.log(`      Keeping ID: ${idsToKeep[0]}, Deleting: ${idsToDelete.join(', ')}`);
        
        await prisma.paymentIntent.deleteMany({
          where: { id: { in: idsToDelete } }
        });
      }
      console.log(`   ✅ Cleaned up ${duplicates.length} sets of duplicates`);
    } else {
      console.log('   ✅ No duplicate paymongoPaymentIntentId values found');
    }

    console.log('\n✅ Pre-migration cleanup completed successfully!');
    console.log('🚀 You can now safely run: npm run prisma:migrate');

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    console.log('\n💡 This might be normal if the PaymentIntent table doesn\'t exist yet.');
    console.log('🚀 You can proceed with: npm run prisma:migrate');
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDataForMigration();