-- Enable pgvector extension (Neon supports it natively)
CREATE EXTENSION IF NOT EXISTS vector;

-- Convert embedding column from BYTEA (float32 LE) to vector(1536)
-- Step 1: Add new vector column
ALTER TABLE raw_posts ADD COLUMN embedding_vec vector(1536);

-- Step 2: Convert existing BYTEA data to vector format
-- BYTEA stores 1536 float32 values in little-endian format (6144 bytes total)
-- We use a PL/pgSQL function for the conversion
CREATE OR REPLACE FUNCTION _bytea_to_vector(b BYTEA) RETURNS vector AS $$
DECLARE
  dims INT := 1536;
  vals FLOAT8[];
  i INT;
  b0 INT; b1 INT; b2 INT; b3 INT;
  raw_int INT;
  sign INT;
  exponent INT;
  mantissa FLOAT8;
  val FLOAT8;
BEGIN
  IF b IS NULL OR octet_length(b) != dims * 4 THEN
    RETURN NULL;
  END IF;

  vals := ARRAY[]::FLOAT8[];

  FOR i IN 0..dims-1 LOOP
    -- Read 4 bytes in little-endian order
    b0 := get_byte(b, i * 4);
    b1 := get_byte(b, i * 4 + 1);
    b2 := get_byte(b, i * 4 + 2);
    b3 := get_byte(b, i * 4 + 3);

    -- Reconstruct 32-bit integer (little-endian)
    raw_int := b0 | (b1 << 8) | (b2 << 16) | (b3 << 24);

    -- IEEE 754 float32 decode
    IF raw_int = 0 OR raw_int = -2147483648 THEN
      val := 0.0;
    ELSE
      sign := CASE WHEN (raw_int >> 31) & 1 = 1 THEN -1 ELSE 1 END;
      exponent := ((raw_int >> 23) & 255) - 127;
      mantissa := 1.0 + ((raw_int & 8388607)::FLOAT8 / 8388608.0);
      val := sign * mantissa * power(2.0, exponent);
    END IF;

    vals := array_append(vals, val);
  END LOOP;

  RETURN vals::vector;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 3: Backfill existing embeddings
UPDATE raw_posts
SET embedding_vec = _bytea_to_vector(embedding)
WHERE embedding IS NOT NULL;

-- Step 4: Drop old BYTEA column, rename new column
ALTER TABLE raw_posts DROP COLUMN embedding;
ALTER TABLE raw_posts RENAME COLUMN embedding_vec TO embedding;

-- Step 5: Create HNSW index for cosine similarity search
CREATE INDEX idx_raw_posts_embedding ON raw_posts
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Cleanup: drop conversion function
DROP FUNCTION _bytea_to_vector(BYTEA);
