import { storage } from '../storage.js';
import { type InsertReconciliation } from '../../shared/schema.js';

export class ReconciliationEngine {
  static async runReconciliation(): Promise<{
    processed: number;
    reconciled: number;
    mismatched: number;
    unreconciled: number;
  }> {
    const orders = await storage.getAllOrders();
    const payments = await storage.getAllPayments();
    const products = await storage.getAllProducts();

    // Create maps for quick lookup
    const paymentMap = new Map();
    payments.forEach(payment => {
      if (!paymentMap.has(payment.subOrderNo)) {
        paymentMap.set(payment.subOrderNo, []);
      }
      paymentMap.get(payment.subOrderNo).push(payment);
    });

    const productMap = new Map();
    products.forEach(product => {
      productMap.set(product.sku, product);
    });

    const reconciliations: InsertReconciliation[] = [];
    let reconciledCount = 0;
    let mismatchedCount = 0;
    let unreconciledCount = 0;

    for (const order of orders) {
      const orderPayments = paymentMap.get(order.subOrderNo) || [];
      const product = productMap.get(order.sku);

      if (!product) {
        console.warn(`Product not found for SKU: ${order.sku}`);
        continue;
      }

      const orderValue = Number(order.discountedPrice) || 0;
      const productCost = Number(product.costPrice) || 0;
      const packagingCost = Number(product.packagingCost) || 0;

      let status: string;
      let settlementAmount = 0;
      let adsCost = 0;

      if (orderPayments.length > 0) {
        const payment = orderPayments[0]; // Take first payment
        settlementAmount = Number(payment.settlementAmount) || 0;
        adsCost = Number(payment.adsFee) || 0;

        // Determine status based on settlement
        if (settlementAmount > 0) {
          // Check for discrepancies (simple tolerance check)
          const expectedSettlement = orderValue * 0.87; // Rough estimate after fees
          const tolerance = 5.0; // ₹5 tolerance
          
          if (Math.abs(settlementAmount - expectedSettlement) <= tolerance) {
            status = 'reconciled';
            reconciledCount++;
          } else {
            status = 'mismatch';
            mismatchedCount++;
          }
        } else {
          status = 'unreconciled';
          unreconciledCount++;
        }
      } else {
        // No payment found
        status = 'unreconciled';
        unreconciledCount++;
      }

      const totalCost = productCost + packagingCost;
      const grossProfit = settlementAmount - totalCost;
      const netProfit = grossProfit - adsCost;

      const reconciliation: InsertReconciliation = {
        subOrderNo: order.subOrderNo,
        orderId: order.id,
        paymentId: orderPayments[0]?.id || null,
        productId: product.id,
        status,
        orderValue: orderValue.toString(),
        settlementAmount: settlementAmount.toString(),
        productCost: productCost.toString(),
        packagingCost: packagingCost.toString(),
        adsCost: adsCost.toString(),
        grossProfit: grossProfit.toString(),
        netProfit: netProfit.toString(),
      };

      reconciliations.push(reconciliation);
    }

    // Clear existing reconciliations and create new ones
    if (reconciliations.length > 0) {
      await storage.bulkCreateReconciliations(reconciliations);
    }

    return {
      processed: reconciliations.length,
      reconciled: reconciledCount,
      mismatched: mismatchedCount,
      unreconciled: unreconciledCount,
    };
  }

  static async calculateProfitLoss(subOrderNo: string): Promise<{
    grossProfit: number;
    netProfit: number;
    profitMargin: number;
  }> {
    const reconciliation = await storage.getReconciliationBySubOrderNo(subOrderNo);
    
    if (!reconciliation) {
      return { grossProfit: 0, netProfit: 0, profitMargin: 0 };
    }

    const grossProfit = Number(reconciliation.grossProfit) || 0;
    const netProfit = Number(reconciliation.netProfit) || 0;
    const orderValue = Number(reconciliation.orderValue) || 0;
    const profitMargin = orderValue > 0 ? (netProfit / orderValue) * 100 : 0;

    return {
      grossProfit,
      netProfit,
      profitMargin,
    };
  }
}
