-- Migration to change product dimensions from integer to real (decimal)
-- This allows storing decimal values like 91.5 instead of truncating to 91

-- Update the column types to support decimal values
ALTER TABLE products 
  ALTER COLUMN length TYPE REAL,
  ALTER COLUMN breadth TYPE REAL,
  ALTER COLUMN height TYPE REAL;

-- Add a comment to document the change
COMMENT ON COLUMN products.length IS 'Product length in cm (supports decimal values)';
COMMENT ON COLUMN products.breadth IS 'Product breadth in cm (supports decimal values)';
COMMENT ON COLUMN products.height IS 'Product height in cm (supports decimal values)';
