import { ApplicationsService } from './src/applications/applications.service';
import { ApplicationState } from '@prisma/application-client';

async function testApplications() {
  console.log('Testing Applications Service...');
  const appService = new ApplicationsService();

  const dummyUserId = '32fcc937-2161-42ab-8320-a159c61881fd'; // User created in auth test
  const dummyScholarshipId = '2f76f1ca-0cd7-4098-92e6-52e04c4935c0'; // TUM Scholarship

  // 1. Track Application
  console.log('\n1. Tracking new scholarship application...');
  const app = await appService.trackApplication(dummyUserId, {
    scholarshipId: dummyScholarshipId,
    scholarshipTitle: 'Scholarship for international students of TUM',
    providerName: 'Technical University of Munich (TUM)',
    cycleLabel: 'Winter Semester 2026/27',
    targetDeadline: '2026-10-15T00:00:00.000Z',
    initialDocuments: [
      {
        documentType: 'LETTER_OF_MOTIVATION',
        requirementLevel: 'MANDATORY',
        instructions: 'Financial status description in 100-200 words.',
      },
      {
        documentType: 'ACADEMIC_CV',
        requirementLevel: 'MANDATORY',
        instructions: 'Europass format academic CV.',
      },
      {
        documentType: 'TRANSCRIPT',
        requirementLevel: 'MANDATORY',
        instructions: 'Grade report with official grading scale.',
      },
    ],
  });

  console.log('Tracked Application ID:', app.id);
  console.log('Initial Status:', app.status);
  console.log('Documents created count:', app.documents?.length);

  // 2. Fetch User Applications
  console.log('\n2. Fetching user applications list with progress metrics...');
  const userApps = await appService.getUserApplications(dummyUserId);
  console.log('Found applications count:', userApps.length);
  console.log('Initial Progress:', userApps[0].progressPercent + '%');

  // 3. Update Status to PREPARING
  console.log('\n3. Updating application status to PREPARING...');
  const updatedApp = await appService.updateApplicationStatus(
    dummyUserId,
    app.id,
    ApplicationState.PREPARING,
    'Gathering transcripts from university registrar.',
  );
  console.log('Updated status:', updatedApp.status);

  // 4. Update Document Checklist items
  if (app.documents && app.documents.length > 0) {
    const firstDoc = app.documents[0];
    console.log(`\n4. Marking document [${firstDoc.documentType}] as prepared & translated...`);
    const updatedDoc = await appService.updateDocumentStatus(dummyUserId, app.id, firstDoc.id, {
      isPrepared: true,
      translationDone: true,
      notes: 'Drafted and verified with mentor.',
    });
    console.log('Document updated:', updatedDoc.documentType, 'Prepared:', updatedDoc.isPrepared);
  }

  // 5. Re-check progress %
  const appsAfter = await appService.getUserApplications(dummyUserId);
  console.log('\n5. New Application Progress:', appsAfter[0].progressPercent + '%');

  console.log('\nAll Application Tracker DB tests passed successfully!');
  process.exit(0);
}

testApplications().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
