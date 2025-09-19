import AdmZip from 'adm-zip';
import * as XLSX from 'xlsx';
import { InsertPayment } from '@shared/schema';

export interface ZIPProcessResult {
  payments: InsertPayment[];
  errors: string[];
  processedCount: number;
}

export interface ExtractedFile {
  buffer: Buffer;
  filename: string;
  type: 'xlsx' | 'csv' | 'xls' | 'unknown';
}

export class ZIPProcessor {
  static sanitizeNumericField(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return 0;
    
    const cleaned = value.replace(/[₹,\s]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  static parseDate(dateValue: any): Date {
    if (!dateValue) return new Date();
    
    if (dateValue instanceof Date) return dateValue;
    
    if (typeof dateValue === 'number') {
      // Excel date serial number
      const excelEpoch = new Date(1900, 0, 1);
      const days = dateValue - 2; // Excel date bug adjustment
      return new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
    }
    
    if (typeof dateValue === 'string') {
      const trimmed = dateValue.trim();
      
      // Try standard date parsing first
      let parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) return parsed;
      
      // Try DD/MM/YYYY format
      const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (ddmmyyyy) {
        return new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
      }
      
      // Try MM/DD/YYYY format
      const mmddyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (mmddyyyy) {
        return new Date(parseInt(mmddyyyy[3]), parseInt(mmddyyyy[1]) - 1, parseInt(mmddyyyy[2]));
      }
    }
    
    return new Date();
  }

  static async extractFilesFromZip(buffer: Buffer): Promise<ExtractedFile[]> {
    try {
      const zip = new AdmZip(buffer);
      const zipEntries = zip.getEntries();
      const files: ExtractedFile[] = [];

      zipEntries.forEach((entry: any) => {
        if (!entry.isDirectory) {
          const filename = entry.entryName.toLowerCase();
          let type: ExtractedFile['type'] = 'unknown';
          
          if (filename.endsWith('.xlsx')) {
            type = 'xlsx';
          } else if (filename.endsWith('.csv')) {
            type = 'csv';
          } else if (filename.endsWith('.xls')) {
            type = 'xls';
          }

          if (type !== 'unknown') {
            files.push({
              buffer: entry.getData(),
              filename: entry.entryName,
              type
            });
          }
        }
      });

      return files;
    } catch (error) {
      console.error('Error extracting files from ZIP:', error);
      return [];
    }
  }

  static async processPaymentXLSX(buffer: Buffer, filename: string): Promise<ZIPProcessResult & { 
    productGstData?: Array<{ sku: string; gstPercent: number; productName: string; }>;
    orderStatusData?: Array<{ subOrderNo: string; orderStatus: string; }>;
  }> {
    const payments: InsertPayment[] = [];
    const errors: string[] = [];
    let processedCount = 0;
    const productGstData: Array<{ sku: string; gstPercent: number; productName: string; }> = [];
    const orderStatusData: Array<{ subOrderNo: string; orderStatus: string; }> = [];

    try {
      const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
      
      // Look for "Order Payments" sheet first, fallback to first sheet (more robust)
      let targetSheet = 'Order Payments';
      if (!workbook.Sheets[targetSheet]) {
        targetSheet = workbook.SheetNames[0];
        console.log(`Order Payments sheet not found in ${filename}, using: ${targetSheet}`);
      } else {
        console.log(`Processing Order Payments sheet in ${filename}`);
      }
      
      const worksheet = workbook.Sheets[targetSheet];
      
      // For Meesho files, read as array of arrays to handle header row properly
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      if (rawData.length < 2) {
        errors.push(`${filename}: No data found in Excel file`);
        return { payments, errors, processedCount };
      }

      // Find the header row (search first 5 rows, more robust)
      let headerRowIndex = -1;
      let headers: string[] = [];
      
      for (let i = 0; i < Math.min(5, rawData.length); i++) {
        const row = rawData[i] as any[];
        if (row && row.length > 5 && 
            (row.some((cell: any) => cell && cell.toString().toLowerCase().includes('sub order')) ||
             row[0] === 'Sub Order No')) {
          headerRowIndex = i;
          headers = row.map(h => h ? h.toString() : '');
          break;
        }
      }
      
      if (headerRowIndex === -1 || headers.length === 0) {
        errors.push(`${filename}: Could not find header row with Sub Order No`);
        return { payments, errors, processedCount };
      }
      
      console.log(`Found headers at row ${headerRowIndex} in ${filename}:`, headers.slice(0, 10));

      // Enhanced column detection with multiple aliases
      const subOrderAliases = [
        'Sub Order No', 'SubOrderNo', 'sub_order_no', 'Sub Order ID',
        'Sub-Order-No', 'SUB_ORDER_NO', 'Order No', 'OrderNo'
      ];
      const subOrderIndex = headers.findIndex(h => 
        h && subOrderAliases.some(alias => 
          h === alias || h.toLowerCase().includes(alias.toLowerCase())
        )
      );
      
      // Enhanced settlement amount detection
      const settlementAliases = [
        'Final Settlement Amount', 'Settlement Amount', 'Net Settlement',
        'Final Settlement', 'Settlement', 'Net Amount', 'Payout Amount',
        'Final Amount', 'Amount Settled', 'Total Settlement'
      ];
      const settlementIndex = headers.findIndex(h => 
        h && settlementAliases.some(alias => 
          h === alias || h.toLowerCase().includes(alias.toLowerCase())
        )
      );
      
      // Enhanced date detection
      const dateAliases = [
        'Payment Date', 'Settlement Date', 'Payout Date', 'Transaction Date',
        'Date', 'Settled Date', 'Payment Settlement Date', 'Processing Date',
        'Order Date'
      ];
      const dateIndex = headers.findIndex(h => 
        h && dateAliases.some(alias => 
          h === alias || h.toLowerCase().includes(alias.toLowerCase())
        )
      );

      // GST percentage detection
      const gstAliases = [
        'Product GST %', 'GST %', 'GST Percent', 'GST', 'Tax %', 
        'Tax Percent', 'Product Tax %', 'Gst %'
      ];
      const gstIndex = headers.findIndex(h => 
        h && gstAliases.some(alias => 
          h === alias || h.toLowerCase().includes(alias.toLowerCase())
        )
      );

      // Product name detection (for GST mapping)
      const productNameAliases = [
        'Product Name', 'Item Name', 'Title', 'Product Title',
        'Product', 'Item', 'Name'
      ];
      const productNameIndex = headers.findIndex(h => 
        h && productNameAliases.some(alias => 
          h === alias || h.toLowerCase().includes(alias.toLowerCase())
        )
      );

      // SKU detection 
      const skuAliases = [
        'Supplier SKU', 'SKU', 'Product SKU', 'Item SKU', 
        'Product Code', 'Item Code', 'sku'
      ];
      const skuIndex = headers.findIndex(h => 
        h && skuAliases.some(alias => 
          h === alias || h.toLowerCase().includes(alias.toLowerCase())
        )
      );

      // Order status detection
      const orderStatusAliases = [
        'Live Order Status', 'Order Status', 'Status', 'Current Status',
        'Order State', 'Delivery Status', 'Live Status'
      ];
      const orderStatusIndex = headers.findIndex(h => 
        h && orderStatusAliases.some(alias => 
          h === alias || h.toLowerCase().includes(alias.toLowerCase())
        )
      );

      if (subOrderIndex === -1) {
        errors.push(`${filename}: Could not find Sub Order No column. Available headers: ${headers.slice(0, 10).join(', ')}`);
        return { payments, errors, processedCount };
      }

      // Log detected columns for debugging
      console.log(`Column detection for ${filename}:`);
      console.log(`- Sub Order No: "${headers[subOrderIndex]}" (index ${subOrderIndex})`);
      console.log(`- Settlement Amount: ${settlementIndex >= 0 ? `"${headers[settlementIndex]}" (index ${settlementIndex})` : 'NOT FOUND'}`);
      console.log(`- Date: ${dateIndex >= 0 ? `"${headers[dateIndex]}" (index ${dateIndex})` : 'NOT FOUND'}`);
      console.log(`- GST %: ${gstIndex >= 0 ? `"${headers[gstIndex]}" (index ${gstIndex})` : 'NOT FOUND'}`);
      console.log(`- Product Name: ${productNameIndex >= 0 ? `"${headers[productNameIndex]}" (index ${productNameIndex})` : 'NOT FOUND'}`);
      console.log(`- SKU: ${skuIndex >= 0 ? `"${headers[skuIndex]}" (index ${skuIndex})` : 'NOT FOUND'}`);
      console.log(`- Order Status: ${orderStatusIndex >= 0 ? `"${headers[orderStatusIndex]}" (index ${orderStatusIndex})` : 'NOT FOUND'}`);
      
      if (settlementIndex === -1) {
        console.warn(`${filename}: Settlement amount column not found. Payment amounts will be set to 0.`);
      }
      if (dateIndex === -1) {
        console.warn(`${filename}: Date column not found. Using current date as fallback.`);
      }

      // Process data rows (starting after header row)
      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        try {
          const row = rawData[i] as any[];
          if (!row || row.length === 0) continue;
          
          processedCount++;
          
          const subOrderNo = row[subOrderIndex]?.toString().trim();
          if (!subOrderNo) {
            continue; // Skip empty rows
          }

          const settlementAmount = settlementIndex !== -1 ? 
            this.sanitizeNumericField(row[settlementIndex]) : 0;
          
          const settlementDate = dateIndex !== -1 ? 
            this.parseDate(row[dateIndex]) : new Date();

          // Extract GST percentage and product data
          if (gstIndex !== -1 && skuIndex !== -1) {
            const gstValue = row[gstIndex];
            const skuValue = row[skuIndex]?.toString().trim();
            const productNameValue = productNameIndex !== -1 ? row[productNameIndex]?.toString().trim() : '';
            
            if (skuValue && gstValue !== undefined && gstValue !== null) {
              const gstPercent = this.sanitizeNumericField(gstValue);
              if (gstPercent > 0) {
                productGstData.push({
                  sku: skuValue,
                  gstPercent: gstPercent,
                  productName: productNameValue || ''
                });
              }
            }
          }

          // Extract order status data
          if (orderStatusIndex !== -1) {
            const orderStatusValue = row[orderStatusIndex]?.toString().trim();
            if (orderStatusValue) {
              orderStatusData.push({
                subOrderNo: subOrderNo,
                orderStatus: orderStatusValue
              });
            }
          }

          const payment: InsertPayment = {
            subOrderNo,
            settlementAmount: settlementAmount.toString(),
            settlementDate
          };

          payments.push(payment);

        } catch (error) {
          errors.push(`${filename} Row ${i + 1}: Processing error - ${error}`);
        }
      }

    } catch (error) {
      errors.push(`${filename}: XLSX processing error - ${error}`);
    }

    console.log(`${filename}: Processed ${payments.length} payments, ${productGstData.length} product GST records, ${orderStatusData.length} order status records, ${errors.length} errors`);
    return { payments, errors, processedCount, productGstData, orderStatusData };
  }

