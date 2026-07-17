-- Create the users table
CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'tech'))
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_role_check;
  END IF;
END $$;

UPDATE users
SET role = 'tech'
WHERE role IN ('manager', 'editor');

ALTER TABLE users
ADD CONSTRAINT users_role_check CHECK (role IN ('super_admin', 'admin', 'tech'));

-- Create the product categories table
CREATE TABLE IF NOT EXISTS product_categories (
  category_id SERIAL PRIMARY KEY,
  category_name TEXT NOT NULL,
  parent_category_id INTEGER,
  FOREIGN KEY (parent_category_id) REFERENCES product_categories(category_id)
);

-- Create the departments table
CREATE TABLE IF NOT EXISTS departments (
  department_id SERIAL PRIMARY KEY,
  department_name TEXT UNIQUE NOT NULL,
  manager_name TEXT,
  phone TEXT,
  extension TEXT,
  email TEXT,
  source_url TEXT
);

-- Create the products table
CREATE TABLE IF NOT EXISTS products (
  product_id SERIAL PRIMARY KEY,
  product_name TEXT NOT NULL,
  product_description TEXT,
  warranty_period TEXT,
  department_name TEXT,
  user_first_name TEXT,
  user_last_name TEXT,
  barcode TEXT UNIQUE NOT NULL,
  product_type TEXT,
  category_id INTEGER,
  part TEXT,
  brand TEXT,
  model TEXT,
  serial_number TEXT UNIQUE,
  capacity TEXT,
  purchase_date DATE,
  last_update_date TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (category_id) REFERENCES product_categories(category_id)
);

-- Create the logs table
CREATE TABLE IF NOT EXISTS logs (
  log_id SERIAL PRIMARY KEY,
  product_id INTEGER,
  operation_type TEXT NOT NULL,
  previous_data JSONB,
  new_data JSONB,
  operation_date TIMESTAMP DEFAULT NOW(),
  operator TEXT,
  changed_part TEXT,
  FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS maintenance_records (
  maintenance_id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL,
  issue_title TEXT NOT NULL,
  issue_description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  resolution_note TEXT,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_movements (
  movement_id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL,
  from_department_name TEXT,
  to_department_name TEXT,
  from_user_first_name TEXT,
  from_user_last_name TEXT,
  to_user_first_name TEXT,
  to_user_last_name TEXT,
  note TEXT,
  moved_by TEXT,
  moved_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);

INSERT INTO product_categories (category_name)
SELECT category_name
FROM (
  VALUES
    ('Bilgisayar'),
    ('Monitör'),
    ('Yazıcı'),
    ('Depolama'),
    ('Mobilya'),
    ('Ağ Ekipmanı')
) AS category_seed(category_name)
WHERE NOT EXISTS (
  SELECT 1
  FROM product_categories
  WHERE product_categories.category_name = category_seed.category_name
);

INSERT INTO departments (department_name, manager_name, phone, extension, email, source_url)
VALUES
  ('Executive Office', 'Department Manager', '+90 000 000 0000', '1001', 'executive@example.local', 'https://example.local/departments/executive-office'),
  ('Records and Correspondence Department', 'Department Manager', '+90 000 000 0000', '1002', 'records@example.local', 'https://example.local/departments/records'),
  ('Financial Services Department', 'Department Manager', '+90 000 000 0000', '1003', 'finance@example.local', 'https://example.local/departments/finance'),
  ('Public Relations Department', 'Department Manager', '+90 000 000 0000', '1004', 'public-relations@example.local', 'https://example.local/departments/public-relations'),
  ('Public Works Department', 'Department Manager', '+90 000 000 0000', '1005', 'public-works@example.local', 'https://example.local/departments/public-works'),
  ('Urban Planning Department', 'Department Manager', '+90 000 000 0000', '1006', 'planning@example.local', 'https://example.local/departments/urban-planning'),
  ('Licensing and Inspection Department', 'Department Manager', '+90 000 000 0000', '1007', 'licensing@example.local', 'https://example.local/departments/licensing'),
  ('Human Resources Department', 'Department Manager', '+90 000 000 0000', '1008', 'hr@example.local', 'https://example.local/departments/human-resources'),
  ('Support Services Department', 'Department Manager', '+90 000 000 0000', '1009', 'support@example.local', 'https://example.local/departments/support-services'),
  ('Cleaning Services Department', 'Department Manager', '+90 000 000 0000', '1010', 'cleaning@example.local', 'https://example.local/departments/cleaning-services'),
  ('Real Estate Department', 'Department Manager', '+90 000 000 0000', '1011', 'real-estate@example.local', 'https://example.local/departments/real-estate'),
  ('Municipal Police Department', 'Department Manager', '+90 000 000 0000', '1012', 'municipal-police@example.local', 'https://example.local/departments/municipal-police'),
  ('Legal Affairs Department', 'Department Manager', '+90 000 000 0000', '1013', 'legal@example.local', 'https://example.local/departments/legal-affairs'),
  ('Project Planning Department', 'Department Manager', '+90 000 000 0000', '1014', 'projects@example.local', 'https://example.local/departments/project-planning'),
  ('Neighborhood Affairs Department', 'Department Manager', '+90 000 000 0000', '1015', 'neighborhood@example.local', 'https://example.local/departments/neighborhood-affairs'),
  ('Youth and Sports Department', 'Department Manager', '+90 000 000 0000', '1016', 'sports@example.local', 'https://example.local/departments/youth-sports'),
  ('Childcare Services Department', 'Department Manager', '+90 000 000 0000', '1017', 'childcare@example.local', 'https://example.local/departments/childcare'),
  ('Health Services Department', 'Department Manager', '+90 000 000 0000', '1018', 'health@example.local', 'https://example.local/departments/health-services'),
  ('IT Department', 'Department Manager', '+90 000 000 0000', '1019', 'it@example.local', 'https://example.local/departments/it'),
  ('Parks and Gardens Department', 'Department Manager', '+90 000 000 0000', '1020', 'parks@example.local', 'https://example.local/departments/parks-gardens'),
  ('Culture and Social Affairs Department', 'Department Manager', '+90 000 000 0000', '1021', 'culture@example.local', 'https://example.local/departments/culture-social-affairs'),
  ('Inspection Board', 'Department Manager', '+90 000 000 0000', '1022', 'inspection@example.local', 'https://example.local/departments/inspection-board'),
  ('Climate and Zero Waste Department', 'Department Manager', '+90 000 000 0000', '1023', 'climate@example.local', 'https://example.local/departments/climate-zero-waste'),
  ('Disaster Affairs Department', 'Department Manager', '+90 000 000 0000', '1024', 'disaster@example.local', 'https://example.local/departments/disaster-affairs'),
  ('Veterinary Services Department', 'Department Manager', '+90 000 000 0000', '1025', 'veterinary@example.local', 'https://example.local/departments/veterinary-services')
ON CONFLICT (department_name)
DO UPDATE SET
  manager_name = EXCLUDED.manager_name,
  phone = EXCLUDED.phone,
  extension = EXCLUDED.extension,
  email = EXCLUDED.email,
  source_url = EXCLUDED.source_url;
