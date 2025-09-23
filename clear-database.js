#!/usr/bin/env node

/**
 * Database Clear Script
 * This script will clear all data from the database tables
 * Run with: node clear-database.js
 */

import postgres from "postgres";
import { config } from "dotenv";

// Load environment variables
config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required");
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function clearDatabase() {
  try {
    console.log("🗑️  Starting database cleanup...");

    // Clear tables in the correct order to avoid foreign key constraint issues
    const tables = [
      'calculation_cache',
      'reconciliations', 
      'products_dynamic',
      'orders_dynamic',
      'payments',
      'orders',
      'uploads',
      'products',
      'users'
    ];

    for (const table of tables) {
      console.log(`   Clearing ${table}...`);
      const result = await sql`DELETE FROM ${sql(table)}`;
      console.log(`   ✅ Cleared ${table} (${result.count} rows deleted)`);
    }

    // Verify all tables are empty
    console.log("\n📊 Verifying tables are empty:");
    
    const counts = await sql`
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
      SELECT 'calculation_cache', COUNT(*) FROM calculation_cache
    `;

    counts.forEach(row => {
      const status = row.count === '0' ? '✅' : '❌';
      console.log(`   ${status} ${row.table_name}: ${row.count} rows`);
    });

    const totalRows = counts.reduce((sum, row) => sum + parseInt(row.count), 0);
    
    if (totalRows === 0) {
      console.log("\n🎉 Database successfully cleared! All tables are empty.");
    } else {
      console.log(`\n⚠️  Warning: ${totalRows} rows still remain in the database.`);
    }

  } catch (error) {
    console.error("❌ Error clearing database:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Confirmation prompt
console.log("⚠️  WARNING: This will delete ALL data from the database!");
console.log("   This action cannot be undone.");
console.log("   Make sure you have backups if needed.");
console.log("");

// Check if running with --force flag
const forceFlag = process.argv.includes('--force');

if (forceFlag) {
  console.log("🚀 Force flag detected, proceeding with database clear...");
  clearDatabase();
} else {
  console.log("To proceed, run: node clear-database.js --force");
  console.log("Or manually run the SQL commands in clear-database.sql");
}