-- Add structured supplier marketplace capability fields.
ALTER TABLE "Supplier"
  ADD COLUMN "products" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "services" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "capabilities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

