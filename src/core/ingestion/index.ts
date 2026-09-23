/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * DataForge Ingestion Coordinator
 * Orchestrates multi-file parsing, per-file error isolation, and sample dataset provision.
 */

import { SourceFile, SheetDataset } from '../types';
import { parseCsvFile } from './csvParser';
import { parseXlsxFile } from './xlsxParser';
import * as XLSX from 'xlsx';

export interface IngestionFileResult {
  file: SourceFile;
  error?: string;
}

/**
 * Ingests a single File (CSV or XLSX) with full error isolation.
 * Guarantees that a corrupted or invalid file never throws or halts ingestion of other files.
 */
export async function ingestSingleFile(file: File): Promise<SourceFile> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Validate supported extensions
  if (extension !== 'csv' && extension !== 'xlsx') {
    return {
      id: fileId,
      name: file.name,
      sizeBytes: file.size,
      fileType: (extension === 'xlsx' ? 'xlsx' : 'csv'),
      lastModified: file.lastModified || Date.now(),
      status: 'error',
      errorMessage: `Unsupported file extension '.${extension}'. Only .csv and .xlsx files are supported.`,
      sheetNames: [],
      activeSheetName: '',
      sheets: [],
    };
  }

  try {
    if (extension === 'csv') {
      const dataset = await parseCsvFile(file, fileId);
      return {
        id: fileId,
        name: file.name,
        sizeBytes: file.size,
        fileType: 'csv',
        lastModified: file.lastModified || Date.now(),
        status: 'ready',
        sheetNames: [dataset.sheetName],
        activeSheetName: dataset.sheetName,
        sheets: [dataset],
      };
    } else {
      // Excel .xlsx
      const datasets = await parseXlsxFile(file, fileId);
      const sheetNames = datasets.map((d) => d.sheetName);
      const activeSheetName = sheetNames[0] ?? '';

      return {
        id: fileId,
        name: file.name,
        sizeBytes: file.size,
        fileType: 'xlsx',
        lastModified: file.lastModified || Date.now(),
        status: 'ready',
        sheetNames,
        activeSheetName,
        sheets: datasets,
      };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown parsing error occurred';
    return {
      id: fileId,
      name: file.name,
      sizeBytes: file.size,
      fileType: extension === 'xlsx' ? 'xlsx' : 'csv',
      lastModified: file.lastModified || Date.now(),
      status: 'error',
      errorMessage: message,
      sheetNames: [],
      activeSheetName: '',
      sheets: [],
    };
  }
}

/**
 * Ingests multiple files concurrently with individual error handling.
 */
export async function ingestMultipleFiles(files: File[]): Promise<SourceFile[]> {
  const promises = files.map((file) => ingestSingleFile(file));
  return Promise.all(promises);
}

/**
 * Generates sample demo files (Customers.xlsx with 2 sheets and Orders.csv)
 * directly in memory for immediate instant testing.
 */
