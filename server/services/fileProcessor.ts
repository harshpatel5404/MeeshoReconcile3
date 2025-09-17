import * as csv from 'csv-parser';
import * as xlsx from 'xlsx';
import { Readable } from 'stream';
import { storage } from '../storage';
import { type InsertOrder, type InsertPayment } from '@shared/schema';

export interface ProcessedFile {
  orders?: InsertOrder[];
  payments?: InsertPayment[];
  errors: string[];
}

export class FileProcessor {
  static async processOrdersCSV(buffer: Buffer): Promise<ProcessedFile> {
    const orders: InsertOrder[] = [];
    const errors: string[] = [];

    return new Promise((resolve) => {
      const stream = Readable.from(buffer);
      stream
        .pipe(csv())
        .on('data', (row: any) => {
          try {
            const order: InsertOrder = {
              subOrderNo: row['Sub Order No']?.trim(),
              orderDate: new Date(row['Order Date']?.trim()),
              customerState: row['Customer State']?.trim(),
              productName: row['Product Name']?.trim(),
              sku: row['SKU']?.trim(),
              size: row['Size']?.trim() || 'Free Size',
              quantity: parseInt(row['Quantity']) || 1,
              listedPrice: row['Supplier Listed Price (Incl. GST + Commission)']?.replace('₹', '') || '0',
              discountedPrice: row['Supplier Discounted Price (Incl GST and Commision)']?.replace('₹', '') || '0',
              packetId: row['Packet Id']?.trim(),
              reasonForCredit: row['Reason for Credit Entry']?.trim(),
            };

            // Validation
            if (!order.subOrderNo || !order.productName || !order.sku) {
              errors.push(`Invalid order data at row: ${JSON.stringify(row)}`);
              return;
            }

            orders.push(order);
          } catch (error) {
            errors.push(`Error processing row: ${error}`);
          }
        })
        .on('end', () => {
          resolve({ orders, errors });
        })
        .on('error', (error) => {
          errors.push(`CSV parsing error: ${error}`);
          resolve({ orders, errors });
        });
    });
  }

  static async processPaymentsXLSX(buffer: Buffer): Promise<ProcessedFile> {
    const payments: InsertPayment[] = [];
    const errors: string[] = [];

    try {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet);

      jsonData.forEach((row: any, index: number) => {
        try {
          const payment: InsertPayment = {
            subOrderNo: row['Sub Order No'] || row['Order ID'] || row['sub_order_no'],
            settlementDate: row['Settlement Date'] ? new Date(row['Settlement Date']) : null,
            settlementAmount: row['Settlement Amount'] || row['Net Amount'] || '0',
            orderValue: row['Order Value'] || row['GMV'] || '0',
            commissionFee: row['Commission Fee'] || row['Commission'] || '0',
            fixedFee: row['Fixed Fee'] || row['Collection Fee'] || '0',
            paymentGatewayFee: row['Payment Gateway Fee'] || row['PG Fee'] || '0',
            adsFee: row['Ads Fee'] || row['Marketing Fee'] || '0',
          };

          // Validation
          if (!payment.subOrderNo) {
            errors.push(`Missing sub order number at row ${index + 1}`);
            return;
          }

          payments.push(payment);
        } catch (error) {
          errors.push(`Error processing payment row ${index + 1}: ${error}`);
        }
      });
    } catch (error) {
      errors.push(`XLSX parsing error: ${error}`);
    }

    return { payments, errors };
  }

  static async extractProductsFromOrders(orders: InsertOrder[]): Promise<void> {
    const uniqueProducts = new Map<string, any>();

    orders.forEach(order => {
      if (!uniqueProducts.has(order.sku)) {
        uniqueProducts.set(order.sku, {
          sku: order.sku,
          title: order.productName,
          costPrice: '0',
          packagingCost: '15',
          gstPercent: '18',
          totalOrders: 0,
        });
      }
      uniqueProducts.get(order.sku)!.totalOrders += 1;
    });

    // Bulk create products that don't exist
    const productList = Array.from(uniqueProducts.values());
    const existingProducts = await storage.getAllProducts();
    const existingSkus = new Set(existingProducts.map(p => p.sku));

    const newProducts = productList.filter(p => !existingSkus.has(p.sku));
    if (newProducts.length > 0) {
      await storage.bulkCreateProducts(newProducts);
    }

    // Update order counts for existing products
    for (const product of productList) {
      if (existingSkus.has(product.sku)) {
        const existing = existingProducts.find(p => p.sku === product.sku);
        if (existing) {
          await storage.updateProduct(product.sku, {
            totalOrders: (Number(existing.totalOrders) || 0) + product.totalOrders
          });
        }
      }
    }
  }
}
