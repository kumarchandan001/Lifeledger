export interface LegacyReadinessInput {
  beneficiaries: Array<{ name: string; relationship: string }>;
  plans: Array<{ name: string; type: string; beneficiaryCount: number }>;
  vaultDocuments: Array<{ title: string; category: string }>;
  instructions: Array<{ title: string; category: string }>;
  messages: Array<{ title: string; type: string }>;
  assets: Array<{ serviceName: string; assetType: string }>;
}

export function buildLegacyReadinessPrompt(data: LegacyReadinessInput): string {
  return `You are an AI assistant for LifeLedger, a secure digital life management platform.

Analyze the user's legacy planning data and generate a readiness assessment.

Current Legacy Data:
- Beneficiaries (${data.beneficiaries.length}): ${JSON.stringify(data.beneficiaries)}
- Legacy Plans (${data.plans.length}): ${JSON.stringify(data.plans)}
- Vault Documents (${data.vaultDocuments.length}): ${JSON.stringify(data.vaultDocuments)}
- Instructions (${data.instructions.length}): ${JSON.stringify(data.instructions)}
- Personal Messages (${data.messages.length}): ${JSON.stringify(data.messages)}
- Digital Assets (${data.assets.length}): ${JSON.stringify(data.assets)}

Provide a JSON response with:
1. "suggestions" - An array of actionable suggestions to improve legacy readiness. Each suggestion has:
   - "category": one of "beneficiaries", "plans", "vault", "instructions", "messages", "assets"
   - "title": short action title
   - "description": user-friendly description of what to do and why
   - "priority": "HIGH", "MEDIUM", or "LOW"

2. "missingItems" - An array of missing critical items. Each has:
   - "category": the category
   - "itemType": what is missing (e.g., "Health Insurance Policy", "Primary Beneficiary")
   - "reason": why this is important

Focus on practical, important suggestions. Key checks:
- At least one beneficiary with a family relationship
- At least one legacy plan with assigned beneficiaries
- Critical documents in vault (medical, insurance, identity, financial)
- Financial and medical instructions
- At least one personal message
- Bank accounts and insurance policies registered

Return ONLY the raw JSON object with "suggestions" and "missingItems" arrays. No markdown styling.`;
}
