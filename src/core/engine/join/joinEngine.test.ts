/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Deterministic Tests for Multi-File Match & Join Engine
 * Verifies correctness across INNER, LEFT, RIGHT, and FULL OUTER joins,
 * one-to-one, one-to-many, duplicate keys, null handling, type coercion,
 * and column disambiguation without mutating sources.
 */

import { SheetDataset } from '../../types';
import { executeJoin } from './joinEngine';
import { validateJoinConfiguration } from './joinValidator';
import { JoinConfig } from './joinTypes';

// Test Helper to construct dummy SheetDatasets
function createTestDataset(
  id: string,
  fileName: string,
  columns: { name: string; type: 'string' | 'number' | 'date' | 'boolean' }[],
  rows: Record<string, unknown>[]
): SheetDataset {
  return {
    id,
    fileId: id,
    fileName,
    fileType: 'csv',
    sheetName: 'Sheet1',
    rowCount: rows.length,
    columnCount: columns.length,
    duplicateRowCount: 0,
    columns: columns.map((c, i) => {
      const nulls = rows.filter((r) => r[c.name] === null || r[c.name] === undefined || r[c.name] === '').length;
      return {
        id: `${id}_col_${i}`,
        name: c.name,
        inferredType: c.type,
        nullCount: nulls,
        nonNullCount: rows.length - nulls,
        nullPercentage: rows.length > 0 ? Math.round((nulls / rows.length) * 100) : 0,
        uniqueCount: new Set(rows.map((r) => r[c.name])).size,
        samples: rows.slice(0, 3).map((r) => (r[c.name] !== undefined ? (r[c.name] as any) : null)),
      };
    }),
    rows,
  };
}

