import { StudioService } from './src/studio/studio.service';

async function testStudio() {
  console.log('Testing AI Studio Service...');
  const studio = new StudioService();

  // 1. Generate Motivation Letter for TUM
  console.log('\n1. Generating Motivation Letter for Technical University of Munich (TUM)...');
  const letterResult = await studio.generateMotivationLetter({
    scholarshipTitle: 'Scholarship for international students of TUM',
    providerName: 'Technical University of Munich (TUM)',
    targetDegree: 'MASTERS',
    fieldOfStudy: 'Computer Science',
    instructions: 'Explain financial status in 100–200 words in English or German.',
    studentName: 'Syed Ali',
    nationality: 'PK',
    cgpa: 3.75,
    gradingScale: 4.0,
    studentPersonalContext: 'Currency devaluation has severely increased living expenses in Munich. Currently maintaining top academic standing in Distributed Systems.',
  });

  console.log('\n--- GENERATED MOTIVATION LETTER ---');
  console.log('Title:', letterResult.title);
  console.log('Word Count:', letterResult.wordCount);
  console.log('Salutation:', letterResult.salutation);
  console.log('Letter Content:\n', letterResult.letterContent);
  console.log('Key Arguments:', letterResult.keyArguments);
  console.log('Originality Tips:', letterResult.originalityTips);

  // 2. Generate Academic CV
  console.log('\n2. Generating Structured European Academic CV...');
  const cvResult = await studio.generateAcademicCv({
    studentName: 'Syed Ali',
    email: 'syed.ali@example.pk',
    nationality: 'Pakistani',
    degreeLevel: 'BACHELORS',
    fieldOfStudy: 'Software Engineering',
    cgpa: 3.75,
    gradingScale: 4.0,
    graduationYear: 2025,
    targetScholarship: 'DAAD / TUM Master Scholarship',
    technicalSkills: 'TypeScript, Go, Python, PostgreSQL, Docker, PyTorch',
    projectsSummary: 'Developed an automated scholarship extraction pipeline using LLMs and deterministic rule engines.',
  });

  console.log('\n--- GENERATED ACADEMIC CV ---');
  console.log('Headline:', cvResult.personalInfo?.targetHeadline);
  console.log('Summary:', cvResult.academicSummary);
  console.log('Education Count:', cvResult.education?.length);
  console.log('Projects Count:', cvResult.academicProjects?.length);

  console.log('\nAll AI Application Studio tests passed successfully!');
  process.exit(0);
}

testStudio().catch((err) => {
  console.error('Studio test failed:', err);
  process.exit(1);
});

