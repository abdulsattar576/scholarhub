import { EligibilityEngineService } from './src/eligibility/eligibility-engine.service';
import { ScholarshipService } from './src/scholarship/scholarship.service';

async function testEligibilityScenarios() {
  console.log('===============================================================');
  console.log('        TESTING ELIGIBILITY MATCHING ENGINE (TRI-STATE)        ');
  console.log('===============================================================\n');

  const scholarshipService = new ScholarshipService();
  const engine = new EligibilityEngineService();

  // Find our stored TUM scholarship
  const searchResult = await scholarshipService.searchScholarships({});
  if (searchResult.items.length === 0) {
    console.error('[!] No scholarships found in database.');
    return;
  }

  const scholarship = searchResult.items[0];
  console.log(`[*] Target Scholarship: "${scholarship.title}" (ID: ${scholarship.id})\n`);

  // SCENARIO 1: Pakistani Graduate (Eligible Candidate)
  console.log('---------------------------------------------------------------');
  console.log('SCENARIO 1: Pakistani Bachelor Graduate (Target Persona)');
  console.log('Profile: Nationality: PK, Degree: BACHELORS, CGPA: 3.6/4.0, IELTS: 7.5');
  console.log('---------------------------------------------------------------');
  const result1 = await engine.evaluate(scholarship.id, undefined, {
    nationality: 'PK',
    degreeLevel: 'BACHELORS',
    cgpa: 3.6,
    gradingScale: 4.0,
    languageTests: [{ testType: 'IELTS', score: 7.5 }],
  });
  console.log(`[+] Overall Status: ${result1.overallStatus}`);
  console.log(`[+] Summary: ${result1.summaryExplanation}`);
  console.log('[+] Rule-by-rule Breakdown:');
  for (const r of result1.results) {
    console.log(`    - [${r.status}] (${r.ruleType}): ${r.reason}`);
    if (r.evidenceSource) {
      console.log(`      Quote: "${r.evidenceSource.substring(0, 70)}..."`);
    }
  }

  // SCENARIO 2: German National (Ineligible Candidate)
  console.log('\n---------------------------------------------------------------');
  console.log('SCENARIO 2: German National (Ineligible for International Grant)');
  console.log('Profile: Nationality: DE, Degree: BACHELORS, CGPA: 3.9/4.0');
  console.log('---------------------------------------------------------------');
  const result2 = await engine.evaluate(scholarship.id, undefined, {
    nationality: 'DE',
    degreeLevel: 'BACHELORS',
    cgpa: 3.9,
    gradingScale: 4.0,
  });
  console.log(`[+] Overall Status: ${result2.overallStatus}`);
  console.log(`[+] Summary: ${result2.summaryExplanation}`);
  console.log('[+] Rule-by-rule Breakdown:');
  for (const r of result2.results) {
    console.log(`    - [${r.status}] (${r.ruleType}): ${r.reason}`);
  }

  // SCENARIO 3: Incomplete Profile (Needs Review Candidate)
  console.log('\n---------------------------------------------------------------');
  console.log('SCENARIO 3: Incomplete Student Profile (Missing Nationality)');
  console.log('Profile: Nationality: null, Degree: BACHELORS, CGPA: 3.2/4.0');
  console.log('---------------------------------------------------------------');
  const result3 = await engine.evaluate(scholarship.id, undefined, {
    degreeLevel: 'BACHELORS',
    cgpa: 3.2,
    gradingScale: 4.0,
  });
  console.log(`[+] Overall Status: ${result3.overallStatus}`);
  console.log(`[+] Summary: ${result3.summaryExplanation}`);
  console.log('[+] Rule-by-rule Breakdown:');
  for (const r of result3.results) {
    console.log(`    - [${r.status}] (${r.ruleType}): ${r.reason}`);
  }

  console.log('\n===============================================================');
  console.log('             ELIGIBILITY ENGINE TESTS COMPLETED                ');
  console.log('===============================================================');
}

testEligibilityScenarios().catch(console.error);
