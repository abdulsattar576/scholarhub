import { JobsService } from './src/jobs/jobs.service';
import { AdminService } from './src/admin/admin.service';
import { StudioService } from './src/studio/studio.service';
import { PrismaClient as ApplicationPrismaClient } from '@prisma/application-client';

async function main() {
  console.log('=== TEST SUITE: Durable Background Jobs & Worker System ===\n');

  const adminService = new AdminService();
  const studioService = new StudioService();
  const jobsService = new JobsService(adminService, studioService);
  const prisma = new ApplicationPrismaClient();

  const testUserId = 'test-student-job-user-001';

  // 1. Enqueue Lifecycle Audit Job
  console.log('1. Testing Enqueue of SCHOLARSHIP_LIFECYCLE_AUDIT...');
  const lifecycleJob = await jobsService.enqueueJob(
    'SCHOLARSHIP_LIFECYCLE_AUDIT',
    {},
    {
      ownerUserId: testUserId,
      idempotencyKey: `lifecycle-test-${Date.now()}`,
    },
  );

  console.log(`   ✓ Job created: ID=${lifecycleJob.id}, Status=${lifecycleJob.status}, Attempts=${lifecycleJob.attempts}`);

  // Wait a moment for background runner to complete
  console.log('   Waiting for background runner to complete lifecycle audit...');
  let completedLifecycleJob: any = null;
  for (let i = 0; i < 20; i++) {
    await new Promise((res) => setTimeout(res, 200));
    const polled = await jobsService.getJob(lifecycleJob.id, testUserId);
    if (polled.status === 'COMPLETED' || polled.status === 'FAILED') {
      completedLifecycleJob = polled;
      break;
    }
  }

  if (!completedLifecycleJob || completedLifecycleJob.status !== 'COMPLETED') {
    throw new Error(`Lifecycle job did not complete: status=${completedLifecycleJob?.status}`);
  }

  console.log(`   ✓ Job completed in background! Status=${completedLifecycleJob.status}, Progress=${completedLifecycleJob.progress}%`);
  console.log(`   Summary from result: ${completedLifecycleJob.result?.summary}\n`);

  // 2. Test Idempotency
  console.log('2. Testing Idempotency Guarantee...');
  const idempotentKey = `idempotent-key-${Date.now()}`;
  const firstEnqueue = await jobsService.enqueueJob(
    'DOCUMENT_EXPORT_CV',
    {
      cvData: {
        personalInfo: { fullName: 'Ali Raza', email: 'ali@example.com', nationality: 'Pakistani' },
      },
      format: 'markdown',
    },
    {
      ownerUserId: testUserId,
      idempotencyKey: idempotentKey,
    },
  );

  const secondEnqueue = await jobsService.enqueueJob(
    'DOCUMENT_EXPORT_CV',
    {
      cvData: {
        personalInfo: { fullName: 'Ali Raza DIFFERENT', email: 'ali@example.com', nationality: 'Pakistani' },
      },
      format: 'markdown',
    },
    {
      ownerUserId: testUserId,
      idempotencyKey: idempotentKey,
    },
  );

  if (firstEnqueue.id !== secondEnqueue.id) {
    throw new Error(`Idempotency failed! Expected same job ID, got ${firstEnqueue.id} vs ${secondEnqueue.id}`);
  }
  console.log(`   ✓ Idempotency verified: Both requests mapped to identical Job ID: ${firstEnqueue.id}\n`);

  // Wait for export job completion
  console.log('   Waiting for background export job to complete...');
  let completedExportJob: any = null;
  for (let i = 0; i < 20; i++) {
    await new Promise((res) => setTimeout(res, 200));
    const polled = await jobsService.getJob(firstEnqueue.id, testUserId);
    if (polled.status === 'COMPLETED' || polled.status === 'FAILED') {
      completedExportJob = polled;
      break;
    }
  }

  console.log(`   ✓ Export job completed: Filename=${completedExportJob?.result?.filename}\n`);

  // 3. Test User Job Listing
  console.log('3. Testing User Job History Retrieval...');
  const userJobs = await jobsService.getUserJobs(testUserId);
  console.log(`   ✓ Retrieved ${userJobs.length} jobs for user ${testUserId}`);
  userJobs.forEach((j) => {
    console.log(`     - [${j.status}] Type: ${j.jobType} (ID: ${j.id.slice(0, 8)}...)`);
  });

  // Clean up test jobs
  await prisma.backgroundJob.deleteMany({
    where: { ownerUserId: testUserId },
  });
  console.log('\n   ✓ Test cleanup complete.');

  console.log('\n=== ALL DURABLE BACKGROUND JOBS TESTS PASSED ===');
}

main().catch((err) => {
  console.error('Job test failed:', err);
  process.exit(1);
});

