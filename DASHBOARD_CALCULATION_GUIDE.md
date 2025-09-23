# ReconMe Dashboard Calculation Guide
## Comprehensive Logic Documentation for Meesho Reconciliation Dashboard

### Overview
This guide documents the exact calculation logic for each dashboard section based on Meesho's payment reconciliation data structure. All calculations are derived from the actual file formats and business logic described in the FILE_PROCESSING_GUIDE.md.

---

## 📊 DATA SOURCES

### Primary Data Sources
1. **Orders CSV** - Contains order details, customer info, and order status
2. **Payment ZIP/XLSX** - Contains settlement data with 42 columns of financial breakdown
3. **Product Data** - Cost prices, packaging costs, GST rates

### Key Data Points from Files
- **Orders CSV**: 149 orders, ₹484-₹499 price range, 60% delivered, 25% RTO
- **Payment XLSX**: 10 payment records, 42 financial columns, mostly RTO orders with ₹0 settlement
- **Settlement Formula**: `(B + C + G + H + I + L + Q + R + S + T + U + V + W + Y + AA + AD + AF + AX)`

---

## 💰 SETTLEMENT BREAKDOWN SECTION

### Purpose
Shows the step-by-step breakdown of how Meesho calculates the final settlement amount from gross sales to net payout.

### Data Sources
- **Column 14**: Total Sale Amount (Incl. Shipping & GST)
- **Column 15**: Total Sale Return Amount (Incl. Shipping & GST) 
- **Column 21**: Meesho Commission (Incl. GST)
- **Column 16**: Fixed Fee (Incl. GST)
- **Column 28**: Shipping Charge (Incl. GST)
- **Column 26**: Return Shipping Charge (Incl. GST)
- **Column 33**: TCS (Tax Collected at Source)
- **Column 35**: TDS (Tax Deducted at Source)
- **Column 12**: Final Settlement Amount

### Calculation Logic
```typescript
async getSettlementComponents(): Promise<SettlementComponentsData[]> {
  // Get actual payment data from XLSX files
  const [paymentData] = await db
    .select({
      totalSaleAmount: sql<number>`SUM(CASE WHEN ${payments.orderValue} > 0 THEN ${payments.orderValue} ELSE 0 END)`,
      totalReturnAmount: sql<number>`SUM(CASE WHEN ${payments.orderValue} < 0 THEN ${payments.orderValue} ELSE 0 END)`,
      totalCommission: sum(payments.commissionFee),
      totalFixedFees: sum(payments.fixedFee),
      totalGatewayFees: sum(payments.paymentGatewayFee),
      totalAdsFees: sum(payments.adsFee),
      finalSettlement: sum(payments.settlementAmount),
      recordCount: count(payments.id)
    })
    .from(payments);

  // Get order data for shipping calculations
  const [orderData] = await db
    .select({
      totalOrders: count(ordersDynamic.id),
      deliveredOrders: sql<number>`count(case when UPPER(${ordersDynamic.dynamicData}->>'Reason for Credit Entry') = 'DELIVERED' then 1 end)`,
      returnOrders: sql<number>`count(case when UPPER(${ordersDynamic.dynamicData}->>'Reason for Credit Entry') IN ('RTO_COMPLETE', 'RTO_LOCKED', 'RETURN') then 1 end)`,
    })
    .from(ordersDynamic)
    .where(sql`${ordersDynamic.uploadId} IN (SELECT id FROM uploads WHERE is_current_version = true)`);

  const totalSaleAmount = Number(paymentData?.totalSaleAmount || 0);
  const totalReturnAmount = Number(paymentData?.totalReturnAmount || 0);
  const totalCommission = Number(paymentData?.totalCommission || 0);
  const totalFixedFees = Number(paymentData?.totalFixedFees || 0);
  const totalGatewayFees = Number(paymentData?.totalGatewayFees || 0);
  const totalAdsFees = Number(paymentData?.totalAdsFees || 0);
  const finalSettlement = Number(paymentData?.finalSettlement || 0);
  
  // Calculate shipping charges based on order counts
  const deliveredOrders = Number(orderData?.deliveredOrders || 0);
  const returnOrders = Number(orderData?.returnOrders || 0);
  const forwardShipping = deliveredOrders * 49; // ₹49 per delivered order
  const returnShipping = returnOrders * 49; // ₹49 per return
  
  // Calculate taxes
  const tcs = totalSaleAmount * 0.001; // 0.1% TCS on sales
  const tds = finalSettlement * 0.01; // 1% TDS on settlement

  return [
    { component: 'Total Sale Amount (Incl. Shipping & GST)', totalAmount: totalSaleAmount },
    { component: 'Sale Return Amount (Incl. Shipping & GST)', totalAmount: totalReturnAmount },
    { component: 'Forward Shipping Charges', totalAmount: forwardShipping },
    { component: 'Return Shipping Charges', totalAmount: -returnShipping },
    { component: 'Meesho Commission (Incl. GST)', totalAmount: -totalCommission },
    { component: 'Fixed Fee (Incl. GST)', totalAmount: -totalFixedFees },
    { component: 'Payment Gateway Fee', totalAmount: -totalGatewayFees },
    { component: 'Ads Fee', totalAmount: -totalAdsFees },
    { component: 'TCS (Tax Collected at Source)', totalAmount: -tcs },
    { component: 'TDS (Tax Deducted at Source)', totalAmount: -tds },
    { component: 'Final Settlement Amount', totalAmount: finalSettlement },
  ];
}
```

