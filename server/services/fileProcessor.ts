import csv from 'csv-parser';
import * as xlsx from 'xlsx';
import { Readable } from 'stream';
import { storage } from '../storage';
import { 
  type InsertOrder, type InsertPayment, 
  type InsertOrderDynamic, type InsertProductDynamic,
  type FileStructure, type ColumnMetadata 
} from '@shared/schema';

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

  // Legacy method for backward compatibility
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

            // Store additional product information if available in CSV
            if (row['GST Percent'] || row['GST %'] || row['Tax Rate']) {
              (order as any).gstPercent = row['GST Percent'] || row['GST %'] || row['Tax Rate'];
            }

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
        .on('error', (error: any) => {
          errors.push(`CSV parsing error: ${error}`);
          resolve({ orders, errors });
        });
    });
  }

  static async processPaymentsXLSX(buffer: Buffer): Promise<ProcessedFile> {
    const payments: InsertPayment[] = [];
    const productGstUpdates: Map<string, string> = new Map();
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

          // Extract GST information for product updates
          const sku = row['SKU'] || row['Product SKU'] || row['sku'];
          const productGst = row['Product GST %'] || row['Product GST'] || row['GST %'] || row['GST Percent'];
          
          if (sku && productGst && !productGstUpdates.has(sku)) {
            // Clean GST value - remove % symbol if present
            const cleanGst = typeof productGst === 'string' 
              ? productGst.replace('%', '').trim() 
              : productGst.toString();
            productGstUpdates.set(sku, cleanGst);
          }

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

      // Update products with GST information from payment file
      if (productGstUpdates.size > 0) {
        const updates = Array.from(productGstUpdates.entries());
        for (const [sku, gstPercent] of updates) {
          try {
            await storage.updateProduct(sku, { gstPercent });
          } catch (error) {
            errors.push(`Error updating GST for product ${sku}: ${error}`);
          }
        }
      }
    } catch (error) {
      errors.push(`XLSX parsing error: ${error}`);
    }

    return { payments, errors };
  }

  // Enhanced method to create dynamic products from order data
  static async extractProductsFromOrdersDynamic(
    orderData: Record<string, any>[], 
    uploadId: string, 
    defaultGstPercent: string = '18'
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

  // Legacy method for backward compatibility
  static async extractProductsFromOrders(orders: InsertOrder[], defaultGstPercent: string = '18'): Promise<void> {
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
          sku: order.sku,
          title: order.productName,
          costPrice: '0',
          packagingCost: '15',
          gstPercent: gstPercent,
          totalOrders: 0,
        };
        
        uniqueProducts.set(order.sku, productInfo);
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
