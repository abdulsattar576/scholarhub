import { EligibilityEngineService } from './src/eligibility/eligibility-engine.service';
import { ScholarshipService } from './src/scholarship/scholarship.service';

async function testAllScholarships() {
  console.log('===============================================================');
  console.log('    TESTING ELIGIBILITY ENGINE AGAINST ALL INGESTED SOURCES    ');
  console.log('===============================================================\n');

  const scholarshipService = new ScholarshipService();
  const engine = new EligibilityEngineService();

  const searchResult = await scholarshipService.searchScholarships({});
  console.log(`Found ${searchResult.items.length} opportunities in database.\n`);

  const studentProfile = {
    nationality: 'PK',
    degreeLevel: 'BACHELORS',
    cgpa: 3.6,
    gradingScale: 4.0,
    languageTests: [{ testType: 'IELTS', score: 7.0 }],
  };

  console.log('Evaluating Student: Pakistani, B.Sc. graduate, CGPA 3.6/4.0, IELTS 7.0\n');

  for (const sch of searchResult.items) {
    console.log('---------------------------------------------------------------');
    console.log(`Evaluating: "${sch.title}"`);
    console.log(`Provider: ${sch.providerName} | Funding: ${sch.fundingType}`);
    console.log('---------------------------------------------------------------');

    const evalResult = await engine.evaluate(sch.id, undefined, studentProfile);
    console.log(`[+] Overall Status: ${evalResult.overallStatus}`);
    console.log(`[+] Summary: ${evalResult.summaryExplanation}`);
    console.log('[+] Rules Evaluated:');
    for (const r of evalResult.results) {
      console.log(`    - [${r.status}] ${r.ruleType}: ${r.reason}`);
      if (r.evidenceSource) {
        console.log(`      Quote: "${r.evidenceSource.substring(0, 80)}..."`);
      }
    }
    console.log('\n');
  }

  process.exit(0);
}

testAllScholarships().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
