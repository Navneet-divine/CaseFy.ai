PDF Upload
      │
      ▼
Extract Text
      │
      ▼
Split into Chunks
      │
      ▼
Generate Embeddings for each chunk
      │
      ▼
Store:
- Chunk text
- Embedding
      │
      ▼
──────────────────────────────────────
Later...
──────────────────────────────────────
User asks:
"Is there anything related to Navneet Kushwaha?"
      │
      ▼
Generate embedding for the user's question
      │
      ▼
MongoDB Atlas Vector Search compares:
Question embedding
        VS
Stored chunk embeddings
      │
      ▼
Returns the most similar chunks
      │
      ▼
Build a context from those chunks
      │
      ▼
Send:
- User's original question
- Retrieved context
to the LLM
      │
      ▼
LLM generates a natural-language answer