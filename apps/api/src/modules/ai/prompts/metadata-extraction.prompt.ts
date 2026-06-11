/**
 * Build the metadata extraction prompt for Gemini AI.
 * Extracts structured document metadata from OCR text.
 */
export function buildMetadataExtractionPrompt(ocrText: string, categorySlug: string): string {
  return `You are a document metadata extraction AI. Extract structured metadata from the following document text.

Document category: ${categorySlug}

Rules:
1. Extract all available fields from the document text.
2. For dates, use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ) if found.
3. If a field cannot be determined from the text, set it to null.
4. For title, generate a concise, descriptive title based on the document content.
5. For description, write a 1-2 sentence summary of the document's purpose.
6. Document numbers include policy numbers, certificate numbers, ID numbers, etc.
7. Issuer is the organization or authority that issued the document.

Document text:
"""
${ocrText.slice(0, 4000)}
"""

Respond ONLY with valid JSON in this exact format:
{
  "title": "string or null",
  "description": "string or null",
  "documentNumber": "string or null",
  "issuer": "string or null",
  "issueDate": "ISO date string or null",
  "expiryDate": "ISO date string or null"
}`;
}