### Display Format
- **Positive amounts**: Revenue items (green)
- **Negative amounts**: Deductions (red)
- **Final Settlement**: Net result (blue)

---

## 📈 EARNINGS OVERVIEW SECTION

### Purpose
Shows the seller's profit/loss analysis by comparing settlement income against all business costs.

### Data Sources
- **Settlement Data**: From payment XLSX files
- **Product Costs**: From product master data or estimates
- **Operational Costs**: Marketing, packaging, logistics

### Calculation Logic
```typescript
async getEarningsOverview(): Promise<EarningsOverviewData[]> {
  // Get settlement income
  const [settlementData] = await db
    .select({
      finalSettlement: sum(payments.settlementAmount),
      totalAdsFees: sum(payments.adsFee),
      totalCommissionFees: sum(payments.commissionFee),
      totalGatewayFees: sum(payments.paymentGatewayFee),
      totalFixedFees: sum(payments.fixedFee),
    })
    .from(payments);

  // Get order volume for cost calculations
  const [orderData] = await db
    .select({
      totalOrders: count(ordersDynamic.id),
      totalSaleValue: sql<number>`SUM(CAST(${ordersDynamic.dynamicData}->>'Supplier Discounted Price (Incl GST and Commision)' AS DECIMAL) * CAST(${ordersDynamic.dynamicData}->>'Quantity' AS INTEGER))`,
      deliveredOrders: sql<number>`count(case when UPPER(${ordersDynamic.dynamicData}->>'Reason for Credit Entry') = 'DELIVERED' then 1 end)`,
    })
    .from(ordersDynamic)
    .where(sql`${ordersDynamic.uploadId} IN (SELECT id FROM uploads WHERE is_current_version = true)`);

  const finalSettlement = Number(settlementData?.finalSettlement || 0);
  const totalSaleValue = Number(orderData?.totalSaleValue || 0);
  const totalOrders = Number(orderData?.totalOrders || 0);
  const deliveredOrders = Number(orderData?.deliveredOrders || 0);

  // Calculate business costs
  const productCost = totalSaleValue * 0.65; // 65% of sale value (industry standard for apparel)
  const packagingCost = totalOrders * 15; // ₹15 per order
  const marketingCost = Number(settlementData?.totalAdsFees || 0) || (totalSaleValue * 0.03); // 3% marketing
  const logisticsCost = deliveredOrders * 49; // ₹49 per delivered order
  
  // Platform fees (already deducted from settlement)
  const platformFees = Number(settlementData?.totalCommissionFees || 0) + 
                      Number(settlementData?.totalGatewayFees || 0) + 
                      Number(settlementData?.totalFixedFees || 0);

  // Calculate net profit
  const totalCosts = productCost + packagingCost + marketingCost + logisticsCost;
  const netProfit = finalSettlement - totalCosts;

  return [
    { description: 'Settlement Income (from Meesho)', amount: finalSettlement },
    { description: 'Product Cost (65% of sales)', amount: -productCost },
    { description: 'Packaging Cost (₹15/order)', amount: -packagingCost },
    { description: 'Marketing/Ads Cost', amount: -marketingCost },
    { description: 'Logistics Cost (₹49/delivered)', amount: -logisticsCost },
    { description: 'Platform Fees (already deducted)', amount: 0 }, // Already deducted in settlement
    { description: 'Net Profit/Loss', amount: netProfit },
  ];
}
```

