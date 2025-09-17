import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, desc, asc, sql, count, sum, and, or, like, gte, lte } from "drizzle-orm";
import { 
  users, products, orders, payments, reconciliations, uploads,
  type User, type InsertUser,
  type Product, type InsertProduct,
  type Order, type InsertOrder,
  type Payment, type InsertPayment,
  type Reconciliation, type InsertReconciliation,
  type Upload, type InsertUpload
} from "@shared/schema";

// Embedded Database Configuration for Meesho Payment Reconciliation
// This credential is embedded directly for easy future usage and development
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:$Harsh98@db.tepwrjnmaosalngjffvy.supabase.co:5432/postgres";

const client = postgres(DATABASE_URL, { prepare: false });
const db = drizzle(client);

export interface IStorage {
  // Users
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;

  // Products
  getAllProducts(): Promise<Product[]>;
  getProductBySku(sku: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(sku: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  bulkCreateProducts(products: InsertProduct[]): Promise<Product[]>;

  // Orders
  getAllOrders(filters?: OrderFilters): Promise<Order[]>;
  getOrderBySubOrderNo(subOrderNo: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  bulkCreateOrders(orders: InsertOrder[]): Promise<Order[]>;

  // Payments
  getAllPayments(): Promise<Payment[]>;
  getPaymentsBySubOrderNo(subOrderNo: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  bulkCreatePayments(payments: InsertPayment[]): Promise<Payment[]>;

  // Reconciliations
  getAllReconciliations(status?: string): Promise<Reconciliation[]>;
  getReconciliationBySubOrderNo(subOrderNo: string): Promise<Reconciliation | undefined>;
  createReconciliation(reconciliation: InsertReconciliation): Promise<Reconciliation>;
  bulkCreateReconciliations(reconciliations: InsertReconciliation[]): Promise<Reconciliation[]>;
  getReconciliationSummary(): Promise<ReconciliationSummary>;

  // Uploads
  getAllUploads(): Promise<Upload[]>;
  createUpload(upload: InsertUpload): Promise<Upload>;
  updateUploadStatus(id: string, status: string, recordsProcessed?: number, errors?: any): Promise<Upload | undefined>;

  // Analytics
  getDashboardSummary(): Promise<DashboardSummary>;
}

export interface OrderFilters {
  subOrderNo?: string;
  status?: string;
  paymentStatus?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ReconciliationSummary {
  reconciled: number;
  mismatch: number;
  unreconciled: number;
  successRate: number;
}

export interface DashboardSummary {
  totalRevenue: number;
  netProfit: number;
  totalOrders: number;
  successRate: number;
  revenueGrowth: number;
  profitGrowth: number;
  ordersGrowth: number;
  successRateGrowth: number;
}

export class DatabaseStorage implements IStorage {
  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    const result = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return result[0];
  }

  async getAllProducts(): Promise<Product[]> {
    return db.select().from(products).orderBy(asc(products.sku));
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.sku, sku)).limit(1);
    return result[0];
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const result = await db.insert(products).values(product).returning();
    return result[0];
  }

  async updateProduct(sku: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const result = await db.update(products).set({
      ...product,
      updatedAt: new Date()
    }).where(eq(products.sku, sku)).returning();
    return result[0];
  }

  async bulkCreateProducts(productList: InsertProduct[]): Promise<Product[]> {
    if (productList.length === 0) return [];
    return db.insert(products).values(productList).returning();
  }

  async getAllOrders(filters: OrderFilters = {}): Promise<Order[]> {
    let query = db.select().from(orders);
    const conditions = [];

    if (filters.subOrderNo) {
      conditions.push(like(orders.subOrderNo, `%${filters.subOrderNo}%`));
    }
    if (filters.status) {
      conditions.push(eq(orders.reasonForCredit, filters.status));
    }
    if (filters.dateFrom) {
      conditions.push(gte(orders.orderDate, filters.dateFrom));
    }
    if (filters.dateTo) {
      conditions.push(lte(orders.orderDate, filters.dateTo));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return (query as any).orderBy(desc(orders.orderDate));
  }

  async getOrderBySubOrderNo(subOrderNo: string): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(eq(orders.subOrderNo, subOrderNo)).limit(1);
    return result[0];
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const result = await db.insert(orders).values(order).returning();
    return result[0];
  }

  async bulkCreateOrders(orderList: InsertOrder[]): Promise<Order[]> {
    if (orderList.length === 0) return [];
    return db.insert(orders).values(orderList).returning();
  }

  async getAllPayments(): Promise<Payment[]> {
    return db.select().from(payments).orderBy(desc(payments.createdAt));
  }

  async getPaymentsBySubOrderNo(subOrderNo: string): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.subOrderNo, subOrderNo));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const result = await db.insert(payments).values(payment).returning();
    return result[0];
  }

  async bulkCreatePayments(paymentList: InsertPayment[]): Promise<Payment[]> {
    if (paymentList.length === 0) return [];
    return db.insert(payments).values(paymentList).returning();
  }

  async getAllReconciliations(status?: string): Promise<Reconciliation[]> {
    let query = db.select().from(reconciliations);
    if (status) {
      query = query.where(eq(reconciliations.status, status)) as any;
    }
    return (query as any).orderBy(desc(reconciliations.createdAt));
  }

  async getReconciliationBySubOrderNo(subOrderNo: string): Promise<Reconciliation | undefined> {
    const result = await db.select().from(reconciliations).where(eq(reconciliations.subOrderNo, subOrderNo)).limit(1);
    return result[0];
  }

  async createReconciliation(reconciliation: InsertReconciliation): Promise<Reconciliation> {
    const result = await db.insert(reconciliations).values(reconciliation).returning();
    return result[0];
  }

  async bulkCreateReconciliations(reconciliationList: InsertReconciliation[]): Promise<Reconciliation[]> {
    if (reconciliationList.length === 0) return [];
    return db.insert(reconciliations).values(reconciliationList).returning();
  }

  async getReconciliationSummary(): Promise<ReconciliationSummary> {
    const results = await db
      .select({
        status: reconciliations.status,
        count: count(),
      })
      .from(reconciliations)
      .groupBy(reconciliations.status);

    const summary = {
      reconciled: 0,
      mismatch: 0,
      unreconciled: 0,
      successRate: 0
    };

    results.forEach(result => {
      switch (result.status) {
        case 'reconciled':
          summary.reconciled = result.count;
          break;
        case 'mismatch':
          summary.mismatch = result.count;
          break;
        case 'unreconciled':
          summary.unreconciled = result.count;
          break;
      }
    });

    const total = summary.reconciled + summary.mismatch + summary.unreconciled;
    summary.successRate = total > 0 ? (summary.reconciled / total) * 100 : 0;

    return summary;
  }

  async getAllUploads(): Promise<Upload[]> {
    return db.select().from(uploads).orderBy(desc(uploads.createdAt));
  }

  async createUpload(upload: InsertUpload): Promise<Upload> {
    const result = await db.insert(uploads).values(upload).returning();
    return result[0];
  }

  async updateUploadStatus(id: string, status: string, recordsProcessed?: number, errors?: any): Promise<Upload | undefined> {
    const result = await db.update(uploads).set({
      status,
      recordsProcessed,
      errors
    }).where(eq(uploads.id, id)).returning();
    return result[0];
  }

  async getDashboardSummary(): Promise<DashboardSummary> {
    // Get order analytics
    const [orderStats] = await db
      .select({
        totalOrders: count(orders.id),
        totalRevenue: sum(orders.discountedPrice),
        avgOrderValue: sql<number>`avg(${orders.discountedPrice})`,
      })
      .from(orders);

    // Get payment analytics
    const [paymentStats] = await db
      .select({
        totalSettlements: count(payments.id),
        totalSettlementAmount: sum(payments.settlementAmount),
        totalCommissionFees: sum(payments.commissionFee),
        totalGatewayFees: sum(payments.paymentGatewayFee),
      })
      .from(payments);

    // Calculate metrics
    const totalOrders = orderStats?.totalOrders || 0;
    const totalRevenue = Number(orderStats?.totalRevenue || 0);
    const totalSettlements = paymentStats?.totalSettlements || 0;
    const totalSettlementAmount = Number(paymentStats?.totalSettlementAmount || 0);
    const totalFees = Number(paymentStats?.totalCommissionFees || 0) + Number(paymentStats?.totalGatewayFees || 0);
    
    // Calculate net profit (settlements - fees)
    const netProfit = totalSettlementAmount - totalFees;
    
    // Calculate success rate (orders with settlements)
    const successRate = totalOrders > 0 ? (totalSettlements / totalOrders) * 100 : 0;

    // Calculate growth rates (compare with data from 30 days ago)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [oldOrderStats] = await db
      .select({
        oldTotalOrders: count(orders.id),
        oldTotalRevenue: sum(orders.discountedPrice),
      })
      .from(orders)
      .where(lte(orders.orderDate, thirtyDaysAgo));

    const oldTotalOrders = oldOrderStats?.oldTotalOrders || 0;
    const oldTotalRevenue = Number(oldOrderStats?.oldTotalRevenue || 0);

    const revenueGrowth = oldTotalRevenue > 0 ? ((totalRevenue - oldTotalRevenue) / oldTotalRevenue) * 100 : 0;
    const ordersGrowth = oldTotalOrders > 0 ? ((totalOrders - oldTotalOrders) / oldTotalOrders) * 100 : 0;

    return {
      totalRevenue,
      netProfit,
      totalOrders,
      successRate,
      revenueGrowth,
      profitGrowth: revenueGrowth * 0.7, // Estimate profit growth as 70% of revenue growth
      ordersGrowth,
      successRateGrowth: Math.max(-10, Math.min(10, ordersGrowth * 0.1)), // Conservative success rate growth
    };
  }
}

export const storage = new DatabaseStorage();
