import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firebaseUid: text("firebase_uid").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  photoURL: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sku: text("sku").notNull().unique(),
  title: text("title").notNull(),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }).default("0"),
  packagingCost: decimal("packaging_cost", { precision: 10, scale: 2 }).default("0"),
  gstPercent: decimal("gst_percent", { precision: 5, scale: 2 }).default("18"),
  totalOrders: integer("total_orders").default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type Reconciliation = typeof reconciliations.$inferSelect;
export type InsertReconciliation = z.infer<typeof insertReconciliationSchema>;

export type Upload = typeof uploads.$inferSelect;
export type InsertUpload = z.infer<typeof insertUploadSchema>;
