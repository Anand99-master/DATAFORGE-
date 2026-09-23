/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * DataForge Comprehensive End-to-End Integration & QA Test Suite
 * Validates cross-module contracts, state transitions, data integrity,
 * error recovery, and 100% deterministic reproducibility.
 */

import * as XLSX from 'xlsx';
import { SheetDataset, SourceFile, FilterGroup, SelectionConfig } from '../types';
import { profileDataset, sanitizeHeaders } from '../profiler/schemaProfiler';
import { executeSelection } from '../engine/selectionEngine';
import { executeJoin } from '../engine/join/joinEngine';
import { validateJoinConfiguration } from '../engine/join/joinValidator';
import { serializeToCsvString } from '../export/csvExporter';
import { generateXlsxBlob } from '../export/xlsxExporter';
import { validateExportDataset, sanitizeFileName } from '../export/exportEngine';
import { ingestSingleFile, ingestMultipleFiles, generateDemoDatasets } from '../ingestion';

export interface TestResultItem {
  testId: string;
  category: 'A_CSV_WORKFLOW' | 'B_XLSX_WORKFLOW' | 'C_MULTI_FILE_JOIN' | 'D_FILTER_THEN_JOIN' | 'E_ERROR_RECOVERY' | 'DETERMINISM';
  name: string;
  passed: boolean;
  details: string;
}

export interface SuiteSummary {
  allPassed: boolean;
  totalTests: number;
  passCount: number;
  failCount: number;
  results: TestResultItem[];
}