  static async processPaymentZIP(buffer: Buffer): Promise<ZIPProcessResult & { 
    productGstData?: Array<{ sku: string; gstPercent: number; productName: string; }>;
    orderStatusData?: Array<{ subOrderNo: string; orderStatus: string; }>;
  }> {
    const allPayments: InsertPayment[] = [];
    const allErrors: string[] = [];
    let totalProcessed = 0;
    const allProductGstData: Array<{ sku: string; gstPercent: number; productName: string; }> = [];
    const allOrderStatusData: Array<{ subOrderNo: string; orderStatus: string; }> = [];

    try {
      const files = await this.extractFilesFromZip(buffer);
      
      if (files.length === 0) {
        return { 
          payments: [], 
          errors: ['No supported files found in ZIP archive'], 
          processedCount: 0 
        };
      }

      console.log(`Found ${files.length} files in ZIP:`, files.map(f => f.filename));

      // Process all extracted files
      for (const file of files) {
        try {
          if (file.type === 'xlsx' || file.type === 'xls') {
            console.log(`Processing XLSX file: ${file.filename}`);
            const result = await this.processPaymentXLSX(file.buffer, file.filename);
            allPayments.push(...result.payments);
            allErrors.push(...result.errors);
            totalProcessed += result.processedCount;
            
            // Collect additional data
            if (result.productGstData) {
              allProductGstData.push(...result.productGstData);
            }
            if (result.orderStatusData) {
              allOrderStatusData.push(...result.orderStatusData);
            }
          } 
          else if (file.type === 'csv') {
            console.log(`Processing CSV file: ${file.filename}`);
            // Handle payment CSVs that might be in the ZIP
            allErrors.push(`${file.filename}: CSV payment processing not implemented - only XLSX supported`);
          }
        } catch (fileError) {
          allErrors.push(`Error processing file ${file.filename}: ${fileError}`);
        }
      }

    } catch (error) {
      allErrors.push(`ZIP processing error: ${error}`);
    }

    console.log(`ZIP processing complete: ${allPayments.length} payments processed, ${allErrors.length} errors`);
    console.log(`Additional data extracted: ${allProductGstData.length} product GST records, ${allOrderStatusData.length} order status records`);
    
    return { 
      payments: allPayments, 
      errors: allErrors, 
      processedCount: totalProcessed,
      productGstData: allProductGstData,
      orderStatusData: allOrderStatusData
    };
  }
}