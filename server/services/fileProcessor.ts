import csv from 'csv-parser';
import * as xlsx from 'xlsx';
import AdmZip from 'adm-zip';
import { Readable } from 'stream';
import { storage } from '../storage';
import { 
  type InsertOrder, type InsertPayment, 
  type InsertOrderDynamic, type InsertProductDynamic,
  type FileStructure, type ColumnMetadata 
} from '@shared/schema';
import { CSVProcessor } from './csvProcessor';
import { ZIPProcessor } from './zipProcessor';

export interface ProcessedFile {
  orders?: InsertOrder[];
  payments?: InsertPayment[];
  ordersDynamic?: InsertOrderDynamic[];
  productsDynamic?: InsertProductDynamic[];
  fileStructure?: FileStructure;
  errors: string[];
}

export interface DynamicFileResult {
  data: Record<string, any>[];
  fileStructure: FileStructure;
  errors: string[];
}

export class FileProcessor {
  // Helper method to sanitize numeric fields by removing currency symbols and commas
  static sanitizeNumericField(value: any): string {
    if (value == null || value === '') return '0';
    
    if (typeof value === 'number') {
      return value.toString();
    }
    
    if (typeof value === 'string') {
      // Remove currency symbols (₹, $, €, £) and commas, keep decimal point and numbers
      const cleaned = value.trim().replace(/[₹$€£,]/g, '');
      
      // Check if it's a valid number after cleaning
      if (cleaned && !isNaN(Number(cleaned))) {
        return cleaned;
      }
    }
    
    return '0';
  }

