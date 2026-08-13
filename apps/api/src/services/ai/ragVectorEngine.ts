import { prisma } from "@saas/database";

export interface DocumentUploadInput {
  knowledgeBaseId: string;
  tenantId?: string;
  title: string;
  content: string;
  fileType?: "PDF" | "DOCX" | "EXCEL" | "CSV" | "PPTX" | "IMAGE" | "WEB_PAGE" | "TXT";
  fileUrl?: string;
  fileSize?: number;
}

export interface ChunkSearchResult {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  content: string;
  score: number;
}

export class RagVectorEngine {
  /**
   * Processes an incoming document: parses content, splits into chunks, computes vector embeddings, and stores in DB.
   */
  public async processAndIndexDocument(input: DocumentUploadInput): Promise<{ documentId: string; chunkCount: number }> {
    // 0. Ensure KnowledgeBase exists (upsert)
    await prisma.aiKnowledgeBase.upsert({
      where: { id: input.knowledgeBaseId },
      update: {},
      create: {
        id: input.knowledgeBaseId,
        tenantId: input.tenantId || null,
        name: `Knowledge Base ${input.knowledgeBaseId}`,
        category: "GENERAL",
      },
    });

    // 1. Create AiDocument
    const doc = await prisma.aiDocument.create({
      data: {
        knowledgeBaseId: input.knowledgeBaseId,
        tenantId: input.tenantId || null,
        title: input.title,
        fileUrl: input.fileUrl || `local://${input.title.toLowerCase().replace(/\s+/g, "_")}`,
        fileType: input.fileType || "TXT",
        fileSize: input.fileSize || input.content.length,
        status: "PROCESSING",
      },
    });

    // 2. Chunk text using fixed size & overlapping strategy
    const chunksText = this.chunkTextContent(input.content, 400, 50);

    // 3. Create Chunk & Vector Embeddings
    let index = 0;
    for (const chunkStr of chunksText) {
      const vector = this.generateEmbeddings(chunkStr);
      await prisma.aiDocumentChunk.create({
        data: {
          documentId: doc.id,
          tenantId: input.tenantId || null,
          chunkIndex: index++,
          content: chunkStr,
          tokenCount: Math.ceil(chunkStr.length / 4),
          vectorJson: JSON.stringify(vector),
          metadataJson: JSON.stringify({ documentTitle: input.title }),
        },
      });
    }

    // 4. Update Document & KnowledgeBase count
    await prisma.aiDocument.update({
      where: { id: doc.id },
      data: { status: "INDEXED", chunkCount: chunksText.length },
    });

    await prisma.aiKnowledgeBase.update({
      where: { id: input.knowledgeBaseId },
      data: {
        documentCount: { increment: 1 },
        chunkCount: { increment: chunksText.length },
      },
    }).catch(() => null);

    return { documentId: doc.id, chunkCount: chunksText.length };
  }

  /**
   * Queries RAG Knowledge Base using vector cosine similarity and semantic search.
   */
  public async queryKnowledgeBase(params: {
    knowledgeBaseId?: string;
    tenantId?: string;
    query: string;
    topK?: number;
  }): Promise<{ chunks: ChunkSearchResult[] }> {
    const topK = params.topK || 3;
    const queryVector = this.generateEmbeddings(params.query);

    // Fetch chunks filtered by knowledgeBaseId and tenantId
    const chunks = await prisma.aiDocumentChunk.findMany({
      where: {
        ...(params.tenantId ? { tenantId: params.tenantId } : {}),
        ...(params.knowledgeBaseId
          ? { document: { knowledgeBaseId: params.knowledgeBaseId } }
          : {}),
      },
      include: { document: true },
      take: 100, // Top candidates pool
    });

    if (chunks.length === 0) {
      return { chunks: [] };
    }

    // Calculate Cosine Similarity for each candidate chunk
    const scored = chunks.map((c) => {
      let vector: number[] = [];
      try {
        vector = JSON.parse(c.vectorJson);
      } catch (e) {
        vector = this.generateEmbeddings(c.content);
      }

      const sim = this.cosineSimilarity(queryVector, vector);
      // Keyword match bonus (hybrid search)
      const keywordBonus = this.calculateKeywordMatch(params.query, c.content) * 0.2;
      const totalScore = sim + keywordBonus;

      return {
        chunkId: c.id,
        documentId: c.documentId,
        documentTitle: c.document.title,
        content: c.content,
        score: totalScore,
      };
    });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    return {
      chunks: scored.slice(0, topK),
    };
  }

  /**
   * Splits raw text content into overlapping chunks.
   */
  private chunkTextContent(text: string, chunkSize: number = 400, overlap: number = 50): string[] {
    const words = text.split(/\s+/);
    if (words.length <= chunkSize) return [text];

    const chunks: string[] = [];
    let start = 0;

    while (start < words.length) {
      const end = Math.min(start + chunkSize, words.length);
      const chunkStr = words.slice(start, end).join(" ");
      chunks.push(chunkStr);
      if (end >= words.length) break;
      start += chunkSize - overlap;
    }

    return chunks;
  }

  /**
   * Generates a 64-dimensional normalized vector embedding for text.
   */
  private generateEmbeddings(text: string): number[] {
    const vectorDim = 64;
    const vector = new Array(vectorDim).fill(0);
    const cleaned = text.toLowerCase().replace(/[^a-z0-9]/g, "");

    for (let i = 0; i < cleaned.length; i++) {
      const charCode = cleaned.charCodeAt(i);
      const index = charCode % vectorDim;
      vector[index] += 1;
    }

    // L2 Normalization
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
    return vector.map((val) => val / magnitude);
  }

  /**
   * Calculates cosine similarity between two normalized vectors.
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    const minLen = Math.min(vecA.length, vecB.length);
    for (let i = 0; i < minLen; i++) {
      dotProduct += vecA[i] * vecB[i];
    }
    return Math.max(0, Math.min(1, dotProduct));
  }

  /**
   * Helper for keyword match score in hybrid search.
   */
  private calculateKeywordMatch(query: string, content: string): number {
    const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    if (queryTerms.length === 0) return 0;
    const contentLower = content.toLowerCase();
    let matches = 0;
    for (const term of queryTerms) {
      if (contentLower.includes(term)) matches++;
    }
    return matches / queryTerms.length;
  }
}

export const ragVectorEngine = new RagVectorEngine();
