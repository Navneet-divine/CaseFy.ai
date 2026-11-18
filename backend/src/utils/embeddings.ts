import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

/**
 * Splits a long string of text into smaller chunks with overlap,
 * attempting to preserve word boundaries (not breaking words in half).
 */
export function chunkText(
  text: string,
  chunkSize: number = 1000,
  chunkOverlap: number = 200
): string[] {
  if (!text || text.trim() === "") return [];

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;

    if (endIndex > text.length) {
      endIndex = text.length;
    } else {
      // Find the last space within the last 200 characters of the chunk boundary
      // to avoid cutting a word in the middle.
      const lastSpace = text.lastIndexOf(" ", endIndex);
      if (lastSpace > startIndex + chunkSize - 200) {
        endIndex = lastSpace;
      }
    }

    const chunk = text.substring(startIndex, endIndex).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    startIndex = endIndex - chunkOverlap;
    if (startIndex >= text.length - chunkOverlap) {
      // Prevent infinite loop if we are very close to the end
      break;
    }
  }

  return chunks;
}

/**
 * Generates an embedding vector for a single text string using gemini-embedding-001.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const result = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: text,
    });
    const embedding = result.embeddings?.[0]?.values;
    if (!embedding) {
      throw new Error("No embedding values returned from GoogleGenAI");
    }
    return embedding;
  } catch (error) {
    console.error("Error generating single embedding:", error);
    throw error;
  }
}

/**
 * Generates embeddings for multiple texts using Gemini batch embedding API.
 * Falls back to sequential request calls if batching fails or is unsupported.
 */
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  if (!texts || texts.length === 0) return [];

  try {
    // Batch embed content limit is usually 100 requests per batch call
    const batchLimit = 50;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchLimit) {
      const batch = texts.slice(i, i + batchLimit);
      const result = await ai.models.embedContent({
        model: "gemini-embedding-001",
        contents: batch,
      });

      if (result.embeddings) {
        for (const emb of result.embeddings) {
          if (emb.values) {
            allEmbeddings.push(emb.values);
          }
        }
      } else {
        throw new Error("No embeddings returned from GoogleGenAI");
      }
    }

    return allEmbeddings;
  } catch (error) {
    console.warn("Batch embedding failed, falling back to sequential calls:", error);
    const fallbackEmbeddings: number[][] = [];
    for (const text of texts) {
      const embedding = await getEmbedding(text);
      fallbackEmbeddings.push(embedding);
    }
    return fallbackEmbeddings;
  }
}

/**
 * Computes the cosine similarity between two numeric vectors of equal length.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
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
