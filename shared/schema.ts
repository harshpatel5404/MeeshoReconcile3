import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean, json, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firebaseUid: text("firebase_uid").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  photoURL: text("photo_url"),
  monthlyQuota: integer("monthly_quota").default(10),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  sku: text("sku").notNull(),
  title: text("title").notNull(),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }).default("0"),
  packagingCost: decimal("packaging_cost", { precision: 10, scale: 2 }).default("0"),
  finalPrice: decimal("final_price", { precision: 10, scale: 2 }).default("0"),
  gstPercent: decimal("gst_percent", { precision: 5, scale: 2 }).default("5"),
  totalOrders: integer("total_orders").default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    uniqueUserSku: unique().on(table.userId, table.sku),
    userUpdatedAtIdx: index("products_user_updated_at_idx").on(table.userId, table.updatedAt),
  };
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subOrderNo: text("sub_order_no").notNull().unique(),
  orderDate: timestamp("order_date").notNull(),
  customerState: text("customer_state"),
  productName: text("product_name").notNull(),
  sku: text("sku").notNull(),
  size: text("size"),
  quantity: integer("quantity").notNull(),
  listedPrice: decimal("listed_price", { precision: 10, scale: 2 }).notNull(),
  discountedPrice: decimal("discounted_price", { precision: 10, scale: 2 }).notNull(),
  packetId: text("packet_id"),
  reasonForCredit: text("reason_for_credit").notNull(),
  paymentStatus: text("payment_status"), // Mapped from reasonForCredit: PAID, REFUNDED, CANCELLED, etc.
  paymentDate: timestamp("payment_date"), // Date when payment was processed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subOrderNo: text("sub_order_no").notNull(),
  settlementDate: timestamp("settlement_date"),
  settlementAmount: decimal("settlement_amount", { precision: 10, scale: 2 }),
  orderValue: decimal("order_value", { precision: 10, scale: 2 }),
  commissionFee: decimal("commission_fee", { precision: 10, scale: 2 }),
  fixedFee: decimal("fixed_fee", { precision: 10, scale: 2 }),
  paymentGatewayFee: decimal("payment_gateway_fee", { precision: 10, scale: 2 }),
  adsFee: decimal("ads_fee", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    uniquePayment: unique().on(table.subOrderNo, table.settlementDate),
  };
});

export const reconciliations = pgTable("reconciliations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subOrderNo: text("sub_order_no").notNull().unique(),
  orderId: varchar("order_id").references(() => orders.id),
  paymentId: varchar("payment_id").references(() => payments.id),
  productId: varchar("product_id").references(() => products.id),
  status: text("status").notNull(), // 'reconciled', 'mismatch', 'unreconciled'
  orderValue: decimal("order_value", { precision: 10, scale: 2 }),
  settlementAmount: decimal("settlement_amount", { precision: 10, scale: 2 }),
  productCost: decimal("product_cost", { precision: 10, scale: 2 }),
  packagingCost: decimal("packaging_cost", { precision: 10, scale: 2 }),
  adsCost: decimal("ads_cost", { precision: 10, scale: 2 }),
  grossProfit: decimal("gross_profit", { precision: 10, scale: 2 }),
  netProfit: decimal("net_profit", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const uploads = pgTable("uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  fileType: text("file_type").notNull(), // 'payment_zip', 'orders_csv'
  status: text("status").notNull(), // 'processing', 'processed', 'failed'
  recordsProcessed: integer("records_processed").default(0),
  errors: json("errors"),
  sourceMonth: text("source_month"),
  label: text("label"),
  columnStructure: json("column_structure"), // Store dynamic column info
  isCurrentVersion: boolean("is_current_version").default(true),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    uploadsUsageIdx: index("uploads_usage_idx").on(table.uploadedBy, table.createdAt),
  };
});

// Enhanced products table to support dynamic columns
export const productsDynamic = pgTable("products_dynamic", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  uploadId: varchar("upload_id").references(() => uploads.id),
  dynamicData: json("dynamic_data").notNull(), // Store all dynamic column data
  sku: text("sku").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    uniqueProductUpload: unique().on(table.sku, table.uploadId),
  };
});

