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

  // ─── Seed Subscription Plans ───
  console.log('💰 Seeding subscription plans...');

  const plans = [
    {
      name: 'free',
      displayName: 'Free',
      description: 'Get started with essential document management. Perfect for personal use.',
      priceMonthly: 0,
      priceYearly: 0,
      storageLimitGb: 5,
      maxDocuments: 100,
      maxFamilyMembers: 1,
      maxLegacyPlans: 1,
      ocrCreditsMonthly: 50,
      aiCreditsMonthly: 50,
      trialDays: 0,
      displayOrder: 1,
      features: {
        basicOcr: true,
        basicSearch: true,
        advancedAi: false,
        emergencyAccess: false,
        digitalLegacy: false,
        prioritySupport: false,
        familyVault: false,
        unlimitedLegacyPlans: false,
        advancedAnalytics: false,
        sharedVault: false,
        familyCollaboration: false,
      },
      entitlements: [
        { feature: 'basic_ocr', enabled: true },
        { feature: 'basic_search', enabled: true },
        { feature: 'advanced_ai', enabled: false },
        { feature: 'emergency_access', enabled: false },
        { feature: 'digital_legacy', enabled: false },
        { feature: 'priority_support', enabled: false },
        { feature: 'family_vault', enabled: false },
        { feature: 'unlimited_legacy_plans', enabled: false },
        { feature: 'advanced_analytics', enabled: false },
        { feature: 'shared_vault', enabled: false },
        { feature: 'family_collaboration', enabled: false },
        { feature: 'storage_gb', enabled: true, limitValue: 5 },
        { feature: 'max_documents', enabled: true, limitValue: 100 },
        { feature: 'ocr_credits_monthly', enabled: true, limitValue: 50 },
        { feature: 'ai_credits_monthly', enabled: true, limitValue: 50 },
        { feature: 'max_family_members', enabled: true, limitValue: 1 },
        { feature: 'max_legacy_plans', enabled: true, limitValue: 1 },
      ],
    },
    {
      name: 'premium',
      displayName: 'Premium',
      description: 'Unlock the full power of AI-driven document intelligence. For professionals.',
      priceMonthly: 499,
      priceYearly: 4799,
      storageLimitGb: 100,
      maxDocuments: -1,
      maxFamilyMembers: 1,
      maxLegacyPlans: -1,
      ocrCreditsMonthly: 500,
      aiCreditsMonthly: 500,
      trialDays: 14,
      displayOrder: 2,
      features: {
        basicOcr: true,
        basicSearch: true,
        advancedAi: true,
        emergencyAccess: true,
        digitalLegacy: true,
        prioritySupport: true,
        familyVault: false,
        unlimitedLegacyPlans: true,
        advancedAnalytics: true,
        sharedVault: false,
        familyCollaboration: false,
      },
      entitlements: [
        { feature: 'basic_ocr', enabled: true },
        { feature: 'basic_search', enabled: true },
        { feature: 'advanced_ai', enabled: true },
        { feature: 'emergency_access', enabled: true },
        { feature: 'digital_legacy', enabled: true },
        { feature: 'priority_support', enabled: true },
        { feature: 'family_vault', enabled: false },
        { feature: 'unlimited_legacy_plans', enabled: true },
        { feature: 'advanced_analytics', enabled: true },
        { feature: 'shared_vault', enabled: false },
        { feature: 'family_collaboration', enabled: false },
        { feature: 'storage_gb', enabled: true, limitValue: 100 },
        { feature: 'max_documents', enabled: true, limitValue: -1 },
        { feature: 'ocr_credits_monthly', enabled: true, limitValue: 500 },
        { feature: 'ai_credits_monthly', enabled: true, limitValue: 500 },
        { feature: 'max_family_members', enabled: true, limitValue: 1 },
        { feature: 'max_legacy_plans', enabled: true, limitValue: -1 },
      ],
    },
    {
      name: 'family',
      displayName: 'Family',
      description: 'Protect your entire family with shared storage, vaults, and collaboration tools.',
      priceMonthly: 999,
      priceYearly: 9599,
      storageLimitGb: 500,
      maxDocuments: -1,
      maxFamilyMembers: 10,
      maxLegacyPlans: -1,
      ocrCreditsMonthly: 1000,
      aiCreditsMonthly: 1000,
      trialDays: 14,
      displayOrder: 3,
      features: {
        basicOcr: true,
        basicSearch: true,
        advancedAi: true,
        emergencyAccess: true,
        digitalLegacy: true,
        prioritySupport: true,
        familyVault: true,
        unlimitedLegacyPlans: true,
        advancedAnalytics: true,
        sharedVault: true,
        familyCollaboration: true,
      },
      entitlements: [
        { feature: 'basic_ocr', enabled: true },
        { feature: 'basic_search', enabled: true },
        { feature: 'advanced_ai', enabled: true },
        { feature: 'emergency_access', enabled: true },
        { feature: 'digital_legacy', enabled: true },
        { feature: 'priority_support', enabled: true },
        { feature: 'family_vault', enabled: true },
        { feature: 'unlimited_legacy_plans', enabled: true },
        { feature: 'advanced_analytics', enabled: true },
        { feature: 'shared_vault', enabled: true },
        { feature: 'family_collaboration', enabled: true },
        { feature: 'storage_gb', enabled: true, limitValue: 500 },
        { feature: 'max_documents', enabled: true, limitValue: -1 },
        { feature: 'ocr_credits_monthly', enabled: true, limitValue: 1000 },
        { feature: 'ai_credits_monthly', enabled: true, limitValue: 1000 },
        { feature: 'max_family_members', enabled: true, limitValue: 10 },
        { feature: 'max_legacy_plans', enabled: true, limitValue: -1 },
      ],
    },
  ];

  for (const plan of plans) {
    const { entitlements, ...planData } = plan;

    const createdPlan = await prisma.subscriptionPlan.upsert({
      where: { name: planData.name },
      update: {
        displayName: planData.displayName,
        description: planData.description,
        priceMonthly: planData.priceMonthly,
        priceYearly: planData.priceYearly,
        storageLimitGb: planData.storageLimitGb,
        maxDocuments: planData.maxDocuments,
        maxFamilyMembers: planData.maxFamilyMembers,
        maxLegacyPlans: planData.maxLegacyPlans,
        ocrCreditsMonthly: planData.ocrCreditsMonthly,
        aiCreditsMonthly: planData.aiCreditsMonthly,
        trialDays: planData.trialDays,
        displayOrder: planData.displayOrder,
        features: planData.features,
      },
      create: planData,
    });

    // Seed entitlements for this plan
    for (const entitlement of entitlements) {
      await prisma.planEntitlement.upsert({
        where: {
          planId_feature: {
            planId: createdPlan.id,
            feature: entitlement.feature,
          },
        },
        update: {
          enabled: entitlement.enabled,
          limitValue: entitlement.limitValue ?? null,
        },
        create: {
          planId: createdPlan.id,
          feature: entitlement.feature,
          enabled: entitlement.enabled,
          limitValue: entitlement.limitValue ?? null,
        },
      });
    }
  }
  console.log(`  ✅ ${plans.length} subscription plans seeded with entitlements\n`);

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
