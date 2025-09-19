import { Readable } from 'stream';
import csv from 'csv-parser';
import { InsertOrder } from '@shared/schema';

export interface CSVProcessResult {
  orders: InsertOrder[];
  errors: string[];
  processedCount: number;
}

export class CSVProcessor {
  static sanitizeNumericField(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return 0;
    
    // Remove currency symbols, commas, and whitespace
    const cleaned = value.replace(/[₹,\s]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  static parseDate(dateString: string): Date {
    if (!dateString) return new Date();
    
    // Handle different date formats
    const trimmed = dateString.trim();
    const parsed = new Date(trimmed);
    
    // If invalid date, try other formats
    if (isNaN(parsed.getTime())) {
      // Try DD/MM/YYYY format
      const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (ddmmyyyy) {
        return new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
      }
    }
    
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  static mapPaymentStatus(reasonForCredit: string): string {
    if (!reasonForCredit) return 'PENDING';
    
    const reason = reasonForCredit.toLowerCase().trim();
    
    // Map based on common patterns in Meesho data
    if (reason.includes('delivery completed') || reason.includes('delivered')) {
      return 'PAID';
    }
    if (reason.includes('refund') || reason.includes('return')) {
      return 'REFUNDED';
    }
    if (reason.includes('cancelled') || reason.includes('canceled')) {
      return 'CANCELLED';
    }
    if (reason.includes('rto') || reason.includes('reverse')) {
      return 'REFUNDED';
    }
    
    return 'PROCESSING';
  }

  static isPaymentCompleted(reasonForCredit: string): boolean {
    if (!reasonForCredit) return false;
    
    const reason = reasonForCredit.toLowerCase().trim();
    return reason.includes('delivery completed') || 
           reason.includes('delivered') ||
           reason.includes('settlement');
  }

  static async processOrdersCSV(buffer: Buffer): Promise<CSVProcessResult> {
    const orders: InsertOrder[] = [];
    const errors: string[] = [];
    let processedCount = 0;

    return new Promise((resolve) => {
      const stream = Readable.from(buffer);
      
      stream
        .pipe(csv())
        .on('data', (row: any) => {
          try {
            processedCount++;
            
            // Extract and clean order data
            const subOrderNo = row['Sub Order No']?.trim() || row['Sub Order ID']?.trim() || row['subOrderNo']?.trim();
            const orderDate = row['Order Date']?.trim() || row['orderDate']?.trim();
            const productName = row['Product Name']?.trim() || row['productName']?.trim();
            const sku = row['SKU']?.trim() || row['sku']?.trim();
            const reasonForCredit = row['Reason for Credit Entry']?.trim() || row['reasonForCredit']?.trim();

            // Validate required fields
            if (!subOrderNo || !productName || !sku) {
              errors.push(`Row ${processedCount}: Missing required fields (Sub Order No, Product Name, or SKU)`);
              return;
            }

            // Create order object with all available data
            const order: InsertOrder = {
              subOrderNo,
              orderDate: this.parseDate(orderDate),
              customerState: row['Customer State']?.trim() || row['customerState']?.trim() || '',
              productName,
              sku,
              size: row['Size']?.trim() || row['size']?.trim() || 'Free Size',
              quantity: parseInt(row['Quantity'] || row['quantity'] || '1') || 1,
              listedPrice: this.sanitizeNumericField(
                row['Supplier Listed Price (Incl. GST + Commission)'] || 
                row['Listed Price'] || 
                row['listedPrice'] ||
                row['Supplier Listed Price'] ||
                row['Sale Amount']
              ).toString(),
              discountedPrice: this.sanitizeNumericField(
                row['Supplier Discounted Price (Incl GST and Commision)'] || 
                row['Discounted Price'] ||
                row['discountedPrice'] ||
                row['Final Sale Amount']
              ).toString(),
              packetId: row['Packet Id']?.trim() || row['packetId']?.trim() || '',
              reasonForCredit: reasonForCredit || '',
              
              // Enhanced payment data extraction from CSV
              paymentStatus: this.mapPaymentStatus(reasonForCredit),
              paymentDate: this.isPaymentCompleted(reasonForCredit) ? this.parseDate(orderDate) : undefined
            };

            orders.push(order);
            
          } catch (error) {
            errors.push(`Row ${processedCount}: Processing error - ${error}`);
          }
        })
        .on('end', () => {
          console.log(`CSV Processing complete: ${orders.length} orders processed, ${errors.length} errors`);
          resolve({ orders, errors, processedCount });
        })
        .on('error', (error: any) => {
          errors.push(`CSV parsing error: ${error}`);
          resolve({ orders, errors, processedCount });
        });
    });
  }
}