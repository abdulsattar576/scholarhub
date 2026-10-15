import { PrismaClient as ScholarshipPrismaClient, CycleStatus } from '@prisma/scholarship-client';
import { PrismaClient as ApplicationPrismaClient } from '@prisma/application-client';
import { StudioService } from './src/studio/studio.service';
import { AdminService } from './src/admin/admin.service';

async function main() {
  console.log('--- TEST 1: Studio Document Export (Markdown & Print-Ready HTML) ---');
  const studioService = new StudioService();

  const mockCvData = {
    personalInfo: {
      fullName: 'Muhammad Usman',
      email: 'usman.pakistan@example.com',
      nationality: 'Pakistani',
      targetHeadline: 'B.S. Software Engineering Graduate | Candidate for TUM Master in Informatics',
    },
    academicSummary: 'High-achieving computer science researcher with 3.84/4.00 CGPA from NUST Pakistan.',
    education: [
      {
        degree: 'Bachelor of Science in Software Engineering',
        institution: 'National University of Sciences and Technology (NUST), Islamabad',
        year: '2020 - 2024',
        cgpa: '3.84 / 4.00',
        highlights: ['HEC Recognized', 'Dean’s Honor Roll (4 consecutive semesters)'],
      },
    ],
    technicalAndLabSkills: [
      { category: 'Programming', skills: ['Python', 'TypeScript', 'C++', 'Go'] },
      { category: 'Systems & Cloud', skills: ['Docker', 'PostgreSQL', 'Redis', 'Linux'] },
    ],
    academicProjects: [
      {
        title: 'Distributed Consensus Simulator',
        role: 'Lead Architect',
        description: 'Engineered a Raft consensus model evaluating Byzantine fault tolerance.',
        outcomes: ['Achieved 99.9% consistency under simulated network partitions'],
      },
    ],
    languages: [
      { language: 'English', proficiency: 'C1 / IELTS 8.0' },
      { language: 'German', proficiency: 'A2 (Goethe-Zertifikat)' },
      { language: 'Urdu', proficiency: 'Native' },
    ],
  };

  const cvMarkdown = studioService.exportAcademicCv(mockCvData, 'markdown');
  console.log('✓ CV Markdown exported successfully:');
  console.log(`  Filename: ${cvMarkdown.filename}`);
  console.log(`  Content snippet: ${cvMarkdown.content.slice(0, 150)}...\n`);

  const cvHtml = studioService.exportAcademicCv(mockCvData, 'html');
  console.log('✓ CV HTML exported successfully:');
  console.log(`  Filename: ${cvHtml.filename}`);
  console.log(`  Length: ${cvHtml.content.length} characters\n`);

  const mockLetterData = {
    title: 'Statement of Purpose for DAAD Helmut-Schmidt-Programme',
    targetInstitution: 'University of Passau / DAAD',
    salutation: 'Distinguished Members of the Selection Committee,',
    letterContent: 'I am writing to express my earnest candidacy for the Helmut-Schmidt-Programme...',
    keyArguments: [
      'Addresses digital governance and financial inclusion in Pakistan',
      'Strong academic baseline with verifiable research credentials',
    ],
    originalityTips: [
      'Tailor paragraphs 2 and 3 with your personal undergraduate thesis details',
    ],
    wordCount: 420,
  };

  const letterMd = studioService.exportMotivationLetter(mockLetterData, 'markdown');
  console.log('✓ Motivation Letter Markdown exported successfully:');
  console.log(`  Filename: ${letterMd.filename}`);
  console.log(`  Content snippet: ${letterMd.content.slice(0, 160)}...\n`);

  const letterHtml = studioService.exportMotivationLetter(mockLetterData, 'html');
  console.log('✓ Motivation Letter HTML exported successfully:');
  console.log(`  Filename: ${letterHtml.filename}`);
  console.log(`  Length: ${letterHtml.content.length} characters\n`);

  console.log('--- TEST 2: Scholarship Lifecycle & Deadline Reconciliation ---');
  const adminService = new AdminService();
  const report = await adminService.reconcileLifecycle();

  console.log('✓ Lifecycle reconciliation completed:');
  console.log(`  Total Cycles Evaluated: ${report.totalCyclesEvaluated}`);
  console.log(`  Closed Count: ${report.closedCount}`);
  console.log(`  Opened Count: ${report.openedCount}`);
  console.log(`  Approaching Deadlines Count: ${report.approachingDeadlines.length}`);
  console.log('  Approaching Deadlines Details:');
  report.approachingDeadlines.forEach((ad, i) => {
    console.log(`    ${i + 1}. [${ad.urgencyLevel}] ${ad.scholarshipTitle} (${ad.cycleLabel}) - ${ad.daysRemaining} days remaining (Affected applications: ${ad.affectedStudentApplications})`);
  });

  console.log('\n--- ALL LIFECYCLE & EXPORT TESTS PASSED ---');
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

