import { PrismaClient } from '@prisma/client';
import { CATEGORIES, SUB_CATEGORIES } from '@lifeledger/shared';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ─── Seed Categories ───
  console.log('📂 Seeding categories...');
  for (const cat of CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        color: cat.color,
        displayOrder: cat.displayOrder,
        isActive: true,
      },
    });

    // Seed sub-categories for this category
    const subs = SUB_CATEGORIES[cat.slug] ?? [];
    for (let i = 0; i < subs.length; i++) {
      const sub = subs[i]!;
      await prisma.subCategory.upsert({
        where: {
          categoryId_slug: {
            categoryId: category.id,
            slug: sub.slug,
          },
        },
        update: {},
        create: {
          categoryId: category.id,
          name: sub.name,
          slug: sub.slug,
          displayOrder: i + 1,
        },
      });
    }
  }
  console.log(`  ✅ ${CATEGORIES.length} categories seeded\n`);

  // ─── Seed Plans ───
  console.log('💰 Seeding plans...');
  const plans = [
    {
      name: 'free',
      displayName: 'Free',
      priceMonthly: 0,
      priceYearly: 0,
      storageLimitGb: 1,
      maxDocuments: 50,
      maxFamilyMembers: 1,
      ocrCreditsMonthly: 10,
      aiQueriesMonthly: 5,
      features: {
        search: 'basic',
        sharing: true,
        maxShareLinks: 3,
        emergencyAccess: false,
        digitalLegacy: false,
        prioritySupport: false,
      },
    },
    {
      name: 'premium',
      displayName: 'Premium',
      priceMonthly: 99,
      priceYearly: 999,
      storageLimitGb: 25,
      maxDocuments: -1,
      maxFamilyMembers: 1,
      ocrCreditsMonthly: 100,
      aiQueriesMonthly: 50,
      features: {
        search: 'fulltext_nlp',
        sharing: true,
        maxShareLinks: -1,
        emergencyAccess: true,
        digitalLegacy: true,
        prioritySupport: true,
      },
    },
    {
      name: 'family',
      displayName: 'Family',
      priceMonthly: 249,
      priceYearly: 2499,
      storageLimitGb: 100,
      maxDocuments: -1,
      maxFamilyMembers: 6,
      ocrCreditsMonthly: 300,
      aiQueriesMonthly: 150,
      features: {
        search: 'fulltext_nlp',
        sharing: true,
        maxShareLinks: -1,
        emergencyAccess: true,
        digitalLegacy: true,
        prioritySupport: true,
        familyVault: true,
      },
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: {},
      create: plan,
    });
  }
  console.log(`  ✅ ${plans.length} plans seeded\n`);

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