export async function generateDemoDatasets(): Promise<SourceFile[]> {
  // 1. Generate Customers.xlsx with 2 sheets: "Active_Customers" and "VIP_Accounts"
  const wb = XLSX.utils.book_new();

  const customerRowsSheet1 = [
    { Customer_ID: 'CUST-001', Customer_Name: 'Aarav Patel', City: 'Ahmedabad', State: 'Gujarat', Joined_Date: '2023-01-15', Is_Active: true },
    { Customer_ID: 'CUST-002', Customer_Name: 'Diya Sharma', City: 'Mumbai', State: 'Maharashtra', Joined_Date: '2022-11-20', Is_Active: true },
    { Customer_ID: 'CUST-003', Customer_Name: 'Kabir Mehta', City: 'Ahmedabad', State: 'Gujarat', Joined_Date: '2023-04-10', Is_Active: true },
    { Customer_ID: 'CUST-004', Customer_Name: 'Ananya Iyer', City: 'Bengaluru', State: 'Karnataka', Joined_Date: '2021-08-05', Is_Active: false },
    { Customer_ID: 'CUST-005', Customer_Name: 'Rohan Joshi', City: 'Ahmedabad', State: 'Gujarat', Joined_Date: '2023-06-18', Is_Active: true },
    { Customer_ID: 'CUST-006', Customer_Name: 'Pooja Verma', City: 'Delhi', State: 'Delhi', Joined_Date: '2022-03-22', Is_Active: true },
    { Customer_ID: 'CUST-007', Customer_Name: 'Vikram Desai', City: 'Ahmedabad', State: 'Gujarat', Joined_Date: '2023-09-01', Is_Active: true },
    { Customer_ID: 'CUST-008', Customer_Name: 'Neha Nair', City: 'Kochi', State: 'Kerala', Joined_Date: '2022-12-14', Is_Active: true },
    { Customer_ID: 'CUST-009', Customer_Name: 'Sanjay Trivedi', City: 'Ahmedabad', State: 'Gujarat', Joined_Date: '2023-02-28', Is_Active: false },
    { Customer_ID: 'CUST-010', Customer_Name: 'Meera Rao', City: 'Hyderabad', State: 'Telangana', Joined_Date: '2021-10-12', Is_Active: true },
    { Customer_ID: 'CUST-011', Customer_Name: 'Amit Shah', City: 'Ahmedabad', State: 'Gujarat', Joined_Date: '2023-05-19', Is_Active: true },
    { Customer_ID: 'CUST-012', Customer_Name: 'Tanvi Kulkarni', City: 'Pune', State: 'Maharashtra', Joined_Date: '2022-07-09', Is_Active: true },
  ];

  const customerRowsSheet2 = [
    { Customer_ID: 'CUST-001', Credit_Tier: 'Tier 1 Platinum', Account_Manager: 'Rajesh K', Credit_Limit: 500000 },
    { Customer_ID: 'CUST-003', Credit_Tier: 'Tier 2 Gold', Account_Manager: 'Sneha M', Credit_Limit: 250000 },
    { Customer_ID: 'CUST-005', Credit_Tier: 'Tier 1 Platinum', Account_Manager: 'Rajesh K', Credit_Limit: 750000 },
    { Customer_ID: 'CUST-007', Credit_Tier: 'Tier 3 Silver', Account_Manager: 'Arun P', Credit_Limit: 100000 },
  ];

  const ws1 = XLSX.utils.json_to_sheet(customerRowsSheet1);
  const ws2 = XLSX.utils.json_to_sheet(customerRowsSheet2);
  XLSX.utils.book_append_sheet(wb, ws1, 'Active_Customers');
  XLSX.utils.book_append_sheet(wb, ws2, 'Credit_Profiles');

  const xlsxBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const xlsxFile = new File([xlsxBuffer], 'Customers.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  // 2. Generate Orders.csv
  const csvContent = [
    'Order_ID,Customer_ID,Product,Category,Revenue,Quantity,Order_Date,Payment_Status',
    'ORD-901,CUST-001,Enterprise Server Pro,Hardware,14500,2,2024-02-10,Paid',
    'ORD-902,CUST-002,Office Suite License,Software,4200,10,2024-02-12,Paid',
    'ORD-903,CUST-003,Data Analytics Platform,Cloud,18900,1,2024-02-14,Paid',
    'ORD-904,CUST-005,Industrial Router X9,Networking,11250,5,2024-02-15,Pending',
    'ORD-905,CUST-006,Wireless Keyboard Set,Peripherals,1850,25,2024-02-17,Paid',
    'ORD-906,CUST-007,Cloud Backup Storage,Cloud,12400,1,2024-02-18,Paid',
    'ORD-907,CUST-008,Ergonomic Chair Pro,Furniture,8500,4,2024-02-20,Paid',
    'ORD-908,CUST-001,Cybersecurity Audit,Services,22000,1,2024-02-21,Paid',
    'ORD-909,CUST-009,4K Ultra Monitor,Hardware,9500,3,2024-02-22,Refunded',
    'ORD-910,CUST-011,High-Speed Optical Cable,Networking,15400,12,2024-02-23,Paid',
    'ORD-911,CUST-003,Database Clustering License,Software,16800,2,2024-02-24,Paid',
    'ORD-912,CUST-012,Virtual Private Server,Cloud,3600,1,2024-02-25,Paid',
    'ORD-913,CUST-005,Enterprise Support Annual,Services,12800,1,2024-02-26,Paid',
    'ORD-914,CUST-007,Precision Sensor Array,Hardware,10500,4,2024-02-27,Paid',
  ].join('\n');

  const csvFile = new File([csvContent], 'Orders.csv', { type: 'text/csv' });

  return ingestMultipleFiles([xlsxFile, csvFile]);
}
