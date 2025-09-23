-- Clear Database Script
-- This will delete all data from all tables in the correct order to avoid foreign key constraints

-- Clear calculation cache first (no dependencies)
DELETE FROM calculation_cache;

-- Clear reconciliations (references orders, payments, products)
DELETE FROM reconciliations;

-- Clear dynamic tables (reference uploads)
DELETE FROM products_dynamic;
DELETE FROM orders_dynamic;

-- Clear payments (no foreign key dependencies)
DELETE FROM payments;

-- Clear orders (no foreign key dependencies)
DELETE FROM orders;

-- Clear uploads (references users)
DELETE FROM uploads;

-- Clear products (references users)
DELETE FROM products;

-- Clear users last (referenced by other tables)
DELETE FROM users;

-- Reset sequences if needed (PostgreSQL auto-generates UUIDs, so this might not be necessary)
-- But we can verify the tables are empty

-- Verify all tables are empty
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'reconciliations', COUNT(*) FROM reconciliations
UNION ALL
SELECT 'uploads', COUNT(*) FROM uploads
UNION ALL
SELECT 'products_dynamic', COUNT(*) FROM products_dynamic
UNION ALL
SELECT 'orders_dynamic', COUNT(*) FROM orders_dynamic
UNION ALL
SELECT 'calculation_cache', COUNT(*) FROM calculation_cache;