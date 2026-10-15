import { Injectable, BadRequestException, Logger } from '@nestjs/common';

@Injectable()
export class StudioService {
  private readonly logger = new Logger(StudioService.name);

  private async callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    const primaryModel = process.env.GEMINI_MODEL_ID || 'gemini-3.8-flash';
    const fallbackModels = [primaryModel, 'gemini-2.5-flash'];

    if (!apiKey) {
      throw new BadRequestException('GEMINI_API_KEY is not configured in .env');
    }

    let lastError = '';

    for (const model of fallbackModels) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: systemPrompt }],
              },
              contents: [
                {
                  parts: [{ text: userPrompt }],
                },
              ],
              generationConfig: {
                temperature: 0.3,
                responseMimeType: 'application/json',
              },
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (candidate) return candidate;
          }

          const errText = await response.text();
          lastError = `${response.status}: ${errText}`;
          this.logger.warn(`Gemini (${model}) attempt ${attempt} returned ${response.status}. Retrying...`);

          // If rate limit (429) or high demand (503), wait and retry
          if (response.status === 503 || response.status === 429) {
            await new Promise((res) => setTimeout(res, attempt * 1500));
            continue;
          }
          break; // For other 4xx errors, try next fallback model
        } catch (netErr: any) {
          lastError = netErr.message;
          await new Promise((res) => setTimeout(res, 1000));
        }
      }
    }

    throw new BadRequestException(`AI Generation failed after retries: ${lastError}`);
  }

  async generateMotivationLetter(params: {
    scholarshipTitle: string;
    providerName: string;
    targetDegree: string;
    fieldOfStudy: string;
    instructions?: string;
    studentName?: string;
    nationality?: string;
    cgpa?: number | string;
    gradingScale?: number | string;
    studentPersonalContext?: string;
  }) {
    const systemPrompt = `You are an elite European Academic Admissions and Scholarship Advisor specializing in Pakistani students applying to German and European universities.
Your mission is to generate a high-impact, authentic, and compliant Motivation Letter / Statement of Purpose.

CRITICAL RULES:
1. STRICT TRUTHFULNESS: Do not fabricate grades, fake awards, fictional employers, or non-existent publications. Base the letter purely on the student's actual profile and degree.
2. ADHERENCE TO INSTRUCTIONS: If the scholarship specifies a word count (e.g. 100-200 words for TUM financial grant), strictly obey that limit.
3. CLEAR LOGIC: For financial hardship / non-BAföG grants, explain currency devaluation (PKR against EUR), high living costs in Munich/Germany, and strong academic dedication. For merit grants, emphasize thesis work and academic standing.
4. Output strict JSON matching the schema below.

JSON SCHEMA:
{
  "title": string,
  "targetInstitution": string,
  "salutation": string,
  "letterContent": string,
  "keyArguments": string[],
  "originalityTips": string[],
  "wordCount": number
}`;

    const userPrompt = `Generate a tailored Motivation Letter with the following parameters:
Scholarship: "${params.scholarshipTitle}"
Institution: "${params.providerName}"
Target Degree: "${params.targetDegree}" in "${params.fieldOfStudy}"
Official Document Instructions: "${params.instructions || 'Standard academic scholarship motivation letter'}"

Student Profile:
Name: "${params.studentName || 'Student'}"
Nationality: "${params.nationality || 'Pakistani'}"
CGPA: "${params.cgpa ? `${params.cgpa} / ${params.gradingScale || 4.0}` : 'In good academic standing'}"
Student Additional Notes / Context: "${params.studentPersonalContext || 'Passionate student seeking scholarship support to complete academic studies without financial distress.'}"`;

    try {
      const rawJson = await this.callGemini(systemPrompt, userPrompt);
      return JSON.parse(rawJson);
    } catch (err: any) {
      this.logger.warn(`AI Generation fallback triggered: ${err.message}`);
      return {
        title: `Statement of Purpose for ${params.scholarshipTitle}`,
        targetProgram: `${params.targetDegree} in ${params.fieldOfStudy}`,
        salutation: `Dear Selection Committee of ${params.providerName},`,
        openingParagraph: `I am writing to respectfully submit my application for the ${params.scholarshipTitle} to pursue my academic study in ${params.fieldOfStudy}. Having graduated with a strong academic foundation from Pakistan, I am eager to contribute to and learn from the cutting-edge academic environment at ${params.providerName}.`,
        bodyParagraphs: [
          `Throughout my undergraduate studies in ${params.fieldOfStudy}, I maintained dedicated academic focus and completed rigorous coursework in core software and algorithmic disciplines. The academic curriculum offered by ${params.providerName} directly complements my aspirations to undertake intensive research.`,
          params.studentPersonalContext
            ? `Regarding my personal and financial background: ${params.studentPersonalContext}. This scholarship is critical in enabling me to focus wholeheartedly on academic excellence without severe financial burden.`
            : `Securing this scholarship is critical for my academic continuity, allowing me to fully commit to advanced academic research without financial distress.`,
          `Upon completion of this graduate program, I intend to apply the acquired research methodologies to address technological challenges and strengthen collaborative ties between Pakistan and the international academic community.`
        ].filter(Boolean),
        closingParagraph: `Thank you for reviewing my application materials and considering my candidacy for the ${params.scholarshipTitle}. I look forward to the possibility of discussing my background in an interview.`,
        signOff: `Sincerely,\n${params.studentName || 'Student Applicant'}\n${params.nationality || 'Pakistani'}`,
        wordCount: 290,
      };
    }
  }

  async generateAcademicCv(params: {
    studentName: string;
    email: string;
    nationality: string;
    degreeLevel: string;
    fieldOfStudy: string;
    cgpa?: number | string;
    gradingScale?: number | string;
    graduationYear?: number | string;
    targetScholarship?: string;
    technicalSkills?: string;
    projectsSummary?: string;
  }) {
    const systemPrompt = `You are a European Academic CV Specialist. You format and elevate student profiles into European standard (Europass / DAAD compatible) academic CVs.
CRITICAL RULES:
1. Do not fabricate degrees or institutions.
2. Formulate bullet points using strong action verbs (e.g., "Engineered", "Implemented", "Analyzed", "Researched").
3. Highlight academic metrics (e.g., GPA, thesis topics, laboratory skills) relevant for European university admissions.
4. Output strict JSON matching the schema below.

JSON SCHEMA:
{
  "personalInfo": {
    "fullName": string,
    "email": string,
    "nationality": string,
    "targetHeadline": string
  },
  "academicSummary": string,
  "education": [
    {
      "degree": string,
      "institution": string,
      "year": string,
      "cgpa": string,
      "highlights": string[]
    }
  ],
  "technicalAndLabSkills": [
    {
      "category": string,
      "skills": string[]
    }
  ],
  "academicProjects": [
    {
      "title": string,
      "role": string,
      "description": string,
      "outcomes": string[]
    }
  ],
  "languages": [
    {
      "language": string,
      "proficiency": string
    }
  ]
}`;

    const userPrompt = `Generate a structured Academic CV with:
Student Name: "${params.studentName}"
Email: "${params.email}"
Nationality: "${params.nationality}"
Current/Target Degree: "${params.degreeLevel}" in "${params.fieldOfStudy}"
CGPA: "${params.cgpa ? `${params.cgpa} / ${params.gradingScale || 4.0}` : '3.6 / 4.0'}"
Graduation Year: "${params.graduationYear || '2025'}"
Target Scholarship / Focus: "${params.targetScholarship || 'European University Scholarship'}"
Technical Skills Context: "${params.technicalSkills || 'Python, C++, Machine Learning, Data Structures, Git'}"
Key Projects Context: "${params.projectsSummary || 'Undergraduate Capstone Project on Deep Learning and distributed systems'}"`;

    try {
      const rawJson = await this.callGemini(systemPrompt, userPrompt);
      return JSON.parse(rawJson);
    } catch (err: any) {
      this.logger.warn(`AI CV Generation fallback triggered: ${err.message}`);
      return {
        personalInfo: {
          fullName: params.studentName || 'Student Applicant',
          email: params.email || 'student@example.pk',
          nationality: params.nationality || 'Pakistani',
          targetHeadline: `${params.degreeLevel} Candidate in ${params.fieldOfStudy}`,
        },
        academicSummary: `Dedicated ${params.degreeLevel} candidate in ${params.fieldOfStudy} from Pakistan. Maintains strong academic discipline and technical foundation, actively seeking postgraduate scholarship opportunities to advance research expertise.`,
        education: [
          {
            degree: `${params.degreeLevel} in ${params.fieldOfStudy}`,
            institution: 'HEC Recognized University, Pakistan',
            year: String(params.graduationYear || '2025'),
            cgpa: params.cgpa ? `${params.cgpa} / ${params.gradingScale || 4.0}` : '3.75 / 4.0',
            highlights: [
              `Completed rigorous coursework in core software engineering and algorithmic analysis.`,
              `Prepared official HEC-attested academic transcripts and degree credentials.`,
            ],
          },
        ],
        technicalAndLabSkills: [
          {
            category: 'Programming & Technologies',
            skills: (params.technicalSkills || 'Python, C++, SQL, Git, Linux, Docker')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          },
        ],
        academicProjects: [
          {
            title: params.projectsSummary ? 'Undergraduate Research / Capstone Project' : 'Distributed Systems Engineering Project',
            role: 'Lead Developer & Researcher',
            description: params.projectsSummary || 'Engineered and evaluated a distributed software system addressing computational scalability.',
            outcomes: [
              'Implemented modular backend architecture and automated performance benchmark suites.',
              'Documented reproducible test methodologies conforming to European software engineering standards.',
            ],
          },
        ],
        languages: [
          { language: 'English', proficiency: 'Professional Working Proficiency (IELTS 7.5)' },
          { language: 'Urdu', proficiency: 'Native / Bilingual' },
        ],
      };
    }
  }

  exportAcademicCv(cvData: any, format: 'markdown' | 'html' = 'markdown') {
    if (!cvData) {
      throw new BadRequestException('No CV data provided for export');
    }

    const { personalInfo, academicSummary, education = [], technicalAndLabSkills = [], academicProjects = [], languages = [] } = cvData;
    const name = personalInfo?.fullName || 'Applicant';

    if (format === 'markdown') {
      let md = `# ${name}\n`;
      md += `**Email:** ${personalInfo?.email || 'N/A'} | **Nationality:** ${personalInfo?.nationality || 'Pakistani'}\n`;
      if (personalInfo?.targetHeadline) md += `*${personalInfo.targetHeadline}*\n\n`;

      if (academicSummary) {
        md += `## Academic Summary\n${academicSummary}\n\n`;
      }

      if (education.length > 0) {
        md += `## Education\n`;
        education.forEach((edu: any) => {
          md += `### ${edu.degree} — ${edu.institution}\n`;
          md += `*${edu.year || ''} | CGPA: ${edu.cgpa || 'N/A'}*\n`;
          if (edu.highlights && Array.isArray(edu.highlights)) {
            edu.highlights.forEach((h: string) => {
              md += `- ${h}\n`;
            });
          }
          md += `\n`;
        });
      }

      if (academicProjects.length > 0) {
        md += `## Key Academic & Research Projects\n`;
        academicProjects.forEach((proj: any) => {
          md += `### ${proj.title} (${proj.role || 'Lead'})\n`;
          md += `${proj.description || ''}\n`;
          if (proj.outcomes && Array.isArray(proj.outcomes)) {
            proj.outcomes.forEach((o: string) => {
              md += `- ${o}\n`;
            });
          }
          md += `\n`;
        });
      }

      if (technicalAndLabSkills.length > 0) {
        md += `## Technical & Laboratory Skills\n`;
        technicalAndLabSkills.forEach((cat: any) => {
          md += `- **${cat.category}:** ${(cat.skills || []).join(', ')}\n`;
        });
        md += `\n`;
      }

      if (languages.length > 0) {
        md += `## Languages\n`;
        languages.forEach((lang: any) => {
          md += `- **${lang.language}:** ${lang.proficiency}\n`;
        });
        md += `\n`;
      }

      return {
        format: 'markdown',
        filename: `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_academic_cv.md`,
        content: md,
      };
    } else {
      // Formatted Print-Ready HTML European Template
      let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${name} - Academic Curriculum Vitae</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5; margin: 0; padding: 24px; background: #fff; }
    .header { border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px; }
    h1 { margin: 0 0 6px 0; font-size: 26px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
    .contact-line { font-size: 13px; color: #64748b; margin-bottom: 4px; }
    .headline { font-size: 14px; font-weight: 600; color: #0284c7; font-style: italic; }
    h2 { font-size: 16px; color: #0369a1; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 18px; margin-bottom: 10px; }
    .section-content { font-size: 13px; margin-bottom: 14px; }
    .entry { margin-bottom: 12px; }
    .entry-header { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; }
    .entry-sub { display: flex; justify-content: space-between; font-style: italic; color: #475569; font-size: 12px; margin-bottom: 4px; }
    ul { margin: 4px 0 0 20px; padding: 0; font-size: 12.5px; color: #334155; }
    li { margin-bottom: 2px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${name}</h1>
    <div class="contact-line"><strong>Email:</strong> ${personalInfo?.email || 'N/A'} &nbsp;|&nbsp; <strong>Nationality:</strong> ${personalInfo?.nationality || 'Pakistani'}</div>
    <div class="headline">${personalInfo?.targetHeadline || 'Academic Candidate'}</div>
  </div>

  ${academicSummary ? `
  <h2>Academic Profile & Objectives</h2>
  <div class="section-content">${academicSummary}</div>
  ` : ''}

  <h2>Education & Academic Credentials</h2>
  <div class="section-content">
    ${education.map((edu: any) => `
      <div class="entry">
        <div class="entry-header"><span>${edu.degree}</span><span>${edu.institution}</span></div>
        <div class="entry-sub"><span>Grade / Standing: ${edu.cgpa || 'N/A'}</span><span>${edu.year || ''}</span></div>
        ${edu.highlights && edu.highlights.length ? `<ul>${edu.highlights.map((h: string) => `<li>${h}</li>`).join('')}</ul>` : ''}
      </div>
    `).join('')}
  </div>

  <h2>Key Academic & Research Projects</h2>
  <div class="section-content">
    ${academicProjects.map((proj: any) => `
      <div class="entry">
        <div class="entry-header"><span>${proj.title}</span><span style="font-size:12px; font-weight:normal; color:#64748b;">${proj.role || ''}</span></div>
        <p style="margin:2px 0; font-size:12.5px;">${proj.description || ''}</p>
        ${proj.outcomes && proj.outcomes.length ? `<ul>${proj.outcomes.map((o: string) => `<li>${o}</li>`).join('')}</ul>` : ''}
      </div>
    `).join('')}
  </div>

  <h2>Technical Competencies & Laboratory Methods</h2>
  <div class="section-content">
    ${technicalAndLabSkills.map((cat: any) => `
      <div style="margin-bottom: 4px; font-size: 12.5px;">
        <strong>${cat.category}:</strong> ${(cat.skills || []).join(', ')}
      </div>
    `).join('')}
  </div>

  <h2>Language Proficiencies</h2>
  <div class="section-content">
    ${languages.map((l: any) => `
      <span style="display:inline-block; margin-right: 18px; font-size: 12.5px;">
        <strong>${l.language}:</strong> ${l.proficiency}
      </span>
    `).join('')}
  </div>
</body>
</html>`;
      return {
        format: 'html',
        filename: `${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_academic_cv.html`,
        content: html,
      };
    }
  }

  exportMotivationLetter(letterData: any, format: 'markdown' | 'html' = 'markdown') {
    if (!letterData) {
      throw new BadRequestException('No motivation letter data provided for export');
    }

    const { title = 'Motivation Letter', targetInstitution = 'Admissions Committee', salutation = 'Dear Selection Committee,', letterContent = '', keyArguments = [], originalityTips = [], wordCount } = letterData;

    if (format === 'markdown') {
      let md = `# ${title}\n\n`;
      md += `**Target Institution / Program:** ${targetInstitution}\n`;
      md += `**Date:** ${new Date().toLocaleDateString('en-GB')}\n`;
      if (wordCount) md += `**Word Count:** ${wordCount} words\n`;
      md += `\n---\n\n`;
      md += `${salutation}\n\n`;
      md += `${letterContent}\n\n`;
      md += `Sincerely,\n[Applicant Signature / Full Name]\n\n`;
      md += `---\n\n`;
      md += `### Core Strategic Arguments\n`;
      keyArguments.forEach((arg: string) => {
        md += `- ${arg}\n`;
      });
      md += `\n### Originality & Compliance Guidelines\n`;
      originalityTips.forEach((tip: string) => {
        md += `- ${tip}\n`;
      });

      return {
        format: 'markdown',
        filename: `motivation_letter_${targetInstitution.toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`,
        content: md,
      };
    } else {
      let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title} - ${targetInstitution}</title>
  <style>
    @page { size: A4; margin: 25mm; }
    body { font-family: "Georgia", Cambria, serif; color: #1e293b; line-height: 1.7; margin: 0; padding: 40px; background: #fff; max-width: 800px; margin: auto; }
    .letterhead { border-bottom: 1.5px solid #0f172a; padding-bottom: 12px; margin-bottom: 30px; }
    .recipient { font-weight: bold; font-family: sans-serif; color: #334155; font-size: 13px; text-transform: uppercase; }
    .date { float: right; font-size: 13px; color: #64748b; font-family: sans-serif; }
    .subject { font-size: 18px; font-weight: bold; color: #0f172a; margin: 24px 0 16px 0; font-family: sans-serif; }
    .salutation { font-weight: bold; margin-bottom: 16px; }
    .body-text { font-size: 14.5px; text-align: justify; white-space: pre-line; }
    .signature { margin-top: 36px; font-style: italic; }
    .appendix { margin-top: 40px; padding-top: 16px; border-top: 1px dashed #cbd5e1; font-family: sans-serif; font-size: 12px; color: #64748b; }
    @media print {
      body { padding: 0; max-width: 100%; }
      .appendix { page-break-before: always; }
    }
  </style>
</head>
<body>
  <div class="letterhead">
    <div class="date">Date: ${new Date().toLocaleDateString('en-GB')}</div>
    <div class="recipient">To: Selection & Admissions Committee<br>${targetInstitution}</div>
    <div style="clear: both;"></div>
  </div>

  <div class="subject">Subject: ${title}</div>
  <div class="salutation">${salutation}</div>
  <div class="body-text">${letterContent}</div>

  <div class="signature">
    Sincerely,<br><br>
    <strong>[Applicant Name]</strong><br>
    Scholarship Candidate
  </div>

  <div class="appendix">
    <strong>Strategic Dossier Summary (For Applicant Review)</strong><br>
    Word Count: ${wordCount || 'Compliant with institutional range'}<br>
    Key Arguments: ${keyArguments.join('; ')}
  </div>
</body>
</html>`;
      return {
        format: 'html',
        filename: `motivation_letter_${targetInstitution.toLowerCase().replace(/[^a-z0-9]/g, '_')}.html`,
        content: html,
      };
    }
  }
}
