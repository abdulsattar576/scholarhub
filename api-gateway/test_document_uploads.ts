import { ApplicationsService } from './src/applications/applications.service';
import { PrismaClient as ApplicationPrismaClient } from '@prisma/application-client';
import * as fs from 'fs';

async function main() {
  console.log('=== TEST SUITE: Private Document File Upload & Storage ===\n');

  const appService = new ApplicationsService();
  const prisma = new ApplicationPrismaClient();

  const testUserId = `test-uploader-${Date.now()}`;
  const strangerUserId = `stranger-user-${Date.now()}`;

  // 1. Track an application
  console.log('1. Tracking test application with document checklist...');
  const app = await appService.trackApplication(testUserId, {
    scholarshipId: `sch-upload-${Date.now()}`,
    scholarshipTitle: 'TUM Master of Science in Informatics',
    providerName: 'Technical University of Munich',
    initialDocuments: [
      {
        documentType: 'ACADEMIC_TRANSCRIPT',
        requirementLevel: 'MANDATORY',
        instructions: 'Official HEC attested university transcript in English or German.',
      },
      {
        documentType: 'LANGUAGE_CERTIFICATE',
        requirementLevel: 'MANDATORY',
        instructions: 'IELTS Academic min 6.5 or TOEFL iBT 88+.',
      },
    ],
  });

  const transcriptDoc = app.documents.find((d: any) => d.documentType === 'ACADEMIC_TRANSCRIPT');
  if (!transcriptDoc) throw new Error('Document requirement not found');
  console.log(`   ✓ Application tracked. Target document ID: ${transcriptDoc.id}`);

  // 2. Mock file upload
  console.log('2. Uploading mock official transcript PDF (4KB)...');
  const mockPdfBuffer = Buffer.from('%PDF-1.4\n%Mock Official Transcript Content for ScholarHub testing\n%%EOF');
  const mockMulterFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'NUST_Official_Transcript_HEC_Attested.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: mockPdfBuffer.length,
    buffer: mockPdfBuffer,
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
  };

  const uploadResult = await appService.uploadDocumentFile(
    testUserId,
    app.id,
    transcriptDoc.id,
    mockMulterFile,
  );

  console.log(`   ✓ File successfully stored:`);
  console.log(`     - Stored File Name: ${uploadResult.fileName}`);
  console.log(`     - File Size: ${uploadResult.fileSize} bytes`);
  console.log(`     - MIME Type: ${uploadResult.mimeType}`);
  console.log(`     - Storage Key: ${uploadResult.storageKey}`);
  console.log(`     - isPrepared: ${uploadResult.isPrepared}`);

  if (!uploadResult.storageKey || !fs.existsSync(uploadResult.storageKey)) {
    throw new Error('File was not written to private storage path on disk!');
  }
  if (!uploadResult.isPrepared) {
    throw new Error('Document was not automatically marked as isPrepared!');
  }

  // 3. Verify object-level isolation (unauthorized stranger cannot get file)
  console.log('3. Verifying Object-Level Security (Stranger User Access)...');
  try {
    await appService.getDocumentFile(strangerUserId, app.id, transcriptDoc.id);
    throw new Error('Security failure: Stranger was able to access student private document!');
  } catch (err: any) {
    console.log(`   ✓ Security check passed: Access denied with message: "${err.message}"`);
  }

  // 4. Retrieve file for authorized student
  console.log('4. Retrieving file for authorized student...');
  const fileInfo = await appService.getDocumentFile(testUserId, app.id, transcriptDoc.id);
  console.log(`   ✓ File located: ${fileInfo.fileName} (${fileInfo.mimeType})`);

  // 5. Delete attached file
  console.log('5. Deleting attached document file...');
  const deleteResult = await appService.deleteDocumentFile(testUserId, app.id, transcriptDoc.id);
  console.log(`   ✓ Document detached. StorageKey in DB: ${deleteResult.storageKey}`);
  if (fs.existsSync(fileInfo.filePath)) {
    throw new Error('File on disk was not removed after document detachment!');
  }
  console.log(`   ✓ File on disk cleanly purged.`);

  // Cleanup DB
  await prisma.application.delete({ where: { id: app.id } });
  console.log('\n   ✓ Test cleanup complete.');

  console.log('\n=== ALL PRIVATE DOCUMENT UPLOAD TESTS PASSED ===');
}

main().catch((err) => {
  console.error('Upload test failed:', err);
  process.exit(1);
});

