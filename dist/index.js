var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/services/csvProcessor.ts
var csvProcessor_exports = {};
__export(csvProcessor_exports, {
  CSVProcessor: () => CSVProcessor
});
import { Readable } from "stream";
import csv from "csv-parser";
var CSVProcessor;
var init_csvProcessor = __esm({
  "server/services/csvProcessor.ts"() {
    "use strict";
    CSVProcessor = class {
      static sanitizeNumericField(value) {
        if (typeof value === "number") return value;
        if (typeof value !== "string") return 0;
        const cleaned = value.replace(/[₹,\s]/g, "").trim();
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      }
      static parseDate(dateString) {
        if (!dateString) return /* @__PURE__ */ new Date();
        const trimmed = dateString.trim();
        const parsed = new Date(trimmed);
        if (isNaN(parsed.getTime())) {
          const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (ddmmyyyy) {
            return new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
          }
        }
        return isNaN(parsed.getTime()) ? /* @__PURE__ */ new Date() : parsed;
      }
      // Map order status from CSV to standard order status
      static normalizeOrderStatus(reasonForCredit) {
        if (!reasonForCredit) return "Unknown";
        const reason = reasonForCredit.toUpperCase().trim();
        switch (reason) {
          case "DELIVERED":
            return "Delivered";
          case "CANCELLED":
          case "CANCELED":
            return "Cancelled";
          case "RTO_COMPLETE":
          case "RTO_LOCKED":
          case "RTO_OFD":
            return "RTO";
          case "RETURN":
          case "RETURNED":
            return "Return";
          default:
            return "Unknown";
        }
      }
      // Calculate payment status based on order status and settlement amount
      static calculatePaymentStatus(orderStatus, settlementAmount = 0) {
        const normalizedStatus = orderStatus.trim();
        if (normalizedStatus === "Cancelled") {
          return "N/A";
        } else if (normalizedStatus === "Delivered") {
          if (settlementAmount > 0) {
            return "Paid";
          } else {
            return "N/A";
          }
        } else if (normalizedStatus === "RTO") {
          return "Unpaid/Zero";
        } else if (normalizedStatus === "Return") {
          if (settlementAmount < 0) {
            return "Refunded";
          } else {
            return "N/A";
          }
        } else {
          return "N/A";
        }
      }
      static mapPaymentStatus(reasonForCredit) {
        const normalizedStatus = this.normalizeOrderStatus(reasonForCredit);
        return this.calculatePaymentStatus(normalizedStatus, 0);
      }
      static isPaymentCompleted(reasonForCredit) {
        if (!reasonForCredit) return false;
        const reason = reasonForCredit.toLowerCase().trim();
        return reason.includes("delivery completed") || reason.includes("delivered") || reason.includes("settlement");
      }
      // Enhanced field mapping for different CSV formats
      static getFieldValue(row, fieldAliases) {
        for (const alias of fieldAliases) {
          if (row[alias] !== void 0 && row[alias] !== null) {
            return String(row[alias]).trim();
          }
        }
        return "";
      }
      static async processOrdersCSV(buffer) {
        const orders2 = [];
        const errors = [];
        let processedCount = 0;
        let headers = [];
        const productMetadata = /* @__PURE__ */ new Map();
        return new Promise((resolve) => {
          const stream = Readable.from(buffer);
          stream.pipe(csv()).on("headers", (headerList) => {
            headers = headerList;
            console.log("CSV Headers detected:", headers);
          }).on("data", (row) => {
            try {
              processedCount++;
              const subOrderNo = this.getFieldValue(row, [
                "Sub Order No",
                "subOrderNo",
                "sub_order_no",
                "Sub Order ID"
              ]);
              const orderDate = this.getFieldValue(row, [
                "Order Date",
                "orderDate",
                "order_date",
                "OrderDate",
                "ORDER_DATE",
                "Date",
                "Created Date"
              ]);
              const productName = this.getFieldValue(row, [
                "Product Name",
                "Item Name",
                "Title",
                "Product Title",
                "Product",
                "Item",
                "Name"
              ]);
              const sku = this.getFieldValue(row, [
                "SKU",
                "sku",
                "Product SKU",
                "Item SKU",
                "Product Code",
                "Item Code"
              ]);
              const reasonForCredit = this.getFieldValue(row, [
                "Reason for Credit Entry",
                "reasonForCredit",
                "reason_for_credit",
                "Status",
                "Order Status",
                "Payment Status",
                "Credit Reason"
              ]);
              const gstPercent = this.getFieldValue(row, [
                "GST %",
                "GST Percent",
                "Product GST %",
                "Tax %",
                "Tax Percent",
                "GST",
                "gst_percent",
                "gstPercent",
                "Product Tax %"
              ]);
              const costPrice = this.getFieldValue(row, [
                "Cost Price",
                "costPrice",
                "cost_price",
                "Product Cost",
                "Purchase Price",
                "Base Cost",
                "Manufacturing Cost",
                "Item Cost"
              ]);
              const missingFields = [];
              if (!subOrderNo) missingFields.push("Sub Order No");
              if (!productName) missingFields.push("Product Name");
              if (!sku) missingFields.push("SKU");
              if (missingFields.length > 0) {
                errors.push(`Row ${processedCount}: Missing required fields: ${missingFields.join(", ")}. Available columns: ${headers.slice(0, 5).join(", ")}...`);
                return;
              }
              const order = {
                subOrderNo,
                orderDate: this.parseDate(orderDate),
                customerState: this.getFieldValue(row, [
                  "Customer State",
                  "customerState",
                  "customer_state",
                  "State",
                  "Buyer State",
                  "Delivery State"
                ]),
                productName,
                sku,
                size: this.getFieldValue(row, [
                  "Size",
                  "size",
                  "Product Size",
                  "Variant",
                  "SIZE",
                  "Item Size"
                ]) || "Free Size",
                quantity: parseInt(this.getFieldValue(row, [
                  "Quantity",
                  "quantity",
                  "qty",
                  "Qty",
                  "QTY",
                  "Item Quantity",
                  "Order Quantity"
                ]) || "1") || 1,
                listedPrice: this.sanitizeNumericField(
                  this.getFieldValue(row, [
                    "Supplier Listed Price (Incl. GST + Commission)",
                    "Listed Price",
                    "listedPrice",
                    "Sale Price",
                    "Supplier Listed Price",
                    "Sale Amount",
                    "Price",
                    "Listed Price (Incl. GST)",
                    "Original Price"
                  ])
                ).toString(),
                discountedPrice: this.sanitizeNumericField(
                  this.getFieldValue(row, [
                    "Supplier Discounted Price (Incl GST and Commision)",
                    "Discounted Price",
                    "discountedPrice",
                    "Final Sale Amount",
                    "Final Price",
                    "Net Price",
                    "Selling Price",
                    "Discounted Sale Price",
                    "Final Sale Price"
                  ])
                ).toString(),
                packetId: this.getFieldValue(row, [
                  "Packet Id",
                  "packetId",
                  "packet_id",
                  "PacketID",
                  "PACKET_ID",
                  "Packet No",
                  "Package ID"
                ]),
                reasonForCredit: reasonForCredit || "",
                // Enhanced payment data extraction from CSV (initial status without settlement data)
                paymentStatus: this.mapPaymentStatus(reasonForCredit),
                paymentDate: this.isPaymentCompleted(reasonForCredit) ? this.parseDate(orderDate) : void 0
              };
              orders2.push(order);
              if (sku && productName) {
                const metadata = {
                  sku,
                  productName,
                  gstPercent: 5
                  // Default to 5% GST based on real payment file analysis
                };
                if (gstPercent) {
                  const gstValue = this.sanitizeNumericField(gstPercent);
                  if (gstValue > 0) {
                    metadata.gstPercent = gstValue;
                  }
                }
                if (costPrice) {
                  const costValue = this.sanitizeNumericField(costPrice);
                  if (costValue > 0) {
                    metadata.costPrice = costValue;
                  }
                }
                productMetadata.set(sku, metadata);
              }
            } catch (error) {
              errors.push(`Row ${processedCount}: Processing error - ${error}`);
            }
          }).on("end", () => {
            const productMetadataArray = Array.from(productMetadata.values());
            console.log(`CSV Processing complete: ${orders2.length} orders processed, ${productMetadataArray.length} product metadata records, ${errors.length} errors`);
            resolve({ orders: orders2, errors, processedCount, productMetadata: productMetadataArray });
          }).on("error", (error) => {
            errors.push(`CSV parsing error: ${error}`);
            resolve({ orders: orders2, errors, processedCount });
          });
        });
      }
    };
  }
});

// server/services/zipProcessor.ts
var zipProcessor_exports = {};
__export(zipProcessor_exports, {
  ZIPProcessor: () => ZIPProcessor
});
import AdmZip from "adm-zip";
import * as XLSX from "xlsx";
var ZIPProcessor;
var init_zipProcessor = __esm({
  "server/services/zipProcessor.ts"() {
    "use strict";
    ZIPProcessor = class {
      static sanitizeNumericField(value) {
        if (typeof value === "number") return value;
        if (typeof value !== "string") return 0;
        const cleaned = value.replace(/[₹,\s]/g, "").trim();
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      }
      static parseDate(dateValue) {
        if (!dateValue) return /* @__PURE__ */ new Date();
        if (dateValue instanceof Date) return dateValue;
        if (typeof dateValue === "number") {
          const excelEpoch = new Date(1900, 0, 1);
          const days = dateValue - 2;
          return new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1e3);
        }
        if (typeof dateValue === "string") {
          const trimmed = dateValue.trim();
          let parsed = new Date(trimmed);
          if (!isNaN(parsed.getTime())) return parsed;
          const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (ddmmyyyy) {
            return new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
          }
          const mmddyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (mmddyyyy) {
            return new Date(parseInt(mmddyyyy[3]), parseInt(mmddyyyy[1]) - 1, parseInt(mmddyyyy[2]));
          }
        }
        return /* @__PURE__ */ new Date();
      }
      static async extractFilesFromZip(buffer) {
        try {
          const zip = new AdmZip(buffer);
          const zipEntries = zip.getEntries();
          const files = [];
          zipEntries.forEach((entry) => {
            if (!entry.isDirectory) {
              const filename = entry.entryName.toLowerCase();
              let type = "unknown";
              if (filename.endsWith(".xlsx")) {
                type = "xlsx";
              } else if (filename.endsWith(".csv")) {
                type = "csv";
              } else if (filename.endsWith(".xls")) {
                type = "xls";
              }
              if (type !== "unknown") {
                files.push({
                  buffer: entry.getData(),
                  filename: entry.entryName,
                  type
                });
              }
            }
          });
          return files;
        } catch (error) {
          console.error("Error extracting files from ZIP:", error);
          return [];
        }
      }
      static async processPaymentXLSX(buffer, filename) {
        const payments2 = [];
        const errors = [];
        let processedCount = 0;
        const productGstData = [];
        const orderStatusData = [];
        try {
          const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
          let targetSheet = "Order Payments";
          if (!workbook.Sheets[targetSheet]) {
            targetSheet = workbook.SheetNames[0];
            console.log(`Order Payments sheet not found in ${filename}, using: ${targetSheet}`);
          } else {
            console.log(`Processing Order Payments sheet in ${filename}`);
          }
          const worksheet = workbook.Sheets[targetSheet];
          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          if (rawData.length < 2) {
            errors.push(`${filename}: No data found in Excel file`);
            return { payments: payments2, errors, processedCount };
          }
          let headerRowIndex = -1;
          let headers = [];
          for (let i = 0; i < Math.min(5, rawData.length); i++) {
            const row = rawData[i];
            if (row && row.length > 5 && (row.some((cell) => cell && cell.toString().toLowerCase().includes("sub order")) || row[0] === "Sub Order No")) {
              headerRowIndex = i;
              headers = row.map((h) => h ? h.toString() : "");
              break;
            }
          }
          if (headerRowIndex === -1 || headers.length === 0) {
            errors.push(`${filename}: Could not find header row with Sub Order No`);
            return { payments: payments2, errors, processedCount };
          }
          console.log(`Found headers at row ${headerRowIndex} in ${filename}:`, headers.slice(0, 10));
          const subOrderIndex = headers.findIndex((h) => h === "Sub Order No");
          const settlementIndex = headers.findIndex((h) => h === "Final Settlement Amount");
          const dateIndex = headers.findIndex((h) => h === "Payment Date");
          const gstIndex = headers.findIndex((h) => h === "Product GST %");
          const productNameIndex = headers.findIndex((h) => h === "Product Name");
          const skuIndex = headers.findIndex((h) => h === "Supplier SKU");
          const orderStatusIndex = headers.findIndex((h) => h === "Live Order Status");
          const orderDateIndex = headers.findIndex((h) => h === "Order Date");
          const totalSaleIndex = headers.findIndex((h) => h === "Total Sale Amount (Incl. Shipping & GST)");
          if (subOrderIndex === -1) {
            errors.push(`${filename}: Could not find Sub Order No column. Available headers: ${headers.slice(0, 10).join(", ")}`);
            return { payments: payments2, errors, processedCount };
          }
          console.log(`Column detection for ${filename}:`);
          console.log(`- Sub Order No: "${headers[subOrderIndex]}" (index ${subOrderIndex})`);
          console.log(`- Settlement Amount: ${settlementIndex >= 0 ? `"${headers[settlementIndex]}" (index ${settlementIndex})` : "NOT FOUND"}`);
          console.log(`- Date: ${dateIndex >= 0 ? `"${headers[dateIndex]}" (index ${dateIndex})` : "NOT FOUND"}`);
          console.log(`- GST %: ${gstIndex >= 0 ? `"${headers[gstIndex]}" (index ${gstIndex})` : "NOT FOUND"}`);
          console.log(`- Product Name: ${productNameIndex >= 0 ? `"${headers[productNameIndex]}" (index ${productNameIndex})` : "NOT FOUND"}`);
          console.log(`- SKU: ${skuIndex >= 0 ? `"${headers[skuIndex]}" (index ${skuIndex})` : "NOT FOUND"}`);
          console.log(`- Order Status: ${orderStatusIndex >= 0 ? `"${headers[orderStatusIndex]}" (index ${orderStatusIndex})` : "NOT FOUND"}`);
          console.log(`- Order Date: ${orderDateIndex >= 0 ? `"${headers[orderDateIndex]}" (index ${orderDateIndex})` : "NOT FOUND"}`);
          console.log(`- Total Sale Amount: ${totalSaleIndex >= 0 ? `"${headers[totalSaleIndex]}" (index ${totalSaleIndex})` : "NOT FOUND"}`);
          if (settlementIndex === -1) {
            console.warn(`${filename}: Settlement amount column not found. Payment amounts will be set to 0.`);
          }
          if (dateIndex === -1) {
            console.warn(`${filename}: Date column not found. Using current date as fallback.`);
          }
          for (let i = headerRowIndex + 1; i < rawData.length; i++) {
            try {
              const row = rawData[i];
              if (!row || row.length === 0) continue;
              processedCount++;
              const subOrderNo = row[subOrderIndex]?.toString().trim();
              if (!subOrderNo) {
                continue;
              }
              const settlementAmount = settlementIndex !== -1 ? this.sanitizeNumericField(row[settlementIndex]) : 0;
              const settlementDate = dateIndex !== -1 ? this.parseDate(row[dateIndex]) : /* @__PURE__ */ new Date();
              if (gstIndex !== -1 && skuIndex !== -1) {
                const gstValue = row[gstIndex];
                const skuValue = row[skuIndex]?.toString().trim();
                const productNameValue = productNameIndex !== -1 ? row[productNameIndex]?.toString().trim() : "";
                if (skuValue && gstValue !== void 0 && gstValue !== null) {
                  const gstPercent = this.sanitizeNumericField(gstValue);
                  if (gstPercent > 0) {
                    productGstData.push({
                      sku: skuValue,
                      gstPercent,
                      productName: productNameValue || ""
                    });
                  }
                }
              }
              if (orderStatusIndex !== -1) {
                const orderStatusValue = row[orderStatusIndex]?.toString().trim();
                if (orderStatusValue) {
                  orderStatusData.push({
                    subOrderNo,
                    orderStatus: orderStatusValue
                  });
                }
              }
              const payment = {
                subOrderNo,
                settlementAmount: settlementAmount.toString(),
                settlementDate,
                orderValue: totalSaleIndex !== -1 ? this.sanitizeNumericField(row[totalSaleIndex]).toString() : "0",
                commissionFee: "0",
                // Default to 0 instead of empty string
                fixedFee: "0",
                // Default to 0 instead of empty string
                paymentGatewayFee: "0",
                // Default to 0 instead of empty string
                adsFee: "0"
                // Default to 0 instead of empty string
              };
              payments2.push(payment);
            } catch (error) {
              errors.push(`${filename} Row ${i + 1}: Processing error - ${error}`);
            }
          }
        } catch (error) {
          errors.push(`${filename}: XLSX processing error - ${error}`);
        }
        console.log(`${filename}: Processed ${payments2.length} payments, ${productGstData.length} product GST records, ${orderStatusData.length} order status records, ${errors.length} errors`);
        return { payments: payments2, errors, processedCount, productGstData, orderStatusData };
      }
      static async processPaymentZIP(buffer) {
        const allPayments = [];
        const allErrors = [];
        let totalProcessed = 0;
        const allProductGstData = [];
        const allOrderStatusData = [];
        try {
          const files = await this.extractFilesFromZip(buffer);
          if (files.length === 0) {
            return {
              payments: [],
              errors: ["No supported files found in ZIP archive"],
              processedCount: 0
            };
          }
          console.log(`Found ${files.length} files in ZIP:`, files.map((f) => f.filename));
          for (const file of files) {
            try {
              if (file.type === "xlsx" || file.type === "xls") {
                console.log(`Processing XLSX file: ${file.filename}`);
                const result = await this.processPaymentXLSX(file.buffer, file.filename);
                allPayments.push(...result.payments);
                allErrors.push(...result.errors);
                totalProcessed += result.processedCount;
                if (result.productGstData) {
                  allProductGstData.push(...result.productGstData);
                }
                if (result.orderStatusData) {
                  allOrderStatusData.push(...result.orderStatusData);
                }
              } else if (file.type === "csv") {
                console.log(`Processing CSV file: ${file.filename}`);
                allErrors.push(`${file.filename}: CSV payment processing not implemented - only XLSX supported`);
              }
            } catch (fileError) {
              allErrors.push(`Error processing file ${file.filename}: ${fileError}`);
            }
          }
        } catch (error) {
          allErrors.push(`ZIP processing error: ${error}`);
        }
        console.log(`ZIP processing complete: ${allPayments.length} payments processed, ${allErrors.length} errors`);
        console.log(`Additional data extracted: ${allProductGstData.length} product GST records, ${allOrderStatusData.length} order status records`);
        return {
          payments: allPayments,
          errors: allErrors,
          processedCount: totalProcessed,
          productGstData: allProductGstData,
          orderStatusData: allOrderStatusData
        };
      }
    };
  }
});

