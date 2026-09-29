export type TextChunk = { index: number; content: string };

/**
 * Paragraph-aware chunking keeps semantic boundaries while avoiding tokenizer/provider coupling.
 * ~3,000 characters is typically 650-850 English tokens; 350 chars overlap preserves local context.
 */
export function chunkDocument(text: string, maxChars = 3000, overlapChars = 350): TextChunk[] {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  const flush = () => {
    if (!current.trim()) return;
    chunks.push(current.trim());
    const overlap = current.slice(Math.max(0, current.length - overlapChars));
    current = overlap;
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChars) {
      if (current.trim()) flush();
      for (let start = 0; start < paragraph.length; start += maxChars - overlapChars) {
        chunks.push(paragraph.slice(start, start + maxChars));
      }
      current = '';
      continue;
    }

    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxChars) flush();
    current = current ? `${current}\n\n${paragraph}` : paragraph;
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks.map((content, index) => ({ index, content }));
}
