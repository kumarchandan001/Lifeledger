/**
 * Build the tag generation prompt for Gemini AI.
 * Generates search-optimized tags for document discovery.
 */
export function buildTagGenerationPrompt(
  ocrText: string,
  categorySlug: string,
  metadata: Record<string, unknown>,
): string {
  const metadataStr = JSON.stringify(metadata, null, 2);

  return `You are a document tagging AI. Generate relevant search tags for the following document to optimize discoverability.

Document category: ${categorySlug}
Extracted metadata: ${metadataStr}

Rules:
1. Generate 5-15 relevant tags.
2. Tags should be lowercase, single words or short phrases (max 3 words).
3. Include a mix of:
   - Category tags (e.g., "insurance", "medical", "identity")
   - Context tags (e.g., "government", "hospital", "bank")
   - Content tags derived from document specifics (e.g., "passport", "tax-return", "policy")
   - Action tags (e.g., "renewal", "claim", "application")
4. Do NOT include personal identifiable information (names, numbers, addresses).
5. Tags should help a user find this document when searching.

Document text:
"""
${ocrText.slice(0, 3000)}
"""

Respond ONLY with valid JSON in this exact format:
{
  "tags": ["tag1", "tag2", "tag3", ...],
  "reasoning": "brief explanation of tag choices"
}`;
}