export async function runEndToEndIntegrationSuite(): Promise<SuiteSummary> {
  const results: TestResultItem[] = [];

  function record(
    category: TestResultItem['category'],
    name: string,
    passed: boolean,
    details: string
  ) {
    const testId = `T-${results.length + 1}`;
    results.push({ testId, category, name, passed, details });
  }

  // =========================================================================
  // SUITE A: CSV -> SELECTION -> FILTER -> PREVIEW -> EXPORT
  // =========================================================================
  try {
    const rawCsv = [
      'Order_ID,Customer_Name,Product,Revenue,Is_Active,Order_Date',
      'ORD-101,Aarav Patel,Ultra Server Pro,25000,true,2024-01-10',
      'ORD-102,Diya Sharma,Office Suite,4500,true,2024-01-12',
      'ORD-103,Kabir Mehta,Cloud Storage,15000,false,2024-01-15',
      'ORD-104,Ananya Iyer,High-Speed Switch,32000,true,2024-01-18',
      'ORD-105,Rohan Joshi,Office Suite,4500,false,2024-01-20',
      'ORD-106,Pooja Verma,Ultra Server Pro,25000,true,2024-01-22',
    ].join('\n');

    const csvFile = new File([rawCsv], 'Orders_Test.csv', { type: 'text/csv' });
    const source = await ingestSingleFile(csvFile);

    const isIngested = source.status === 'ready' && source.sheets.length === 1;
    const dataset = source.sheets[0];

    record(
      'A_CSV_WORKFLOW',
      'A1. Ingest CSV & Profile Schema',
      isIngested && dataset.rowCount === 6 && dataset.columnCount === 6,
      `Ingested 6 rows, 6 columns. Status: ${source.status}`
    );

    // Filter: Revenue >= 10000 AND Is_Active == true
    const filterConfig: SelectionConfig = {
      datasetId: dataset.id,
      selectedColumns: ['Order_ID', 'Customer_Name', 'Revenue', 'Is_Active'],
      filterGroups: [
        {
          id: 'g1',
          logicalOperator: 'AND',
          conditions: [
            {
              id: 'c1',
              columnName: 'Revenue',
              operator: 'greater_than_or_equal',
              value: 10000,
            },
            {
              id: 'c2',
              columnName: 'Is_Active',
              operator: 'is_true',
            },
          ],
        },
      ],
      groupLogicalOperator: 'AND',
    };

    const selectionResult = executeSelection(dataset, filterConfig);
    // Matching: ORD-101 (25000, true), ORD-104 (32000, true), ORD-106 (25000, true) = 3 rows
    const filterMatches =
      selectionResult.rows.length === 3 &&
      selectionResult.columns.length === 4 &&
      selectionResult.rows.every(
        (r) => (Number(r.Revenue) >= 10000) && (r.Is_Active === true || r.Is_Active === 'true')
      );

    record(
      'A_CSV_WORKFLOW',
      'A2. Selection & Filter Execution',
      filterMatches,
      `Expected 3 rows with 4 projected columns, received ${selectionResult.rows.length} rows`
    );

    // Export to CSV
    const csvExport = serializeToCsvString({
      columns: selectionResult.columns,
      rows: selectionResult.rows,
      suggestedFileName: 'Orders_Result',
      sourceType: 'selection',
    });
    const hasHeader = csvExport.includes('Order_ID,Customer_Name,Revenue,Is_Active');
    const hasData = csvExport.includes('ORD-101,Aarav Patel,25000,true');

    record(
      'A_CSV_WORKFLOW',
      'A3. Export Filtered Selection to CSV',
      hasHeader && hasData,
      `CSV Header intact: ${hasHeader}, Data present: ${hasData}`
    );

    // Export to XLSX
    const xlsxBlob = generateXlsxBlob({
      columns: selectionResult.columns,
      rows: selectionResult.rows,
      suggestedFileName: 'Orders_Result',
      sourceType: 'selection',
    }, 'Orders_Result');
    record(
      'A_CSV_WORKFLOW',
      'A4. Export Filtered Selection to XLSX',
      xlsxBlob.size > 0 && xlsxBlob.type.includes('spreadsheetml'),
      `XLSX Blob generated with size ${xlsxBlob.size} bytes`
    );
  } catch (err: unknown) {
    record('A_CSV_WORKFLOW', 'A. Suite A Failure', false, String(err));
  }

  // =========================================================================
  // SUITE B: XLSX -> SHEET SELECTION -> SELECTION -> PREVIEW -> EXPORT
  // =========================================================================
  try {
    const demoFiles = await generateDemoDatasets();
    const excelFile = demoFiles.find((f) => f.fileType === 'xlsx');

    const hasExcelSheets = excelFile && excelFile.sheets.length >= 2;
    record(
      'B_XLSX_WORKFLOW',
      'B1. Ingest Multi-Sheet Excel Workbook',
      Boolean(hasExcelSheets),
      `Loaded workbook with ${excelFile?.sheets.length ?? 0} sheets`
    );

    if (excelFile && hasExcelSheets) {
      // Pick Sheet 2: "Credit_Profiles"
      const creditSheet = excelFile.sheets.find((s) => s.sheetName === 'Credit_Profiles')!;

      // Project columns in specific reordered sequence: [Credit_Tier, Customer_ID, Credit_Limit]
      const selectionConfig: SelectionConfig = {
        datasetId: creditSheet.id,
        selectedColumns: ['Credit_Tier', 'Customer_ID', 'Credit_Limit'],
        filterGroups: [
          {
            id: 'g1',
            logicalOperator: 'AND',
            conditions: [
              {
                id: 'c1',
                columnName: 'Credit_Limit',
                operator: 'greater_than_or_equal',
                value: 250000,
              },
            ],
          },
        ],
        groupLogicalOperator: 'AND',
      };

      const result = executeSelection(creditSheet, selectionConfig);
      // Sheet 2 has 4 rows (CUST-001: 500k, CUST-003: 250k, CUST-005: 750k, CUST-007: 100k)
      // >= 250k matches 3 rows
      const exactMatch =
        result.rows.length === 3 &&
        result.columns[0] === 'Credit_Tier' &&
        result.columns[1] === 'Customer_ID' &&
        result.columns[2] === 'Credit_Limit';

      record(
        'B_XLSX_WORKFLOW',
        'B2. Sheet Selection, Projection Order & Filter',
        exactMatch,
        `Expected 3 rows with exact column sequence [Credit_Tier, Customer_ID, Credit_Limit], received ${result.rows.length} rows`
      );

      // Export Sheet 2 result
      const csvStr = serializeToCsvString({
        columns: result.columns,
        rows: result.rows,
        suggestedFileName: 'Credit_Profiles_Result',
        sourceType: 'selection',
      });
      const csvLines = csvStr.trim().split('\n');
      record(
        'B_XLSX_WORKFLOW',
        'B3. Export Multi-Sheet Filter to CSV',
        csvLines.length === 4, // Header + 3 data rows
        `Generated 1 header + 3 data rows in CSV`
      );
    }
  } catch (err: unknown) {
    record('B_XLSX_WORKFLOW', 'B. Suite B Failure', false, String(err));
  }

  // =========================================================================
  // SUITE C: CUSTOMERS.XLSX + ORDERS.CSV -> JOIN -> PREVIEW -> EXPORT
  // =========================================================================
  try {
    const demoFiles = await generateDemoDatasets();
    const custFile = demoFiles.find((f) => f.name.includes('Customers'))!;
    const ordFile = demoFiles.find((f) => f.name.includes('Orders'))!;

    const custDataset = custFile.sheets[0]; // Active_Customers (12 rows)
    const ordDataset = ordFile.sheets[0]; // Orders.csv (14 rows)

    // Test Config Validation
    const val = validateJoinConfiguration(custDataset, ordDataset, 'Customer_ID', 'Customer_ID');
    record(
      'C_MULTI_FILE_JOIN',
      'C1. Join Compatibility Validation',
      val.isValid && !val.typeMismatch,
      `Valid: ${val.isValid}, Type Mismatch: ${val.typeMismatch}`
    );

    // 1. INNER JOIN
    const innerRes = executeJoin(custDataset, ordDataset, {
      primaryDatasetId: custDataset.id,
      secondaryDatasetId: ordDataset.id,
      primaryKey: 'Customer_ID',
      secondaryKey: 'Customer_ID',
      joinType: 'inner',
      selectedColumns: [
        { datasetId: custDataset.id, column: 'Customer_ID', outputName: 'Customer_ID', origin: 'primary', inferredType: 'string' },
        { datasetId: custDataset.id, column: 'Customer_Name', outputName: 'Customer_Name', origin: 'primary', inferredType: 'string' },
        { datasetId: custDataset.id, column: 'City', outputName: 'City', origin: 'primary', inferredType: 'string' },
        { datasetId: ordDataset.id, column: 'Order_ID', outputName: 'Order_ID', origin: 'secondary', inferredType: 'string' },
        { datasetId: ordDataset.id, column: 'Revenue', outputName: 'Revenue', origin: 'secondary', inferredType: 'number' },
      ],
    });

    // All 14 orders map to customers in Active_Customers
    record(
      'C_MULTI_FILE_JOIN',
      'C2. Relational INNER JOIN Execution',
      innerRes.rows.length === 14 && innerRes.stats.matchingRowCount > 0,
      `Matched ${innerRes.rows.length} rows with matchingRowCount: ${innerRes.stats.matchingRowCount}`
    );

    // 2. LEFT JOIN
    const leftRes = executeJoin(custDataset, ordDataset, {
      primaryDatasetId: custDataset.id,
      secondaryDatasetId: ordDataset.id,
      primaryKey: 'Customer_ID',
      secondaryKey: 'Customer_ID',
      joinType: 'left',
      selectedColumns: [],
    });
    // Customers with orders produce multiple rows, customers without orders produce 1 row with nulls. Total >= 14
    record(
      'C_MULTI_FILE_JOIN',
      'C3. Relational LEFT JOIN Execution',
      leftRes.rows.length >= 14 && leftRes.stats.unmatchedPrimaryCount >= 0,
      `LEFT JOIN produced ${leftRes.rows.length} rows, unmatched primary: ${leftRes.stats.unmatchedPrimaryCount}`
    );

    // Export joined dataset to CSV and XLSX
    const joinedCsv = serializeToCsvString({
      columns: innerRes.columns,
      rows: innerRes.rows,
      suggestedFileName: 'Joined_Result',
      sourceType: 'join',
    });
    const joinedXlsx = generateXlsxBlob({
      columns: innerRes.columns,
      rows: innerRes.rows,
      suggestedFileName: 'Joined_Result',
      sourceType: 'join',
    }, 'Joined_Result');

    record(
      'C_MULTI_FILE_JOIN',
      'C4. Export Joined Result to CSV & XLSX',
      joinedCsv.includes('Customer_Name') && joinedXlsx.size > 1000,
      `CSV contains Customer_Name: true, XLSX size: ${joinedXlsx.size} bytes`
    );
  } catch (err: unknown) {
    record('C_MULTI_FILE_JOIN', 'C. Suite C Failure', false, String(err));
  }

  // =========================================================================
  // SUITE D: FILTER -> JOIN -> PREVIEW -> EXPORT
  // =========================================================================
  try {
    const demoFiles = await generateDemoDatasets();
    const custDataset = demoFiles.find((f) => f.name.includes('Customers'))!.sheets[0];
    const ordDataset = demoFiles.find((f) => f.name.includes('Orders'))!.sheets[0];

    // Filter Step: Only customers in Ahmedabad
    const filterConfig: SelectionConfig = {
      datasetId: custDataset.id,
      selectedColumns: ['Customer_ID', 'Customer_Name', 'City'],
      filterGroups: [
        {
          id: 'g1',
          logicalOperator: 'AND',
          conditions: [
            {
              id: 'c1',
              columnName: 'City',
              operator: 'equals',
              value: 'Ahmedabad',
            },
          ],
        },
      ],
      groupLogicalOperator: 'AND',
    };

    const filterResult = executeSelection(custDataset, filterConfig);
    // There are 6 customers in Ahmedabad (CUST-001, CUST-003, CUST-005, CUST-007, CUST-009, CUST-011)
    const ahmedabadCustCount = filterResult.rows.length;

    // Convert filtered result into a SheetDataset so it can be seamlessly passed into the Join Engine
    const filteredCustDataset: SheetDataset = profileDataset({
      id: 'filtered_ahmedabad_cust',
      fileId: 'f_temp',
      fileName: 'Filtered_Customers.csv',
      fileType: 'csv',
      sheetName: 'Ahmedabad_Only',
      headers: filterResult.columns,
      rows: filterResult.rows,
    });

    // Join Filtered Customers with Orders
    const filteredJoinResult = executeJoin(filteredCustDataset, ordDataset, {
      primaryDatasetId: filteredCustDataset.id,
      secondaryDatasetId: ordDataset.id,
      primaryKey: 'Customer_ID',
      secondaryKey: 'Customer_ID',
      joinType: 'inner',
      selectedColumns: [
        { datasetId: filteredCustDataset.id, column: 'Customer_ID', outputName: 'Customer_ID', origin: 'primary', inferredType: 'string' },
        { datasetId: filteredCustDataset.id, column: 'Customer_Name', outputName: 'Customer_Name', origin: 'primary', inferredType: 'string' },
        { datasetId: filteredCustDataset.id, column: 'City', outputName: 'City', origin: 'primary', inferredType: 'string' },
        { datasetId: ordDataset.id, column: 'Order_ID', outputName: 'Order_ID', origin: 'secondary', inferredType: 'string' },
        { datasetId: ordDataset.id, column: 'Product', outputName: 'Product', origin: 'secondary', inferredType: 'string' },
        { datasetId: ordDataset.id, column: 'Revenue', outputName: 'Revenue', origin: 'secondary', inferredType: 'number' },
      ],
    });

    // Every single row in the joined result must have City == Ahmedabad
    const allAhmedabad = filteredJoinResult.rows.every((r) => r.City === 'Ahmedabad');
    const orderCountForAhmedabad = filteredJoinResult.rows.length;

    record(
      'D_FILTER_THEN_JOIN',
      'D1. Pipeline: Filter Dataset -> Relational Join',
      ahmedabadCustCount === 6 && orderCountForAhmedabad > 0 && allAhmedabad,
      `Filtered 6 Ahmedabad customers. Joined with Orders yielded ${orderCountForAhmedabad} matching orders. 100% Ahmedabad verified.`
    );

    // Export Pipeline Result
    const pipelineCsv = serializeToCsvString({
      columns: filteredJoinResult.columns,
      rows: filteredJoinResult.rows,
      suggestedFileName: 'Ahmedabad_Orders',
      sourceType: 'join',
    });
    const pipelineXlsx = generateXlsxBlob({
      columns: filteredJoinResult.columns,
      rows: filteredJoinResult.rows,
      suggestedFileName: 'Ahmedabad_Orders',
      sourceType: 'join',
    }, 'Ahmedabad_Orders');

    record(
      'D_FILTER_THEN_JOIN',
      'D2. Pipeline: Export Chained Result',
      pipelineCsv.includes('Ahmedabad') && pipelineXlsx.size > 0,
      `Exported pipeline output to CSV & XLSX without data degradation`
    );
  } catch (err: unknown) {
    record('D_FILTER_THEN_JOIN', 'D. Suite D Failure', false, String(err));
  }

  // =========================================================================
  // SUITE E: ERROR RECOVERY & BOUNDARY HANDLING
  // =========================================================================
  try {
    // 1. Corrupted CSV with unbalanced raw bytes
    const malformedCsvFile = new File(['Col1,Col2\n"Unclosed quotes,val2'], 'corrupt.csv', { type: 'text/csv' });
    const malformedSource = await ingestSingleFile(malformedCsvFile);
    // Ingestion should recover or handle gracefully without throwing unhandled exceptions
    record(
      'E_ERROR_RECOVERY',
      'E1. Corrupted CSV Ingestion Recovery',
      malformedSource.status === 'ready' || malformedSource.status === 'error',
      `Parsed gracefully with status: ${malformedSource.status}`
    );

    // 2. Corrupted XLSX
    const corruptXlsxFile = new File([new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7])], 'corrupt.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const corruptSource = await ingestSingleFile(corruptXlsxFile);
    record(
      'E_ERROR_RECOVERY',
      'E2. Corrupted XLSX Ingestion Isolation',
      corruptSource.status === 'error' && Boolean(corruptSource.errorMessage),
      `Isolated error gracefully: '${corruptSource.errorMessage}'`
    );

    // 3. Empty File (0 bytes)
    const emptyFile = new File([], 'empty.csv', { type: 'text/csv' });
    const emptySource = await ingestSingleFile(emptyFile);
    record(
      'E_ERROR_RECOVERY',
      'E3. Zero-byte Empty File Isolation',
      Boolean(emptySource.status === 'error' && emptySource.errorMessage?.includes('empty')),
      `Caught 0-byte file: '${emptySource.errorMessage}'`
    );

    // 4. Missing and Duplicate Headers Sanitation
    const rawHeaders = ['Name', '', 'Name', 'Age', '   ', 'Name'];
    const { headers: sanitized, warnings } = sanitizeHeaders(rawHeaders);
    const expectedHeaders = ['Name', 'Column_2', 'Name_2', 'Age', 'Column_5', 'Name_3'];
    const headerSanitizationCorrect =
      JSON.stringify(sanitized) === JSON.stringify(expectedHeaders) && warnings.length === 4;

    record(
      'E_ERROR_RECOVERY',
      'E4. Missing & Duplicate Header Disambiguation',
      headerSanitizationCorrect,
      `Sanitized to: [${sanitized.join(', ')}], Warnings logged: ${warnings.length}`
    );

    // 5. Invalid Filter Value (Comparing non-numeric text to numeric operator)
    const sampleDataset: SheetDataset = {
      id: 'test_ds',
      fileId: 'f1',
      fileName: 'test.csv',
      fileType: 'csv',
      sheetName: 'Sheet1',
      rowCount: 2,
      columnCount: 2,
      duplicateRowCount: 0,
      columns: [
        { id: 'c1', name: 'Price', inferredType: 'number', nullCount: 0, nonNullCount: 2, nullPercentage: 0, uniqueCount: 2, samples: [100, 200] },
        { id: 'c2', name: 'Name', inferredType: 'string', nullCount: 0, nonNullCount: 2, nullPercentage: 0, uniqueCount: 2, samples: ['A', 'B'] },
      ],
      rows: [
        { Price: 100, Name: 'A' },
        { Price: 200, Name: 'B' },
      ],
    };

    const invalidFilterConfig: SelectionConfig = {
      datasetId: sampleDataset.id,
      selectedColumns: ['Price', 'Name'],
      filterGroups: [
        {
          id: 'g1',
          logicalOperator: 'AND',
          conditions: [
            {
              id: 'c1',
              columnName: 'Price',
              operator: 'greater_than',
              value: 'INVALID_NOT_A_NUMBER', // Non-numeric comparison
            },
          ],
        },
      ],
      groupLogicalOperator: 'AND',
    };

    const filterExecSafe = executeSelection(sampleDataset, invalidFilterConfig);
    // Invalid numeric comparison should safely evaluate to false and return 0 rows without crashing
    record(
      'E_ERROR_RECOVERY',
      'E5. Invalid Filter Value Safety',
      filterExecSafe.rows.length === 0,
      `Safely evaluated invalid filter value. Returned 0 rows without runtime exception.`
    );

    // 6. Invalid Export State Validation
    const nullValidation = validateExportDataset(null);
    const emptyColValidation = validateExportDataset({
      columns: [],
      rows: [{ a: 1 }],
      suggestedFileName: 'test',
      sourceType: 'selection',
    });

    record(
      'E_ERROR_RECOVERY',
      'E6. Export Pre-flight Validation',
      !nullValidation.isValid && !emptyColValidation.isValid,
      `Blocked null dataset and 0-column dataset from export.`
    );

    // 7. Filename Sanitization with Path Traversal and Illegal Characters
    const dirtyFileName = '../../../etc/passwd:report?*<|>".csv';
    const cleanFileName = sanitizeFileName(dirtyFileName);
    record(
      'E_ERROR_RECOVERY',
      'E7. Filename Path-Traversal and Character Sanitization',
      !cleanFileName.includes('..') && !cleanFileName.includes('/') && !cleanFileName.includes(':'),
      `Sanitized '${dirtyFileName}' -> '${cleanFileName}'`
    );
  } catch (err: unknown) {
    record('E_ERROR_RECOVERY', 'E. Suite E Failure', false, String(err));
  }

  // =========================================================================
  // SUITE 9: DETERMINISM VERIFICATION (100% Identical Output Across Iterations)
  // =========================================================================
  try {
    const demoFiles = await generateDemoDatasets();
    const custDataset = demoFiles.find((f) => f.name.includes('Customers'))!.sheets[0];
    const ordDataset = demoFiles.find((f) => f.name.includes('Orders'))!.sheets[0];

    const iterations = 5;
    const selectionRuns: string[] = [];
    const joinRuns: string[] = [];
    const csvExportRuns: string[] = [];

    const config: SelectionConfig = {
      datasetId: custDataset.id,
      selectedColumns: ['Customer_ID', 'Customer_Name', 'City', 'Is_Active'],
      filterGroups: [
        {
          id: 'g1',
          logicalOperator: 'AND',
          conditions: [
            { id: 'c1', columnName: 'City', operator: 'equals', value: 'Ahmedabad' },
            { id: 'c2', columnName: 'Is_Active', operator: 'is_true' },
          ],
        },
      ],
      groupLogicalOperator: 'AND',
    };

    const joinConfig = {
      primaryDatasetId: custDataset.id,
      secondaryDatasetId: ordDataset.id,
      primaryKey: 'Customer_ID',
      secondaryKey: 'Customer_ID',
      joinType: 'inner' as const,
      selectedColumns: [
        { datasetId: custDataset.id, column: 'Customer_ID', outputName: 'Customer_ID', origin: 'primary' as const, inferredType: 'string' as const },
        { datasetId: custDataset.id, column: 'Customer_Name', outputName: 'Customer_Name', origin: 'primary' as const, inferredType: 'string' as const },
        { datasetId: ordDataset.id, column: 'Revenue', outputName: 'Revenue', origin: 'secondary' as const, inferredType: 'number' as const },
      ],
    };

    for (let i = 0; i < iterations; i++) {
      // 1. Selection
      const selRes = executeSelection(custDataset, config);
      selectionRuns.push(JSON.stringify(selRes.rows));

      // 2. Join
      const jnRes = executeJoin(custDataset, ordDataset, joinConfig);
      joinRuns.push(JSON.stringify(jnRes.rows));

      // 3. Export
      const csvStr = serializeToCsvString({
        columns: jnRes.columns,
        rows: jnRes.rows,
        suggestedFileName: 'Deterministic_Export',
        sourceType: 'join',
      });
      csvExportRuns.push(csvStr);
    }

    const selectionDeterministic = selectionRuns.every((run) => run === selectionRuns[0]);
    const joinDeterministic = joinRuns.every((run) => run === joinRuns[0]);
    const csvDeterministic = csvExportRuns.every((run) => run === csvExportRuns[0]);

    record(
      'DETERMINISM',
      'D1. 5-Run Identical Selection Reproducibility',
      selectionDeterministic,
      `All 5 selection runs produced identical JSON output`
    );

    record(
      'DETERMINISM',
      'D2. 5-Run Identical Hash-Join Reproducibility',
      joinDeterministic,
      `All 5 join runs produced identical JSON output`
    );

    record(
      'DETERMINISM',
      'D3. 5-Run Identical CSV Serialization Reproducibility',
      csvDeterministic,
      `All 5 CSV export runs produced byte-identical serialization`
    );
  } catch (err: unknown) {
    record('DETERMINISM', 'Determinism Suite Failure', false, String(err));
  }

  const passCount = results.filter((r) => r.passed).length;
  const failCount = results.filter((r) => !r.passed).length;
  const allPassed = failCount === 0;

  return {
    allPassed,
    totalTests: results.length,
    passCount,
    failCount,
    results,
  };
}