### Business Logic Notes
- **Product Cost**: 65% of sale value (typical for apparel/sarees)
- **Packaging**: ₹15 per order (standard packaging cost)
- **Logistics**: ₹49 per delivered order (Meesho's standard rate)
- **Platform Fees**: Already deducted in settlement calculation

---

## 🔧 OPERATIONAL COSTS & RECOVERIES SECTION

### Purpose
Shows detailed breakdown of operational expenses and any recoveries/compensations from Meesho.

### Data Sources
- **Column 21**: Meesho Commission
- **Column 16**: Fixed Fee
- **Column 17**: Warehousing fee
- **Column 36**: Compensation
- **Column 37**: Claims
- **Column 38**: Recovery

### Calculation Logic
```typescript
async getOperationalCosts(): Promise<OperationalCostsData[]> {
  // Get detailed cost breakdown from payment data
  const [costsData] = await db
    .select({
      commissionFees: sum(payments.commissionFee),
      fixedFees: sum(payments.fixedFee),
      gatewayFees: sum(payments.paymentGatewayFee),
      adsFees: sum(payments.adsFee),
      // Note: Warehousing, compensation, claims, recovery would come from 
      // additional columns if available in the payment processing
    })
    .from(payments);

  // Get order data for operational metrics
  const [orderMetrics] = await db
    .select({
      totalOrders: count(ordersDynamic.id),
      returnOrders: sql<number>`count(case when UPPER(${ordersDynamic.dynamicData}->>'Reason for Credit Entry') IN ('RTO_COMPLETE', 'RTO_LOCKED') then 1 end)`,
      cancelledOrders: sql<number>`count(case when UPPER(${ordersDynamic.dynamicData}->>'Reason for Credit Entry') = 'CANCELLED' then 1 end)`,
    })
    .from(ordersDynamic)
    .where(sql`${ordersDynamic.uploadId} IN (SELECT id FROM uploads WHERE is_current_version = true)`);

  const commissionFees = Number(costsData?.commissionFees || 0);
  const fixedFees = Number(costsData?.fixedFees || 0);
  const gatewayFees = Number(costsData?.gatewayFees || 0);
  const adsFees = Number(costsData?.adsFees || 0);
  const totalOrders = Number(orderMetrics?.totalOrders || 0);
  const returnOrders = Number(orderMetrics?.returnOrders || 0);

  // Calculate estimated operational costs
  const warehousingFees = totalOrders * 8; // ₹8 per order warehousing
  const returnHandlingFees = returnOrders * 25; // ₹25 per return
  const customerSupportCost = totalOrders * 2; // ₹2 per order support cost

  // Recoveries and compensations (would be from additional XLSX columns)
  const estimatedCompensation = returnOrders * 10; // ₹10 compensation per return
  const qualityClaimsRecovery = returnOrders * 5; // ₹5 recovery per return

  return [
    { type: 'Meesho Commission', amount: commissionFees },
    { type: 'Fixed Processing Fees', amount: fixedFees },
    { type: 'Payment Gateway Fees', amount: gatewayFees },
    { type: 'Advertising/Marketing Fees', amount: adsFees },
    { type: 'Warehousing Fees (est.)', amount: warehousingFees },
    { type: 'Return Handling Fees (est.)', amount: returnHandlingFees },
    { type: 'Customer Support Cost (est.)', amount: customerSupportCost },
    { type: 'Compensation Received', amount: -estimatedCompensation },
    { type: 'Quality Claims Recovery', amount: -qualityClaimsRecovery },
  ];
}
```

### Cost Categories
1. **Platform Fees**: Commission, fixed fees, gateway fees
2. **Operational Costs**: Warehousing, return handling, support
3. **Marketing Costs**: Ads, promotions
4. **Recoveries**: Compensations, claims, adjustments

---

## 🎯 CALCULATION ACCURACY IMPROVEMENTS

### Current Issues
1. **Estimated Values**: Many costs are estimated due to limited payment data
2. **Missing Columns**: Not all 42 XLSX columns are being utilized
3. **Static Calculations**: Some values are hardcoded instead of data-driven

### Recommended Improvements

#### 1. Enhanced Payment Data Extraction
```typescript
// Extract all 42 columns from payment XLSX
const enhancedPaymentColumns = {
  // Revenue columns
  totalSaleAmount: 'Total Sale Amount (Incl. Shipping & GST)', // Column 14
  saleReturnAmount: 'Total Sale Return Amount (Incl. Shipping & GST)', // Column 15
  
  // Fee columns
  fixedFee: 'Fixed Fee (Incl. GST)', // Column 16
  warehousingFee: 'Warehousing fee (inc Gst)', // Column 17
  returnPremium: 'Return premium (incl GST)', // Column 18
  meeshoCommission: 'Meesho Commission (Incl. GST)', // Column 21
  shippingCharge: 'Shipping Charge (Incl. GST)', // Column 28
  
  // Tax columns
  tcs: 'TCS', // Column 33
  tds: 'TDS', // Column 35
  
  // Recovery columns
  compensation: 'Compensation', // Column 36
  claims: 'Claims', // Column 37
  recovery: 'Recovery', // Column 38
};
```

#### 2. Dynamic Cost Calculation
```typescript
// Calculate costs based on actual data instead of estimates
const calculateDynamicCosts = (paymentData: any[], orderData: any[]) => {
  const actualShippingCost = paymentData.reduce((sum, payment) => 
    sum + (payment.shippingCharge || 0), 0);
  
  const actualCommission = paymentData.reduce((sum, payment) => 
    sum + (payment.meeshoCommission || 0), 0);
  
  const actualWarehousingFee = paymentData.reduce((sum, payment) => 
    sum + (payment.warehousingFee || 0), 0);
  
  return {
    actualShippingCost,
    actualCommission,
    actualWarehousingFee
  };
};
```

#### 3. Real-time Data Validation
```typescript
// Validate settlement calculation against Meesho's formula
const validateSettlement = (paymentRecord: any) => {
  const calculatedSettlement = 
    paymentRecord.totalSaleAmount +
    paymentRecord.saleReturnAmount -
    paymentRecord.meeshoCommission -
    paymentRecord.fixedFee -
    paymentRecord.shippingCharge -
    paymentRecord.tcs -
    paymentRecord.tds +
    paymentRecord.compensation -
    paymentRecord.recovery;
  
  const actualSettlement = paymentRecord.finalSettlementAmount;
  const variance = Math.abs(calculatedSettlement - actualSettlement);
  
  return {
    calculated: calculatedSettlement,
    actual: actualSettlement,
    variance: variance,
    isAccurate: variance < 1 // Within ₹1 tolerance
  };
};
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Data Extraction Enhancement
- [ ] Extract all 42 columns from payment XLSX files
- [ ] Map additional fee and recovery columns
- [ ] Implement column validation and error handling

### Phase 2: Calculation Logic Update
- [ ] Replace estimated values with actual data
- [ ] Implement dynamic cost calculations
- [ ] Add settlement validation logic

### Phase 3: Dashboard Updates
- [ ] Update Settlement Breakdown with actual data
- [ ] Enhance Earnings Overview with real costs
- [ ] Improve Operational Costs with detailed breakdown

### Phase 4: Testing & Validation
- [ ] Test with sample payment files
- [ ] Validate calculations against Meesho's formula
- [ ] Compare results with manual calculations

---

## 🔍 DEBUGGING & TROUBLESHOOTING

### Common Issues
1. **Zero Settlement Amounts**: Normal for RTO orders
2. **Missing Fee Data**: Check if all XLSX columns are being processed
3. **Calculation Mismatches**: Verify formula implementation

### Debug Queries
```sql
-- Check payment data completeness
SELECT 
  COUNT(*) as total_payments,
  SUM(CASE WHEN settlement_amount > 0 THEN 1 ELSE 0 END) as positive_settlements,
  SUM(CASE WHEN commission_fee > 0 THEN 1 ELSE 0 END) as records_with_commission,
  AVG(settlement_amount) as avg_settlement
FROM payments;

-- Validate order-payment matching
SELECT 
  o.reason_for_credit,
  COUNT(*) as order_count,
  COUNT(p.id) as payment_count,
  COUNT(p.id) * 100.0 / COUNT(*) as match_rate
FROM orders_dynamic o
LEFT JOIN payments p ON o.sub_order_no = p.sub_order_no
GROUP BY o.reason_for_credit;
```

---

## 📊 SAMPLE CALCULATIONS

### Example: Settlement Breakdown for Sample Data
Based on the actual sample data (10 RTO orders with ₹0 settlement):

```
Total Sale Amount: ₹5,850 (10 orders × avg ₹585)
Sale Return Amount: -₹5,850 (all RTO orders)
Forward Shipping: ₹0 (no delivered orders)
Return Shipping: -₹490 (10 returns × ₹49)
Commission: ₹0 (no commission on RTO)
Fixed Fee: -₹250 (10 orders × ₹25)
TCS: -₹5.85 (0.1% of sales)
TDS: ₹0 (no settlement to tax)
Final Settlement: ₹0
```

### Example: Earnings Overview
```
Settlement Income: ₹0
Product Cost: -₹3,802 (65% of ₹5,850)
Packaging Cost: -₹150 (10 orders × ₹15)
Marketing Cost: ₹0 (no ads on RTO)
Logistics Cost: -₹490 (return shipping)
Net Loss: -₹4,442
```

---

*Last Updated: January 2025*
*Version: 1.0*