-- Add multiple images and description to products table
ALTER TABLE products 
ADD COLUMN image_urls TEXT[],
ADD COLUMN description TEXT,
ADD COLUMN status TEXT DEFAULT 'active';

-- Create feedback table
CREATE TABLE feedback (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  product_id INTEGER,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT FALSE,
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_feedback_user_id ON feedback(user_id);
CREATE INDEX idx_feedback_product_id ON feedback(product_id);
CREATE INDEX idx_feedback_is_approved ON feedback(is_approved);
CREATE INDEX idx_feedback_is_published ON feedback(is_published);
CREATE INDEX idx_feedback_rating ON feedback(rating);
CREATE INDEX idx_products_status ON products(status);
