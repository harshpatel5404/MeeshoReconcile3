# Dashboard Calculation Guide

## Overview
This guide explains the step-by-step calculation logic for all sections of the ReconMe Meesho Payment Reconciliation Dashboard. The dashboard processes data from uploaded CSV (orders) and ZIP (payment settlements) files to provide comprehensive financial analytics.

## Data Sources

### Primary Data Sources:
1. **Orders CSV** - Contains order information with fields like:
   - `Sub Order No`: Unique identifier for each order
   - `Order Date`: Date when order was placed
   - `Supplier Discounted Price (Incl GST and Commision)`: Final order amount
   - `Product Name`: Name of the product
   - `SKU`: Stock Keeping Unit identifier
   - `Quantity`: Number of items ordered
   - `Reason for Credit Entry`: Order status (DELIVERED, CANCELLED, RTO_COMPLETE, etc.)

2. **Payment ZIP** - Contains settlement information with fields like:
   - `subOrderNo`: Links to orders
   - `settlementAmount`: Amount settled by Meesho
   - `commissionFee`: Platform commission
   - `paymentGatewayFee`: Payment processing fees
   - `adsFee`: Marketing/advertisement fees
   - `fixedFee`: Fixed operational fees
   - `settlementDate`: Date of settlement

## Section 1: Overall Financial Summary

### Calculations:

#### Total Sales (Invoice)
```sql
SUM(orders_dynamic.dynamic_data->>'Supplier Discounted Price (Incl GST and Commision)')
FROM orders_dynamic
WHERE upload_id IN (SELECT id FROM uploads WHERE is_current_version = true)
```
**Logic**: Sum of all order values from the uploaded CSV file

#### Settlement Amount
```sql
SUM(payments.settlement_amount)
FROM payments
WHERE sub_order_no IN (current upload orders)
```
**Logic**: Total amount received from Meesho as settlements

#### Total Purchase Cost
```sql
SUM(
  CAST(orders_dynamic.dynamic_data->>'Quantity' AS INTEGER) * 
  CAST(products_dynamic.dynamic_data->>'costPrice' AS DECIMAL)
)
```
**Logic**: Quantity × Cost Price for all products

#### Total Packaging Cost
```sql
SUM(
  CAST(orders_dynamic.dynamic_data->>'Quantity' AS INTEGER) * 
  CAST(products_dynamic.dynamic_data->>'packagingCost' AS DECIMAL)
)
```
**Logic**: Quantity × Packaging Cost for all products

#### Shipping Cost
```sql
totalOrders * 49
```
**Logic**: Standard shipping rate of ₹49 per order

#### Total TDS (Tax Deducted at Source)
```sql
settlementAmount * 0.01
```
**Logic**: 1% TDS on settlement amount

#### Net Profit
```sql
settlementAmount - (totalPurchaseCost + totalPackagingCost + shippingCost + totalTds + totalFees)
```
**Logic**: Revenue minus all costs and fees

## Section 2: Orders Overview

### Order Status Calculations:

#### Total Orders
```sql
COUNT(orders_dynamic.id)
FROM orders_dynamic
WHERE upload_id IN (current version uploads)
```

#### Delivered Orders
```sql
COUNT(CASE WHEN UPPER(dynamic_data->>'Reason for Credit Entry') = 'DELIVERED' THEN 1 END)
```

#### Shipped Orders
```sql
COUNT(CASE WHEN UPPER(dynamic_data->>'Reason for Credit Entry') IN ('SHIPPED', 'READY_TO_SHIP') THEN 1 END)
```

#### Cancelled Orders
```sql
COUNT(CASE WHEN UPPER(dynamic_data->>'Reason for Credit Entry') IN ('CANCELLED', 'CANCELED') THEN 1 END)
```

#### Returns/RTO
```sql
COUNT(CASE WHEN UPPER(dynamic_data->>'Reason for Credit Entry') IN ('RETURN', 'RETURNED', 'REFUND', 'RTO', 'RTO_COMPLETE') THEN 1 END)
```

#### Average Order Value
```sql
AVG(CAST(dynamic_data->>'Supplier Discounted Price (Incl GST and Commision)' AS DECIMAL))
```

#### Return Rate
```sql
(returns / totalOrders) * 100
```

#### Orders Awaiting Payment Record
```sql
COUNT(orders_dynamic.id)
FROM orders_dynamic
LEFT JOIN payments ON orders_dynamic.dynamic_data->>'Sub Order No' = payments.sub_order_no
WHERE payments.id IS NULL
```
**Logic**: Orders without corresponding payment records

## Section 3: Settlement Components Breakdown

### Components:

