import { CATEGORIES, SUB_CATEGORIES } from '@lifeledger/shared';

/**
 * Build the classification prompt for Gemini AI.
 * Includes all LifeLedger categories and subcategories for accurate mapping.
 */
export function buildClassificationPrompt(ocrText: string): string {
  const categoryList = CATEGORIES.map((cat) => {
    const subs = SUB_CATEGORIES[cat.slug as keyof typeof SUB_CATEGORIES] || [];
    const subList = subs.map((s) => `    - ${s.name} (slug: ${s.slug})`).join('\n');
    return `  - ${cat.name} (slug: ${cat.slug})\n${subList}`;
  }).join('\n');

  return `You are a document classification AI. Analyze the following extracted text from a document and classify it into the most appropriate category and subcategory.

Available categories and subcategories:
${categoryList}

Rules:
1. You MUST select from the categories and subcategories listed above.
2. Return the category and subcategory by their SLUG values.
3. Provide a confidence score from 0 to 100.
4. If the text is too short or unclear to classify, use category "identity" with low confidence.
5. Consider document numbers, headers, issuer names, dates, and key terminology.

Document text:
"""
${ocrText.slice(0, 4000)}
"""

Respond ONLY with valid JSON in this exact format:
{
  "categorySlug": "string",
  "subcategorySlug": "string or null",
  "confidence": number,
  "reasoning": "brief explanation"
}`;
}