// Enhanced orders table to support dynamic columns  
export const ordersDynamic = pgTable("orders_dynamic", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  uploadId: varchar("upload_id").references(() => uploads.id),
  dynamicData: json("dynamic_data").notNull(), // Store all dynamic column data
  subOrderNo: text("sub_order_no").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    uniqueOrderUpload: unique().on(table.subOrderNo, table.uploadId),
  };
});

// Real-time calculation cache
export const calculationCache = pgTable("calculation_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cacheKey: text("cache_key").notNull().unique(),
  calculationType: text("calculation_type").notNull(), // 'dashboard_summary', 'product_totals', etc.
  calculationResult: json("calculation_result").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  dependsOnUploads: json("depends_on_uploads"), // Track which uploads this depends on
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  updatedAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export const insertReconciliationSchema = createInsertSchema(reconciliations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUploadSchema = createInsertSchema(uploads).omit({
  id: true,
  createdAt: true,
});

export const insertProductDynamicSchema = createInsertSchema(productsDynamic).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderDynamicSchema = createInsertSchema(ordersDynamic).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCalculationCacheSchema = createInsertSchema(calculationCache).omit({
  id: true,
  lastUpdated: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type ProductDynamic = typeof productsDynamic.$inferSelect;
export type InsertProductDynamic = z.infer<typeof insertProductDynamicSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderDynamic = typeof ordersDynamic.$inferSelect;
export type InsertOrderDynamic = z.infer<typeof insertOrderDynamicSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type Reconciliation = typeof reconciliations.$inferSelect;
export type InsertReconciliation = z.infer<typeof insertReconciliationSchema>;

export type Upload = typeof uploads.$inferSelect;
export type InsertUpload = z.infer<typeof insertUploadSchema>;

export type CalculationCache = typeof calculationCache.$inferSelect;
export type InsertCalculationCache = z.infer<typeof insertCalculationCacheSchema>;

// Dashboard Analytics Types
export interface ComprehensiveFinancialSummary {
  // Overall Financial Summary
  totalSaleAmount: number;
  settlementAmount: number;
  totalPurchaseCost: number;
  totalPackagingCost: number;
  shippingCost: number;
  totalTds: number;
  netProfit: number;

  // Orders Overview  
  totalOrders: number;
  delivered: number;
  shipped: number;
  exchanged: number;
  cancelled: number;
  returns: number;
  avgOrderValue: number;
  returnRate: number;
  ordersAwaitingPaymentRecord: number;
}

export interface SettlementComponentsData {
  component: string;
  totalAmount: number;
}

export interface EarningsOverviewData {
  description: string;
  amount: number;
}

export interface OperationalCostsData {
  type: string;
  amount: number;
}

export interface DailyVolumeData {
  date: string;
  orderVolume: number;
  aov: number;
}

export interface TopProductsData {
  sku: string;
  name: string;
  orders: number;
  revenue: number;
}

export interface TopReturnsData {
  sku: string;
  name: string;
  returns: number;
  rtoCount: number;
  combinedCount: number;
}

// Dynamic column structure types
export interface ColumnMetadata {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  required: boolean;
  description?: string;
}

export interface FileStructure {
  columns: ColumnMetadata[];
  primaryKey: string;
  totalRows: number;
  sampleData: Record<string, any>[];
}

// Live dashboard metrics
export interface LiveDashboardMetrics {
  totalProducts: number;
  totalOrders: number;
  totalSales: number;
  totalGST: number;
  profitLoss: number;
  trends: {
    sales: { date: string; value: number }[];
    gst: { date: string; value: number }[];
    profit: { date: string; value: number }[];
  };
}

// Real-time sync events
export interface SyncEvent {
  type: 'product_update' | 'order_update' | 'file_upload';
  entityId: string;
  changes: Record<string, any>;
  timestamp: Date;
}

// Orders Overview Analytics (separate from Order Status chart data)
export interface OrdersOverview {
  delivered: number;
  shipped: number;
  readyToShip: number;
  cancelled: number;
  rto: number; // RTO Complete + RTO Locked combined
  exchanged: number;
  avgOrderValue: number;
  returnRate: number; // Percentage of returns vs delivered
  awaitingPaymentOrders: number; // Delivered orders without payment records
  totalOrdersUsedForAOV: number; // Denominator for AOV calculation
}
