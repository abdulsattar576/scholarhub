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

    const rawJson = await this.callGemini(systemPrompt, userPrompt);
    try {
      return JSON.parse(rawJson);
    } catch {
      throw new BadRequestException('Failed to parse structured JSON from AI output');
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

    const rawJson = await this.callGemini(systemPrompt, userPrompt);
    try {
      return JSON.parse(rawJson);
    } catch {
      throw new BadRequestException('Failed to parse structured JSON from AI output');
    }
  }
}
