/**
 * Test runner script
 */
import { runJoinVerificationSuite } from '../engine/join/joinEngine.test';
import { runExportVerificationSuite } from '../export/exportEngine.test';
import { runEndToEndIntegrationSuite } from './integrationSuite.test';

async function run() {
  console.log('====================================================');
  console.log('1. RUNNING JOIN VERIFICATION SUITE');
  console.log('====================================================');
  const joinSummary = runJoinVerificationSuite();
  console.log(`Join Tests: ${joinSummary.results.length} | Passed: ${joinSummary.allPassed ? 'ALL' : 'SOME FAILED'}`);
  joinSummary.results.forEach((r) => {
    console.log(`  ${r.passed ? '✓' : '✗'} ${r.testName}: ${r.message}`);
  });

  console.log('\n====================================================');
  console.log('2. RUNNING EXPORT VERIFICATION SUITE');
  console.log('====================================================');
  const exportSummary = runExportVerificationSuite();
  console.log(`Export Tests: ${exportSummary.results.length} | Passed: ${exportSummary.allPassed ? 'ALL' : 'SOME FAILED'}`);
  exportSummary.results.forEach((r) => {
    console.log(`  ${r.passed ? '✓' : '✗'} ${r.testName}: ${r.message}`);
  });

  console.log('\n====================================================');
  console.log('3. RUNNING END-TO-END INTEGRATION & QA SUITE');
  console.log('====================================================');
  const qaSummary = await runEndToEndIntegrationSuite();
  console.log(`QA Tests: ${qaSummary.totalTests} | Passed: ${qaSummary.passCount} | Failed: ${qaSummary.failCount}`);
  qaSummary.results.forEach((r) => {
    console.log(`  ${r.passed ? '✓' : '✗'} [${r.category}] ${r.name}: ${r.details}`);
  });

  if (!joinSummary.allPassed || !exportSummary.allPassed || !qaSummary.allPassed) {
    console.error('\n❌ INTEGRATION QA FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ ALL INTEGRATION & DETERMINISTIC QA TESTS PASSED');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