  // Helper method to normalize column keys for fuzzy matching
  static normalizeKey(key: string): string {
    return key.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  // Helper method to find column value using fuzzy matching
  static findColumnValue(row: Record<string, any>, synonyms: string[]): any {
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
  static calculateTotalGst(row: Record<string, any>): string | null {
    // First check for IGST (Interstate GST)
    const igst = this.findColumnValue(row, ['IGST Rate', 'IGST %', 'IGST Percent', 'Interstate GST']);
    if (igst) {
      const sanitized = this.sanitizeGstField(igst);
      console.log(`Found IGST: ${sanitized}%`);
      return sanitized;
    }

    // Then check for CGST + SGST (Intrastate GST)
    const cgst = this.findColumnValue(row, ['CGST Rate', 'CGST %', 'CGST Percent', 'Central GST']);
    const sgst = this.findColumnValue(row, ['SGST Rate', 'SGST %', 'SGST Percent', 'State GST']);
    
    if (cgst && sgst) {
      const cgstValue = parseFloat(this.sanitizeGstField(cgst, '0'));
      const sgstValue = parseFloat(this.sanitizeGstField(sgst, '0'));
      const totalGst = cgstValue + sgstValue;
      console.log(`Found CGST (${cgstValue}%) + SGST (${sgstValue}%) = ${totalGst}%`);
      return totalGst.toString();
    }

    // Fallback to general GST columns
    const generalGst = this.findColumnValue(row, [
      'Product GST %', 'Product GST', 'GST %', 'GST Percent',
      'GST_Percent', 'Tax Rate', 'GST Rate', 'Product_GST',
      'Item Tax Rate'
    ]);
    
    if (generalGst) {
      const sanitized = this.sanitizeGstField(generalGst);
      console.log(`Found general GST: ${sanitized}%`);
      return sanitized;
    }

    return null;
  }

  // Helper method to sanitize GST fields with proper validation and fallback
  static sanitizeGstField(value: any, defaultGst: string = '5'): string {
    if (value == null || value === '') return defaultGst;
    
    if (typeof value === 'number') {
      // Valid number, ensure it's reasonable for GST (0-100)
      const numValue = Number(value);
      if (numValue >= 0 && numValue <= 100) {
        return value.toString();
      }
      return defaultGst;
    }
    
    if (typeof value === 'string') {
      // Remove % symbol, whitespace, and common formatting
      const cleaned = value.trim().replace(/[%\s]/g, '');
      
      // Check if it's a valid number after cleaning
      if (cleaned && !isNaN(Number(cleaned))) {
        const numValue = Number(cleaned);
        // Ensure GST is within reasonable range (0-100)
        if (numValue >= 0 && numValue <= 100) {
          return cleaned;
        }
      }
    }
    
    // Invalid or out of range value, use default
    return defaultGst;
  }

  // Enhanced method to extract files from ZIP archive (XLSX, CSV, etc.)
  static async extractFilesFromZip(buffer: Buffer): Promise<{ files: Array<{ buffer: Buffer; filename: string; type: string }> } | null> {
    try {
      const zip = new AdmZip(buffer);
      const zipEntries = zip.getEntries();
      const files: Array<{ buffer: Buffer; filename: string; type: string }> = [];

      // Extract all relevant files (XLSX, CSV, etc.)
      zipEntries.forEach((entry: any) => {
        if (!entry.isDirectory) {
          const filename = entry.entryName.toLowerCase();
          let type = 'unknown';
          
          if (filename.endsWith('.xlsx')) {
            type = 'xlsx';
          } else if (filename.endsWith('.csv')) {
            type = 'csv';
          } else if (filename.endsWith('.xls')) {
            type = 'xls';
          }

          if (type !== 'unknown') {
            const buffer = entry.getData();
            files.push({
              buffer,
              filename: entry.entryName,
              type
            });
          }
        }
      });

      return { files };
    } catch (error) {
      console.error('Error extracting files from ZIP:', error);
      return null;
    }
  }

  // Legacy method for backward compatibility
  static async extractXLSXFromZip(buffer: Buffer): Promise<{ xlsxBuffer: Buffer; filename: string } | null> {
    const result = await FileProcessor.extractFilesFromZip(buffer);
    if (result && result.files.length > 0) {
      const xlsxFile = result.files.find(f => f.type === 'xlsx');
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
  static async processPaymentsZIP(buffer: Buffer): Promise<ProcessedFile & {
    productGstData?: Array<{ sku: string; gstPercent: number; productName: string; }>;
    orderStatusData?: Array<{ subOrderNo: string; orderStatus: string; }>;
  }> {
    const result = await ZIPProcessor.processPaymentZIP(buffer);
    return {
      payments: result.payments,
      errors: result.errors,
      productGstData: result.productGstData,
      orderStatusData: result.orderStatusData
    };
  }

  // Enhanced method that extracts dynamic structure and processes data
  static async processOrdersCSVDynamic(buffer: Buffer, uploadId: string): Promise<DynamicFileResult> {
    const data: Record<string, any>[] = [];
    const errors: string[] = [];
    let headers: string[] = [];

    return new Promise((resolve) => {
      const stream = Readable.from(buffer);
      let isFirstRow = true;
      
      stream
        .pipe(csv())
        .on('data', (row: any) => {
          try {
            // Capture headers from first row
            if (isFirstRow) {
              headers = Object.keys(row);
              isFirstRow = false;
            }

            // Store all row data as-is for dynamic processing
            const cleanedRow: Record<string, any> = {};
            for (const [key, value] of Object.entries(row)) {
              // Clean and type the data appropriately
              if (typeof value === 'string') {
                const trimmed = value.trim();
                // Try to parse numbers
                if (trimmed && !isNaN(Number(trimmed.replace(/[₹,]/g, '')))) {
                  cleanedRow[key] = trimmed.replace(/[₹,]/g, '');
                } else if (trimmed.toLowerCase() === 'true' || trimmed.toLowerCase() === 'false') {
                  cleanedRow[key] = trimmed.toLowerCase() === 'true';
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
        })
        .on('end', () => {
          // Generate file structure metadata
          const fileStructure = FileProcessor.analyzeFileStructure(headers, data, 'Sub Order No');
          resolve({ data, fileStructure, errors });
        })
        .on('error', (error: any) => {
          errors.push(`CSV parsing error: ${error}`);
          resolve({ data, fileStructure: { columns: [], primaryKey: '', totalRows: 0, sampleData: [] }, errors });
        });
    });
  }

  // Use the dedicated CSV processor for enhanced order processing
  static async processOrdersCSV(buffer: Buffer): Promise<ProcessedFile & {
    productMetadata?: Array<{ sku: string; gstPercent?: number; costPrice?: number; productName: string; }>;
  }> {
    const result = await CSVProcessor.processOrdersCSV(buffer);
    return {
      orders: result.orders,
      errors: result.errors,
      productMetadata: result.productMetadata
    };
  }

  static async processPaymentsXLSX(buffer: Buffer): Promise<ProcessedFile> {
    const payments: InsertPayment[] = [];
    const productGstUpdates: Map<string, string> = new Map();
    const errors: string[] = [];

    try {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      
      // Look for "Order Payments" sheet first, fallback to first sheet
      let targetSheet = 'Order Payments';
      if (!workbook.Sheets[targetSheet]) {
        targetSheet = workbook.SheetNames[0];
        console.log(`Order Payments sheet not found, using: ${targetSheet}`);
      } else {
        console.log('Processing Order Payments sheet');
      }
      
      const worksheet = workbook.Sheets[targetSheet];
      
      // For Meesho files, read as array of arrays to handle header row properly
      const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Find the header row (usually row 1 in Meesho files)
      let headerRowIndex = 0;
      let headers: string[] = [];
      
      for (let i = 0; i < Math.min(5, rawData.length); i++) {
        const row = rawData[i] as any[];
        if (row && row.length > 10 && row[0] === 'Sub Order No') {
          headerRowIndex = i;
          headers = row;
          break;
        }
      }
      
      if (headers.length === 0) {
        console.error('Could not find header row with Sub Order No');
        return { payments: [], errors: ['Invalid payment file format - header row not found'] };
      }
      
      console.log(`Found headers at row ${headerRowIndex}:`, headers.slice(0, 10));
      
      // Find column indices for key fields
      const subOrderIndex = headers.indexOf('Sub Order No');
      const supplierSkuIndex = headers.indexOf('Supplier SKU');
      const gstIndex = headers.indexOf('Product GST %');
      const settlementDateIndex = headers.indexOf('Payment Date');
      const settlementAmountIndex = headers.indexOf('Final Settlement Amount');
      const orderValueIndex = headers.indexOf('Total Sale Amount (Incl. Shipping & GST)');
      const commissionIndex = headers.indexOf('Meesho Commission (Incl. GST)');
      
      console.log(`Column indices: SubOrder=${subOrderIndex}, SKU=${supplierSkuIndex}, GST=${gstIndex}`);
      
      if (subOrderIndex === -1) {
        return { payments: [], errors: ['Sub Order No column not found'] };
      }

      // Process data rows (starting after header row)
      for (let i = headerRowIndex + 2; i < rawData.length; i++) {
        try {
          const row = rawData[i] as any[];
          if (!row || row.length < 5) continue;
          
          const subOrderNo = row[subOrderIndex];
          const supplierSku = row[supplierSkuIndex];
          const productGst = row[gstIndex];
          
          // Create payment record
          const payment: InsertPayment = {
            subOrderNo: subOrderNo ? String(subOrderNo).trim() : '',
            settlementDate: settlementDateIndex !== -1 && row[settlementDateIndex] ? new Date(row[settlementDateIndex]) : null,
            settlementAmount: FileProcessor.sanitizeNumericField(settlementAmountIndex !== -1 ? row[settlementAmountIndex] : '0'),
            orderValue: FileProcessor.sanitizeNumericField(orderValueIndex !== -1 ? row[orderValueIndex] : '0'),
            commissionFee: FileProcessor.sanitizeNumericField(commissionIndex !== -1 ? row[commissionIndex] : '0'),
            fixedFee: FileProcessor.sanitizeNumericField('0'),
            paymentGatewayFee: FileProcessor.sanitizeNumericField('0'),
            adsFee: FileProcessor.sanitizeNumericField('0'),
          };

          // Extract GST information for product updates
          if (supplierSku && productGst && !productGstUpdates.has(supplierSku)) {
            const sanitizedGst = FileProcessor.sanitizeGstField(productGst);
            productGstUpdates.set(supplierSku, sanitizedGst);
            console.log(`Found GST data: SKU ${supplierSku} -> ${sanitizedGst}%`);
          }

          // Validation - only add payments with sub order numbers
          if (!payment.subOrderNo) {
            continue;
          }

          payments.push(payment);
        } catch (error) {
          errors.push(`Error processing payment row ${i + 1}: ${error}`);
        }
      }

      console.log(`Found ${productGstUpdates.size} products with GST data to update`);

      // Add diagnostic error if no payments were processed
      if (payments.length === 0 && rawData.length > headerRowIndex + 2) {
        errors.push(`No payments processed - data extraction failed. Found headers: ${headers.join(', ')}. Processing ${rawData.length - headerRowIndex - 2} data rows.`);
        console.warn('Payment processing failed - no valid payment rows found');
      }

      // Update products with GST information from payment file
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
      console.error('XLSX parsing error:', error);
      errors.push(`XLSX parsing error: ${error}`);
    }

    return { payments, errors };
  }

  // Enhanced method to create dynamic products from order data
  static async extractProductsFromOrdersDynamic(
    orderData: Record<string, any>[], 
    uploadId: string, 
    defaultGstPercent: string = '5'
  ): Promise<InsertProductDynamic[]> {
    const uniqueProducts = new Map<string, InsertProductDynamic>();

    orderData.forEach(order => {
      const sku = order['SKU'] || order['sku'];
      const productName = order['Product Name'] || order['productName'] || order['product_name'];
      
      if (sku && !uniqueProducts.has(sku)) {
        // Extract all product-related information
        const productData: Record<string, any> = {
          sku: sku,
          productName: productName,
          costPrice: order['Cost Price'] || order['costPrice'] || '0',
          packagingCost: order['Packaging Cost'] || order['packagingCost'] || '15',
          gstPercent: order['GST Percent'] || order['GST %'] || order['Tax Rate'] || defaultGstPercent,
          // Include any other fields that might be product-related
          ...Object.fromEntries(
            Object.entries(order).filter(([key]) => 
              key.toLowerCase().includes('product') || 
              key.toLowerCase().includes('price') ||
              key.toLowerCase().includes('cost') ||
              key.toLowerCase().includes('gst') ||
              key.toLowerCase().includes('tax')
            )
          )
        };

        uniqueProducts.set(sku, {
          uploadId,
          dynamicData: productData,
          sku: sku,
        });
      }
    });

    return Array.from(uniqueProducts.values());
  }

  // Enhanced method to process any CSV file dynamically
  static async processGenericCSV(buffer: Buffer, uploadId: string, primaryKeyField?: string): Promise<DynamicFileResult> {
    const data: Record<string, any>[] = [];
    const errors: string[] = [];
    let headers: string[] = [];

    return new Promise((resolve) => {
      const stream = Readable.from(buffer);
      let isFirstRow = true;
      
      stream
        .pipe(csv())
        .on('data', (row: any) => {
          try {
            if (isFirstRow) {
              headers = Object.keys(row);
              isFirstRow = false;
            }

            // Clean and process all data
            const cleanedRow: Record<string, any> = {};
            for (const [key, value] of Object.entries(row)) {
              cleanedRow[key] = FileProcessor.cleanAndTypeValue(value);
            }

            data.push(cleanedRow);
          } catch (error) {
            errors.push(`Error processing row: ${error}`);
          }
        })
        .on('end', () => {
          const detectedPrimaryKey = primaryKeyField || FileProcessor.detectPrimaryKey(headers);
          const fileStructure = FileProcessor.analyzeFileStructure(headers, data, detectedPrimaryKey);
          resolve({ data, fileStructure, errors });
        })
        .on('error', (error: any) => {
          errors.push(`CSV parsing error: ${error}`);
          resolve({ data, fileStructure: { columns: [], primaryKey: '', totalRows: 0, sampleData: [] }, errors });
        });
    });
  }

  // Utility methods for file analysis
  static analyzeFileStructure(headers: string[], data: Record<string, any>[], primaryKey: string): FileStructure {
    const columns: ColumnMetadata[] = headers.map(header => {
      const sampleValues = data.slice(0, 100).map(row => row[header]).filter(val => val != null);
      
      let type: 'text' | 'number' | 'date' | 'boolean' = 'text';
      
      // Determine column type based on sample data
      if (sampleValues.length > 0) {
        const numericCount = sampleValues.filter(val => !isNaN(Number(val))).length;
        const dateCount = sampleValues.filter(val => !isNaN(Date.parse(val))).length;
        const booleanCount = sampleValues.filter(val => 
          typeof val === 'boolean' || val === 'true' || val === 'false'
        ).length;

        if (booleanCount / sampleValues.length > 0.8) {
          type = 'boolean';
        } else if (numericCount / sampleValues.length > 0.8) {
          type = 'number';
        } else if (dateCount / sampleValues.length > 0.8 && header.toLowerCase().includes('date')) {
          type = 'date';
        }
      }

      return {
        name: header,
        type,
        required: sampleValues.length / data.length > 0.9, // Consider required if >90% have values
        description: FileProcessor.generateColumnDescription(header, type),
      };
    });

    return {
      columns,
      primaryKey,
      totalRows: data.length,
      sampleData: data.slice(0, 5), // First 5 rows as sample
    };
  }

  static detectPrimaryKey(headers: string[]): string {
    const primaryKeyPatterns = [
      /^id$/i,
      /sub.*order.*no/i,
      /order.*id/i,
      /sku$/i,
      /product.*id/i,
    ];

    for (const pattern of primaryKeyPatterns) {
      const match = headers.find(header => pattern.test(header));
      if (match) return match;
    }

    // Default to first column if no pattern matches
    return headers[0] || '';
  }

  static cleanAndTypeValue(value: any): any {
    if (typeof value !== 'string') return value;
    
    const trimmed = value.trim();
    
    // Empty string
    if (!trimmed) return '';
    
    // Boolean
    if (trimmed.toLowerCase() === 'true') return true;
    if (trimmed.toLowerCase() === 'false') return false;
    
    // Number (including currency)
    const numberMatch = trimmed.match(/^[₹$€£]?([0-9,]+\.?[0-9]*)$/);
    if (numberMatch) {
      const cleanNumber = numberMatch[1].replace(/,/g, '');
      const parsed = parseFloat(cleanNumber);
      if (!isNaN(parsed)) return parsed.toString();
    }
    
    return trimmed;
  }

  // Helper method to map order status to payment status
  static mapPaymentStatus(reasonForCredit: string): string {
    if (!reasonForCredit) return 'PENDING';
    
    const status = reasonForCredit.toUpperCase();
    switch (status) {
      case 'DELIVERED':
        return 'PAID';
      case 'RTO_COMPLETE':
      case 'RTO COMPLETE':
        return 'REFUNDED';
      case 'CANCELLED':
      case 'CANCELED':
        return 'CANCELLED';
      case 'RTO_LOCKED':
      case 'RTO LOCKED':
        return 'PROCESSING';
      case 'SHIPPED':
      case 'OUT_FOR_DELIVERY':
      case 'OUT FOR DELIVERY':
        return 'PROCESSING';
      case 'LOST':
        return 'LOST';
      default:
        return 'PENDING';
    }
  }

  // Helper method to check if payment is completed
  static isPaymentCompleted(reasonForCredit: string): boolean {
    if (!reasonForCredit) return false;
    
    const status = reasonForCredit.toUpperCase();
    return ['DELIVERED', 'RTO_COMPLETE', 'RTO COMPLETE'].includes(status);
  }

  static generateColumnDescription(columnName: string, type: string): string {
    const name = columnName.toLowerCase();
    
    if (name.includes('price') || name.includes('cost') || name.includes('amount')) {
      return `${type === 'number' ? 'Numeric' : 'Text'} field for ${columnName}`;
    }
    if (name.includes('date') || name.includes('time')) {
      return `Date/time field for ${columnName}`;
    }
    if (name.includes('id') || name.includes('no')) {
      return `Identifier field for ${columnName}`;
    }
    if (name.includes('name') || name.includes('title')) {
      return `Text field for ${columnName}`;
    }
    
    return `${type.charAt(0).toUpperCase() + type.slice(1)} field for ${columnName}`;
  }

  // Legacy method for backward compatibility - now requires userId
  static async extractProductsFromOrders(orders: InsertOrder[], defaultGstPercent: string = '18', userId?: string): Promise<void> {
    if (!userId) {
      console.warn('extractProductsFromOrders called without userId - skipping product creation');
      return;
    }

    const uniqueProducts = new Map<string, any>();

    orders.forEach(order => {
      if (!uniqueProducts.has(order.sku)) {
        // Try to extract GST from product information or use default
        let gstPercent = defaultGstPercent;
        
        // Check if GST information is available in the order data
        if ((order as any).gstPercent) {
          gstPercent = (order as any).gstPercent;
        }
        
        const productInfo = {
          userId: userId, // Ensure userId is always present
          sku: order.sku,
          globalSku: `${userId}:${order.sku}`, // Generate unique global SKU
          title: order.productName,
          costPrice: '0',
          packagingCost: '15',
          gstPercent: gstPercent,
          totalOrders: 0,
          isProcessed: true
        };
        
        uniqueProducts.set(order.sku, productInfo);
      }
      uniqueProducts.get(order.sku)!.totalOrders += 1;
    });

    // Handle products with unique requirement and proper order count increments
    const productList = Array.from(uniqueProducts.values());
    const existingProducts = await storage.getAllProducts(userId);
    const existingSkusMap = new Map(existingProducts.map(p => [p.sku, p]));

    // Prepare products for upsert with proper totalOrders handling
    const productsToUpsert = productList.map(product => {
      const existing = existingSkusMap.get(product.sku);
      return {
        ...product,
        totalOrders: existing 
          ? (Number(existing.totalOrders) || 0) + product.totalOrders  // Increment existing count
          : product.totalOrders  // New product, use current count
      };
    });
    
    if (productsToUpsert.length > 0) {
      await storage.bulkUpsertProducts(productsToUpsert);
      console.log(`Upserted ${productsToUpsert.length} products with incremental order counts (unique product requirement)`);
    }
  }
}
