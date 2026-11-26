/**
 * Pure RAG chunking and vector cosine similarity search logic
 */

export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
  pageNumber?: number;
}

/**
 * Calculates cosine similarity between two numeric vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Splits plain text into structured chunks of approximate character size with overlap
 */
export function chunkText(text: string, chunkSize = 500, chunkOverlap = 100): string[] {
  if (!text || text.trim().length === 0) return [];
  const clean = text.replace(/\r\n/g, '\n').trim();
  if (clean.length <= chunkSize) return [clean];

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < clean.length) {
    let endIndex = startIndex + chunkSize;
    if (endIndex >= clean.length) {
      chunks.push(clean.slice(startIndex).trim());
      break;
    }

    // Try to break at a paragraph or sentence boundary
    const nextNewline = clean.lastIndexOf('\n', endIndex);
    const nextPeriod = clean.lastIndexOf('. ', endIndex);
    const breakPoint = Math.max(nextNewline, nextPeriod);

    if (breakPoint > startIndex + chunkSize / 2) {
      endIndex = breakPoint + 1;
    }

    chunks.push(clean.slice(startIndex, endIndex).trim());
    startIndex = endIndex - chunkOverlap;
  }

  return chunks.filter(c => c.length > 0);
}

/**
 * Ranks chunks by cosine similarity to a query embedding and returns top K
 */
export function rankChunksBySimilarity(
  queryEmbedding: number[],
  chunks: DocumentChunk[],
  topK = 3
): { chunk: DocumentChunk; similarity: number }[] {
  const scored = chunks.map(chunk => ({
    chunk,
    similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
  }));

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topK);
}
