import { AdminService } from './src/admin/admin.service';
import { OpportunityStatus } from '@prisma/scholarship-client';

async function testAdmin() {
  console.log('Testing Admin Review Service...');
  const admin = new AdminService();

  // 1. Overview Metrics
  console.log('\n1. Fetching Platform Overview Metrics across DBs...');
  const overview = await admin.getOverview();
  console.log('Overview Metrics:', JSON.stringify(overview.metrics, null, 2));

  // 2. Fetch Scholarships
  console.log('\n2. Fetching All Scholarships for Admin...');
  const scholarships = await admin.getScholarshipsForAdmin();
  console.log(`Found ${scholarships.length} scholarships:`);
  for (const s of scholarships) {
    console.log(`- [${s.opportunityStatus}] "${s.title}" (Provider: ${s.provider?.name})`);
    if (s.cycles[0]?.eligibilityRules?.length > 0) {
      console.log(`  Rules: ${s.cycles[0].eligibilityRules.length}, Docs: ${s.cycles[0].documentRequirements.length}`);
    }
  }

  // 3. Test Scholarship Status Update
  if (scholarships.length > 0) {
    const target = scholarships[0];
    console.log(`\n3. Toggling Status of "${target.title}" to PUBLISHED...`);
    const updated = await admin.updateScholarshipStatus(target.id, OpportunityStatus.PUBLISHED);
    console.log('Updated Status:', updated.opportunityStatus);

    // 4. Test Rule Review Status Update
    const rule = target.cycles[0]?.eligibilityRules[0];
    if (rule) {
      console.log(`\n4. Verifying Rule (${rule.ruleType}) with ID: ${rule.id}...`);
      const updatedRule = await admin.updateRuleReviewStatus(rule.id, 'VERIFIED');
      console.log('Rule Review Status updated to:', updatedRule.reviewStatus);
    }
  }

  console.log('\nAll Admin Review Service tests passed successfully!');
  process.exit(0);
}

testAdmin().catch((err) => {
  console.error('Admin test failed:', err);
  process.exit(1);
});

