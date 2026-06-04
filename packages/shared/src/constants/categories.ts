// ═══════════════════════════════════════════════════
// Category Constants
// ═══════════════════════════════════════════════════

export const CATEGORIES = [
  { name: 'Identity Documents', slug: 'identity', icon: '🪪', color: '#6366f1', displayOrder: 1 },
  { name: 'Medical Records', slug: 'medical', icon: '🏥', color: '#ef4444', displayOrder: 2 },
  {
    name: 'Educational Certificates',
    slug: 'education',
    icon: '🎓',
    color: '#f59e0b',
    displayOrder: 3,
  },
  { name: 'Career Documents', slug: 'career', icon: '💼', color: '#3b82f6', displayOrder: 4 },
  { name: 'Financial Documents', slug: 'financial', icon: '💰', color: '#10b981', displayOrder: 5 },
  { name: 'Insurance Policies', slug: 'insurance', icon: '🛡️', color: '#8b5cf6', displayOrder: 6 },
  { name: 'Property Documents', slug: 'property', icon: '🏠', color: '#f97316', displayOrder: 7 },
  { name: 'Legal Documents', slug: 'legal', icon: '⚖️', color: '#64748b', displayOrder: 8 },
  { name: 'Family Records', slug: 'family', icon: '👨‍👩‍👧‍👦', color: '#ec4899', displayOrder: 9 },
  {
    name: 'Emergency Information',
    slug: 'emergency',
    icon: '🚨',
    color: '#dc2626',
    displayOrder: 10,
  },
  { name: 'Digital Legacy', slug: 'legacy', icon: '📜', color: '#a855f7', displayOrder: 11 },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];

export const SUB_CATEGORIES: Record<CategorySlug, Array<{ name: string; slug: string }>> = {
  identity: [
    { name: 'Aadhaar Card', slug: 'aadhaar' },
    { name: 'PAN Card', slug: 'pan' },
    { name: 'Passport', slug: 'passport' },
    { name: 'Driving License', slug: 'driving-license' },
    { name: 'Voter ID', slug: 'voter-id' },
    { name: 'Other ID', slug: 'other-id' },
  ],
  medical: [
    { name: 'Prescription', slug: 'prescription' },
    { name: 'Lab Report', slug: 'lab-report' },
    { name: 'Vaccination Record', slug: 'vaccination' },
    { name: 'Discharge Summary', slug: 'discharge-summary' },
    { name: 'Medical Certificate', slug: 'medical-certificate' },
    { name: 'Other Medical', slug: 'other-medical' },
  ],
  education: [
    { name: 'Marksheet', slug: 'marksheet' },
    { name: 'Degree Certificate', slug: 'degree' },
    { name: 'Course Certificate', slug: 'course-certificate' },
    { name: 'Transcript', slug: 'transcript' },
    { name: 'Other Education', slug: 'other-education' },
  ],
  career: [
    { name: 'Offer Letter', slug: 'offer-letter' },
    { name: 'Experience Letter', slug: 'experience-letter' },
    { name: 'Payslip', slug: 'payslip' },
    { name: 'Appraisal Letter', slug: 'appraisal' },
    { name: 'Resume / CV', slug: 'resume' },
    { name: 'Other Career', slug: 'other-career' },
  ],
  financial: [
    { name: 'Bank Statement', slug: 'bank-statement' },
    { name: 'Tax Return (ITR)', slug: 'itr' },
    { name: 'Form 16', slug: 'form-16' },
    { name: 'Investment Statement', slug: 'investment' },
    { name: 'Loan Document', slug: 'loan' },
    { name: 'Other Financial', slug: 'other-financial' },
  ],
  insurance: [
    { name: 'Health Insurance', slug: 'health-insurance' },
    { name: 'Life Insurance', slug: 'life-insurance' },
    { name: 'Vehicle Insurance', slug: 'vehicle-insurance' },
    { name: 'Home Insurance', slug: 'home-insurance' },
    { name: 'Travel Insurance', slug: 'travel-insurance' },
    { name: 'Other Insurance', slug: 'other-insurance' },
  ],
  property: [
    { name: 'Sale Deed', slug: 'sale-deed' },
    { name: 'Rent Agreement', slug: 'rent-agreement' },
    { name: 'Property Tax Receipt', slug: 'property-tax' },
    { name: 'Other Property', slug: 'other-property' },
  ],
  legal: [
    { name: 'Will', slug: 'will' },
    { name: 'Power of Attorney', slug: 'power-of-attorney' },
    { name: 'Court Order', slug: 'court-order' },
    { name: 'Agreement / Contract', slug: 'agreement' },
    { name: 'Other Legal', slug: 'other-legal' },
  ],
  family: [
    { name: 'Birth Certificate', slug: 'birth-certificate' },
    { name: 'Marriage Certificate', slug: 'marriage-certificate' },
    { name: 'Death Certificate', slug: 'death-certificate' },
    { name: 'Other Family', slug: 'other-family' },
  ],
  emergency: [
    { name: 'Emergency Contact Card', slug: 'emergency-card' },
    { name: 'Medical Alert', slug: 'medical-alert' },
    { name: 'Other Emergency', slug: 'other-emergency' },
  ],
  legacy: [
    { name: 'Digital Will', slug: 'digital-will' },
    { name: 'Asset Inventory', slug: 'asset-inventory' },
    { name: 'Nominee Details', slug: 'nominee-details' },
    { name: 'Other Legacy', slug: 'other-legacy' },
  ],
};