1. **Sale Amount**: `SUM(payments.order_value)`
2. **Sale Return Amount**: `SUM(CASE WHEN payments.order_value < 0 THEN payments.order_value ELSE 0 END)`
3. **Shipping Charges**: `COUNT(*) * 49`
4. **Return Charges**: `SUM(CASE WHEN payments.order_value < 0 THEN 49 ELSE 0 END)`
5. **Platform Fees**: `SUM(payments.commission_fee)`
6. **Payment Gateway Fees**: `SUM(payments.payment_gateway_fee)`
7. **Fixed Fees**: `SUM(payments.fixed_fee)`
8. **Ads Fees**: `SUM(payments.ads_fee)`
9. **TCS (Tax Collected at Source)**: `SUM(payments.order_value * 0.01)`
10. **TDS (Tax Deducted at Source)**: `SUM(payments.settlement_amount * 0.01)`
11. **Final Settlement**: `SUM(payments.settlement_amount)`

## Section 4: Earnings Overview

### Components:
1. **Final Settlement**: Total amount received
2. **Marketing Cost**: `-SUM(payments.ads_fee)`
3. **Product Cost**: `-SUM(cost_price * quantity)`
4. **Packaging Cost**: `-SUM(packaging_cost * quantity)`
5. **Commission Fees**: `-SUM(payments.commission_fee)`
6. **Payment Gateway Fees**: `-SUM(payments.payment_gateway_fee)`
7. **Fixed Fees**: `-SUM(payments.fixed_fee)`
8. **Net Profit**: Final Settlement - Total Costs

## Section 5: Charts and Analytics

### Revenue Trend Chart
- **X-axis**: Months (last 12 months)
- **Y-axis**: Revenue and Profit
- **Data**: Monthly aggregation of orders by Order Date
- **Profit Calculation**: Monthly settlements - monthly fees

### Daily Volume Chart
- **X-axis**: Days (last 30 days)
- **Y-axis**: Order volume and AOV
- **AOV Calculation**: Total daily revenue / Daily order count

### Top Products Chart
- **Ranking**: By total sales value
- **Calculation**: `SUM(discounted_price * quantity)` per SKU
- **Limit**: Top 10 products

### Top Returns Chart
- **Ranking**: By combined returns and RTO count
- **Data Source**: Orders with return/RTO status
- **Calculation**: Count of return reasons per SKU

### Order Status Distribution
- **Type**: Pie chart
- **Data**: Count of orders by status
- **Categories**: Delivered, Shipped, Cancelled, Returns, etc.

## Section 6: Operational Costs

### Cost Types:
1. **Affiliate Fees**: `SUM(payments.ads_fee)`
2. **Fixed Fee**: `SUM(payments.fixed_fee)`
3. **Meesho Commission**: `SUM(payments.ads_fee) * 0.15` (15% of ads fee)
4. **Warehousing Fee**: `SUM(payments.fixed_fee) * 0.5` (50% of fixed fee)
5. **Total Claims**: `SUM(CASE WHEN payments.fixed_fee > 0 THEN payments.fixed_fee ELSE 0 END)`

## Data Flow Summary

1. **File Upload**: User uploads Orders CSV and Payment ZIP files
2. **Data Processing**: Files are parsed and stored in `orders_dynamic` and `payments` tables
3. **Current Version Tracking**: Only the latest upload for each file type is marked as current
4. **Real-time Calculation**: All metrics are calculated from current version data
5. **Dashboard Display**: Frontend displays formatted calculations with proper currency and percentage formatting

## Key Formulas Reference

| Metric | Formula |
|--------|---------|
| Net Profit | Settlement - (Purchase Cost + Packaging + Shipping + TDS + Fees) |
| Return Rate | (Returns ÷ Total Orders) × 100 |
| AOV | Total Revenue ÷ Total Orders |
| Profit Margin | (Net Profit ÷ Total Sales) × 100 |
| Settlement Rate | (Orders with Settlement ÷ Total Orders) × 100 |

## Currency Formatting

All monetary values are displayed in Indian Rupees (₹) using:
```javascript
new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2
}).format(amount)
```

## Update Mechanism

- **Automatic Recalculation**: Triggered when new files are uploaded
- **Manual Refresh**: Users can click "Refresh Data" button
- **Cache Invalidation**: All dashboard queries are invalidated when data changes
- **Real-time Updates**: Frontend automatically refetches data every 30 seconds

## Error Handling

- **Missing Data**: Default values (0) are used for missing calculations
- **Invalid Dates**: Date parsing errors result in exclusion from time-based charts
- **Null Values**: Handled gracefully with COALESCE in SQL queries
- **Division by Zero**: Prevented with conditional checks (e.g., `totalOrders > 0`)

This guide serves as the complete reference for understanding how every number on the dashboard is calculated and where the data originates from.