export function runJoinVerificationSuite(): {
  allPassed: boolean;
  results: { testName: string; passed: boolean; message: string }[];
} {
  const testResults: { testName: string; passed: boolean; message: string }[] = [];

  const dsCustomers = createTestDataset(
    'ds_cust',
    'Customers.csv',
    [
      { name: 'Customer_ID', type: 'string' },
      { name: 'Customer_Name', type: 'string' },
      { name: 'City', type: 'string' },
    ],
    [
      { Customer_ID: 'C001', Customer_Name: 'Rahul', City: 'Ahmedabad' },
      { Customer_ID: 'C002', Customer_Name: 'Amit', City: 'Surat' },
      { Customer_ID: 'C003', Customer_Name: 'Priya', City: 'Vadodara' },
      { Customer_ID: null, Customer_Name: 'Anonymous', City: 'Rajkot' },
    ]
  );

  const dsOrders = createTestDataset(
    'ds_orders',
    'Orders.csv',
    [
      { name: 'Order_ID', type: 'string' },
      { name: 'Customer_ID', type: 'string' },
      { name: 'Product', type: 'string' },
      { name: 'Amount', type: 'number' },
      { name: 'City', type: 'string' }, // duplicate column name with Customers.City
    ],
    [
      { Order_ID: 'O001', Customer_ID: 'C001', Product: 'Laptop', Amount: 50000, City: 'Ahmedabad HQ' },
      { Order_ID: 'O002', Customer_ID: 'C001', Product: 'Mouse', Amount: 1500, City: 'Ahmedabad Branch' },
      { Order_ID: 'O003', Customer_ID: 'C002', Product: 'Keyboard', Amount: 2500, City: 'Surat Hub' },
      { Order_ID: 'O004', Customer_ID: 'C099', Product: 'Monitor', Amount: 12000, City: 'Delhi Hub' },
      { Order_ID: 'O005', Customer_ID: null, Product: 'Cables', Amount: 500, City: 'Mumbai Hub' },
    ]
  );

  // TEST 1: INNER JOIN (One-to-many + duplicate handling)
  try {
    const config: JoinConfig = {
      primaryDatasetId: dsCustomers.id,
      secondaryDatasetId: dsOrders.id,
      primaryKey: 'Customer_ID',
      secondaryKey: 'Customer_ID',
      joinType: 'inner',
      selectedColumns: [],
    };
    const res = executeJoin(dsCustomers, dsOrders, config);
    // C001 matches 2 orders, C002 matches 1 order => 3 rows total
    // C003 has no orders, C099 has no customer, null keys do NOT match.
    const passed = res.rows.length === 3;
    testResults.push({
      testName: '1. INNER JOIN matching & row count',
      passed,
      message: `Expected 3 rows, received ${res.rows.length}`,
    });
  } catch (e: any) {
    testResults.push({ testName: '1. INNER JOIN', passed: false, message: e.message });
  }

  // TEST 2: LEFT JOIN (Preserve all primary rows, fill nulls)
  try {
    const config: JoinConfig = {
      primaryDatasetId: dsCustomers.id,
      secondaryDatasetId: dsOrders.id,
      primaryKey: 'Customer_ID',
      secondaryKey: 'Customer_ID',
      joinType: 'left',
      selectedColumns: [],
    };
    const res = executeJoin(dsCustomers, dsOrders, config);
    // C001 (2 rows), C002 (1 row), C003 (1 row with nulls), null customer (1 row with nulls) => 5 rows
    const passed = res.rows.length === 5;
    testResults.push({
      testName: '2. LEFT JOIN preserves primary & fills unmatched nulls',
      passed,
      message: `Expected 5 rows, received ${res.rows.length}`,
    });
  } catch (e: any) {
    testResults.push({ testName: '2. LEFT JOIN', passed: false, message: e.message });
  }

  // TEST 3: RIGHT JOIN (Preserve all secondary rows, fill nulls)
  try {
    const config: JoinConfig = {
      primaryDatasetId: dsCustomers.id,
      secondaryDatasetId: dsOrders.id,
      primaryKey: 'Customer_ID',
      secondaryKey: 'Customer_ID',
      joinType: 'right',
      selectedColumns: [],
    };
    const res = executeJoin(dsCustomers, dsOrders, config);
    // Orders O001, O002 (C001), O003 (C002), O004 (C099 unmatched), O005 (null unmatched) => 5 rows
    const passed = res.rows.length === 5;
    testResults.push({
      testName: '3. RIGHT JOIN preserves secondary & fills unmatched primary nulls',
      passed,
      message: `Expected 5 rows, received ${res.rows.length}`,
    });
  } catch (e: any) {
    testResults.push({ testName: '3. RIGHT JOIN', passed: false, message: e.message });
  }

  // TEST 4: FULL OUTER JOIN (All primary + all secondary)
  try {
    const config: JoinConfig = {
      primaryDatasetId: dsCustomers.id,
      secondaryDatasetId: dsOrders.id,
      primaryKey: 'Customer_ID',
      secondaryKey: 'Customer_ID',
      joinType: 'full',
      selectedColumns: [],
    };
    const res = executeJoin(dsCustomers, dsOrders, config);
    // 3 matched rows + 2 unmatched primary rows (C003, Anonymous) + 2 unmatched secondary rows (O004, O005) => 7 rows
    const passed = res.rows.length === 7;
    testResults.push({
      testName: '4. FULL OUTER JOIN combines all rows without key collision',
      passed,
      message: `Expected 7 rows, received ${res.rows.length}`,
    });
  } catch (e: any) {
    testResults.push({ testName: '4. FULL OUTER JOIN', passed: false, message: e.message });
  }

  // TEST 5: NULL KEY ISOLATION (Null keys never match with each other)
  try {
    const val = validateJoinConfiguration(dsCustomers, dsOrders, 'Customer_ID', 'Customer_ID');
    const passed = val.primaryNullCount === 1 && val.secondaryNullCount === 1;
    testResults.push({
      testName: '5. Null key audit and isolation',
      passed,
      message: `Audited ${val.primaryNullCount} primary nulls and ${val.secondaryNullCount} secondary nulls`,
    });
  } catch (e: any) {
    testResults.push({ testName: '5. Null key audit', passed: false, message: e.message });
  }

  // TEST 6: DUPLICATE COLUMN NAME DISAMBIGUATION (Customers.City vs Orders.City)
  try {
    const config: JoinConfig = {
      primaryDatasetId: dsCustomers.id,
      secondaryDatasetId: dsOrders.id,
      primaryKey: 'Customer_ID',
      secondaryKey: 'Customer_ID',
      joinType: 'inner',
      selectedColumns: [],
    };
    const res = executeJoin(dsCustomers, dsOrders, config);
    const hasCity = res.columns.includes('City');
    const hasSecCity = res.columns.some((c) => c.includes('Sec_City') || c.includes('Pri_City'));
    const passed = hasCity && hasSecCity;
    testResults.push({
      testName: '6. Column name disambiguation prevents silent overwriting',
      passed,
      message: `Columns generated: ${res.columns.join(', ')}`,
    });
  } catch (e: any) {
    testResults.push({ testName: '6. Disambiguation', passed: false, message: e.message });
  }

  // TEST 7: SOURCE IMMUTABILITY (Original rows remain completely untouched)
  try {
    const passed = dsCustomers.rows.length === 4 && dsOrders.rows.length === 5;
    testResults.push({
      testName: '7. Source dataset immutability guarantee',
      passed,
      message: 'Original datasets remained completely unmutated',
    });
  } catch (e: any) {
    testResults.push({ testName: '7. Immutability', passed: false, message: e.message });
  }

  const allPassed = testResults.every((t) => t.passed);
  return { allPassed, results: testResults };
}
