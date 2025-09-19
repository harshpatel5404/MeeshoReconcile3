import { Readable } from 'stream';
import csv from 'csv-parser';
import { InsertOrder } from '@shared/schema';

export interface CSVProcessResult {
  orders: InsertOrder[];
  errors: string[];
  processedCount: number;
  productMetadata?: Array<{ sku: string; gstPercent?: number; costPrice?: number; productName: string; }>;
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

  // Enhanced field mapping for different CSV formats
  static getFieldValue(row: any, fieldAliases: string[]): string {
    for (const alias of fieldAliases) {
      if (row[alias] !== undefined && row[alias] !== null) {
        return String(row[alias]).trim();
      }
    }
    return '';
  }

  static async processOrdersCSV(buffer: Buffer): Promise<CSVProcessResult> {
    const orders: InsertOrder[] = [];
    const errors: string[] = [];
    let processedCount = 0;
    let headers: string[] = [];
    let headersSaved = false;
    const productMetadata = new Map<string, { sku: string; gstPercent?: number; costPrice?: number; productName: string; }>();

    return new Promise((resolve) => {
      const stream = Readable.from(buffer);
      
      stream
        .pipe(csv())
        .on('data', (row: any) => {
          try {
            processedCount++;
            
            // Save headers on first row for debugging
            if (!headersSaved) {
              headers = Object.keys(row);
              headersSaved = true;
              console.log('CSV Headers detected:', headers.slice(0, 10)); // Log first 10 headers
            }
            
            // Enhanced field extraction with multiple alias support
            const subOrderNo = this.getFieldValue(row, [
              'Sub Order No', 'Sub Order ID', 'subOrderNo', 'sub_order_no', 
              'SubOrderNo', 'SUB_ORDER_NO', 'Sub-Order-No'
            ]);
            
            const orderDate = this.getFieldValue(row, [
              'Order Date', 'orderDate', 'order_date', 'OrderDate', 
              'ORDER_DATE', 'Date', 'Created Date'
            ]);
            
            const productName = this.getFieldValue(row, [
              'Product Name', 'productName', 'product_name', 'ProductName', 
              'PRODUCT_NAME', 'Title', 'Product Title', 'Item Name'
            ]);
            
            const sku = this.getFieldValue(row, [
              'SKU', 'sku', 'SKU ID', 'Product SKU', 'ItemSKU', 
              'PRODUCT_SKU', 'Product Code', 'Item Code'
            ]);
            
            const reasonForCredit = this.getFieldValue(row, [
              'Reason for Credit Entry', 'reasonForCredit', 'reason_for_credit', 
              'Status', 'Order Status', 'Payment Status', 'Credit Reason'
            ]);

            // Extract additional fields for enhanced mapping (GST %, Cost Price)
            const gstPercent = this.getFieldValue(row, [
              'GST %', 'GST Percent', 'Product GST %', 'Tax %', 'Tax Percent',
              'GST', 'gst_percent', 'gstPercent', 'Product Tax %'
            ]);

            const costPrice = this.getFieldValue(row, [
              'Cost Price', 'costPrice', 'cost_price', 'Product Cost',
              'Purchase Price', 'Base Cost', 'Manufacturing Cost', 'Item Cost'
            ]);

            // Enhanced validation with detailed error reporting
            const missingFields: string[] = [];
            if (!subOrderNo) missingFields.push('Sub Order No');
            if (!productName) missingFields.push('Product Name');
            if (!sku) missingFields.push('SKU');
            
            if (missingFields.length > 0) {
              errors.push(`Row ${processedCount}: Missing required fields: ${missingFields.join(', ')}. Available columns: ${headers.slice(0, 5).join(', ')}...`);
              return;
            }

            // Create order object with all available data
            const order: InsertOrder = {
              subOrderNo,
              orderDate: this.parseDate(orderDate),
              customerState: this.getFieldValue(row, [
                'Customer State', 'customerState', 'customer_state', 
                'State', 'Buyer State', 'Delivery State'
              ]),
              productName,
              sku,
              size: this.getFieldValue(row, [
                'Size', 'size', 'Product Size', 'Variant', 
                'SIZE', 'Item Size'
              ]) || 'Free Size',
              quantity: parseInt(this.getFieldValue(row, [
                'Quantity', 'quantity', 'qty', 'Qty', 'QTY', 
                'Item Quantity', 'Order Quantity'
              ]) || '1') || 1,
              listedPrice: this.sanitizeNumericField(
                this.getFieldValue(row, [
                  'Supplier Listed Price (Incl. GST + Commission)', 
                  'Listed Price', 'listedPrice', 'Sale Price', 
                  'Supplier Listed Price', 'Sale Amount', 'Price', 
                  'Listed Price (Incl. GST)', 'Original Price'
                ])
              ).toString(),
              discountedPrice: this.sanitizeNumericField(
                this.getFieldValue(row, [
                  'Supplier Discounted Price (Incl GST and Commision)', 
                  'Discounted Price', 'discountedPrice', 'Final Sale Amount',
                  'Final Price', 'Net Price', 'Selling Price', 
                  'Discounted Sale Price', 'Final Sale Price'
                ])
              ).toString(),
              packetId: this.getFieldValue(row, [
                'Packet Id', 'packetId', 'packet_id', 'PacketID', 
                'PACKET_ID', 'Packet No', 'Package ID'
              ]),
              reasonForCredit: reasonForCredit || '',
              
              // Enhanced payment data extraction from CSV
              paymentStatus: this.mapPaymentStatus(reasonForCredit),
              paymentDate: this.isPaymentCompleted(reasonForCredit) ? this.parseDate(orderDate) : undefined
            };

            orders.push(order);

            // Collect product metadata (GST%, Cost Price) if available
            if (sku && productName) {
              const metadata: { sku: string; gstPercent?: number; costPrice?: number; productName: string; } = {
                sku,
                productName
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
        })
        .on('end', () => {
          const productMetadataArray = Array.from(productMetadata.values());
          console.log(`CSV Processing complete: ${orders.length} orders processed, ${productMetadataArray.length} product metadata records, ${errors.length} errors`);
          resolve({ orders, errors, processedCount, productMetadata: productMetadataArray });
        })
        .on('error', (error: any) => {
          errors.push(`CSV parsing error: ${error}`);
          resolve({ orders, errors, processedCount });
        });
    });
  }
}