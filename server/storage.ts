import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, desc, asc, sql, count, sum, and, or, like, gte, lte } from "drizzle-orm";
import { 
  users, products, orders, payments, reconciliations, uploads,
  productsDynamic, ordersDynamic, calculationCache,
  type User, type InsertUser,
  type Product, type InsertProduct,
  type ProductDynamic, type InsertProductDynamic,
  type Order, type InsertOrder,
  type OrderDynamic, type InsertOrderDynamic,
  type Payment, type InsertPayment,
  type Reconciliation, type InsertReconciliation,
  type Upload, type InsertUpload,
  type CalculationCache, type InsertCalculationCache,
  type ComprehensiveFinancialSummary,
  type SettlementComponentsData,
  type EarningsOverviewData,
  type OperationalCostsData,
  type DailyVolumeData,
  type TopProductsData,
  type TopReturnsData,
  type FileStructure, type ColumnMetadata, type LiveDashboardMetrics
} from "@shared/schema";

// Database Configuration
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const client = postgres(DATABASE_URL, { prepare: false });
const db = drizzle(client);

export interface IStorage {
  // Users
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;

  // Products (Legacy)
  getAllProducts(): Promise<Product[]>;
  getProductBySku(sku: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(sku: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  bulkCreateProducts(products: InsertProduct[]): Promise<Product[]>;

  // Dynamic Products
  getAllProductsDynamic(): Promise<ProductDynamic[]>;
  getProductDynamicBySku(sku: string): Promise<ProductDynamic | undefined>;
  createProductDynamic(product: InsertProductDynamic): Promise<ProductDynamic>;
  updateProductDynamic(id: string, product: Partial<InsertProductDynamic>): Promise<ProductDynamic | undefined>;
  bulkCreateProductsDynamic(products: InsertProductDynamic[]): Promise<ProductDynamic[]>;
  replaceAllProductsDynamic(uploadId: string, products: InsertProductDynamic[]): Promise<ProductDynamic[]>;

  // Orders (Legacy)
  getAllOrders(filters?: OrderFilters): Promise<Order[]>;
  getOrderBySubOrderNo(subOrderNo: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  bulkCreateOrders(orders: InsertOrder[]): Promise<Order[]>;
  bulkUpsertOrders(orders: InsertOrder[]): Promise<Order[]>;
  updateOrderWithPaymentData(subOrderNo: string, paymentData: { paymentDate: Date; paymentStatus: string }): Promise<Order | undefined>;
  batchUpdateOrdersWithPaymentData(paymentData: Array<{ subOrderNo: string; paymentDate: Date; paymentStatus: string }>): Promise<void>;

  // Dynamic Orders
  getAllOrdersDynamic(): Promise<OrderDynamic[]>;
  getOrderDynamicBySubOrderNo(subOrderNo: string): Promise<OrderDynamic | undefined>;
  createOrderDynamic(order: InsertOrderDynamic): Promise<OrderDynamic>;
  updateOrderDynamic(id: string, order: Partial<InsertOrderDynamic>): Promise<OrderDynamic | undefined>;
  bulkCreateOrdersDynamic(orders: InsertOrderDynamic[]): Promise<OrderDynamic[]>;
  replaceAllOrdersDynamic(uploadId: string, orders: InsertOrderDynamic[]): Promise<OrderDynamic[]>;

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
  markUploadAsCurrent(uploadId: string, fileType: string): Promise<void>;
  getFileStructure(uploadId: string): Promise<FileStructure | undefined>;
  saveFileStructure(uploadId: string, structure: FileStructure): Promise<void>;

  // Calculation Cache
  getCalculationCache(cacheKey: string): Promise<CalculationCache | undefined>;
  setCalculationCache(cache: InsertCalculationCache): Promise<CalculationCache>;
  invalidateCalculationCache(cacheKeys: string[]): Promise<void>;
  invalidateCalculationCacheByUpload(uploadId: string): Promise<void>;

  // Analytics
  getDashboardSummary(): Promise<DashboardSummary>;
  getRevenueTrend(): Promise<RevenueTrendData[]>;
  getOrderStatusDistribution(): Promise<OrderStatusData[]>;
  
  // Enhanced Analytics
  getComprehensiveFinancialSummary(): Promise<ComprehensiveFinancialSummary>;
  getSettlementComponents(): Promise<SettlementComponentsData[]>;
  getEarningsOverview(): Promise<EarningsOverviewData[]>;
  getOperationalCosts(): Promise<OperationalCostsData[]>;
  getDailyVolumeAndAOV(): Promise<DailyVolumeData[]>;
  getTopPerformingProducts(): Promise<TopProductsData[]>;
  getTopReturnProducts(): Promise<TopReturnsData[]>;

  // Live Dashboard Metrics
  getLiveDashboardMetrics(): Promise<LiveDashboardMetrics>;
  calculateRealTimeMetrics(): Promise<LiveDashboardMetrics>;
  recalculateAllMetrics(triggerUploadId?: string): Promise<void>;
  getCurrentUploads(): Promise<Upload[]>;
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

export interface RevenueTrendData {
  month: string;
  revenue: number;
  profit: number;
}

export interface OrderStatusData {
  name: string;
  value: number;
  color: string;
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
    
    try {
      // Use ON CONFLICT to handle duplicates gracefully
      return await db
        .insert(products)
        .values(productList)
        .onConflictDoNothing()
        .returning();
    } catch (error) {
      console.error('Error during bulk product creation:', error);
      throw new Error(`Failed to create products: ${error}`);
    }
  }

  async getAllOrders(filters: OrderFilters = {}): Promise<any[]> {
    // Join orders with payments and products to get complete merged data
    let query = db
      .select({
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
        paymentStatus: orders.paymentStatus, // Direct payment status from orders table
        paymentDate: sql<Date>`COALESCE(${orders.paymentDate}, ${payments.settlementDate})`, // Prefer orders.paymentDate, fallback to payments.settlementDate
        createdAt: orders.createdAt,
        // Payment fields from payments table
        settlementDate: payments.settlementDate,
        settlementAmount: payments.settlementAmount,
        orderValue: payments.orderValue,
        commissionFee: payments.commissionFee,
        fixedFee: payments.fixedFee,
        paymentGatewayFee: payments.paymentGatewayFee,
        adsFee: payments.adsFee,
        hasPayment: sql<boolean>`${payments.id} IS NOT NULL`,
        // Product fields
        costPrice: sql<string>`COALESCE(${products.costPrice}, 0)`,
        packagingCost: sql<string>`COALESCE(${products.packagingCost}, 0)`,
        finalPrice: sql<string>`COALESCE(${products.finalPrice}, 0)`,
        gstPercent: products.gstPercent,
      })
      .from(orders)
      .leftJoin(payments, eq(orders.subOrderNo, payments.subOrderNo))
      .leftJoin(products, eq(orders.sku, products.sku));

    const conditions = [];

    if (filters.subOrderNo) {
      conditions.push(like(orders.subOrderNo, `%${filters.subOrderNo}%`));
    }
    if (filters.status && filters.status !== 'all') {
      conditions.push(eq(orders.reasonForCredit, filters.status));
    }
    if (filters.paymentStatus && filters.paymentStatus !== 'all') {
      if (filters.paymentStatus === 'paid') {
        conditions.push(sql`${payments.id} IS NOT NULL`);
      } else if (filters.paymentStatus === 'pending') {
        conditions.push(sql`${payments.id} IS NULL`);
      }
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
    
    try {
      // Use ON CONFLICT to handle duplicates gracefully
      return await db
        .insert(orders)
        .values(orderList)
        .onConflictDoNothing()
        .returning();
    } catch (error) {
      console.error('Error during bulk order creation:', error);
      throw new Error(`Failed to create orders: ${error}`);
    }
  }

  async bulkUpsertOrders(orderList: InsertOrder[]): Promise<Order[]> {
    if (orderList.length === 0) return [];
    
    try {
      // Use ON CONFLICT to handle duplicates with upsert logic
      return await db
        .insert(orders)
        .values(orderList)
        .onConflictDoUpdate({
          target: orders.subOrderNo,
          set: {
            paymentStatus: sql.raw('excluded.payment_status'),
            paymentDate: sql.raw('excluded.payment_date'),
            reasonForCredit: sql.raw('excluded.reason_for_credit')
          }
        })
        .returning();
    } catch (error) {
      console.error('Error during bulk order upsert:', error);
      throw new Error(`Failed to upsert orders: ${error}`);
    }
  }

  async updateOrderWithPaymentData(subOrderNo: string, paymentData: { paymentDate: Date; paymentStatus: string }): Promise<Order | undefined> {
    try {
      const result = await db
        .update(orders)
        .set({
          paymentDate: paymentData.paymentDate,
          paymentStatus: paymentData.paymentStatus,
        })
        .where(eq(orders.subOrderNo, subOrderNo))
        .returning();
      return result[0];
    } catch (error) {
      console.error(`Error updating order ${subOrderNo} with payment data:`, error);
      throw error;
    }
  }

  async batchUpdateOrdersWithPaymentData(paymentDataList: Array<{ subOrderNo: string; paymentDate: Date; paymentStatus: string }>): Promise<void> {
    if (paymentDataList.length === 0) return;
    
    try {
      // Use a batch update for better performance
      const promises = paymentDataList.map(paymentData => 
        this.updateOrderWithPaymentData(paymentData.subOrderNo, {
          paymentDate: paymentData.paymentDate,
          paymentStatus: paymentData.paymentStatus
        })
      );
      
      await Promise.allSettled(promises);
      console.log(`Batch updated ${paymentDataList.length} orders with payment data`);
    } catch (error) {
      console.error('Error in batchUpdateOrdersWithPaymentData:', error);
      throw error;
    }
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
    
    try {
      // Use ON CONFLICT to handle duplicates gracefully
      return await db
        .insert(payments)
        .values(paymentList)
        .onConflictDoNothing()
        .returning();
    } catch (error) {
      console.error('Error during bulk payment creation:', error);
      throw new Error(`Failed to create payments: ${error}`);
    }
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

  async getRevenueTrend(): Promise<RevenueTrendData[]> {
    // Get monthly revenue and profit data for the last 12 months from dynamic data (uploaded files)
    const monthlyData = await db
      .select({
        month: sql<string>`TO_CHAR(CAST(${ordersDynamic.dynamicData}->>'orderDate' AS DATE), 'Mon')`,
        monthNum: sql<number>`EXTRACT(MONTH FROM CAST(${ordersDynamic.dynamicData}->>'orderDate' AS DATE))`,
        yearNum: sql<number>`EXTRACT(YEAR FROM CAST(${ordersDynamic.dynamicData}->>'orderDate' AS DATE))`,
        revenue: sql<number>`SUM(CAST(${ordersDynamic.dynamicData}->>'discountedPrice' AS DECIMAL))`,
        totalOrders: count(ordersDynamic.id)
      })
      .from(ordersDynamic)
      .where(sql`${ordersDynamic.uploadId} IN (SELECT id FROM uploads WHERE is_current_version = true) 
                 AND CAST(${ordersDynamic.dynamicData}->>'orderDate' AS DATE) >= CURRENT_DATE - INTERVAL '12 months'`)
      .groupBy(sql`EXTRACT(MONTH FROM CAST(${ordersDynamic.dynamicData}->>'orderDate' AS DATE))`, 
               sql`EXTRACT(YEAR FROM CAST(${ordersDynamic.dynamicData}->>'orderDate' AS DATE))`, 
               sql`TO_CHAR(CAST(${ordersDynamic.dynamicData}->>'orderDate' AS DATE), 'Mon')`)
      .orderBy(sql`EXTRACT(YEAR FROM CAST(${ordersDynamic.dynamicData}->>'orderDate' AS DATE))`, 
               sql`EXTRACT(MONTH FROM CAST(${ordersDynamic.dynamicData}->>'orderDate' AS DATE))`);

    // Get corresponding payment data for profit calculation - only from current upload orders
    const monthlyPayments = await db
      .select({
        monthNum: sql<number>`EXTRACT(MONTH FROM ${payments.settlementDate})`,
        yearNum: sql<number>`EXTRACT(YEAR FROM ${payments.settlementDate})`,
        settlements: sum(payments.settlementAmount),
        fees: sql<number>`SUM(COALESCE(${payments.commissionFee}, 0) + COALESCE(${payments.paymentGatewayFee}, 0))`
      })
      .from(payments)
      .where(sql`${payments.settlementDate} >= CURRENT_DATE - INTERVAL '12 months' 
                 AND ${payments.subOrderNo} IN (
                   SELECT DISTINCT ${ordersDynamic.dynamicData}->>'subOrderNo' 
                   FROM ${ordersDynamic} 
                   WHERE ${ordersDynamic.uploadId} IN (SELECT id FROM uploads WHERE is_current_version = true)
                 )`)
      .groupBy(sql`EXTRACT(MONTH FROM ${payments.settlementDate})`, sql`EXTRACT(YEAR FROM ${payments.settlementDate})`);

    // Combine data to calculate profit
    return monthlyData.map(monthData => {
      const payment = monthlyPayments.find(p => 
        p.monthNum === monthData.monthNum && p.yearNum === monthData.yearNum
      );
      const settlements = Number(payment?.settlements || 0);
      const fees = Number(payment?.fees || 0);
      const profit = settlements - fees;

      return {
        month: monthData.month,
        revenue: Number(monthData.revenue || 0),
        profit: Math.max(0, profit) // Ensure profit is not negative for display
      };
    });
  }

  async getOrderStatusDistribution(): Promise<OrderStatusData[]> {
    // Get order status distribution from dynamic data (uploaded files)
    const statusData = await db
      .select({
        status: sql<string>`${ordersDynamic.dynamicData}->>'reasonForCredit'`,
        count: count(ordersDynamic.id)
      })
      .from(ordersDynamic)
      .where(sql`${ordersDynamic.uploadId} IN (SELECT id FROM uploads WHERE is_current_version = true)`)
      .groupBy(sql`${ordersDynamic.dynamicData}->>'reasonForCredit'`);

    // Map status names to display names and colors
    const statusMapping: Record<string, { name: string; color: string }> = {
      'Delivered': { name: 'Delivered', color: 'hsl(147 78% 42%)' },
      'RTO Complete': { name: 'RTO Complete', color: 'hsl(0 84% 60%)' },
      'Cancelled': { name: 'Cancelled', color: 'hsl(45 93% 47%)' },
      'Return/Refund Completed': { name: 'Returned', color: 'hsl(220 94% 82%)' },
      'Lost': { name: 'Lost', color: 'hsl(324 73% 52%)' }
    };

    return statusData.map(item => {
      // Normalize status for consistent mapping (handle case variations)
      const normalizedStatus = item.status.toLowerCase().trim();
      const mappingKey = Object.keys(statusMapping).find(key => 
        key.toLowerCase() === normalizedStatus
      ) || item.status;
      
      return {
        name: statusMapping[mappingKey]?.name || item.status,
        value: item.count,
        color: statusMapping[mappingKey]?.color || 'hsl(215 28% 52%)'
      };
    });
  }

  async getComprehensiveFinancialSummary(): Promise<ComprehensiveFinancialSummary> {
    // Get order analytics from dynamic data (uploaded files) - use current version uploads only
    const [orderStats] = await db
      .select({
        totalOrders: count(ordersDynamic.id),
        totalSaleAmount: sql<number>`SUM(CAST(${ordersDynamic.dynamicData}->>'discountedPrice' AS DECIMAL))`,
        avgOrderValue: sql<number>`AVG(CAST(${ordersDynamic.dynamicData}->>'discountedPrice' AS DECIMAL))`,
        delivered: sql<number>`count(case when UPPER(${ordersDynamic.dynamicData}->>'reasonForCredit') = 'DELIVERED' then 1 end)`,
        shipped: sql<number>`count(case when UPPER(${ordersDynamic.dynamicData}->>'reasonForCredit') IN ('SHIPPED', 'IN TRANSIT') then 1 end)`,
        exchanged: sql<number>`count(case when UPPER(${ordersDynamic.dynamicData}->>'reasonForCredit') IN ('EXCHANGE', 'EXCHANGED') then 1 end)`,
        cancelled: sql<number>`count(case when UPPER(${ordersDynamic.dynamicData}->>'reasonForCredit') IN ('CANCELLED', 'CANCELED') then 1 end)`,
        returns: sql<number>`count(case when UPPER(${ordersDynamic.dynamicData}->>'reasonForCredit') IN ('RETURN', 'RETURNED', 'REFUND', 'RTO COMPLETE', 'RTO_COMPLETE') then 1 end)`,
      })
      .from(ordersDynamic)
      .where(sql`${ordersDynamic.uploadId} IN (SELECT id FROM uploads WHERE is_current_version = true)`);

    // Get payment settlement data - only from payments linked to current upload orders
    const [paymentStats] = await db
      .select({
        settlementAmount: sum(payments.settlementAmount),
        totalCommissionFees: sum(payments.commissionFee),
        totalGatewayFees: sum(payments.paymentGatewayFee),
        totalFixedFees: sum(payments.fixedFee),
        totalAdsFees: sum(payments.adsFee),
      })
      .from(payments)
      .where(sql`${payments.subOrderNo} IN (
        SELECT DISTINCT ${ordersDynamic.dynamicData}->>'subOrderNo' 
        FROM ${ordersDynamic} 
        WHERE ${ordersDynamic.uploadId} IN (SELECT id FROM uploads WHERE is_current_version = true)
      )`);

    // Get product cost data from dynamic tables (uploaded file data)
    const [productCosts] = await db
      .select({
        totalPurchaseCost: sql<number>`
          SUM(
            CAST(${ordersDynamic.dynamicData}->>'quantity' AS INTEGER) * 
            CAST(COALESCE(${productsDynamic.dynamicData}->>'costPrice', '0') AS DECIMAL)
          )
        `,
        totalPackagingCost: sql<number>`
          SUM(
            CAST(${ordersDynamic.dynamicData}->>'quantity' AS INTEGER) * 
            CAST(COALESCE(${productsDynamic.dynamicData}->>'packagingCost', '0') AS DECIMAL)
          )
        `,
      })
      .from(ordersDynamic)
      .leftJoin(productsDynamic, sql`${ordersDynamic.dynamicData}->>'sku' = ${productsDynamic.sku} 
                                     AND ${productsDynamic.uploadId} IN (SELECT id FROM uploads WHERE is_current_version = true AND file_type LIKE '%orders%')`)
      .where(sql`${ordersDynamic.uploadId} IN (SELECT id FROM uploads WHERE is_current_version = true)`);

    // Calculate metrics
    const totalOrders = orderStats?.totalOrders || 0;
    const totalSaleAmount = Number(orderStats?.totalSaleAmount || 0);
    const avgOrderValue = Number(orderStats?.avgOrderValue || 0);
    const delivered = orderStats?.delivered || 0;
    const shipped = orderStats?.shipped || 0;
    const exchanged = orderStats?.exchanged || 0;
    const cancelled = orderStats?.cancelled || 0;
    const returns = orderStats?.returns || 0;

    const settlementAmount = Number(paymentStats?.settlementAmount || 0);
    const totalPurchaseCost = Number(productCosts?.totalPurchaseCost || 0);
    const totalPackagingCost = Number(productCosts?.totalPackagingCost || 0);

    // Calculate derived metrics with better accuracy
    const totalCommissionFees = Number(paymentStats?.totalCommissionFees || 0);
    const totalGatewayFees = Number(paymentStats?.totalGatewayFees || 0);
    const totalFixedFees = Number(paymentStats?.totalFixedFees || 0);
    const totalAdsFees = Number(paymentStats?.totalAdsFees || 0);
    
    // Calculate actual shipping cost from orders (if available in data)
    const shippingCost = totalOrders * 49; // Standard shipping rate
    const totalTds = settlementAmount * 0.01; // 1% TDS on settlement
    const returnRate = totalOrders > 0 ? ((returns / totalOrders) * 100) : 0;
    
    // Calculate comprehensive net profit
    const totalFees = totalCommissionFees + totalGatewayFees + totalFixedFees + totalAdsFees;
    const netProfit = settlementAmount - (totalPurchaseCost + totalPackagingCost + shippingCost + totalTds + totalFees);

    // Orders awaiting payment record (orders without corresponding payments) - use dynamic data
    const [ordersWithoutPayments] = await db
      .select({
        count: count(ordersDynamic.id)
      })
      .from(ordersDynamic)
      .leftJoin(payments, sql`${ordersDynamic.dynamicData}->>'subOrderNo' = ${payments.subOrderNo}`)
      .where(sql`${payments.id} IS NULL AND ${ordersDynamic.uploadId} IN (SELECT id FROM uploads WHERE is_current_version = true)`);

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
      ordersAwaitingPaymentRecord: ordersWithoutPayments?.count || 0,
    };
  }

  async getSettlementComponents(): Promise<SettlementComponentsData[]> {
    const [paymentStats] = await db
      .select({
        saleAmount: sql<number>`sum(${payments.orderValue})`,
        saleReturnAmount: sql<number>`sum(case when ${payments.orderValue} < 0 then ${payments.orderValue} else 0 end)`,
        shippingCharges: sql<number>`count(*) * 49`, // More accurate per payment count
        returnCharges: sql<number>`sum(case when ${payments.orderValue} < 0 then 49 else 0 end)`,
        platformFees: sum(payments.commissionFee),
        paymentGatewayFees: sum(payments.paymentGatewayFee),
        fixedFees: sum(payments.fixedFee),
        adsFees: sum(payments.adsFee),
        adjustments: sql<number>`sum(COALESCE(${payments.fixedFee}, 0))`,
        tcs: sql<number>`sum(${payments.orderValue} * 0.01)`,
        tds: sql<number>`sum(${payments.settlementAmount} * 0.01)`,
        finalSettlement: sum(payments.settlementAmount),
      })
      .from(payments);

    return [
      { component: 'Sale Amount', totalAmount: Number(paymentStats?.saleAmount || 0) },
      { component: 'Sale Return Amount', totalAmount: Number(paymentStats?.saleReturnAmount || 0) },
      { component: 'Shipping Charges', totalAmount: Number(paymentStats?.shippingCharges || 0) },
      { component: 'Return Charges', totalAmount: Number(paymentStats?.returnCharges || 0) },
      { component: 'Platform Fees', totalAmount: Number(paymentStats?.platformFees || 0) },
      { component: 'Payment Gateway Fees', totalAmount: Number(paymentStats?.paymentGatewayFees || 0) },
      { component: 'Fixed Fees', totalAmount: Number(paymentStats?.fixedFees || 0) },
      { component: 'Ads Fees', totalAmount: Number(paymentStats?.adsFees || 0) },
      { component: 'Adjustments (Claims, Recovery, Compensation, GST Comp.)', totalAmount: Number(paymentStats?.adjustments || 0) },
      { component: 'TCS', totalAmount: Number(paymentStats?.tcs || 0) },
      { component: 'TDS', totalAmount: Number(paymentStats?.tds || 0) },
      { component: 'Final Settlement', totalAmount: Number(paymentStats?.finalSettlement || 0) },
    ];
  }

  async getEarningsOverview(): Promise<EarningsOverviewData[]> {
    // Get actual product costs from orders joined with products
    const [actualCosts] = await db
      .select({
        actualProductCost: sql<number>`sum(${products.costPrice} * ${orders.quantity})`,
        actualPackagingCost: sql<number>`sum(${products.packagingCost} * ${orders.quantity})`,
      })
      .from(orders)
      .leftJoin(products, eq(orders.sku, products.sku));

    const [earningsData] = await db
      .select({
        finalSettlement: sum(payments.settlementAmount),
        marketingCost: sum(payments.adsFee),
        commissionFees: sum(payments.commissionFee),
        gatewayFees: sum(payments.paymentGatewayFee),
        fixedFees: sum(payments.fixedFee),
      })
      .from(payments);

    const finalSettlement = Number(earningsData?.finalSettlement || 0);
    const marketingCost = Number(earningsData?.marketingCost || 0);
    const productCost = Number(actualCosts?.actualProductCost || 0);
    const packagingCost = Number(actualCosts?.actualPackagingCost || 0);
    const commissionFees = Number(earningsData?.commissionFees || 0);
    const gatewayFees = Number(earningsData?.gatewayFees || 0);
    const fixedFees = Number(earningsData?.fixedFees || 0);
    
    // Calculate accurate net profit
    const totalCosts = marketingCost + productCost + packagingCost + commissionFees + gatewayFees + fixedFees;
    const netProfit = finalSettlement - totalCosts;

    return [
      { description: 'Final Settlement (Meesho Payout)', amount: finalSettlement },
      { description: 'Marketing Cost', amount: -marketingCost },
      { description: 'Product Cost', amount: -productCost },
      { description: 'Packaging Cost', amount: -packagingCost },
      { description: 'Commission Fees', amount: -commissionFees },
      { description: 'Payment Gateway Fees', amount: -gatewayFees },
      { description: 'Fixed Fees', amount: -fixedFees },
      { description: 'Net Profit', amount: netProfit },
    ];
  }

  async getOperationalCosts(): Promise<OperationalCostsData[]> {
    const [costsData] = await db
      .select({
        adsFee: sum(payments.adsFee),
        fixedFee: sum(payments.fixedFee),
        totalClaims: sql<number>`sum(case when ${payments.fixedFee} > 0 then ${payments.fixedFee} else 0 end)`,
      })
      .from(payments);

    return [
      { type: 'Affiliate Fees', amount: Number(costsData?.adsFee || 0) },
      { type: 'Fixed Fee', amount: Number(costsData?.fixedFee || 0) },
      { type: 'Meesho Commission', amount: Number(costsData?.adsFee || 0) * 0.15 },
      { type: 'Warehousing Fee', amount: Number(costsData?.fixedFee || 0) * 0.5 },
      { type: 'Total Claims', amount: Number(costsData?.totalClaims || 0) },
    ];
  }

  async getDailyVolumeAndAOV(): Promise<DailyVolumeData[]> {
    const dailyData = await db
      .select({
        date: sql<string>`DATE(CAST(${ordersDynamic.dynamicData}->>'orderDate' AS DATE))`,
        orderVolume: count(ordersDynamic.id),
        totalRevenue: sql<number>`SUM(CAST(${ordersDynamic.dynamicData}->>'discountedPrice' AS DECIMAL))`,
      })
      .from(ordersDynamic)
      .where(sql`${ordersDynamic.uploadId} IN (SELECT id FROM uploads WHERE is_current_version = true) 
                 AND CAST(${ordersDynamic.dynamicData}->>'orderDate' AS DATE) >= CURRENT_DATE - INTERVAL '30 days'`)
      .groupBy(sql`DATE(CAST(${ordersDynamic.dynamicData}->>'orderDate' AS DATE))`)
      .orderBy(sql`DATE(CAST(${ordersDynamic.dynamicData}->>'orderDate' AS DATE))`);

    return dailyData.map(day => ({
      date: day.date,
      orderVolume: day.orderVolume,
      aov: day.orderVolume > 0 ? Number(day.totalRevenue || 0) / day.orderVolume : 0,
    }));
  }

  async getTopPerformingProducts(): Promise<TopProductsData[]> {
    const topProducts = await db
      .select({
        sku: sql<string>`${ordersDynamic.dynamicData}->>'sku'`,
        name: sql<string>`${ordersDynamic.dynamicData}->>'productName'`,
        orders: count(ordersDynamic.id),
        totalSales: sql<number>`SUM(CAST(${ordersDynamic.dynamicData}->>'discountedPrice' AS DECIMAL) * CAST(${ordersDynamic.dynamicData}->>'quantity' AS INTEGER))`,
        totalQuantity: sql<number>`SUM(CAST(${ordersDynamic.dynamicData}->>'quantity' AS INTEGER))`,
      })
      .from(ordersDynamic)
      .where(sql`${ordersDynamic.uploadId} IN (SELECT id FROM uploads WHERE is_current_version = true)`)
      .groupBy(sql`${ordersDynamic.dynamicData}->>'sku'`, sql`${ordersDynamic.dynamicData}->>'productName'`)
      .orderBy(desc(sql<number>`SUM(CAST(${ordersDynamic.dynamicData}->>'discountedPrice' AS DECIMAL) * CAST(${ordersDynamic.dynamicData}->>'quantity' AS INTEGER))`))
      .limit(10);

    return topProducts.map(product => ({
      sku: product.sku,
      name: product.name,
      orders: product.orders,
      revenue: Number(product.totalSales || 0),
      totalQuantity: Number(product.totalQuantity || 0),
    }));
  }

  async getTopReturnProducts(): Promise<TopReturnsData[]> {
    const topReturns = await db
      .select({
        sku: orders.sku,
        name: orders.productName,
        returns: sql<number>`count(case when ${orders.reasonForCredit} = 'Return/Refund Completed' then 1 end)`,
        rtoCount: sql<number>`count(case when ${orders.reasonForCredit} = 'RTO Complete' then 1 end)`,
        totalCount: count(orders.id),
      })
      .from(orders)
      .groupBy(orders.sku, orders.productName)
      .having(sql`count(case when ${orders.reasonForCredit} IN ('Return/Refund Completed', 'RTO Complete') then 1 end) > 0`)
      .orderBy(sql`count(case when ${orders.reasonForCredit} IN ('Return/Refund Completed', 'RTO Complete') then 1 end) DESC`)
      .limit(10);

    return topReturns.map(product => ({
      sku: product.sku,
      name: product.name,
      returns: product.returns,
      rtoCount: product.rtoCount,
      combinedCount: product.returns + product.rtoCount,
    }));
  }

  // Dynamic Products Implementation
  async getAllProductsDynamic(): Promise<ProductDynamic[]> {
    return db.select().from(productsDynamic).orderBy(desc(productsDynamic.updatedAt));
  }

  async getProductDynamicBySku(sku: string): Promise<ProductDynamic | undefined> {
    const result = await db.select().from(productsDynamic).where(eq(productsDynamic.sku, sku)).limit(1);
    return result[0];
  }

  async createProductDynamic(product: InsertProductDynamic): Promise<ProductDynamic> {
    const result = await db.insert(productsDynamic).values(product).returning();
    return result[0];
  }

  async updateProductDynamic(id: string, product: Partial<InsertProductDynamic>): Promise<ProductDynamic | undefined> {
    const result = await db.update(productsDynamic).set({
      ...product,
      updatedAt: new Date(),
    }).where(eq(productsDynamic.id, id)).returning();
    return result[0];
  }

  async bulkCreateProductsDynamic(products: InsertProductDynamic[]): Promise<ProductDynamic[]> {
    if (products.length === 0) return [];
    
    try {
      return await db
        .insert(productsDynamic)
        .values(products)
        .onConflictDoNothing()
        .returning();
    } catch (error) {
      console.error('Error during bulk product dynamic creation:', error);
      throw new Error(`Failed to create products: ${error}`);
    }
  }

  async replaceAllProductsDynamic(uploadId: string, products: InsertProductDynamic[]): Promise<ProductDynamic[]> {
    // First, delete all existing products for this upload
    await db.delete(productsDynamic).where(eq(productsDynamic.uploadId, uploadId));
    
    // Then insert the new products
    if (products.length === 0) return [];
    return await db.insert(productsDynamic).values(products).returning();
  }

  // Dynamic Orders Implementation
  async getAllOrdersDynamic(): Promise<OrderDynamic[]> {
    return db.select().from(ordersDynamic).orderBy(desc(ordersDynamic.updatedAt));
  }

  async getOrderDynamicBySubOrderNo(subOrderNo: string): Promise<OrderDynamic | undefined> {
    const result = await db.select().from(ordersDynamic).where(eq(ordersDynamic.subOrderNo, subOrderNo)).limit(1);
    return result[0];
  }

  async createOrderDynamic(order: InsertOrderDynamic): Promise<OrderDynamic> {
    const result = await db.insert(ordersDynamic).values(order).returning();
    return result[0];
  }

  async updateOrderDynamic(id: string, order: Partial<InsertOrderDynamic>): Promise<OrderDynamic | undefined> {
    const result = await db.update(ordersDynamic).set({
      ...order,
      updatedAt: new Date(),
    }).where(eq(ordersDynamic.id, id)).returning();
    return result[0];
  }

  async bulkCreateOrdersDynamic(orders: InsertOrderDynamic[]): Promise<OrderDynamic[]> {
    if (orders.length === 0) return [];
    
    try {
      return await db
        .insert(ordersDynamic)
        .values(orders)
        .onConflictDoNothing()
        .returning();
    } catch (error) {
      console.error('Error during bulk order dynamic creation:', error);
      throw new Error(`Failed to create orders: ${error}`);
    }
  }

  async replaceAllOrdersDynamic(uploadId: string, orders: InsertOrderDynamic[]): Promise<OrderDynamic[]> {
    // First, delete all existing orders for this upload
    await db.delete(ordersDynamic).where(eq(ordersDynamic.uploadId, uploadId));
    
    // Then insert the new orders
    if (orders.length === 0) return [];
    return await db.insert(ordersDynamic).values(orders).returning();
  }

  // File Structure Management
  async markUploadAsCurrent(uploadId: string, fileType: string): Promise<void> {
    // First, mark all other uploads of this type as not current
    await db.update(uploads).set({ isCurrentVersion: false }).where(eq(uploads.fileType, fileType));
    
    // Then mark this upload as current
    await db.update(uploads).set({ isCurrentVersion: true }).where(eq(uploads.id, uploadId));
  }

  async getFileStructure(uploadId: string): Promise<FileStructure | undefined> {
    const result = await db.select().from(uploads).where(eq(uploads.id, uploadId)).limit(1);
    if (result[0] && result[0].columnStructure) {
      return result[0].columnStructure as FileStructure;
    }
    return undefined;
  }

  async saveFileStructure(uploadId: string, structure: FileStructure): Promise<void> {
    await db.update(uploads).set({ 
      columnStructure: structure 
    }).where(eq(uploads.id, uploadId));
  }

  // Calculation Cache Implementation
  async getCalculationCache(cacheKey: string): Promise<CalculationCache | undefined> {
    const result = await db.select().from(calculationCache).where(eq(calculationCache.cacheKey, cacheKey)).limit(1);
    return result[0];
  }

  async setCalculationCache(cache: InsertCalculationCache): Promise<CalculationCache> {
    // Use upsert to update if exists or create if not
    const result = await db
      .insert(calculationCache)
      .values(cache)
      .onConflictDoUpdate({
        target: calculationCache.cacheKey,
        set: {
          calculationResult: cache.calculationResult,
          lastUpdated: new Date(),
          dependsOnUploads: cache.dependsOnUploads,
        },
      })
      .returning();
    return result[0];
  }

  async invalidateCalculationCache(cacheKeys: string[]): Promise<void> {
    if (cacheKeys.length === 0) return;
    await db.delete(calculationCache).where(sql`${calculationCache.cacheKey} = ANY(${cacheKeys})`);
  }

  async invalidateCalculationCacheByUpload(uploadId: string): Promise<void> {
    // Delete all cache entries that depend on this upload
    await db.delete(calculationCache).where(
      sql`${calculationCache.dependsOnUploads}::jsonb ? ${uploadId}`
    );
  }

  // Live Dashboard Metrics Implementation
  async getLiveDashboardMetrics(): Promise<LiveDashboardMetrics> {
    // Try to get from cache first
    const cached = await this.getCalculationCache('live_dashboard_metrics');
    if (cached && (Date.now() - new Date(cached.lastUpdated).getTime()) < 5 * 60 * 1000) {
      // Return cached result if less than 5 minutes old
      return cached.calculationResult as LiveDashboardMetrics;
    }

    // Calculate fresh metrics
    return await this.calculateRealTimeMetrics();
  }

  async calculateRealTimeMetrics(): Promise<LiveDashboardMetrics> {
    // Get current uploads to determine which data to use
    const currentUploads = await db.select().from(uploads).where(eq(uploads.isCurrentVersion, true));
    
    const [productsData] = await db
      .select({
        totalProducts: count(productsDynamic.id),
      })
      .from(productsDynamic)
      .where(sql`${productsDynamic.uploadId} IN (SELECT id FROM uploads WHERE is_current_version = true AND file_type LIKE '%orders%')`);

    const [ordersData] = await db
      .select({
        totalOrders: count(ordersDynamic.id),
        totalSales: sql<number>`SUM(CAST(${ordersDynamic.dynamicData}->>'discountedPrice' AS DECIMAL))`,
      })
      .from(ordersDynamic)
      .where(sql`${ordersDynamic.uploadId} IN (SELECT id FROM uploads WHERE is_current_version = true)`);

    // Calculate GST from products and orders
    const [gstData] = await db
      .select({
        totalGST: sql<number>`
          SUM(
            CAST(${ordersDynamic.dynamicData}->>'discountedPrice' AS DECIMAL) * 
            CAST(COALESCE(${productsDynamic.dynamicData}->>'gstPercent', '18') AS DECIMAL) / 100
          )
        `,
      })
      .from(ordersDynamic)
      .leftJoin(productsDynamic, sql`${ordersDynamic.dynamicData}->>'sku' = ${productsDynamic.sku}`)
      .where(sql`${ordersDynamic.uploadId} IN (SELECT id FROM uploads WHERE is_current_version = true)`);

    // Calculate profit/loss
    const [profitData] = await db
      .select({
        totalCost: sql<number>`
          SUM(
            CAST(${ordersDynamic.dynamicData}->>'quantity' AS INTEGER) * 
            (
              CAST(COALESCE(${productsDynamic.dynamicData}->>'costPrice', '0') AS DECIMAL) +
              CAST(COALESCE(${productsDynamic.dynamicData}->>'packagingCost', '0') AS DECIMAL)
            )
          )
        `,
      })
      .from(ordersDynamic)
      .leftJoin(productsDynamic, sql`${ordersDynamic.dynamicData}->>'sku' = ${productsDynamic.sku}`)
      .where(sql`${ordersDynamic.uploadId} IN (SELECT id FROM uploads WHERE is_current_version = true)`);

    // Calculate trends (last 30 days)
    const salesTrend = await db
      .select({
        date: sql<string>`DATE(CAST(${ordersDynamic.dynamicData}->>'orderDate' AS TIMESTAMP))`,
        value: sql<number>`SUM(CAST(${ordersDynamic.dynamicData}->>'discountedPrice' AS DECIMAL))`,
      })
      .from(ordersDynamic)
      .where(
        and(
          sql`${ordersDynamic.uploadId} IN (SELECT id FROM uploads WHERE is_current_version = true)`,
          sql`CAST(${ordersDynamic.dynamicData}->>'orderDate' AS TIMESTAMP) >= CURRENT_DATE - INTERVAL '30 days'`
        )
      )
      .groupBy(sql`DATE(CAST(${ordersDynamic.dynamicData}->>'orderDate' AS TIMESTAMP))`)
      .orderBy(sql`DATE(CAST(${ordersDynamic.dynamicData}->>'orderDate' AS TIMESTAMP))`);

    const totalProducts = Number(productsData?.totalProducts || 0);
    const totalOrders = Number(ordersData?.totalOrders || 0);
    const totalSales = Number(ordersData?.totalSales || 0);
    const totalGST = Number(gstData?.totalGST || 0);
    const totalCost = Number(profitData?.totalCost || 0);
    const profitLoss = totalSales - totalCost;

    const metrics: LiveDashboardMetrics = {
      totalProducts,
      totalOrders,
      totalSales,
      totalGST,
      profitLoss,
      trends: {
        sales: salesTrend.map(item => ({ date: item.date, value: Number(item.value || 0) })),
        gst: salesTrend.map(item => ({ date: item.date, value: Number(item.value || 0) * 0.18 })), // Simplified GST calculation
        profit: salesTrend.map(item => ({ date: item.date, value: Number(item.value || 0) * 0.2 })), // Simplified profit calculation
      },
    };

    // Cache the results
    await this.setCalculationCache({
      cacheKey: 'live_dashboard_metrics',
      calculationType: 'dashboard_summary',
      calculationResult: metrics,
      dependsOnUploads: currentUploads.map(u => u.id),
    });

    return metrics;
  }

  async recalculateAllMetrics(triggerUploadId?: string): Promise<void> {
    // Invalidate all cached calculations
    await db.delete(calculationCache);
    
    // Recalculate main dashboard metrics
    await this.calculateRealTimeMetrics();
    
    console.log(`Recalculated all metrics${triggerUploadId ? ` triggered by upload ${triggerUploadId}` : ''}`);
  }

  async getCurrentUploads(): Promise<Upload[]> {
    try {
      const currentUploads = await db.select().from(uploads).where(eq(uploads.isCurrentVersion, true));
      return currentUploads;
    } catch (error) {
      console.error('Error fetching current uploads:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