// server/index.ts
import "dotenv/config";
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import multer from "multer";

// server/storage.ts
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, desc, asc, sql as sql2, count, sum, and, like, gte, lte, lt, inArray } from "drizzle-orm";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  calculationCache: () => calculationCache,
  insertCalculationCacheSchema: () => insertCalculationCacheSchema,
  insertOrderDynamicSchema: () => insertOrderDynamicSchema,
  insertOrderSchema: () => insertOrderSchema,
  insertPaymentSchema: () => insertPaymentSchema,
  insertProductDynamicSchema: () => insertProductDynamicSchema,
  insertProductSchema: () => insertProductSchema,
  insertReconciliationSchema: () => insertReconciliationSchema,
  insertUploadSchema: () => insertUploadSchema,
  insertUserSchema: () => insertUserSchema,
  orders: () => orders,
  ordersDynamic: () => ordersDynamic,
  payments: () => payments,
  products: () => products,
  productsDynamic: () => productsDynamic,
  reconciliations: () => reconciliations,
  uploads: () => uploads,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean, json, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firebaseUid: text("firebase_uid").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  photoURL: text("photo_url"),
  monthlyQuota: integer("monthly_quota").default(10),
  currentMonthUsage: integer("current_month_usage").default(0),
  lastUsageReset: timestamp("last_usage_reset").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  sku: text("sku").notNull(),
  globalSku: text("global_sku").unique(),
  // Unique SKU across all users
  title: text("title").notNull(),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }).default("0"),
  packagingCost: decimal("packaging_cost", { precision: 10, scale: 2 }).default("0"),
  finalPrice: decimal("final_price", { precision: 10, scale: 2 }).default("0"),
  gstPercent: decimal("gst_percent", { precision: 5, scale: 2 }).default("5"),
  totalOrders: integer("total_orders").default(0),
  isProcessed: boolean("is_processed").default(false),
  // Mark products processed from uploads
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    uniqueUserSku: unique().on(table.userId, table.sku),
    userUpdatedAtIdx: index("products_user_updated_at_idx").on(table.userId, table.updatedAt),
    globalSkuIdx: index("products_global_sku_idx").on(table.globalSku)
  };
});
var orders = pgTable("orders", {
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
  paymentStatus: text("payment_status"),
  // Mapped from reasonForCredit: PAID, REFUNDED, CANCELLED, etc.
  paymentDate: timestamp("payment_date"),
  // Date when payment was processed
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subOrderNo: text("sub_order_no").notNull(),
  settlementDate: timestamp("settlement_date"),
  settlementAmount: decimal("settlement_amount", { precision: 10, scale: 2 }),
  orderValue: decimal("order_value", { precision: 10, scale: 2 }),
  commissionFee: decimal("commission_fee", { precision: 10, scale: 2 }),
  fixedFee: decimal("fixed_fee", { precision: 10, scale: 2 }),
  paymentGatewayFee: decimal("payment_gateway_fee", { precision: 10, scale: 2 }),
  adsFee: decimal("ads_fee", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => {
  return {
    uniquePayment: unique().on(table.subOrderNo, table.settlementDate)
  };
});
var reconciliations = pgTable("reconciliations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subOrderNo: text("sub_order_no").notNull().unique(),
  orderId: varchar("order_id").references(() => orders.id),
  paymentId: varchar("payment_id").references(() => payments.id),
  productId: varchar("product_id").references(() => products.id),
  status: text("status").notNull(),
  // 'reconciled', 'mismatch', 'unreconciled'
  orderValue: decimal("order_value", { precision: 10, scale: 2 }),
  settlementAmount: decimal("settlement_amount", { precision: 10, scale: 2 }),
  productCost: decimal("product_cost", { precision: 10, scale: 2 }),
  packagingCost: decimal("packaging_cost", { precision: 10, scale: 2 }),
  adsCost: decimal("ads_cost", { precision: 10, scale: 2 }),
  grossProfit: decimal("gross_profit", { precision: 10, scale: 2 }),
  netProfit: decimal("net_profit", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var uploads = pgTable("uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  fileType: text("file_type").notNull(),
  // 'payment_zip', 'orders_csv'
  status: text("status").notNull(),
  // 'processing', 'processed', 'failed'
  recordsProcessed: integer("records_processed").default(0),
  errors: json("errors"),
  sourceMonth: text("source_month"),
  label: text("label"),
  columnStructure: json("column_structure"),
  // Store dynamic column info
  isCurrentVersion: boolean("is_current_version").default(true),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => {
  return {
    uploadsUsageIdx: index("uploads_usage_idx").on(table.uploadedBy, table.createdAt)
  };
});
var productsDynamic = pgTable("products_dynamic", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  uploadId: varchar("upload_id").references(() => uploads.id),
  dynamicData: json("dynamic_data").notNull(),
  // Store all dynamic column data
  sku: text("sku").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    uniqueProductUpload: unique().on(table.sku, table.uploadId)
  };
});
var ordersDynamic = pgTable("orders_dynamic", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  uploadId: varchar("upload_id").references(() => uploads.id),
  dynamicData: json("dynamic_data").notNull(),
  // Store all dynamic column data
  subOrderNo: text("sub_order_no").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => {
  return {
    uniqueOrderUpload: unique().on(table.subOrderNo, table.uploadId)
  };
});
var calculationCache = pgTable("calculation_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cacheKey: text("cache_key").notNull().unique(),
  calculationType: text("calculation_type").notNull(),
  // 'dashboard_summary', 'product_totals', etc.
  calculationResult: json("calculation_result").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  dependsOnUploads: json("depends_on_uploads")
  // Track which uploads this depends on
});
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});
var insertProductSchema = createInsertSchema(products).omit({
  id: true,
  updatedAt: true
});
var insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true
});
var insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true
});
var insertReconciliationSchema = createInsertSchema(reconciliations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertUploadSchema = createInsertSchema(uploads).omit({
  id: true,
  createdAt: true
});
var insertProductDynamicSchema = createInsertSchema(productsDynamic).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertOrderDynamicSchema = createInsertSchema(ordersDynamic).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertCalculationCacheSchema = createInsertSchema(calculationCache).omit({
  id: true,
  lastUpdated: true
});

// server/storage.ts
var DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}
var client = postgres(DATABASE_URL, { prepare: false });
var db = drizzle(client);
var DatabaseStorage = class {
  // Helper function to normalize decimal fields for database insertion
  normalizeDecimal(value) {
    if (value === null || value === void 0 || value === "" || value === "null") {
      return "0";
    }
    if (typeof value === "number") {
      return value.toString();
    }
    if (typeof value === "string") {
      const cleaned = value.trim();
      if (cleaned === "" || isNaN(Number(cleaned))) {
        return "0";
      }
      return cleaned;
    }
    return "0";
  }
  // Normalize payment object before database insertion
  normalizePayment(payment) {
    return {
      ...payment,
      settlementAmount: this.normalizeDecimal(payment.settlementAmount),
      orderValue: this.normalizeDecimal(payment.orderValue),
      commissionFee: this.normalizeDecimal(payment.commissionFee),
      fixedFee: this.normalizeDecimal(payment.fixedFee),
      paymentGatewayFee: this.normalizeDecimal(payment.paymentGatewayFee),
      adsFee: this.normalizeDecimal(payment.adsFee)
    };
  }
  async getUserByFirebaseUid(firebaseUid) {
    const result = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid)).limit(1);
    return result[0];
  }
  async createUser(user) {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }
  async updateUser(id, user) {
    const result = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return result[0];
  }
  async getAllProducts(userId) {
    if (userId) {
      return db.select().from(products).where(eq(products.userId, userId)).orderBy(asc(products.sku));
    }
    return db.select().from(products).orderBy(asc(products.sku));
  }
  async getProductBySku(sku, userId) {
    if (userId) {
      const result2 = await db.select().from(products).where(and(eq(products.sku, sku), eq(products.userId, userId))).limit(1);
      return result2[0];
    }
    const result = await db.select().from(products).where(eq(products.sku, sku)).limit(1);
    return result[0];
  }
  async createProduct(product) {
    const result = await db.insert(products).values(product).returning();
    return result[0];
  }
  async updateProduct(sku, product, userId) {
    if (userId) {
      const result2 = await db.update(products).set({
        ...product,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(and(eq(products.sku, sku), eq(products.userId, userId))).returning();
      return result2[0];
    }
    const result = await db.update(products).set({
      ...product,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(products.sku, sku)).returning();
    return result[0];
  }
  async bulkCreateProducts(productList) {
    if (productList.length === 0) return [];
    try {
      return await db.insert(products).values(productList).onConflictDoNothing().returning();
    } catch (error) {
      console.error("Error during bulk product creation:", error);
      throw new Error(`Failed to create products: ${error}`);
    }
  }
  async bulkUpsertProducts(productList) {
    if (productList.length === 0) return [];
    const uniqueProducts = productList.reduce((acc, product) => {
      const key = `${product.userId}:${product.sku}`;
      if (!acc.has(key)) {
        acc.set(key, product);
      }
      return acc;
    }, /* @__PURE__ */ new Map());
    const deduplicatedList = Array.from(uniqueProducts.values());
    try {
      const insertResult = await db.insert(products).values(deduplicatedList).onConflictDoNothing().returning();
      if (insertResult.length < deduplicatedList.length) {
        const insertedIds = new Set(insertResult.map((p) => `${p.userId}:${p.sku}`));
        const conflictedProducts = deduplicatedList.filter((p) => !insertedIds.has(`${p.userId}:${p.sku}`));
        if (conflictedProducts.length > 0) {
          const updateResults = [];
          for (const product of conflictedProducts) {
            try {
              const existing = await db.select().from(products).where(and(eq(products.userId, product.userId), eq(products.sku, product.sku))).limit(1);
              if (existing[0]) {
                const updateData = {
                  title: product.title,
                  gstPercent: product.gstPercent,
                  totalOrders: (Number(existing[0].totalOrders) || 0) + (Number(product.totalOrders) || 0),
                  isProcessed: product.isProcessed,
                  updatedAt: /* @__PURE__ */ new Date()
                };
                const hasDefaultCostPrice = existing[0].costPrice === "0";
                const hasDefaultPackagingCost = existing[0].packagingCost === "15" || existing[0].packagingCost === "0";
                if (hasDefaultCostPrice && product.costPrice && product.costPrice !== "0") {
                  updateData.costPrice = product.costPrice;
                }
                if (hasDefaultPackagingCost && product.packagingCost && product.packagingCost !== "0") {
                  updateData.packagingCost = product.packagingCost;
                }
                if (updateData.costPrice || updateData.packagingCost) {
                  const costPrice = Number(updateData.costPrice || existing[0].costPrice || "0");
                  const packagingCost = Number(updateData.packagingCost || existing[0].packagingCost || "0");
                  updateData.finalPrice = (costPrice + packagingCost).toString();
                }
                const updateResult = await db.update(products).set(updateData).where(and(eq(products.userId, product.userId), eq(products.sku, product.sku))).returning();
                updateResults.push(...updateResult);
                console.log(`Updated product ${product.sku} for user ${product.userId}, preserved user-modified costs`);
              }
            } catch (updateError) {
              console.warn(`Failed to update product ${product.sku} for user ${product.userId}:`, updateError);
            }
          }
          return [...insertResult, ...updateResults];
        }
      }
      return insertResult;
    } catch (error) {
      console.error("Error during bulk product upsert:", error);
      throw new Error(`Failed to upsert products: ${error}`);
    }
  }
  async updateProductGst(sku, gstPercent, productName, userId) {
    try {
      const updateData = {
        gstPercent: gstPercent.toString(),
        updatedAt: /* @__PURE__ */ new Date()
      };
      if (productName) {
        updateData.title = productName;
      }
      const whereCondition = userId ? and(eq(products.sku, sku), eq(products.userId, userId)) : eq(products.sku, sku);
      let result = await db.update(products).set(updateData).where(whereCondition).returning();
      if (result.length === 0 && !userId) {
        result = await db.update(products).set(updateData).where(sql2`LOWER(${products.sku}) = LOWER(${sku})`).returning();
        if (result.length === 0) {
          const normalizedInputSku = sku.toLowerCase().replace(/[^a-z0-9]/g, "");
          const allProducts = await db.select().from(products);
          for (const product of allProducts) {
            const normalizedProductSku = product.sku.toLowerCase().replace(/[^a-z0-9]/g, "");
            if (normalizedProductSku === normalizedInputSku) {
              result = await db.update(products).set(updateData).where(eq(products.sku, product.sku)).returning();
              break;
            }
          }
        }
      }
      return result[0];
    } catch (error) {
      console.error(`Error updating GST for product ${sku}:`, error);
      throw error;
    }
  }
  async getAllOrders(filters = {}) {
    let query = db.select({
      // Order fields
      id: orders.id,
      subOrderNo: orders.subOrderNo,
      orderDate: orders.orderDate,
      customerState: orders.customerState,
      productName: orders.productName,
      sku: orders.sku,
      size: orders.size,
      quantity: orders.quantity,
      listedPrice: orders.listedPrice,
      discountedPrice: orders.discountedPrice,
      packetId: orders.packetId,
      reasonForCredit: orders.reasonForCredit,
      paymentStatus: orders.paymentStatus,
      // Direct payment status from orders table
      paymentDate: sql2`COALESCE(${orders.paymentDate}, ${payments.settlementDate})`,
      // Prefer orders.paymentDate, fallback to payments.settlementDate
      createdAt: orders.createdAt,
      // Payment fields from payments table
      settlementDate: payments.settlementDate,
      settlementAmount: payments.settlementAmount,
      orderValue: payments.orderValue,
      commissionFee: payments.commissionFee,
      fixedFee: payments.fixedFee,
      paymentGatewayFee: payments.paymentGatewayFee,
      adsFee: payments.adsFee,
      hasPayment: sql2`${payments.id} IS NOT NULL`,
      // Product fields
      costPrice: sql2`COALESCE(${products.costPrice}, 0)`,
      packagingCost: sql2`COALESCE(${products.packagingCost}, 0)`,
      finalPrice: sql2`COALESCE(${products.finalPrice}, 0)`,
      gstPercent: products.gstPercent
    }).from(orders).leftJoin(payments, eq(orders.subOrderNo, payments.subOrderNo)).leftJoin(products, eq(orders.sku, products.sku));
    const conditions = [];
    if (filters.subOrderNo) {
      conditions.push(like(orders.subOrderNo, `%${filters.subOrderNo}%`));
    }
    if (filters.status && filters.status !== "all") {
      conditions.push(eq(orders.reasonForCredit, filters.status));
    }
    if (filters.paymentStatus && filters.paymentStatus !== "all") {
      if (filters.paymentStatus === "paid") {
        conditions.push(sql2`${payments.id} IS NOT NULL`);
      } else if (filters.paymentStatus === "pending") {
        conditions.push(sql2`${payments.id} IS NULL`);
      }
    }
    if (filters.dateFrom) {
      conditions.push(gte(orders.orderDate, filters.dateFrom));
    }
    if (filters.dateTo) {
      conditions.push(lte(orders.orderDate, filters.dateTo));
    }
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    return query.orderBy(desc(orders.orderDate));
  }
  async getOrderBySubOrderNo(subOrderNo) {
    const result = await db.select().from(orders).where(eq(orders.subOrderNo, subOrderNo)).limit(1);
    return result[0];
  }
  async createOrder(order) {
    const result = await db.insert(orders).values(order).returning();
    return result[0];
  }
  async bulkCreateOrders(orderList) {
    if (orderList.length === 0) return [];
    try {
      return await db.insert(orders).values(orderList).onConflictDoNothing().returning();
    } catch (error) {
      console.error("Error during bulk order creation:", error);
      throw new Error(`Failed to create orders: ${error}`);
    }
  }
  async bulkUpsertOrders(orderList) {
    if (orderList.length === 0) return [];
    try {
      return await db.insert(orders).values(orderList).onConflictDoUpdate({
        target: orders.subOrderNo,
        set: {
          paymentStatus: sql2.raw("excluded.payment_status"),
          paymentDate: sql2.raw("excluded.payment_date"),
          reasonForCredit: sql2.raw("excluded.reason_for_credit")
        }
      }).returning();
    } catch (error) {
      console.error("Error during bulk order upsert:", error);
      throw new Error(`Failed to upsert orders: ${error}`);
    }
  }
  async updateOrderWithPaymentData(subOrderNo, paymentData) {
    try {
      const result = await db.update(orders).set({
        paymentDate: paymentData.paymentDate,
        paymentStatus: paymentData.paymentStatus
      }).where(eq(orders.subOrderNo, subOrderNo)).returning();
      return result[0];
    } catch (error) {
      console.error(`Error updating order ${subOrderNo} with payment data:`, error);
      throw error;
    }
  }
  async batchUpdateOrdersWithPaymentData(paymentDataList) {
    if (paymentDataList.length === 0) return;
    try {
      const promises = paymentDataList.map(
        (paymentData) => this.updateOrderWithPaymentData(paymentData.subOrderNo, {
          paymentDate: paymentData.paymentDate,
          paymentStatus: paymentData.paymentStatus
        })
      );
      await Promise.allSettled(promises);
      console.log(`Batch updated ${paymentDataList.length} orders with payment data`);
    } catch (error) {
      console.error("Error in batchUpdateOrdersWithPaymentData:", error);
      throw error;
    }
  }
  async updateOrderStatus(subOrderNo, orderStatus) {
    try {
      const result = await db.update(orders).set({
        reasonForCredit: orderStatus
        // Store order status in reasonForCredit field
      }).where(eq(orders.subOrderNo, subOrderNo)).returning();
      return result[0];
    } catch (error) {
      console.error(`Error updating order status for ${subOrderNo}:`, error);
      throw error;
    }
  }
  async getAllPayments() {
    return db.select().from(payments).orderBy(desc(payments.createdAt));
  }
  async getPaymentsBySubOrderNo(subOrderNo) {
    return db.select().from(payments).where(eq(payments.subOrderNo, subOrderNo));
  }
  async createPayment(payment) {
    const normalizedPayment = this.normalizePayment(payment);
    const result = await db.insert(payments).values(normalizedPayment).returning();
    return result[0];
  }
  async bulkCreatePayments(paymentList) {
    if (paymentList.length === 0) return [];
    try {
      const normalizedPayments = paymentList.map((payment) => this.normalizePayment(payment));
      return await db.insert(payments).values(normalizedPayments).onConflictDoNothing({ target: [payments.subOrderNo, payments.settlementDate] }).returning();
    } catch (error) {
      console.error("Error during bulk payment creation:", error);
      throw new Error(`Failed to create payments: ${error}`);
    }
  }
  async getAllReconciliations(status) {
    let query = db.select().from(reconciliations);
    if (status) {
      query = query.where(eq(reconciliations.status, status));
    }
    return query.orderBy(desc(reconciliations.createdAt));
  }
  async getReconciliationBySubOrderNo(subOrderNo) {
    const result = await db.select().from(reconciliations).where(eq(reconciliations.subOrderNo, subOrderNo)).limit(1);
    return result[0];
  }
  async createReconciliation(reconciliation) {
    const result = await db.insert(reconciliations).values(reconciliation).returning();
    return result[0];
  }
  async bulkCreateReconciliations(reconciliationList) {
    if (reconciliationList.length === 0) return [];
    return db.insert(reconciliations).values(reconciliationList).returning();
  }
  async getReconciliationSummary() {
    const results = await db.select({
      status: reconciliations.status,
      count: count()
    }).from(reconciliations).groupBy(reconciliations.status);
    const summary = {
      reconciled: 0,
      mismatch: 0,
      unreconciled: 0,
      successRate: 0
    };
    results.forEach((result) => {
      switch (result.status) {
        case "reconciled":
          summary.reconciled = result.count;
          break;
        case "mismatch":
          summary.mismatch = result.count;
          break;
        case "unreconciled":
          summary.unreconciled = result.count;
          break;
      }
    });
    const total = summary.reconciled + summary.mismatch + summary.unreconciled;
    summary.successRate = total > 0 ? summary.reconciled / total * 100 : 0;
    return summary;
  }
  async getAllUploads() {
    return db.select().from(uploads).orderBy(desc(uploads.createdAt));
  }
  async createUpload(upload2) {
    const result = await db.insert(uploads).values(upload2).returning();
    return result[0];
  }
  async updateUploadStatus(id, status, recordsProcessed, errors) {
    const result = await db.update(uploads).set({
      status,
      recordsProcessed,
      errors
    }).where(eq(uploads.id, id)).returning();
    return result[0];
  }
  async getDashboardSummary(userId) {
    const [orderStats] = await db.select({
      totalOrders: count(ordersDynamic.id),
      totalRevenue: sql2`SUM(CAST(${ordersDynamic.dynamicData}->>'Supplier Discounted Price (Incl GST and Commision)' AS DECIMAL))`,
      avgOrderValue: sql2`AVG(CAST(${ordersDynamic.dynamicData}->>'Supplier Discounted Price (Incl GST and Commision)' AS DECIMAL))`
    }).from(ordersDynamic).innerJoin(uploads, eq(ordersDynamic.uploadId, uploads.id)).where(and(
      eq(uploads.uploadedBy, userId),
      eq(uploads.isCurrentVersion, true)
    ));
    const [paymentStats] = await db.select({
      totalSettlements: count(payments.id),
      totalSettlementAmount: sum(payments.settlementAmount),
      totalCommissionFees: sum(payments.commissionFee),
      totalGatewayFees: sum(payments.paymentGatewayFee)
    }).from(payments).where(sql2`${payments.subOrderNo} IN (
        SELECT DISTINCT ${ordersDynamic.dynamicData}->>'Sub Order No' 
        FROM ${ordersDynamic} 
        INNER JOIN ${uploads} ON ${ordersDynamic.uploadId} = ${uploads.id}
        WHERE ${uploads.uploadedBy} = ${userId} AND ${uploads.isCurrentVersion} = true
      )`);
    const totalOrders = orderStats?.totalOrders || 0;
    const totalRevenue = Number(orderStats?.totalRevenue || 0);
    const totalSettlements = paymentStats?.totalSettlements || 0;
    const totalSettlementAmount = Number(paymentStats?.totalSettlementAmount || 0);
    const totalFees = Number(paymentStats?.totalCommissionFees || 0) + Number(paymentStats?.totalGatewayFees || 0);
    const netProfit = totalSettlementAmount - totalFees;
    const successRate = totalOrders > 0 ? totalSettlements / totalOrders * 100 : 0;
    const thirtyDaysAgo = /* @__PURE__ */ new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const [oldOrderStats] = await db.select({
      oldTotalOrders: count(ordersDynamic.id),
      oldTotalRevenue: sql2`SUM(CAST(${ordersDynamic.dynamicData}->>'Supplier Discounted Price (Incl GST and Commision)' AS DECIMAL))`
    }).from(ordersDynamic).innerJoin(uploads, eq(ordersDynamic.uploadId, uploads.id)).where(and(
      eq(uploads.uploadedBy, userId),
      eq(uploads.isCurrentVersion, true),
      sql2`CAST(${ordersDynamic.dynamicData}->>'Order Date' AS DATE) <= ${thirtyDaysAgo}`
    ));
    const oldTotalOrders = oldOrderStats?.oldTotalOrders || 0;
    const oldTotalRevenue = Number(oldOrderStats?.oldTotalRevenue || 0);
    const revenueGrowth = oldTotalRevenue > 0 ? (totalRevenue - oldTotalRevenue) / oldTotalRevenue * 100 : 0;
    const ordersGrowth = oldTotalOrders > 0 ? (totalOrders - oldTotalOrders) / oldTotalOrders * 100 : 0;
    return {
      totalRevenue,
      netProfit,
      totalOrders,
      successRate,
      revenueGrowth,
      profitGrowth: revenueGrowth * 0.7,
      // Estimate profit growth as 70% of revenue growth
      ordersGrowth,
      successRateGrowth: Math.max(-10, Math.min(10, ordersGrowth * 0.1))
      // Conservative success rate growth
    };
  }
  async getRevenueTrend(userId) {
    const dailyData = await db.select({
      date: sql2`CAST(${ordersDynamic.dynamicData}->>'Order Date' AS DATE)`,
      revenue: sql2`SUM(CAST(${ordersDynamic.dynamicData}->>'Supplier Discounted Price (Incl GST and Commision)' AS DECIMAL))`,
      orders: count(ordersDynamic.id)
    }).from(ordersDynamic).innerJoin(uploads, eq(ordersDynamic.uploadId, uploads.id)).where(and(
      eq(uploads.uploadedBy, userId),
      eq(uploads.isCurrentVersion, true),
      sql2`CAST(${ordersDynamic.dynamicData}->>'Order Date' AS DATE) >= CURRENT_DATE - INTERVAL '30 days'`
    )).groupBy(sql2`CAST(${ordersDynamic.dynamicData}->>'Order Date' AS DATE)`).orderBy(sql2`CAST(${ordersDynamic.dynamicData}->>'Order Date' AS DATE)`);
    return dailyData.map((dayData) => ({
      date: dayData.date,
      revenue: Number(dayData.revenue || 0),
      orders: Number(dayData.orders || 0)
    }));
  }
  async getOrderStatusDistribution(userId) {
    const statusData = await db.select({
      status: sql2`${ordersDynamic.dynamicData}->>'Reason for Credit Entry'`,
      count: count(ordersDynamic.id)
    }).from(ordersDynamic).innerJoin(uploads, eq(ordersDynamic.uploadId, uploads.id)).where(and(
      eq(uploads.uploadedBy, userId),
      eq(uploads.isCurrentVersion, true)
    )).groupBy(sql2`${ordersDynamic.dynamicData}->>'Reason for Credit Entry'`);
    const statusMapping = {
      "DELIVERED": { name: "Delivered", color: "hsl(147 78% 42%)" },
      "SHIPPED": { name: "Shipped", color: "hsl(217 91% 60%)" },
      "READY_TO_SHIP": { name: "Ready to Ship", color: "hsl(204 100% 40%)" },
      "CANCELLED": { name: "Cancelled", color: "hsl(45 93% 47%)" },
      "RTO_COMPLETE": { name: "RTO Complete", color: "hsl(0 84% 60%)" },
      "RTO_LOCKED": { name: "RTO Locked", color: "hsl(12 76% 61%)" },
      "PENDING": { name: "Pending", color: "hsl(250 100% 60%)" }
    };
    return statusData.map((item) => {
      const statusValue = item.status || "Unknown";
      const mapping = statusMapping[statusValue];
      return {
        name: mapping?.name || statusValue,
        value: item.count,
        color: mapping?.color || "hsl(215 28% 52%)"
      };
    });
  }
  async getComprehensiveFinancialSummary(userId) {
    const [orderStats] = await db.select({
      totalOrders: count(ordersDynamic.id),
      totalSaleAmount: sql2`SUM(CAST(${ordersDynamic.dynamicData}->>'Supplier Discounted Price (Incl GST and Commision)' AS DECIMAL) * CAST(${ordersDynamic.dynamicData}->>'Quantity' AS INTEGER))`,
      avgOrderValue: sql2`AVG(CAST(${ordersDynamic.dynamicData}->>'Supplier Discounted Price (Incl GST and Commision)' AS DECIMAL))`,
      delivered: sql2`count(case when UPPER(${ordersDynamic.dynamicData}->>'Reason for Credit Entry') = 'DELIVERED' then 1 end)`,
      shipped: sql2`count(case when UPPER(${ordersDynamic.dynamicData}->>'Reason for Credit Entry') IN ('SHIPPED', 'READY_TO_SHIP') then 1 end)`,
      exchanged: sql2`count(case when UPPER(${ordersDynamic.dynamicData}->>'Reason for Credit Entry') IN ('EXCHANGE', 'EXCHANGED') then 1 end)`,
      cancelled: sql2`count(case when UPPER(${ordersDynamic.dynamicData}->>'Reason for Credit Entry') IN ('CANCELLED', 'CANCELED') then 1 end)`,
      returns: sql2`count(case when UPPER(${ordersDynamic.dynamicData}->>'Reason for Credit Entry') IN ('RETURN', 'RETURNED', 'REFUND', 'RTO', 'RTO_COMPLETE') then 1 end)`
    }).from(ordersDynamic).innerJoin(uploads, eq(ordersDynamic.uploadId, uploads.id)).where(and(
      eq(uploads.uploadedBy, userId),
      eq(uploads.isCurrentVersion, true)
    ));
    const [paymentStats] = await db.select({
      settlementAmount: sum(payments.settlementAmount),
      totalCommissionFees: sum(payments.commissionFee),
      totalGatewayFees: sum(payments.paymentGatewayFee),
      totalFixedFees: sum(payments.fixedFee),
      totalAdsFees: sum(payments.adsFee)
    }).from(payments).where(sql2`${payments.subOrderNo} IN (
        SELECT DISTINCT ${ordersDynamic.dynamicData}->>'Sub Order No' 
        FROM ${ordersDynamic} 
        INNER JOIN ${uploads} ON ${ordersDynamic.uploadId} = ${uploads.id}
        WHERE ${uploads.uploadedBy} = ${userId} AND ${uploads.isCurrentVersion} = true
      )`);
    const [productCosts] = await db.select({
      totalPurchaseCost: sql2`
          SUM(
            CAST(${ordersDynamic.dynamicData}->>'quantity' AS INTEGER) * 
            CAST(COALESCE(${productsDynamic.dynamicData}->>'costPrice', '0') AS DECIMAL)
          )
        `,
      totalPackagingCost: sql2`
          SUM(
            CAST(${ordersDynamic.dynamicData}->>'quantity' AS INTEGER) * 
            CAST(COALESCE(${productsDynamic.dynamicData}->>'packagingCost', '0') AS DECIMAL)
          )
        `
    }).from(ordersDynamic).innerJoin(uploads, eq(ordersDynamic.uploadId, uploads.id)).leftJoin(productsDynamic, sql2`${ordersDynamic.dynamicData}->>'SKU' = ${productsDynamic.sku} 
                                     AND ${productsDynamic.uploadId} = ${uploads.id}`).where(and(
      eq(uploads.uploadedBy, userId),
      eq(uploads.isCurrentVersion, true)
    ));
    const totalOrders = orderStats?.totalOrders || 0;
    const totalSaleAmount = Number(orderStats?.totalSaleAmount || 0);
    const avgOrderValue = Number(orderStats?.avgOrderValue || 0);
    const delivered = orderStats?.delivered || 0;
    const shipped = orderStats?.shipped || 0;
    const exchanged = orderStats?.exchanged || 0;
    const cancelled = orderStats?.cancelled || 0;
    const returns = orderStats?.returns || 0;
    const settlementAmount = Number(paymentStats?.settlementAmount || 0);
    const totalPurchaseCost = totalSaleAmount * 0.6;
    const totalPackagingCost = totalOrders * 15;
    const totalCommissionFees = Number(paymentStats?.totalCommissionFees || 0);
    const totalGatewayFees = Number(paymentStats?.totalGatewayFees || 0);
    const totalFixedFees = Number(paymentStats?.totalFixedFees || 0);
    const totalAdsFees = Number(paymentStats?.totalAdsFees || 0);
    const shippingCost = totalOrders * 49;
    const totalTds = settlementAmount * 0.01;
    const returnRate = totalOrders > 0 ? returns / totalOrders * 100 : 0;
    const estimatedCommission = totalSaleAmount * 0.15;
    const totalFees = totalCommissionFees + totalGatewayFees + totalFixedFees + totalAdsFees + estimatedCommission;
    const netProfit = settlementAmount - (totalPurchaseCost + totalPackagingCost + shippingCost + totalTds + estimatedCommission);
    const [ordersWithoutPayments] = await db.select({
      count: count(ordersDynamic.id)
    }).from(ordersDynamic).innerJoin(uploads, eq(ordersDynamic.uploadId, uploads.id)).leftJoin(payments, sql2`${ordersDynamic.dynamicData}->>'subOrderNo' = ${payments.subOrderNo}`).where(and(
      eq(uploads.uploadedBy, userId),
      eq(uploads.isCurrentVersion, true),
      sql2`${payments.id} IS NULL`
    ));
    return {
      totalSaleAmount,
      settlementAmount,
      totalPurchaseCost,
      totalPackagingCost,
      shippingCost,
      totalTds,
      netProfit,
      totalOrders,
      delivered,
      shipped,
      exchanged,
      cancelled,
      returns,
      avgOrderValue,
      returnRate,
      ordersAwaitingPaymentRecord: ordersWithoutPayments?.count || 0
    };
  }
  async getSettlementComponents(userId) {
    const [paymentData] = await db.select({
      totalSaleAmount: sql2`SUM(CASE WHEN ${payments.orderValue} > 0 THEN ${payments.orderValue} ELSE 0 END)`,
      totalReturnAmount: sql2`SUM(CASE WHEN ${payments.orderValue} < 0 THEN ${payments.orderValue} ELSE 0 END)`,
      totalCommission: sum(payments.commissionFee),
      totalFixedFees: sum(payments.fixedFee),
      totalGatewayFees: sum(payments.paymentGatewayFee),
      totalAdsFees: sum(payments.adsFee),
      finalSettlement: sum(payments.settlementAmount),
      recordCount: count(payments.id)
    }).from(payments).where(sql2`${payments.subOrderNo} IN (
        SELECT DISTINCT ${ordersDynamic.dynamicData}->>'Sub Order No' 
        FROM ${ordersDynamic} 
        INNER JOIN ${uploads} ON ${ordersDynamic.uploadId} = ${uploads.id}
        WHERE ${uploads.uploadedBy} = ${userId} AND ${uploads.isCurrentVersion} = true
      )`);
    const [orderData] = await db.select({
      totalOrders: count(ordersDynamic.id),
      deliveredOrders: sql2`count(case when UPPER(${ordersDynamic.dynamicData}->>'Reason for Credit Entry') = 'DELIVERED' then 1 end)`,
      returnOrders: sql2`count(case when UPPER(${ordersDynamic.dynamicData}->>'Reason for Credit Entry') IN ('RTO_COMPLETE', 'RTO_LOCKED', 'RETURN') then 1 end)`,
      totalSaleValue: sql2`SUM(CAST(${ordersDynamic.dynamicData}->>'Supplier Discounted Price (Incl GST and Commision)' AS DECIMAL) * CAST(${ordersDynamic.dynamicData}->>'Quantity' AS INTEGER))`
    }).from(ordersDynamic).innerJoin(uploads, eq(ordersDynamic.uploadId, uploads.id)).where(and(
      eq(uploads.uploadedBy, userId),
      eq(uploads.isCurrentVersion, true)
    ));
    const totalSaleAmount = Number(paymentData?.totalSaleAmount || orderData?.totalSaleValue || 0);
    const totalReturnAmount = Number(paymentData?.totalReturnAmount || 0);
    const totalCommission = Number(paymentData?.totalCommission || 0);
    const totalFixedFees = Number(paymentData?.totalFixedFees || 0);
    const totalGatewayFees = Number(paymentData?.totalGatewayFees || 0);
    const totalAdsFees = Number(paymentData?.totalAdsFees || 0);
    const finalSettlement = Number(paymentData?.finalSettlement || 0);
    const deliveredOrders = Number(orderData?.deliveredOrders || 0);
    const returnOrders = Number(orderData?.returnOrders || 0);
    const forwardShipping = deliveredOrders * 49;
    const returnShipping = returnOrders * 49;
    const tcs = totalSaleAmount * 1e-3;
    const tds = finalSettlement > 0 ? finalSettlement * 0.01 : 0;
    return [
      { component: "Total Sale Amount (Incl. Shipping & GST)", totalAmount: totalSaleAmount },
      { component: "Sale Return Amount (Incl. Shipping & GST)", totalAmount: totalReturnAmount },
      { component: "Forward Shipping Charges", totalAmount: forwardShipping },
      { component: "Return Shipping Charges", totalAmount: -returnShipping },
      { component: "Meesho Commission (Incl. GST)", totalAmount: -totalCommission },
      { component: "Fixed Fee (Incl. GST)", totalAmount: -totalFixedFees },
      { component: "Payment Gateway Fee", totalAmount: -totalGatewayFees },
      { component: "Ads Fee", totalAmount: -totalAdsFees },
      { component: "TCS (Tax Collected at Source)", totalAmount: -tcs },
      { component: "TDS (Tax Deducted at Source)", totalAmount: -tds },
      { component: "Final Settlement Amount", totalAmount: finalSettlement }
    ];
  }
  async getEarningsOverview(userId) {
    const [settlementData] = await db.select({
      finalSettlement: sum(payments.settlementAmount),
      totalAdsFees: sum(payments.adsFee),
      totalCommissionFees: sum(payments.commissionFee),
      totalGatewayFees: sum(payments.paymentGatewayFee),
      totalFixedFees: sum(payments.fixedFee)
    }).from(payments).where(sql2`${payments.subOrderNo} IN (
        SELECT DISTINCT ${ordersDynamic.dynamicData}->>'Sub Order No' 
        FROM ${ordersDynamic} 
        INNER JOIN ${uploads} ON ${ordersDynamic.uploadId} = ${uploads.id}
        WHERE ${uploads.uploadedBy} = ${userId} AND ${uploads.isCurrentVersion} = true
      )`);
    const [orderData] = await db.select({
      totalOrders: count(ordersDynamic.id),
      totalSaleValue: sql2`SUM(CAST(${ordersDynamic.dynamicData}->>'Supplier Discounted Price (Incl GST and Commision)' AS DECIMAL) * CAST(${ordersDynamic.dynamicData}->>'Quantity' AS INTEGER))`,
      deliveredOrders: sql2`count(case when UPPER(${ordersDynamic.dynamicData}->>'Reason for Credit Entry') = 'DELIVERED' then 1 end)`
    }).from(ordersDynamic).innerJoin(uploads, eq(ordersDynamic.uploadId, uploads.id)).where(and(
      eq(uploads.uploadedBy, userId),
      eq(uploads.isCurrentVersion, true)
    ));
    const finalSettlement = Number(settlementData?.finalSettlement || 0);
    const totalSaleValue = Number(orderData?.totalSaleValue || 0);
    const totalOrders = Number(orderData?.totalOrders || 0);
    const deliveredOrders = Number(orderData?.deliveredOrders || 0);
    const productCost = totalSaleValue * 0.65;
    const packagingCost = totalOrders * 15;
    const marketingCost = Number(settlementData?.totalAdsFees || 0) || totalSaleValue * 0.03;
    const logisticsCost = deliveredOrders * 49;
    const platformFees = Number(settlementData?.totalCommissionFees || 0) + Number(settlementData?.totalGatewayFees || 0) + Number(settlementData?.totalFixedFees || 0);
    const totalCosts = productCost + packagingCost + marketingCost + logisticsCost;
    const netProfit = finalSettlement - totalCosts;
    return [
      { description: "Settlement Income (from Meesho)", amount: finalSettlement },
      { description: "Product Cost (65% of sales)", amount: -productCost },
      { description: "Packaging Cost (\u20B915/order)", amount: -packagingCost },
      { description: "Marketing/Ads Cost", amount: -marketingCost },
      { description: "Logistics Cost (\u20B949/delivered)", amount: -logisticsCost },
      { description: "Platform Fees (already deducted)", amount: 0 },
      // Already deducted in settlement
      { description: "Net Profit/Loss", amount: netProfit }
    ];
  }
  async getOperationalCosts(userId) {
    const [costsData] = await db.select({
      commissionFees: sum(payments.commissionFee),
      fixedFees: sum(payments.fixedFee),
      gatewayFees: sum(payments.paymentGatewayFee),
      adsFees: sum(payments.adsFee)
      // Note: Warehousing, compensation, claims, recovery would come from 
      // additional columns if available in the payment processing
    }).from(payments).where(sql2`${payments.subOrderNo} IN (
        SELECT DISTINCT ${ordersDynamic.dynamicData}->>'Sub Order No' 
        FROM ${ordersDynamic} 
        INNER JOIN ${uploads} ON ${ordersDynamic.uploadId} = ${uploads.id}
        WHERE ${uploads.uploadedBy} = ${userId} AND ${uploads.isCurrentVersion} = true
      )`);
    const [orderMetrics] = await db.select({
      totalOrders: count(ordersDynamic.id),
      returnOrders: sql2`count(case when UPPER(${ordersDynamic.dynamicData}->>'Reason for Credit Entry') IN ('RTO_COMPLETE', 'RTO_LOCKED') then 1 end)`,
      cancelledOrders: sql2`count(case when UPPER(${ordersDynamic.dynamicData}->>'Reason for Credit Entry') = 'CANCELLED' then 1 end)`
    }).from(ordersDynamic).innerJoin(uploads, eq(ordersDynamic.uploadId, uploads.id)).where(and(
      eq(uploads.uploadedBy, userId),
      eq(uploads.isCurrentVersion, true)
    ));
    const commissionFees = Number(costsData?.commissionFees || 0);
    const fixedFees = Number(costsData?.fixedFees || 0);
    const gatewayFees = Number(costsData?.gatewayFees || 0);
    const adsFees = Number(costsData?.adsFees || 0);
    const totalOrders = Number(orderMetrics?.totalOrders || 0);
    const returnOrders = Number(orderMetrics?.returnOrders || 0);
    const warehousingFees = totalOrders * 8;
    const returnHandlingFees = returnOrders * 25;
    const customerSupportCost = totalOrders * 2;
    const estimatedCompensation = returnOrders * 10;
    const qualityClaimsRecovery = returnOrders * 5;
    return [
      { type: "Meesho Commission", amount: commissionFees },
      { type: "Fixed Processing Fees", amount: fixedFees },
      { type: "Payment Gateway Fees", amount: gatewayFees },
      { type: "Advertising/Marketing Fees", amount: adsFees },
      { type: "Warehousing Fees (est.)", amount: warehousingFees },
      { type: "Return Handling Fees (est.)", amount: returnHandlingFees },
      { type: "Customer Support Cost (est.)", amount: customerSupportCost },
      { type: "Compensation Received", amount: -estimatedCompensation },
      { type: "Quality Claims Recovery", amount: -qualityClaimsRecovery }
    ];
  }
  async getDailyVolumeAndAOV(userId) {
    const dailyData = await db.select({
      date: sql2`DATE(CAST(${ordersDynamic.dynamicData}->>'Order Date' AS DATE))`,
      orderVolume: count(ordersDynamic.id),
      totalRevenue: sql2`SUM(CAST(${ordersDynamic.dynamicData}->>'Supplier Discounted Price (Incl GST and Commision)' AS DECIMAL))`
    }).from(ordersDynamic).innerJoin(uploads, eq(ordersDynamic.uploadId, uploads.id)).where(and(
      eq(uploads.uploadedBy, userId),
      eq(uploads.isCurrentVersion, true),
      sql2`CAST(${ordersDynamic.dynamicData}->>'Order Date' AS DATE) >= CURRENT_DATE - INTERVAL '30 days'`
    )).groupBy(sql2`DATE(CAST(${ordersDynamic.dynamicData}->>'Order Date' AS DATE))`).orderBy(sql2`DATE(CAST(${ordersDynamic.dynamicData}->>'Order Date' AS DATE))`);
    return dailyData.map((day) => ({
      date: day.date,
      orderVolume: day.orderVolume,
      aov: day.orderVolume > 0 ? Number(day.totalRevenue || 0) / day.orderVolume : 0
    }));
  }
  async getTopPerformingProducts(userId) {
    const topProducts = await db.select({
      sku: sql2`LOWER(TRIM(COALESCE(${ordersDynamic.dynamicData}->>'SKU', ${ordersDynamic.dynamicData}->>'sku')))`,
      name: sql2`MIN(COALESCE(${ordersDynamic.dynamicData}->>'Product Name', ${ordersDynamic.dynamicData}->>'productName'))`,
      orders: count(ordersDynamic.id),
      totalSales: sql2`SUM(CAST(COALESCE(${ordersDynamic.dynamicData}->>'Supplier Discounted Price (Incl GST and Commision)', ${ordersDynamic.dynamicData}->>'Discounted Price', ${ordersDynamic.dynamicData}->>'discountedPrice', ${ordersDynamic.dynamicData}->>'Final Sale Amount', ${ordersDynamic.dynamicData}->>'Final Price', '0') AS DECIMAL) * CAST(COALESCE(${ordersDynamic.dynamicData}->>'Quantity', ${ordersDynamic.dynamicData}->>'quantity', ${ordersDynamic.dynamicData}->>'Qty', '1') AS INTEGER))`,
      totalQuantity: sql2`SUM(CAST(COALESCE(${ordersDynamic.dynamicData}->>'Quantity', ${ordersDynamic.dynamicData}->>'quantity', ${ordersDynamic.dynamicData}->>'Qty', '1') AS INTEGER))`
    }).from(ordersDynamic).innerJoin(uploads, eq(ordersDynamic.uploadId, uploads.id)).where(and(
      eq(uploads.uploadedBy, userId),
      eq(uploads.isCurrentVersion, true),
      sql2`TRIM(COALESCE(${ordersDynamic.dynamicData}->>'SKU', ${ordersDynamic.dynamicData}->>'sku')) IS NOT NULL`,
      sql2`TRIM(COALESCE(${ordersDynamic.dynamicData}->>'SKU', ${ordersDynamic.dynamicData}->>'sku')) != ''`
    )).groupBy(sql2`LOWER(TRIM(COALESCE(${ordersDynamic.dynamicData}->>'SKU', ${ordersDynamic.dynamicData}->>'sku'))) `).orderBy(desc(count(ordersDynamic.id))).limit(10);
    return topProducts.map((product) => ({
      sku: product.sku,
      name: product.name || "Unknown Product",
      orders: product.orders,
      revenue: Number(product.totalSales || 0),
      totalQuantity: Number(product.totalQuantity || 0)
    }));
  }
  async getTopReturnProducts(userId) {
    const topReturns = await db.select({
      sku: sql2`LOWER(TRIM(COALESCE(${ordersDynamic.dynamicData}->>'SKU', ${ordersDynamic.dynamicData}->>'sku')))`,
      name: sql2`MIN(COALESCE(${ordersDynamic.dynamicData}->>'Product Name', ${ordersDynamic.dynamicData}->>'productName'))`,
      returns: sql2`count(case when UPPER(COALESCE(${ordersDynamic.dynamicData}->>'Reason for Credit Entry','')) IN ('RETURN', 'RETURNED', 'REFUND') then 1 end)`,
      rtoCount: sql2`count(case when UPPER(COALESCE(${ordersDynamic.dynamicData}->>'Reason for Credit Entry','')) IN ('RTO', 'RTO_COMPLETE', 'RTO_LOCKED') then 1 end)`,
      totalCount: count(ordersDynamic.id)
    }).from(ordersDynamic).innerJoin(uploads, eq(ordersDynamic.uploadId, uploads.id)).where(and(
      eq(uploads.uploadedBy, userId),
      eq(uploads.isCurrentVersion, true),
      sql2`TRIM(COALESCE(${ordersDynamic.dynamicData}->>'SKU', ${ordersDynamic.dynamicData}->>'sku')) IS NOT NULL`,
      sql2`TRIM(COALESCE(${ordersDynamic.dynamicData}->>'SKU', ${ordersDynamic.dynamicData}->>'sku')) != ''`
    )).groupBy(sql2`LOWER(TRIM(COALESCE(${ordersDynamic.dynamicData}->>'SKU', ${ordersDynamic.dynamicData}->>'sku'))) `).having(sql2`count(case when UPPER(COALESCE(${ordersDynamic.dynamicData}->>'Reason for Credit Entry','')) IN ('RETURN', 'RETURNED', 'REFUND', 'RTO', 'RTO_COMPLETE', 'RTO_LOCKED') then 1 end) > 0`).orderBy(sql2`count(case when UPPER(COALESCE(${ordersDynamic.dynamicData}->>'Reason for Credit Entry','')) IN ('RETURN', 'RETURNED', 'REFUND', 'RTO', 'RTO_COMPLETE', 'RTO_LOCKED') then 1 end) DESC`).limit(10);
    return topReturns.map((product) => ({
      sku: product.sku,
      name: product.name || "Unknown Product",
      returns: product.returns,
      rtoCount: product.rtoCount,
      combinedCount: product.returns + product.rtoCount
    }));
  }
  async getOrdersOverview(userId) {
    try {
      const cached = await this.getCalculationCache(`orders_overview_${userId}`);
      if (cached && Date.now() - new Date(cached.lastUpdated).getTime() < 10 * 60 * 1e3) {
        return cached.calculationResult;
      }
      const paymentStatusMap = /* @__PURE__ */ new Map();
      const paymentData = await db.select({
        subOrderNo: payments.subOrderNo,
        hasPayment: sql2`COUNT(*) > 0 AND SUM(CASE WHEN COALESCE(${payments.settlementAmount}, 0) > 0 THEN 1 ELSE 0 END) > 0`
      }).from(payments).where(sql2`${payments.subOrderNo} IN (
          SELECT DISTINCT ${ordersDynamic.dynamicData}->>'Sub Order No' 
          FROM ${ordersDynamic} 
          INNER JOIN ${uploads} ON ${ordersDynamic.uploadId} = ${uploads.id}
          WHERE ${uploads.uploadedBy} = ${userId} AND ${uploads.isCurrentVersion} = true
        )`).groupBy(payments.subOrderNo);
      paymentData.forEach((payment) => {
        paymentStatusMap.set(payment.subOrderNo, payment.hasPayment);
      });
      const staticOrdersData = await db.select({
        subOrderNo: orders.subOrderNo,
        reasonForCredit: orders.reasonForCredit,
        discountedPrice: orders.discountedPrice,
        listedPrice: orders.listedPrice
      }).from(orders).where(sql2`${orders.subOrderNo} IN (
          SELECT DISTINCT ${ordersDynamic.dynamicData}->>'Sub Order No' 
          FROM ${ordersDynamic} 
          INNER JOIN ${uploads} ON ${ordersDynamic.uploadId} = ${uploads.id}
          WHERE ${uploads.uploadedBy} = ${userId} AND ${uploads.isCurrentVersion} = true
        )`);
      const dynamicOrdersData = await db.select({
        subOrderNo: ordersDynamic.subOrderNo,
        dynamicData: ordersDynamic.dynamicData
      }).from(ordersDynamic).innerJoin(uploads, and(
        eq(ordersDynamic.uploadId, uploads.id),
        eq(uploads.uploadedBy, userId),
        eq(uploads.isCurrentVersion, true)
      ));
      const normalizeStatus = (status) => {
        if (!status) return "";
        return status.toString().toUpperCase().trim();
      };
      const extractOrderValue = (dynamicData) => {
        const possiblePriceKeys = [
          "Supplier Discounted Price (Incl GST and Commision)",
          "Discounted Price",
          "discountedPrice",
          "Listed Price",
          "listedPrice"
        ];
        let unitPrice = 0;
        for (const key of possiblePriceKeys) {
          if (dynamicData && dynamicData[key] && !isNaN(Number(dynamicData[key]))) {
            unitPrice = Number(dynamicData[key]);
            break;
          }
        }
        const quantity = Number(dynamicData?.["Quantity"] || dynamicData?.["quantity"] || 1);
        return unitPrice * quantity;
      };
      const STATUS_MAPPINGS = {
        // Delivered statuses
        "DELIVERED": "DELIVERED",
        // Shipped statuses  
        "SHIPPED": "SHIPPED",
        "IN TRANSIT": "SHIPPED",
        "OUT FOR DELIVERY": "SHIPPED",
        "IN_TRANSIT": "SHIPPED",
        "OUT_FOR_DELIVERY": "SHIPPED",
        // Ready to ship statuses
        "READY TO SHIP": "READY_TO_SHIP",
        "RTS": "READY_TO_SHIP",
        "READY_TO_SHIP": "READY_TO_SHIP",
        // Cancelled statuses
        "CANCELLED": "CANCELLED",
        "CANCELED": "CANCELLED",
        // RTO statuses (ONLY RTO_COMPLETE and RTO_LOCKED)
        "RTO_COMPLETE": "RTO",
        "RTO_LOCKED": "RTO",
        // Explicitly exclude other RTO variants like RTO_OFD
        // Exchanged statuses
        "EXCHANGE": "EXCHANGED",
        "EXCHANGED": "EXCHANGED",
        // Return statuses
        "RETURN": "RETURN",
        "RETURNED": "RETURN",
        "REFUND": "RETURN"
      };
      const resolveOrderStatus = (staticStatus, dynamicData) => {
        if (dynamicData && dynamicData["Reason for Credit Entry"]) {
          const status = normalizeStatus(dynamicData["Reason for Credit Entry"]);
          const mapped = STATUS_MAPPINGS[status];
          if (mapped) return mapped;
        }
        const otherStatusKeys = ["Order Status", "Sub Order Status", "status", "Status"];
        for (const key of otherStatusKeys) {
          if (dynamicData && dynamicData[key]) {
            const status = normalizeStatus(dynamicData[key]);
            const mapped = STATUS_MAPPINGS[status];
            if (mapped) return mapped;
          }
        }
        if (staticStatus) {
          const status = normalizeStatus(staticStatus);
          const mapped = STATUS_MAPPINGS[status];
          if (mapped) return mapped;
        }
        return "OTHER";
      };
      let delivered = 0;
      let shipped = 0;
      let readyToShip = 0;
      let cancelled = 0;
      let rto = 0;
      let exchanged = 0;
      let returns = 0;
      let totalDeliveredValue = 0;
      let awaitingPaymentOrders = 0;
      const orderMap = /* @__PURE__ */ new Map();
      for (const order of staticOrdersData) {
        const orderValue = Number(order.discountedPrice || order.listedPrice || 0);
        const hasPayment = paymentStatusMap.get(order.subOrderNo) || false;
        orderMap.set(order.subOrderNo, {
          status: order.reasonForCredit || "",
          orderValue,
          hasPayment,
          dynamicData: null
        });
      }
      for (const dynOrder of dynamicOrdersData) {
        const dynamicData = dynOrder.dynamicData;
        const existing = orderMap.get(dynOrder.subOrderNo);
        if (existing) {
          existing.dynamicData = dynamicData;
          const dynamicValue = extractOrderValue(dynamicData);
          if (dynamicValue > 0) {
            existing.orderValue = dynamicValue;
          }
        } else {
          const orderValue = extractOrderValue(dynamicData);
          const hasPayment = paymentStatusMap.get(dynOrder.subOrderNo) || false;
          orderMap.set(dynOrder.subOrderNo, {
            status: "",
            orderValue,
            hasPayment,
            dynamicData
          });
        }
      }
      for (const [subOrderNo, orderData] of Array.from(orderMap.entries())) {
        const resolvedStatus = resolveOrderStatus(orderData.status, orderData.dynamicData);
        switch (resolvedStatus) {
          case "DELIVERED":
            delivered++;
            totalDeliveredValue += orderData.orderValue;
            if (!orderData.hasPayment) {
              awaitingPaymentOrders++;
            }
            break;
          case "SHIPPED":
            shipped++;
            break;
          case "READY_TO_SHIP":
            readyToShip++;
            break;
          case "CANCELLED":
            cancelled++;
            break;
          case "RTO":
            rto++;
            break;
          case "EXCHANGED":
            exchanged++;
            totalDeliveredValue += orderData.orderValue;
            break;
          case "RETURN":
            returns++;
            break;
        }
      }
      const avgOrderValue = delivered > 0 ? totalDeliveredValue / delivered : 0;
      const returnRate = delivered > 0 ? returns / delivered * 100 : 0;
      const result = {
        delivered,
        shipped,
        readyToShip,
        cancelled,
        rto,
        exchanged,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        returnRate: Math.round(returnRate * 100) / 100,
        awaitingPaymentOrders,
        totalOrdersUsedForAOV: delivered
      };
      const currentUploads = await db.select().from(uploads).where(and(
        eq(uploads.uploadedBy, userId),
        eq(uploads.isCurrentVersion, true)
      ));
      await this.setCalculationCache({
        cacheKey: `orders_overview_${userId}`,
        calculationType: "orders_overview",
        calculationResult: result,
        dependsOnUploads: currentUploads.map((u) => u.id)
      });
      return result;
    } catch (error) {
      console.error("Error calculating orders overview:", error);
      throw new Error(`Failed to calculate orders overview: ${error}`);
    }
  }
  // Dynamic Products Implementation
  async getAllProductsDynamic() {
    return db.select().from(productsDynamic).orderBy(desc(productsDynamic.updatedAt));
  }
  async getProductDynamicBySku(sku) {
    const result = await db.select().from(productsDynamic).where(eq(productsDynamic.sku, sku)).limit(1);
    return result[0];
  }
  async createProductDynamic(product) {
    const result = await db.insert(productsDynamic).values(product).returning();
    return result[0];
  }
  async updateProductDynamic(id, product) {
    const result = await db.update(productsDynamic).set({
      ...product,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(productsDynamic.id, id)).returning();
    return result[0];
  }
  async bulkCreateProductsDynamic(products2) {
    if (products2.length === 0) return [];
    try {
      return await db.insert(productsDynamic).values(products2).onConflictDoNothing().returning();
    } catch (error) {
      console.error("Error during bulk product dynamic creation:", error);
      throw new Error(`Failed to create products: ${error}`);
    }
  }
  async replaceAllProductsDynamic(uploadId, products2) {
    await db.delete(productsDynamic).where(eq(productsDynamic.uploadId, uploadId));
    if (products2.length === 0) return [];
    return await db.insert(productsDynamic).values(products2).returning();
  }
  async addUniqueProductsDynamic(uploadId, products2) {
    if (products2.length === 0) return [];
    try {
      return await db.insert(productsDynamic).values(products2).onConflictDoNothing({ target: [productsDynamic.sku, productsDynamic.uploadId] }).returning();
    } catch (error) {
      console.error("Error during unique product creation:", error);
      throw new Error(`Failed to add unique products: ${error}`);
    }
  }
  // Dynamic Orders Implementation
  async getAllOrdersDynamic() {
    return db.select().from(ordersDynamic).orderBy(desc(ordersDynamic.updatedAt));
  }
  async getOrderDynamicBySubOrderNo(subOrderNo) {
    const result = await db.select().from(ordersDynamic).where(eq(ordersDynamic.subOrderNo, subOrderNo)).limit(1);
    return result[0];
  }
  async createOrderDynamic(order) {
    const result = await db.insert(ordersDynamic).values(order).returning();
    return result[0];
  }
  async updateOrderDynamic(id, order) {
    const result = await db.update(ordersDynamic).set({
      ...order,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(ordersDynamic.id, id)).returning();
    return result[0];
  }
  async bulkCreateOrdersDynamic(orders2) {
    if (orders2.length === 0) return [];
    try {
      return await db.insert(ordersDynamic).values(orders2).onConflictDoNothing().returning();
    } catch (error) {
      console.error("Error during bulk order dynamic creation:", error);
      throw new Error(`Failed to create orders: ${error}`);
    }
  }
  async replaceAllOrdersDynamic(uploadId, orders2) {
    console.log("Clearing all existing orders before adding new ones to prevent duplicates");
    await db.delete(ordersDynamic);
    if (orders2.length === 0) return [];
    return await db.insert(ordersDynamic).values(orders2).returning();
  }
  // File Structure Management
  async markUploadAsCurrent(uploadId, fileType) {
    await db.update(uploads).set({ isCurrentVersion: false }).where(eq(uploads.fileType, fileType));
    await db.update(uploads).set({ isCurrentVersion: true }).where(eq(uploads.id, uploadId));
  }
  async getFileStructure(uploadId) {
    const result = await db.select().from(uploads).where(eq(uploads.id, uploadId)).limit(1);
    if (result[0] && result[0].columnStructure) {
      return result[0].columnStructure;
    }
    return void 0;
  }
  async saveFileStructure(uploadId, structure) {
    await db.update(uploads).set({
      columnStructure: structure
    }).where(eq(uploads.id, uploadId));
  }
  // Calculation Cache Implementation
  async getCalculationCache(cacheKey) {
    const result = await db.select().from(calculationCache).where(eq(calculationCache.cacheKey, cacheKey)).limit(1);
    return result[0];
  }
  async setCalculationCache(cache) {
    const result = await db.insert(calculationCache).values(cache).onConflictDoUpdate({
      target: calculationCache.cacheKey,
      set: {
        calculationResult: cache.calculationResult,
        lastUpdated: /* @__PURE__ */ new Date(),
        dependsOnUploads: cache.dependsOnUploads
      }
    }).returning();
    return result[0];
  }
  async invalidateCalculationCache(cacheKeys) {
    if (cacheKeys.length === 0) return;
    await db.delete(calculationCache).where(sql2`${calculationCache.cacheKey} = ANY(${cacheKeys})`);
  }
  async invalidateCalculationCacheByUpload(uploadId) {
    await db.delete(calculationCache).where(
      sql2`${calculationCache.dependsOnUploads}::jsonb ? ${uploadId}`
    );
  }
  // Live Dashboard Metrics Implementation
  async getLiveDashboardMetrics(userId) {
    const cached = await this.getCalculationCache(`live_dashboard_metrics_${userId}`);
    if (cached && Date.now() - new Date(cached.lastUpdated).getTime() < 5 * 60 * 1e3) {
      return cached.calculationResult;
    }
    return await this.calculateRealTimeMetrics(userId);
  }
  async calculateRealTimeMetrics(userId) {
    const currentUploads = await db.select().from(uploads).where(and(
      eq(uploads.uploadedBy, userId),
      eq(uploads.isCurrentVersion, true)
    ));
    const [productsData] = await db.select({
      totalProducts: count(productsDynamic.id)
    }).from(productsDynamic).innerJoin(uploads, eq(productsDynamic.uploadId, uploads.id)).where(and(
      eq(uploads.uploadedBy, userId),
      eq(uploads.isCurrentVersion, true)
    ));
    const [ordersData] = await db.select({
      totalOrders: count(ordersDynamic.id),
      totalSales: sql2`SUM(CAST(${ordersDynamic.dynamicData}->>'discountedPrice' AS DECIMAL))`
    }).from(ordersDynamic).innerJoin(uploads, eq(ordersDynamic.uploadId, uploads.id)).where(and(
      eq(uploads.uploadedBy, userId),
      eq(uploads.isCurrentVersion, true)
    ));
    const [gstData] = await db.select({
      totalGST: sql2`
          SUM(
            CAST(${ordersDynamic.dynamicData}->>'discountedPrice' AS DECIMAL) * 
            CAST(COALESCE(${productsDynamic.dynamicData}->>'gstPercent', '18') AS DECIMAL) / 100
          )
        `
    }).from(ordersDynamic).innerJoin(uploads, eq(ordersDynamic.uploadId, uploads.id)).leftJoin(productsDynamic, sql2`${ordersDynamic.dynamicData}->>'sku' = ${productsDynamic.sku} AND ${productsDynamic.uploadId} = ${uploads.id}`).where(and(
      eq(uploads.uploadedBy, userId),
      eq(uploads.isCurrentVersion, true)
    ));
    const [profitData] = await db.select({
      totalCost: sql2`
          SUM(
            CAST(${ordersDynamic.dynamicData}->>'quantity' AS INTEGER) * 
            (
              CAST(COALESCE(${productsDynamic.dynamicData}->>'costPrice', '0') AS DECIMAL) +
              CAST(COALESCE(${productsDynamic.dynamicData}->>'packagingCost', '0') AS DECIMAL)
            )
          )
        `
    }).from(ordersDynamic).innerJoin(uploads, eq(ordersDynamic.uploadId, uploads.id)).leftJoin(productsDynamic, sql2`${ordersDynamic.dynamicData}->>'sku' = ${productsDynamic.sku} AND ${productsDynamic.uploadId} = ${uploads.id}`).where(and(
      eq(uploads.uploadedBy, userId),
      eq(uploads.isCurrentVersion, true)
    ));
    const salesTrend = await db.select({
      date: sql2`DATE(CAST(${ordersDynamic.dynamicData}->>'orderDate' AS TIMESTAMP))`,
      value: sql2`SUM(CAST(${ordersDynamic.dynamicData}->>'discountedPrice' AS DECIMAL))`
    }).from(ordersDynamic).innerJoin(uploads, eq(ordersDynamic.uploadId, uploads.id)).where(and(
      eq(uploads.uploadedBy, userId),
      eq(uploads.isCurrentVersion, true),
      sql2`CAST(${ordersDynamic.dynamicData}->>'orderDate' AS TIMESTAMP) >= CURRENT_DATE - INTERVAL '30 days'`
    )).groupBy(sql2`DATE(CAST(${ordersDynamic.dynamicData}->>'orderDate' AS TIMESTAMP))`).orderBy(sql2`DATE(CAST(${ordersDynamic.dynamicData}->>'orderDate' AS TIMESTAMP))`);
    const totalProducts = Number(productsData?.totalProducts || 0);
    const totalOrders = Number(ordersData?.totalOrders || 0);
    const totalSales = Number(ordersData?.totalSales || 0);
    const totalGST = Number(gstData?.totalGST || 0);
    const totalCost = Number(profitData?.totalCost || 0);
    const profitLoss = totalSales - totalCost;
    const metrics = {
      totalProducts,
      totalOrders,
      totalSales,
      totalGST,
      profitLoss,
      trends: {
        sales: salesTrend.map((item) => ({ date: item.date, value: Number(item.value || 0) })),
        gst: salesTrend.map((item) => ({ date: item.date, value: Number(item.value || 0) * 0.18 })),
        // Simplified GST calculation
        profit: salesTrend.map((item) => ({ date: item.date, value: Number(item.value || 0) * 0.2 }))
        // Simplified profit calculation
      }
    };
    await this.setCalculationCache({
      cacheKey: `live_dashboard_metrics_${userId}`,
      calculationType: "dashboard_summary",
      calculationResult: metrics,
      dependsOnUploads: currentUploads.map((u) => u.id)
    });
    return metrics;
  }
  async recalculateAllMetrics(triggerUploadId, userId) {
    try {
      console.log(`Starting metrics recalculation${triggerUploadId ? ` triggered by upload ${triggerUploadId}` : ""}${userId ? ` for user ${userId}` : ""}`);
      try {
        await db.delete(calculationCache);
        console.log("Successfully cleared calculation cache");
      } catch (cacheError) {
        console.warn("Failed to clear calculation cache (non-critical):", cacheError);
      }
      if (userId) {
        try {
          await this.calculateRealTimeMetrics(userId);
          console.log(`Successfully recalculated metrics for user ${userId}`);
        } catch (metricsError) {
          console.error(`Failed to recalculate metrics for user ${userId}:`, metricsError);
          throw metricsError;
        }
      }
      console.log(`Completed metrics recalculation${triggerUploadId ? ` triggered by upload ${triggerUploadId}` : ""}${userId ? ` for user ${userId}` : ""}`);
    } catch (error) {
      console.error("Error in recalculateAllMetrics:", error);
      throw new Error(`Failed to recalculate metrics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  async getCurrentUploads() {
    try {
      const currentUploads = await db.select().from(uploads).where(eq(uploads.isCurrentVersion, true));
      return currentUploads;
    } catch (error) {
      console.error("Error fetching current uploads:", error);
      throw error;
    }
  }
  async getMonthlyUsageCount(userId, from, to) {
    let monthStart;
    let monthEnd;
    if (from && to) {
      monthStart = from;
      monthEnd = to;
    } else {
      monthStart = sql2`date_trunc('month', now() at time zone 'UTC')`;
      monthEnd = sql2`(date_trunc('month', now() at time zone 'UTC') + interval '1 month')`;
    }
    const result = await db.select({ count: count() }).from(uploads).where(
      and(
        eq(uploads.uploadedBy, userId),
        inArray(uploads.status, ["pending", "processing", "processed", "failed"]),
        gte(uploads.createdAt, monthStart),
        lt(uploads.createdAt, monthEnd)
      )
    );
    return Number(result[0]?.count || 0);
  }
  async getUsageSummary(userId) {
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const limit = user[0]?.monthlyQuota || 10;
    const now = /* @__PURE__ */ new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const used = await this.getMonthlyUsageCount(userId, periodStart, periodEnd);
    return {
      used,
      limit,
      periodStart,
      periodEnd
    };
  }
};
var storage = new DatabaseStorage();

// server/services/firebase.ts
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
var firebaseConfig = {
  projectId: "reconme-fbee1"
};
if (getApps().length === 0) {
  initializeApp(firebaseConfig);
}
var auth = getAuth();
async function verifyFirebaseToken(idToken) {
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture
    };
  } catch (error) {
    console.error("Firebase token verification failed:", error);
    throw new Error("Invalid Firebase token");
  }
}

// server/services/fileProcessor.ts
import csv2 from "csv-parser";
import * as xlsx from "xlsx";
import AdmZip2 from "adm-zip";
import { Readable as Readable2 } from "stream";
init_csvProcessor();
init_zipProcessor();
var FileProcessor = class _FileProcessor {
  // Helper method to sanitize numeric fields by removing currency symbols and commas
  static sanitizeNumericField(value) {
    if (value == null || value === "") return "0";
    if (typeof value === "number") {
      return value.toString();
    }
    if (typeof value === "string") {
      const cleaned = value.trim().replace(/[₹$€£,]/g, "");
      if (cleaned && !isNaN(Number(cleaned))) {
        return cleaned;
      }
    }
    return "0";
  }
  // Helper method to normalize column keys for fuzzy matching
  static normalizeKey(key) {
    return key.toLowerCase().replace(/[^a-z0-9]/g, "");
  }
  // Helper method to find column value using fuzzy matching
  static findColumnValue(row, synonyms) {
    for (const synonym of synonyms) {
      const normalizedSynonym = this.normalizeKey(synonym);
      for (const [key, value] of Object.entries(row)) {
        if (this.normalizeKey(key) === normalizedSynonym) {
          return value;
        }
      }
    }
    return null;
  }
  // Helper method to calculate total GST from CGST/SGST or use IGST
  static calculateTotalGst(row) {
    const igst = this.findColumnValue(row, ["IGST Rate", "IGST %", "IGST Percent", "Interstate GST"]);
    if (igst) {
      const sanitized = this.sanitizeGstField(igst);
      console.log(`Found IGST: ${sanitized}%`);
      return sanitized;
    }
    const cgst = this.findColumnValue(row, ["CGST Rate", "CGST %", "CGST Percent", "Central GST"]);
    const sgst = this.findColumnValue(row, ["SGST Rate", "SGST %", "SGST Percent", "State GST"]);
    if (cgst && sgst) {
      const cgstValue = parseFloat(this.sanitizeGstField(cgst, "0"));
      const sgstValue = parseFloat(this.sanitizeGstField(sgst, "0"));
      const totalGst = cgstValue + sgstValue;
      console.log(`Found CGST (${cgstValue}%) + SGST (${sgstValue}%) = ${totalGst}%`);
      return totalGst.toString();
    }
    const generalGst = this.findColumnValue(row, [
      "Product GST %",
      "Product GST",
      "GST %",
      "GST Percent",
      "GST_Percent",
      "Tax Rate",
      "GST Rate",
      "Product_GST",
      "Item Tax Rate"
    ]);
    if (generalGst) {
      const sanitized = this.sanitizeGstField(generalGst);
      console.log(`Found general GST: ${sanitized}%`);
      return sanitized;
    }
    return null;
  }
  // Helper method to sanitize GST fields with proper validation and fallback
  static sanitizeGstField(value, defaultGst = "5") {
    if (value == null || value === "") return defaultGst;
    if (typeof value === "number") {
      const numValue = Number(value);
      if (numValue >= 0 && numValue <= 100) {
        return value.toString();
      }
      return defaultGst;
    }
    if (typeof value === "string") {
      const cleaned = value.trim().replace(/[%\s]/g, "");
      if (cleaned && !isNaN(Number(cleaned))) {
        const numValue = Number(cleaned);
        if (numValue >= 0 && numValue <= 100) {
          return cleaned;
        }
      }
    }
    return defaultGst;
  }
  // Enhanced method to extract files from ZIP archive (XLSX, CSV, etc.)
  static async extractFilesFromZip(buffer) {
    try {
      const zip = new AdmZip2(buffer);
      const zipEntries = zip.getEntries();
      const files = [];
      zipEntries.forEach((entry) => {
        if (!entry.isDirectory) {
          const filename = entry.entryName.toLowerCase();
          let type = "unknown";
          if (filename.endsWith(".xlsx")) {
            type = "xlsx";
          } else if (filename.endsWith(".csv")) {
            type = "csv";
          } else if (filename.endsWith(".xls")) {
            type = "xls";
          }
          if (type !== "unknown") {
            const buffer2 = entry.getData();
            files.push({
              buffer: buffer2,
              filename: entry.entryName,
              type
            });
          }
        }
      });
      return { files };
    } catch (error) {
      console.error("Error extracting files from ZIP:", error);
      return null;
    }
  }
  // Legacy method for backward compatibility
  static async extractXLSXFromZip(buffer) {
    const result = await _FileProcessor.extractFilesFromZip(buffer);
    if (result && result.files.length > 0) {
      const xlsxFile = result.files.find((f) => f.type === "xlsx");
      if (xlsxFile) {
        return {
          xlsxBuffer: xlsxFile.buffer,
          filename: xlsxFile.filename
        };
      }
    }
    return null;
  }
  // Use the dedicated ZIP processor for enhanced payment processing
  static async processPaymentsZIP(buffer) {
    const result = await ZIPProcessor.processPaymentZIP(buffer);
    return {
      payments: result.payments,
      errors: result.errors,
      productGstData: result.productGstData,
      orderStatusData: result.orderStatusData
    };
  }
  // Enhanced method that extracts dynamic structure and processes data
  static async processOrdersCSVDynamic(buffer, uploadId) {
    const data = [];
    const errors = [];
    let headers = [];
    return new Promise((resolve) => {
      const stream = Readable2.from(buffer);
      let isFirstRow = true;
      stream.pipe(csv2()).on("data", (row) => {
        try {
          if (isFirstRow) {
            headers = Object.keys(row);
            isFirstRow = false;
          }
          const cleanedRow = {};
          for (const [key, value] of Object.entries(row)) {
            if (typeof value === "string") {
              const trimmed = value.trim();
              if (trimmed && !isNaN(Number(trimmed.replace(/[₹,]/g, "")))) {
                cleanedRow[key] = trimmed.replace(/[₹,]/g, "");
              } else if (trimmed.toLowerCase() === "true" || trimmed.toLowerCase() === "false") {
                cleanedRow[key] = trimmed.toLowerCase() === "true";
              } else {
                cleanedRow[key] = trimmed;
              }
            } else {
              cleanedRow[key] = value;
            }
          }
          data.push(cleanedRow);
        } catch (error) {
          errors.push(`Error processing row: ${error}`);
        }
      }).on("end", () => {
        const fileStructure = _FileProcessor.analyzeFileStructure(headers, data, "Sub Order No");
        resolve({ data, fileStructure, errors });
      }).on("error", (error) => {
        errors.push(`CSV parsing error: ${error}`);
        resolve({ data, fileStructure: { columns: [], primaryKey: "", totalRows: 0, sampleData: [] }, errors });
      });
    });
  }
  // Use the dedicated CSV processor for enhanced order processing
  static async processOrdersCSV(buffer) {
    const result = await CSVProcessor.processOrdersCSV(buffer);
    return {
      orders: result.orders,
      errors: result.errors,
      productMetadata: result.productMetadata
    };
  }
  static async processPaymentsXLSX(buffer) {
    const payments2 = [];
    const productGstUpdates = /* @__PURE__ */ new Map();
    const errors = [];
    try {
      const workbook = xlsx.read(buffer, { type: "buffer" });
      let targetSheet = "Order Payments";
      if (!workbook.Sheets[targetSheet]) {
        targetSheet = workbook.SheetNames[0];
        console.log(`Order Payments sheet not found, using: ${targetSheet}`);
      } else {
        console.log("Processing Order Payments sheet");
      }
      const worksheet = workbook.Sheets[targetSheet];
      const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
      let headerRowIndex = 0;
      let headers = [];
      for (let i = 0; i < Math.min(5, rawData.length); i++) {
        const row = rawData[i];
        if (row && row.length > 10 && row[0] === "Sub Order No") {
          headerRowIndex = i;
          headers = row;
          break;
        }
      }
      if (headers.length === 0) {
        console.error("Could not find header row with Sub Order No");
        return { payments: [], errors: ["Invalid payment file format - header row not found"] };
      }
      console.log(`Found headers at row ${headerRowIndex}:`, headers.slice(0, 10));
      const subOrderIndex = headers.indexOf("Sub Order No");
      const supplierSkuIndex = headers.indexOf("Supplier SKU");
      const gstIndex = headers.indexOf("Product GST %");
      const settlementDateIndex = headers.indexOf("Payment Date");
      const settlementAmountIndex = headers.indexOf("Final Settlement Amount");
      const orderValueIndex = headers.indexOf("Total Sale Amount (Incl. Shipping & GST)");
      const commissionIndex = headers.indexOf("Meesho Commission (Incl. GST)");
      console.log(`Column indices: SubOrder=${subOrderIndex}, SKU=${supplierSkuIndex}, GST=${gstIndex}`);
      if (subOrderIndex === -1) {
        return { payments: [], errors: ["Sub Order No column not found"] };
      }
      for (let i = headerRowIndex + 2; i < rawData.length; i++) {
        try {
          const row = rawData[i];
          if (!row || row.length < 5) continue;
          const subOrderNo = row[subOrderIndex];
          const supplierSku = row[supplierSkuIndex];
          const productGst = row[gstIndex];
          const payment = {
            subOrderNo: subOrderNo ? String(subOrderNo).trim() : "",
            settlementDate: settlementDateIndex !== -1 && row[settlementDateIndex] ? new Date(row[settlementDateIndex]) : null,
            settlementAmount: _FileProcessor.sanitizeNumericField(settlementAmountIndex !== -1 ? row[settlementAmountIndex] : "0"),
            orderValue: _FileProcessor.sanitizeNumericField(orderValueIndex !== -1 ? row[orderValueIndex] : "0"),
            commissionFee: _FileProcessor.sanitizeNumericField(commissionIndex !== -1 ? row[commissionIndex] : "0"),
            fixedFee: _FileProcessor.sanitizeNumericField("0"),
            paymentGatewayFee: _FileProcessor.sanitizeNumericField("0"),
            adsFee: _FileProcessor.sanitizeNumericField("0")
          };
          if (supplierSku && productGst && !productGstUpdates.has(supplierSku)) {
            const sanitizedGst = _FileProcessor.sanitizeGstField(productGst);
            productGstUpdates.set(supplierSku, sanitizedGst);
            console.log(`Found GST data: SKU ${supplierSku} -> ${sanitizedGst}%`);
          }
          if (!payment.subOrderNo) {
            continue;
          }
          payments2.push(payment);
        } catch (error) {
          errors.push(`Error processing payment row ${i + 1}: ${error}`);
        }
      }
      console.log(`Found ${productGstUpdates.size} products with GST data to update`);
      if (payments2.length === 0 && rawData.length > headerRowIndex + 2) {
        errors.push(`No payments processed - data extraction failed. Found headers: ${headers.join(", ")}. Processing ${rawData.length - headerRowIndex - 2} data rows.`);
        console.warn("Payment processing failed - no valid payment rows found");
      }
      if (productGstUpdates.size > 0) {
        const updates = Array.from(productGstUpdates.entries());
        for (const [sku, gstPercent] of updates) {
          try {
            await storage.updateProduct(sku, { gstPercent });
            console.log(`Updated GST for product ${sku}: ${gstPercent}%`);
          } catch (error) {
            console.error(`Error updating GST for product ${sku}: ${error}`);
            errors.push(`Error updating GST for product ${sku}: ${error}`);
          }
        }
        console.log(`Successfully updated GST for ${updates.length} products`);
      }
    } catch (error) {
      console.error("XLSX parsing error:", error);
      errors.push(`XLSX parsing error: ${error}`);
    }
    return { payments: payments2, errors };
  }
  // Enhanced method to create dynamic products from order data
  static async extractProductsFromOrdersDynamic(orderData, uploadId, defaultGstPercent = "5") {
    const uniqueProducts = /* @__PURE__ */ new Map();
    orderData.forEach((order) => {
      const sku = order["SKU"] || order["sku"];
      const productName = order["Product Name"] || order["productName"] || order["product_name"];
      if (sku && !uniqueProducts.has(sku)) {
        const productData = {
          sku,
          productName,
          costPrice: order["Cost Price"] || order["costPrice"] || "0",
          packagingCost: order["Packaging Cost"] || order["packagingCost"] || "15",
          gstPercent: order["GST Percent"] || order["GST %"] || order["Tax Rate"] || defaultGstPercent,
          // Include any other fields that might be product-related
          ...Object.fromEntries(
            Object.entries(order).filter(
              ([key]) => key.toLowerCase().includes("product") || key.toLowerCase().includes("price") || key.toLowerCase().includes("cost") || key.toLowerCase().includes("gst") || key.toLowerCase().includes("tax")
            )
          )
        };
        uniqueProducts.set(sku, {
          uploadId,
          dynamicData: productData,
          sku
        });
      }
    });
    return Array.from(uniqueProducts.values());
  }
  // Enhanced method to process any CSV file dynamically
  static async processGenericCSV(buffer, uploadId, primaryKeyField) {
    const data = [];
    const errors = [];
    let headers = [];
    return new Promise((resolve) => {
      const stream = Readable2.from(buffer);
      let isFirstRow = true;
      stream.pipe(csv2()).on("data", (row) => {
        try {
          if (isFirstRow) {
            headers = Object.keys(row);
            isFirstRow = false;
          }
          const cleanedRow = {};
          for (const [key, value] of Object.entries(row)) {
            cleanedRow[key] = _FileProcessor.cleanAndTypeValue(value);
          }
          data.push(cleanedRow);
        } catch (error) {
          errors.push(`Error processing row: ${error}`);
        }
      }).on("end", () => {
        const detectedPrimaryKey = primaryKeyField || _FileProcessor.detectPrimaryKey(headers);
        const fileStructure = _FileProcessor.analyzeFileStructure(headers, data, detectedPrimaryKey);
        resolve({ data, fileStructure, errors });
      }).on("error", (error) => {
        errors.push(`CSV parsing error: ${error}`);
        resolve({ data, fileStructure: { columns: [], primaryKey: "", totalRows: 0, sampleData: [] }, errors });
      });
    });
  }
  // Utility methods for file analysis
  static analyzeFileStructure(headers, data, primaryKey) {
    const columns = headers.map((header) => {
      const sampleValues = data.slice(0, 100).map((row) => row[header]).filter((val) => val != null);
      let type = "text";
      if (sampleValues.length > 0) {
        const numericCount = sampleValues.filter((val) => !isNaN(Number(val))).length;
        const dateCount = sampleValues.filter((val) => !isNaN(Date.parse(val))).length;
        const booleanCount = sampleValues.filter(
          (val) => typeof val === "boolean" || val === "true" || val === "false"
        ).length;
        if (booleanCount / sampleValues.length > 0.8) {
          type = "boolean";
        } else if (numericCount / sampleValues.length > 0.8) {
          type = "number";
        } else if (dateCount / sampleValues.length > 0.8 && header.toLowerCase().includes("date")) {
          type = "date";
        }
      }
      return {
        name: header,
        type,
        required: sampleValues.length / data.length > 0.9,
        // Consider required if >90% have values
        description: _FileProcessor.generateColumnDescription(header, type)
      };
    });
    return {
      columns,
      primaryKey,
      totalRows: data.length,
      sampleData: data.slice(0, 5)
      // First 5 rows as sample
    };
  }
  static detectPrimaryKey(headers) {
    const primaryKeyPatterns = [
      /^id$/i,
      /sub.*order.*no/i,
      /order.*id/i,
      /sku$/i,
      /product.*id/i
    ];
    for (const pattern of primaryKeyPatterns) {
      const match = headers.find((header) => pattern.test(header));
      if (match) return match;
    }
    return headers[0] || "";
  }
  static cleanAndTypeValue(value) {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (trimmed.toLowerCase() === "true") return true;
    if (trimmed.toLowerCase() === "false") return false;
    const numberMatch = trimmed.match(/^[₹$€£]?([0-9,]+\.?[0-9]*)$/);
    if (numberMatch) {
      const cleanNumber = numberMatch[1].replace(/,/g, "");
      const parsed = parseFloat(cleanNumber);
      if (!isNaN(parsed)) return parsed.toString();
    }
    return trimmed;
  }
  // Helper method to map order status to payment status
  static mapPaymentStatus(reasonForCredit) {
    if (!reasonForCredit) return "PENDING";
    const status = reasonForCredit.toUpperCase();
    switch (status) {
      case "DELIVERED":
        return "PAID";
      case "RTO_COMPLETE":
      case "RTO COMPLETE":
        return "REFUNDED";
      case "CANCELLED":
      case "CANCELED":
        return "CANCELLED";
      case "RTO_LOCKED":
      case "RTO LOCKED":
        return "PROCESSING";
      case "SHIPPED":
      case "OUT_FOR_DELIVERY":
      case "OUT FOR DELIVERY":
        return "PROCESSING";
      case "LOST":
        return "LOST";
      default:
        return "PENDING";
    }
  }
  // Helper method to check if payment is completed
  static isPaymentCompleted(reasonForCredit) {
    if (!reasonForCredit) return false;
    const status = reasonForCredit.toUpperCase();
    return ["DELIVERED", "RTO_COMPLETE", "RTO COMPLETE"].includes(status);
  }
  static generateColumnDescription(columnName, type) {
    const name = columnName.toLowerCase();
    if (name.includes("price") || name.includes("cost") || name.includes("amount")) {
      return `${type === "number" ? "Numeric" : "Text"} field for ${columnName}`;
    }
    if (name.includes("date") || name.includes("time")) {
      return `Date/time field for ${columnName}`;
    }
    if (name.includes("id") || name.includes("no")) {
      return `Identifier field for ${columnName}`;
    }
    if (name.includes("name") || name.includes("title")) {
      return `Text field for ${columnName}`;
    }
    return `${type.charAt(0).toUpperCase() + type.slice(1)} field for ${columnName}`;
  }
  // Legacy method for backward compatibility - now requires userId
  static async extractProductsFromOrders(orders2, defaultGstPercent = "18", userId) {
    if (!userId) {
      console.warn("extractProductsFromOrders called without userId - skipping product creation");
      return;
    }
    const uniqueProducts = /* @__PURE__ */ new Map();
    orders2.forEach((order) => {
      if (!uniqueProducts.has(order.sku)) {
        let gstPercent = defaultGstPercent;
        if (order.gstPercent) {
          gstPercent = order.gstPercent;
        }
        const productInfo = {
          userId,
          // Ensure userId is always present
          sku: order.sku,
          globalSku: `${userId}:${order.sku}`,
          // Generate unique global SKU
          title: order.productName,
          costPrice: "0",
          packagingCost: "15",
          gstPercent,
          totalOrders: 0,
          isProcessed: true
        };
        uniqueProducts.set(order.sku, productInfo);
      }
      uniqueProducts.get(order.sku).totalOrders += 1;
    });
    const productList = Array.from(uniqueProducts.values());
    const existingProducts = await storage.getAllProducts(userId);
    const existingSkusMap = new Map(existingProducts.map((p) => [p.sku, p]));
    const productsToUpsert = productList.map((product) => {
      const existing = existingSkusMap.get(product.sku);
      return {
        ...product,
        totalOrders: existing ? (Number(existing.totalOrders) || 0) + product.totalOrders : product.totalOrders
        // New product, use current count
      };
    });
    if (productsToUpsert.length > 0) {
      await storage.bulkUpsertProducts(productsToUpsert);
      console.log(`Upserted ${productsToUpsert.length} products with incremental order counts (unique product requirement)`);
    }
  }
};

// server/db.ts
import { Pool } from "pg";
import { drizzle as drizzle2 } from "drizzle-orm/node-postgres";
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db2 = drizzle2({ client: pool, schema: schema_exports });

// server/services/usageTracker.ts
import { eq as eq2, sql as sql3 } from "drizzle-orm";
import { createHash } from "node:crypto";
var UsageTracker = class {
  /**
   * Check if user can process a file (has remaining quota)
   */
  static async canUserProcess(userId) {
    const user = await db2.select().from(users).where(eq2(users.id, userId)).limit(1);
    if (!user.length) {
      throw new Error("User not found");
    }
    const userRecord = user[0];
    const now = /* @__PURE__ */ new Date();
    const lastReset = new Date(userRecord.lastUsageReset);
    const needsReset = this.shouldResetUsage(lastReset, now);
    let currentUsage = userRecord.currentMonthUsage || 0;
    let resetDate = lastReset;
    if (needsReset) {
      await db2.update(users).set({
        currentMonthUsage: 0,
        lastUsageReset: now
      }).where(eq2(users.id, userId));
      currentUsage = 0;
      resetDate = now;
    }
    const monthlyQuota = userRecord.monthlyQuota || 10;
    const remainingUsage = Math.max(0, monthlyQuota - currentUsage);
    const canProcess = remainingUsage > 0;
    const nextReset = new Date(resetDate.getFullYear(), resetDate.getMonth() + 1, 1);
    return {
      currentUsage,
      monthlyQuota,
      remainingUsage,
      canProcess,
      resetDate: nextReset
    };
  }
  /**
   * Record a file processing operation for the user (atomic)
   */
  static async recordUsage(userId) {
    const now = /* @__PURE__ */ new Date();
    const result = await db2.update(users).set({
      currentMonthUsage: sql3`CASE 
          WHEN EXTRACT(month FROM ${users.lastUsageReset}::timestamp) != EXTRACT(month FROM ${now}::timestamp) 
            OR EXTRACT(year FROM ${users.lastUsageReset}::timestamp) != EXTRACT(year FROM ${now}::timestamp)
          THEN 1 
          ELSE ${users.currentMonthUsage} + 1 
        END`,
      lastUsageReset: sql3`CASE 
          WHEN EXTRACT(month FROM ${users.lastUsageReset}::timestamp) != EXTRACT(month FROM ${now}::timestamp) 
            OR EXTRACT(year FROM ${users.lastUsageReset}::timestamp) != EXTRACT(year FROM ${now}::timestamp)
          THEN ${now}
          ELSE ${users.lastUsageReset}
        END`
    }).where(sql3`${users.id} = ${userId} AND (
        CASE 
          WHEN EXTRACT(month FROM ${users.lastUsageReset}::timestamp) != EXTRACT(month FROM ${now}::timestamp) 
            OR EXTRACT(year FROM ${users.lastUsageReset}::timestamp) != EXTRACT(year FROM ${now}::timestamp)
          THEN 1 
          ELSE ${users.currentMonthUsage} + 1 
        END
      ) <= ${users.monthlyQuota}`).returning();
    if (result.length === 0) {
      const usageInfo = await this.getUsageInfo(userId);
      throw new Error(`Monthly quota exceeded. You have processed ${usageInfo.currentUsage}/${usageInfo.monthlyQuota} files this month. Quota resets on ${usageInfo.resetDate.toDateString()}.`);
    }
    const updatedUser = result[0];
    const nextReset = new Date(updatedUser.lastUsageReset.getFullYear(), updatedUser.lastUsageReset.getMonth() + 1, 1);
    return {
      currentUsage: updatedUser.currentMonthUsage || 0,
      monthlyQuota: updatedUser.monthlyQuota || 10,
      remainingUsage: (updatedUser.monthlyQuota || 10) - (updatedUser.currentMonthUsage || 0),
      canProcess: (updatedUser.currentMonthUsage || 0) < (updatedUser.monthlyQuota || 10),
      resetDate: nextReset
    };
  }
  /**
   * Get current usage info without modifying it
   */
  static async getUsageInfo(userId) {
    return this.canUserProcess(userId);
  }
  /**
   * Check if usage should be reset based on dates
   */
  static shouldResetUsage(lastReset, now) {
    return lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear();
  }
  /**
   * Generate a deterministic unique global SKU for a product
   */
  static generateGlobalSku(userId, originalSku) {
    const normalizedSku = originalSku.toLowerCase().replace(/[^a-z0-9]/g, "");
    const input = `${userId}:${normalizedSku}`;
    const hash = createHash("sha256").update(input).digest("hex");
    const hashPrefix = hash.substring(0, 16).toUpperCase();
    return `GLB-${hashPrefix}`;
  }
  /**
   * Admin function to reset user's monthly quota (for testing or special cases)
   */
  static async resetUserQuota(userId) {
    await db2.update(users).set({
      currentMonthUsage: 0,
      lastUsageReset: /* @__PURE__ */ new Date()
    }).where(eq2(users.id, userId));
  }
  /**
   * Admin function to set custom quota for a user
   */
  static async setUserQuota(userId, newQuota) {
    await db2.update(users).set({
      monthlyQuota: newQuota
    }).where(eq2(users.id, userId));
  }
};

// server/routes.ts
var upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024
    // 50MB limit
  }
});
function calculatePaymentStatus(orderStatus, settlementAmount = 0) {
  const normalizedStatus = orderStatus.trim();
  if (normalizedStatus === "Cancelled") {
    return "N/A";
  } else if (normalizedStatus === "Delivered") {
    if (settlementAmount > 0) {
      return "Paid";
    } else {
      return "N/A";
    }
  } else if (normalizedStatus === "RTO") {
    return "Unpaid/Zero";
  } else if (normalizedStatus === "Return") {
    if (settlementAmount < 0) {
      return "Refunded";
    } else {
      return "N/A";
    }
  } else {
    return "N/A";
  }
}
function normalizeOrderStatus(reasonForCredit) {
  if (!reasonForCredit) return "Unknown";
  const reason = reasonForCredit.toUpperCase().trim();
  switch (reason) {
    case "DELIVERED":
      return "Delivered";
    case "CANCELLED":
    case "CANCELED":
      return "Cancelled";
    case "RTO_COMPLETE":
    case "RTO_LOCKED":
    case "RTO_OFD":
    case "RTO":
      return "RTO";
    case "RETURN":
    case "RETURNED":
      return "Return";
    default:
      return reason;
  }
}
async function updateOrdersWithPaymentData(payments2) {
  try {
    console.log(`Updating ${payments2.length} orders with payment data...`);
    for (const payment of payments2) {
      if (payment.subOrderNo) {
        let paymentStatus = "N/A";
        const order = await storage.getOrderBySubOrderNo(payment.subOrderNo);
        if (order && order.reasonForCredit) {
          const normalizedOrderStatus = normalizeOrderStatus(order.reasonForCredit);
          let settlementAmount = 0;
          if (payment.settlementAmount != null) {
            if (typeof payment.settlementAmount === "number") {
              settlementAmount = payment.settlementAmount;
            } else if (typeof payment.settlementAmount === "string") {
              const cleaned = payment.settlementAmount.replace(/[₹$€£,\s]/g, "").trim();
              const parsed = parseFloat(cleaned);
              settlementAmount = Number.isFinite(parsed) ? parsed : 0;
            }
          }
          paymentStatus = calculatePaymentStatus(normalizedOrderStatus, settlementAmount);
        }
        try {
          const updateData = {
            paymentStatus
          };
          if (payment.settlementDate) {
            updateData.paymentDate = payment.settlementDate;
          }
          await storage.updateOrderWithPaymentData(payment.subOrderNo, updateData);
        } catch (error) {
          console.error(`Error updating order ${payment.subOrderNo} with payment data:`, error);
        }
      }
    }
    console.log(`Successfully updated orders with payment data`);
  } catch (error) {
    console.error("Error in updateOrdersWithPaymentData:", error);
  }
}
async function authenticateUser(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }
    const decodedToken = await verifyFirebaseToken(token);
    const user = await storage.getUserByFirebaseUid(decodedToken.uid);
    if (!user) {
      return res.status(401).json({ message: "User not found in database" });
    }
    req.user = {
      ...decodedToken,
      dbId: user.id
      // Add database ID to user object
    };
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
}
async function registerRoutes(app2) {
  app2.post("/api/auth/verify", async (req, res) => {
    try {
      const { idToken } = req.body;
      if (!idToken) {
        return res.status(400).json({ message: "ID token is required" });
      }
      const decodedToken = await verifyFirebaseToken(idToken);
      let user = await storage.getUserByFirebaseUid(decodedToken.uid);
      if (!user) {
        user = await storage.createUser({
          firebaseUid: decodedToken.uid,
          email: decodedToken.email || "",
          displayName: decodedToken.name,
          photoURL: decodedToken.picture
        });
      }
      res.json({ user, token: idToken });
    } catch (error) {
      console.error("Auth verification error:", error);
      res.status(401).json({ message: "Authentication failed" });
    }
  });
  app2.get("/api/dashboard/summary", authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.dbId;
      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }
      const summary = await storage.getDashboardSummary(userId);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard summary" });
    }
  });
  app2.get("/api/dashboard/revenue-trend", authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.dbId;
      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }
      const revenueTrend = await storage.getRevenueTrend(userId);
      res.json(revenueTrend);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch revenue trend" });
    }
  });
  app2.get("/api/dashboard/order-status", authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.dbId;
      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }
      const orderStatus = await storage.getOrderStatusDistribution(userId);
      res.json(orderStatus);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order status" });
    }
  });
  app2.get("/api/dashboard/comprehensive-summary", authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.dbId;
      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }
      const summary = await storage.getComprehensiveFinancialSummary(userId);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch comprehensive financial summary" });
    }
  });
  app2.get("/api/dashboard/settlement-components", authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.dbId;
      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }
      const components = await storage.getSettlementComponents(userId);
      res.json(components);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settlement components" });
    }
  });
  app2.get("/api/dashboard/earnings-overview", authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.dbId;
      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }
      const earnings = await storage.getEarningsOverview(userId);
      res.json(earnings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch earnings overview" });
    }
  });
  app2.get("/api/dashboard/operational-costs", authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.dbId;
      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }
      const costs = await storage.getOperationalCosts(userId);
      res.json(costs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch operational costs" });
    }
  });
  app2.get("/api/dashboard/daily-volume", authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.dbId;
      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }
      const dailyVolume = await storage.getDailyVolumeAndAOV(userId);
      res.json(dailyVolume);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch daily volume data" });
    }
  });
  app2.get("/api/dashboard/top-products", authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.dbId;
      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }
      const topProducts = await storage.getTopPerformingProducts(userId);
      res.json(topProducts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch top products" });
    }
  });
  app2.get("/api/dashboard/top-returns", authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.dbId;
      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }
      const topReturns = await storage.getTopReturnProducts(userId);
      res.json(topReturns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch top return products" });
    }
  });
  app2.get("/api/dashboard/orders-overview", authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.dbId;
      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }
      const ordersOverview = await storage.getOrdersOverview(userId);
      res.json(ordersOverview);
    } catch (error) {
      console.error("Failed to fetch orders overview:", error);
      res.status(500).json({ message: "Failed to fetch orders overview" });
    }
  });
  app2.get("/api/dashboard/live-metrics", authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.dbId;
      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }
      const liveMetrics = await storage.getLiveDashboardMetrics(userId);
      res.json(liveMetrics);
    } catch (error) {
      console.error("Failed to fetch live dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch live dashboard metrics" });
    }
  });
  app2.post("/api/dashboard/recalculate", authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.dbId;
      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }
      await storage.recalculateAllMetrics(void 0, userId);
      res.json({ message: "Metrics recalculated successfully" });
    } catch (error) {
      console.error("Failed to recalculate metrics:", error);
      res.status(500).json({ message: "Failed to recalculate metrics" });
    }
  });
  app2.get("/api/products-dynamic", authenticateUser, async (req, res) => {
    try {
      const products2 = await storage.getAllProductsDynamic();
      res.json(products2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dynamic products" });
    }
  });
  app2.put("/api/products-dynamic/:id", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const updatedProduct = await storage.updateProductDynamic(id, req.body);
      if (updatedProduct) {
        await storage.recalculateAllMetrics();
        res.json(updatedProduct);
      } else {
        res.status(404).json({ message: "Product not found" });
      }
    } catch (error) {
      console.error("Failed to update dynamic product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });
  app2.get("/api/orders-dynamic", authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.dbId;
      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }
      const orders2 = await storage.getAllOrdersDynamic();
      const payments2 = await storage.getAllPayments();
      const paymentMap = /* @__PURE__ */ new Map();
      payments2.forEach((payment) => {
        paymentMap.set(payment.subOrderNo, payment);
      });
      const products2 = await storage.getAllProducts(userId);
      const productMap = /* @__PURE__ */ new Map();
      products2.forEach((product) => {
        productMap.set(product.sku, product);
      });
      const ordersWithPayments = orders2.map((order) => {
        const payment = paymentMap.get(order.subOrderNo);
        const orderData = order.dynamicData || {};
        const normalizedOrderData = {};
        for (const key in orderData) {
          if (Object.prototype.hasOwnProperty.call(orderData, key)) {
            normalizedOrderData[key.trim().toLowerCase()] = orderData[key];
          }
        }
        const sku = normalizedOrderData["sku"] || "";
        const product = productMap.get(sku);
        const settlementAmount = parseFloat(payment?.settlementAmount || "0");
        const orderStatus = normalizedOrderData["reason for credit entry"] || "Unknown";
        const normalizedOrderStatus = normalizeOrderStatus(orderStatus);
        const paymentStatus = calculatePaymentStatus(normalizedOrderStatus, settlementAmount);
        return {
          ...order,
          // Explicitly map required fields from normalized data
          sku,
          quantity: normalizedOrderData["qty"] || "1",
          orderDate: normalizedOrderData["order date"] || (/* @__PURE__ */ new Date()).toISOString(),
          listedPrice: normalizedOrderData["supplier listed price (incl. gst + commission)"] || normalizedOrderData["listed price"] || normalizedOrderData["listedprice"] || normalizedOrderData["sale price"] || normalizedOrderData["supplier listed price"] || normalizedOrderData["sale amount"] || normalizedOrderData["price"] || normalizedOrderData["listed price (incl. gst)"] || normalizedOrderData["original price"] || "0",
          reasonForCredit: orderStatus,
          // Payment data from ZIP file
          paymentDate: payment?.settlementDate || null,
          settlementAmount: payment?.settlementAmount || null,
          settlementDate: payment?.settlementDate || null,
          hasPayment: !!payment,
          paymentStatus,
          // Additional payment details
          orderValue: payment?.orderValue || null,
          commissionFee: payment?.commissionFee || null,
          fixedFee: payment?.fixedFee || null,
          paymentGatewayFee: payment?.paymentGatewayFee || null,
          adsFee: payment?.adsFee || null,
          // Product cost data
          costPrice: product?.costPrice || "0",
          packagingCost: product?.packagingCost || "0",
          finalPrice: product?.finalPrice || "0",
          gstPercent: product?.gstPercent || 5
        };
      });
      const { status, paymentStatus: paymentStatusFilter } = req.query;
      let filteredOrders = ordersWithPayments;
      if (status && status !== "all") {
        filteredOrders = filteredOrders.filter((order) => normalizeOrderStatus(order.reasonForCredit) === status);
      }
      if (paymentStatusFilter && paymentStatusFilter !== "all") {
        filteredOrders = filteredOrders.filter((order) => order.paymentStatus.toLowerCase() === paymentStatusFilter.toLowerCase());
      }
      res.json(filteredOrders);
    } catch (error) {
      console.error("Failed to fetch dynamic orders:", error);
      res.status(500).json({ message: "Failed to fetch dynamic orders" });
    }
  });
  app2.put("/api/orders-dynamic/:id", authenticateUser, async (req, res) => {
    try {
      const { id } = req.params;
      const updatedOrder = await storage.updateOrderDynamic(id, req.body);
      if (updatedOrder) {
        await storage.recalculateAllMetrics();
        res.json(updatedOrder);
      } else {
        res.status(404).json({ message: "Order not found" });
      }
    } catch (error) {
      console.error("Failed to update dynamic order:", error);
      res.status(500).json({ message: "Failed to update order" });
    }
  });
  app2.get("/api/file-structure/:uploadId", authenticateUser, async (req, res) => {
    try {
      const { uploadId } = req.params;
      const fileStructure = await storage.getFileStructure(uploadId);
      if (fileStructure) {
        res.json(fileStructure);
      } else {
        res.status(404).json({ message: "File structure not found" });
      }
    } catch (error) {
      console.error("Failed to fetch file structure:", error);
      res.status(500).json({ message: "Failed to fetch file structure" });
    }
  });
  app2.get("/api/current-uploads", authenticateUser, async (req, res) => {
    try {
      const currentUploads = await storage.getCurrentUploads();
      res.json(currentUploads);
    } catch (error) {
      console.error("Failed to fetch current uploads:", error);
      res.status(500).json({ message: "Failed to fetch current uploads" });
    }
  });
  app2.get("/api/users/me", authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.dbId;
      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }
      const user = await storage.getUserByFirebaseUid(req.user?.uid || "");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const usage = await storage.getUsageSummary(userId);
      res.json({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          monthlyQuota: user.monthlyQuota,
          createdAt: user.createdAt
        },
        usage
      });
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });
  app2.get("/api/users/me/usage", authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.dbId;
      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }
      const usage = await storage.getUsageSummary(userId);
      res.json(usage);
    } catch (error) {
      console.error("Failed to fetch usage summary:", error);
      res.status(500).json({ message: "Failed to fetch usage summary" });
    }
  });
  app2.post("/api/upload", authenticateUser, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const userId = req.user?.dbId;
      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }
      const usageInfo = await UsageTracker.canUserProcess(userId);
      if (!usageInfo.canProcess) {
        return res.status(429).json({
          message: `Monthly upload limit reached. You have used ${usageInfo.currentUsage}/${usageInfo.monthlyQuota} uploads this month. Quota resets on ${usageInfo.resetDate.toDateString()}.`,
          used: usageInfo.currentUsage,
          limit: usageInfo.monthlyQuota,
          remaining: usageInfo.remainingUsage,
          resetAt: usageInfo.resetDate.toISOString()
        });
      }
      const { fileType, sourceMonth, label, gstPercent } = req.body;
      const uploadRecord = await storage.createUpload({
        filename: req.file.filename || req.file.originalname,
        originalName: req.file.originalname,
        fileType,
        status: "processing",
        sourceMonth,
        label,
        uploadedBy: userId
      });
      processFileAsync(uploadRecord.id, req.file.buffer, fileType, gstPercent, userId);
      res.json({ uploadId: uploadRecord.id, status: "processing" });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Upload failed" });
    }
  });
  app2.get("/api/uploads", authenticateUser, async (req, res) => {
    try {
      const uploads2 = await storage.getAllUploads();
      res.json(uploads2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch uploads" });
    }
  });
  app2.get("/api/orders", authenticateUser, async (req, res) => {
    try {
      const filters = {
        subOrderNo: req.query.subOrderNo,
        status: req.query.status,
        paymentStatus: req.query.paymentStatus,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom) : void 0,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo) : void 0
      };
      const orders2 = await storage.getAllOrders(filters);
      res.json(orders2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });
  app2.get("/api/account/usage", authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.dbId;
      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }
      const usageInfo = await UsageTracker.getUsageInfo(userId);
      res.json(usageInfo);
    } catch (error) {
      console.error("Failed to fetch usage info:", error);
      res.status(500).json({ message: "Failed to fetch usage information" });
    }
  });
  app2.get("/api/products", authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.dbId;
      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }
      const products2 = await storage.getAllProducts(userId);
      res.json(products2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });
  app2.post("/api/products", authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.dbId;
      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }
      const productData = insertProductSchema.parse({ ...req.body, userId });
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      console.error("Failed to create product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });
  app2.put("/api/products/:sku", authenticateUser, async (req, res) => {
    try {
      const { sku } = req.params;
      const userId = req.user?.dbId;
      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }
      const allowedSchema = insertProductSchema.partial().pick({
        costPrice: true,
        packagingCost: true,
        gstPercent: true,
        title: true
      });
      const updateData = allowedSchema.parse(req.body);
      const product = await storage.updateProduct(sku, updateData, userId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      await storage.recalculateAllMetrics();
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to update product" });
    }
  });
  app2.post("/api/products/bulk-update", authenticateUser, async (req, res) => {
    try {
      const { field, value } = req.body;
      const userId = req.user?.dbId;
      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }
      if (!["packagingCost", "gstPercent", "costPrice"].includes(field)) {
        return res.status(400).json({ message: "Invalid field" });
      }
      const products2 = await storage.getAllProducts(userId);
      let validatedValue;
      if (["costPrice", "packagingCost", "gstPercent"].includes(field)) {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          return res.status(400).json({ message: "Invalid numeric value" });
        }
        validatedValue = numValue.toString();
      } else {
        validatedValue = value.toString();
      }
      const updates = products2.map(
        (product) => storage.updateProduct(product.sku, { [field]: validatedValue }, userId)
      );
      await Promise.all(updates);
      await storage.recalculateAllMetrics();
      res.json({
        message: "Bulk update completed",
        updatedProducts: products2.length,
        field,
        value: validatedValue
      });
    } catch (error) {
      console.error("Bulk update error:", error);
      res.status(500).json({ message: "Bulk update failed" });
    }
  });
  app2.post("/api/products/update-all-costs", authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.dbId;
      if (!userId) {
        return res.status(401).json({ message: "User authentication required" });
      }
      const products2 = await storage.getAllProducts(userId);
      const updates = products2.map(async (product) => {
        const costPrice = parseFloat(product.costPrice || "0");
        const packagingCost = parseFloat(product.packagingCost || "0");
        const finalPrice = Math.round((costPrice + packagingCost) * 100) / 100;
        return await storage.updateProduct(product.sku, {
          finalPrice: finalPrice.toString()
        }, userId);
      });
      const updatedProducts = await Promise.all(updates);
      await storage.recalculateAllMetrics();
      res.json({
        message: "All product costs updated successfully",
        productsProcessed: updatedProducts.length,
        totalFinalPriceCalculated: updatedProducts.reduce((sum2, product) => sum2 + parseFloat(product?.finalPrice || "0"), 0)
      });
    } catch (error) {
      console.error("Failed to update all product costs:", error);
      res.status(500).json({ message: "Failed to update product costs" });
    }
  });
  app2.get("/api/export/:type", authenticateUser, async (req, res) => {
    try {
      const { type } = req.params;
      let data = [];
      let filename = "";
      switch (type) {
        case "orders":
          data = await storage.getAllOrders();
          filename = "orders_export.csv";
          break;
        case "payments":
          data = await storage.getAllPayments();
          filename = "payments_export.csv";
          break;
        default:
          return res.status(400).json({ message: "Invalid export type" });
      }
      const csv3 = convertToCSV(data);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(csv3);
    } catch (error) {
      res.status(500).json({ message: "Export failed" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}
async function processFileAsync(uploadId, buffer, fileType, gstPercent, userId) {
  try {
    let result;
    let recordsProcessed = 0;
    if (fileType === "orders_csv") {
      const dynamicResult = await FileProcessor.processOrdersCSVDynamic(buffer, uploadId);
      if (dynamicResult.data && dynamicResult.data.length > 0) {
        const ordersDynamic2 = dynamicResult.data.map((row) => ({
          uploadId,
          dynamicData: row,
          subOrderNo: row["Sub Order No"] || row["subOrderNo"] || ""
        }));
        await storage.replaceAllOrdersDynamic(uploadId, ordersDynamic2);
        const productsDynamic2 = await FileProcessor.extractProductsFromOrdersDynamic(
          dynamicResult.data,
          uploadId,
          gstPercent || "18"
        );
        if (productsDynamic2.length > 0 && userId) {
          const productsToSave = productsDynamic2.map((product) => ({
            userId,
            // Ensure userId is always present
            sku: product.sku,
            globalSku: UsageTracker.generateGlobalSku(userId, product.sku),
            title: product.dynamicData?.["Product Name"] || product.sku,
            costPrice: product.dynamicData?.["Cost Price"] || "0",
            packagingCost: product.dynamicData?.["Packaging Cost"] || "0",
            gstPercent: product.dynamicData?.["GST %"] || "5",
            isProcessed: true
          }));
          await storage.bulkUpsertProducts(productsToSave);
        }
        await storage.saveFileStructure(uploadId, dynamicResult.fileStructure);
        await storage.markUploadAsCurrent(uploadId, fileType);
        recordsProcessed = dynamicResult.data.length;
        await storage.recalculateAllMetrics(uploadId);
        console.log(`Processed ${recordsProcessed} orders dynamically, extracted ${productsDynamic2.length} products`);
      }
      if (recordsProcessed > 0) {
        const { CSVProcessor: CSVProcessor2 } = await Promise.resolve().then(() => (init_csvProcessor(), csvProcessor_exports));
        const enhancedResult = await CSVProcessor2.processOrdersCSV(buffer);
        if (enhancedResult.orders) {
          try {
            await storage.bulkUpsertOrders(enhancedResult.orders);
            await FileProcessor.extractProductsFromOrders(enhancedResult.orders, gstPercent || "5", userId);
            if (enhancedResult.productMetadata && enhancedResult.productMetadata.length > 0 && userId) {
              console.log(`Applying ${enhancedResult.productMetadata.length} product metadata records from ENHANCED CSV processor`);
              for (const metadata of enhancedResult.productMetadata) {
                try {
                  const gstToApply = metadata.gstPercent !== void 0 ? metadata.gstPercent : 5;
                  await storage.updateProductGst(metadata.sku, gstToApply, metadata.productName, userId);
                  if (metadata.costPrice !== void 0) {
                    await storage.updateProduct(metadata.sku, { costPrice: metadata.costPrice.toString() }, userId);
                  }
                } catch (error) {
                  console.warn(`Failed to update metadata for product ${metadata.sku}:`, error);
                }
              }
            }
            console.log(`Processed ${enhancedResult.orders.length} orders with exact column mapping and payment data`);
          } catch (error) {
            console.error("Enhanced CSV processing error (non-blocking):", error);
          }
        }
      }
      await storage.updateUploadStatus(uploadId, "processed", recordsProcessed, dynamicResult.errors);
      if (userId) {
        try {
          await UsageTracker.recordUsage(userId);
          console.log(`Usage recorded for user ${userId} after CSV orders processing`);
        } catch (error) {
          console.error("Error recording usage:", error);
        }
      }
    } else if (fileType === "payment_zip") {
      const { ZIPProcessor: ZIPProcessor2 } = await Promise.resolve().then(() => (init_zipProcessor(), zipProcessor_exports));
      result = await ZIPProcessor2.processPaymentZIP(buffer);
      if (result.payments) {
        await storage.bulkCreatePayments(result.payments);
        await updateOrdersWithPaymentData(result.payments);
        if (result.productGstData && result.productGstData.length > 0) {
          console.log(`Updating ${result.productGstData.length} products with GST data from ENHANCED ZIP processor`);
          for (const gstData of result.productGstData) {
            try {
              console.log(`Attempting to update GST for SKU: "${gstData.sku}" with ${gstData.gstPercent}% GST (from column 7)`);
              const updated = await storage.updateProductGst(gstData.sku, gstData.gstPercent, gstData.productName, userId);
              if (updated) {
                console.log(`\u2713 Successfully updated GST for SKU: "${gstData.sku}" to ${gstData.gstPercent}%`);
              } else {
                console.warn(`\u2717 No product found with SKU: "${gstData.sku}" - GST update skipped`);
              }
            } catch (error) {
              console.error(`\u2717 Failed to update GST for product "${gstData.sku}":`, error);
            }
          }
        }
        if (result.orderStatusData && result.orderStatusData.length > 0) {
          console.log(`Updating ${result.orderStatusData.length} orders with status data from ZIP`);
          for (const statusData of result.orderStatusData) {
            try {
              await storage.updateOrderStatus(statusData.subOrderNo, statusData.orderStatus);
            } catch (error) {
              console.warn(`Failed to update status for order ${statusData.subOrderNo}:`, error);
            }
          }
        }
        await storage.updateUploadStatus(uploadId, "processed", result.payments.length, result.errors);
        if (userId) {
          try {
            await UsageTracker.recordUsage(userId);
            console.log(`Usage recorded for user ${userId} after ZIP processing`);
          } catch (error) {
            console.error("Error recording usage:", error);
          }
        }
        await storage.recalculateAllMetrics(uploadId);
        console.log(`Processed ${result.payments.length} payments from ZIP file`);
      } else {
        console.log("ZIP processing failed, attempting direct XLSX processing as fallback");
        const fallbackResult = await FileProcessor.processPaymentsXLSX(buffer);
        if (fallbackResult.payments) {
          await storage.bulkCreatePayments(fallbackResult.payments);
          await updateOrdersWithPaymentData(fallbackResult.payments);
          await storage.updateUploadStatus(uploadId, "processed", fallbackResult.payments.length, [...result?.errors || [], ...fallbackResult.errors || []]);
          if (userId) {
            try {
              await UsageTracker.recordUsage(userId);
              console.log(`Usage recorded for user ${userId} after fallback XLSX processing`);
            } catch (error) {
              console.error("Error recording usage:", error);
            }
          }
          await storage.recalculateAllMetrics(uploadId);
          console.log(`Processed ${fallbackResult.payments.length} payments from direct XLSX`);
        }
      }
    } else if (fileType === "products_csv") {
      const dynamicResult = await FileProcessor.processGenericCSV(buffer, uploadId, "SKU");
      if (dynamicResult.data && dynamicResult.data.length > 0 && userId) {
        const productsDynamic2 = dynamicResult.data.map((row) => ({
          uploadId,
          dynamicData: row,
          sku: row["SKU"] || row["sku"] || ""
        }));
        await storage.replaceAllProductsDynamic(uploadId, productsDynamic2);
        const productsToSave = dynamicResult.data.map((row) => {
          const sku = row["SKU"] || row["sku"] || "";
          return {
            userId,
            sku,
            globalSku: UsageTracker.generateGlobalSku(userId, sku),
            title: row["Product Name"] || row["Title"] || row["Name"] || sku,
            costPrice: row["Cost Price"] || row["Cost"] || "0",
            packagingCost: row["Packaging Cost"] || row["Packaging"] || "0",
            gstPercent: row["GST %"] || row["GST"] || "5",
            isProcessed: true
          };
        });
        await storage.bulkUpsertProducts(productsToSave);
        await storage.saveFileStructure(uploadId, dynamicResult.fileStructure);
        await storage.markUploadAsCurrent(uploadId, fileType);
        recordsProcessed = dynamicResult.data.length;
        await storage.recalculateAllMetrics(uploadId);
        console.log(`Processed ${recordsProcessed} products dynamically and saved to user products`);
      }
      await storage.updateUploadStatus(uploadId, "processed", recordsProcessed, dynamicResult.errors);
      if (userId) {
        try {
          await UsageTracker.recordUsage(userId);
          console.log(`Usage recorded for user ${userId} after products CSV processing`);
        } catch (error) {
          console.error("Error recording usage:", error);
        }
      }
    }
  } catch (error) {
    console.error(`File processing error for upload ${uploadId}:`, error);
    await storage.updateUploadStatus(uploadId, "failed", 0, [String(error)]);
  }
}
function convertToCSV(data) {
  if (data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(",")];
  for (const row of data) {
    const values = headers.map((header) => {
      const val = row[header];
      return typeof val === "string" ? `"${val.replace(/"/g, '""')}"` : val;
    });
    csvRows.push(values.join(","));
  }
  return csvRows.join("\n");
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
async function loadReplitPlugins() {
  if (process.env.NODE_ENV === "production") {
    return [];
  }
  try {
    const [runtimeErrorOverlay, cartographer, devBanner] = await Promise.all([
      import("@replit/vite-plugin-runtime-error-modal").then((m) => m.default).catch(() => null),
      import("@replit/vite-plugin-cartographer").then((m) => m.cartographer).catch(() => null),
      import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner).catch(() => null)
    ]);
    const plugins = [];
    if (runtimeErrorOverlay) plugins.push(runtimeErrorOverlay());
    if (cartographer && process.env.REPL_ID) plugins.push(cartographer());
    if (devBanner && process.env.REPL_ID) plugins.push(devBanner());
    return plugins;
  } catch {
    return [];
  }
}
var vite_config_default = defineConfig(async () => {
  const replitPlugins = await loadReplitPlugins();
  return {
    plugins: [
      react(),
      ...replitPlugins
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets")
      }
    },
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true
    },
    server: {
      fs: {
        strict: true,
        deny: ["**/.*"]
      }
    }
  };
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  serveStatic(app);
  const port = parseInt(process.env.PORT || "5001", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
