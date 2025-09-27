import { Readable } from 'stream';
import csv from 'csv-parser';
import { InsertOrder } from '../../shared/schema.js';

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

  // Map order status from CSV to standard order status
  static normalizeOrderStatus(reasonForCredit: string): string {
    if (!reasonForCredit) return 'Unknown';
    
    const reason = reasonForCredit.toUpperCase().trim();
    
    switch (reason) {
      case 'DELIVERED':
        return 'Delivered';
      case 'CANCELLED':
      case 'CANCELED':
        return 'Cancelled';
      case 'RTO_COMPLETE':
      case 'RTO_LOCKED':
      case 'RTO_OFD':
        return 'RTO';
      case 'RETURN':
      case 'RETURNED':
        return 'Return';
      default:
        return 'Unknown';
    }
  }

  // Calculate payment status based on order status and settlement amount
  static calculatePaymentStatus(orderStatus: string, settlementAmount: number = 0): string {
    const normalizedStatus = orderStatus.trim();
    
    if (normalizedStatus === 'Cancelled') {
      return 'N/A';
    } else if (normalizedStatus === 'Delivered') {
      if (settlementAmount > 0) {
        return 'Paid';
      } else {
        return 'N/A';
      }
    } else if (normalizedStatus === 'RTO') {
      return 'Unpaid/Zero';
    } else if (normalizedStatus === 'Return') {
      if (settlementAmount < 0) {
        return 'Refunded';
      } else {
        return 'N/A';
      }
    } else {
      return 'N/A';
    }
  }

  static mapPaymentStatus(reasonForCredit: string): string {
    const normalizedStatus = this.normalizeOrderStatus(reasonForCredit);
    return this.calculatePaymentStatus(normalizedStatus, 0); // Initial status without settlement data
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
    const productMetadata = new Map<string, { sku: string; gstPercent?: number; costPrice?: number; productName: string; }>();

    return new Promise((resolve) => {
      const stream = Readable.from(buffer);
      
      stream
        .pipe(csv())
        .on('headers', (headerList: string[]) => {
          headers = headerList;
          console.log('CSV Headers detected:', headers); // Log all headers for exact matching
        })
        .on('data', (row: any) => {
          try {
            processedCount++; // Count each data row (csv-parser already handles headers)
            
            // Enhanced field mapping with aliases for different CSV formats
            const subOrderNo = this.getFieldValue(row, [
              'Sub Order No', 'subOrderNo', 'sub_order_no', 'Sub Order ID'
            ]);
            
            const orderDate = this.getFieldValue(row, [
              'Order Date', 'orderDate', 'order_date', 'OrderDate', 'ORDER_DATE', 'Date', 'Created Date'
            ]);
            
            const productName = this.getFieldValue(row, [
              'Product Name', 'Item Name', 'Title', 'Product Title', 'Product', 'Item', 'Name'
            ]);
            
            const sku = this.getFieldValue(row, [
              'SKU', 'sku', 'Product SKU', 'Item SKU', 'Product Code', 'Item Code'
            ]);
            
            const reasonForCredit = this.getFieldValue(row, [
              'Reason for Credit Entry', 'reasonForCredit', 'reason_for_credit', 'Status', 'Order Status', 'Payment Status', 'Credit Reason'
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
                'Customer State', 'customerState', 'customer_state', 'State', 'Buyer State', 'Delivery State'
              ]),
              productName,
              sku,
              size: this.getFieldValue(row, [
                'Size', 'size', 'Product Size', 'Variant', 'SIZE', 'Item Size'
              ]) || 'Free Size',
              quantity: parseInt(this.getFieldValue(row, [
                'Quantity', 'quantity', 'qty', 'Qty', 'QTY', 'Item Quantity', 'Order Quantity'
              ]) || '1') || 1,
              listedPrice: this.sanitizeNumericField(
                this.getFieldValue(row, [
                  'Supplier Listed Price (Incl. GST + Commission)', 'Listed Price', 'listedPrice', 'Sale Price', 'Supplier Listed Price', 'Sale Amount', 'Price', 'Listed Price (Incl. GST)', 'Original Price'
                ])
              ).toString(),
              discountedPrice: this.sanitizeNumericField(
                this.getFieldValue(row, [
                  'Supplier Discounted Price (Incl GST and Commision)', 'Discounted Price', 'discountedPrice', 'Final Sale Amount', 'Final Price', 'Net Price', 'Selling Price', 'Discounted Sale Price', 'Final Sale Price'
                ])
              ).toString(),
              packetId: this.getFieldValue(row, [
                'Packet Id', 'packetId', 'packet_id', 'PacketID', 'PACKET_ID', 'Packet No', 'Package ID'
              ]),
              reasonForCredit: reasonForCredit || '',
              
              // Enhanced payment data extraction from CSV (initial status without settlement data)
              paymentStatus: this.mapPaymentStatus(reasonForCredit),
              paymentDate: this.isPaymentCompleted(reasonForCredit) ? this.parseDate(orderDate) : undefined
            };

            orders.push(order);

            // Collect product metadata (GST%, Cost Price) if available
            if (sku && productName) {
              const metadata: { sku: string; gstPercent?: number; costPrice?: number; productName: string; } = {
                sku,
                productName,
                gstPercent: 5 // Default to 5% GST based on real payment file analysis
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
