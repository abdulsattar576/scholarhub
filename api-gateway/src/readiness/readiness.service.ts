import { Injectable } from '@nestjs/common';

export interface ReadinessGuide {
  id: string;
  title: string;
  badge: string;
  summary: string;
  steps: Array<{
    stepNumber: number;
    title: string;
    description: string;
    warning?: string;
  }>;
  feesPkr?: string;
  estimatedTime: string;
  officialPortalUrl: string;
  criticalTips: string[];
}

@Injectable()
export class ReadinessService {
  private readonly guides: Record<string, ReadinessGuide> = {
    hec: {
      id: 'hec',
      title: 'HEC Pakistan Degree & Transcript Attestation',
      badge: 'Mandatory for All European Applications',
      summary: 'Higher Education Commission (HEC) attestation certifies the authenticity of your Bachelor/Master degree and transcripts for international visa and university admissions.',
      feesPkr: 'Rs. 1,000 per original document, Rs. 700 per photocopy',
      estimatedTime: '10–15 business days (Courier) or Same Day (Urgent Walk-in)',
      officialPortalUrl: 'https://eservices.hec.gov.pk',
      steps: [
        {
          stepNumber: 1,
          title: 'Online Profile & Application on HEC E-Services Portal',
          description: 'Register at eservices.hec.gov.pk. Enter all qualifications chronologically starting from Matriculation up to your highest degree.',
        },
        {
          stepNumber: 2,
          title: 'Document Upload & Scrutiny',
          description: 'Upload clear color scans of your Original Degree, Final Transcript, and CNIC/Passport. Wait for online scrutiny approval (usually 2–4 days).',
          warning: 'Do not book an appointment or send documents via TCS until you receive the "Scrutiny Completed - Ready for Submission" email notification from HEC.',
        },
        {
          stepNumber: 3,
          title: 'Select Attestation Mode (Courier vs Walk-in)',
          description: 'Courier Mode: Hand over original documents + fee challan to designated TCS centres. Urgent Walk-in: Schedule an in-person appointment at HEC Islamabad, Lahore, Karachi, Peshawar, or Quetta centers.',
        },
        {
          stepNumber: 4,
          title: 'Sealed Envelope Request (If Required by University)',
          description: 'If your German/European university or scholarship requires direct official transcripts, tick the "Sealed Envelope" option on the portal. HEC will affix an official stamp across the envelope flap.',
        },
      ],
      criticalTips: [
        'Ensure the spelling of your name exactly matches your CNIC/Passport on both transcript and degree parchment.',
        'If your degree parchment has not yet been issued (provisional certificate only), check if your target German university accepts HEC-attested provisional certificates.',
        'Never laminate original documents; HEC applies a physical security ticket and embossing stamp to the back of the original parchment.',
      ],
    },
    ibcc: {
      id: 'ibcc',
      title: 'IBCC Equivalence & Certificate Attestation',
      badge: 'Required for Matric / F.Sc / O & A Levels',
      summary: 'Inter Board Coordination Commission (IBCC) verifies Secondary (10th) and Higher Secondary (12th) certificates and converts foreign qualifications (O/A Levels) into Pakistani grading equivalence.',
      feesPkr: 'Rs. 1,200 per certificate (Attestation); Rs. 3,000–6,000 (Equivalence Certificate)',
      estimatedTime: '5–10 business days',
      officialPortalUrl: 'https://www.ibcc.edu.pk',
      steps: [
        {
          stepNumber: 1,
          title: 'Prior Verification from Origin BISE Board',
          description: 'Before IBCC attestation, your Matric and Intermediate certificates must first be verified by your issuing Board of Intermediate and Secondary Education (e.g. BISE Lahore, Federal Board FBISE, BISE Karachi).',
          warning: 'IBCC will reject certificates that do not carry the BISE issuing board verification stamp/sealed envelope.',
        },
        {
          stepNumber: 2,
          title: 'IBCC Online Portal Application',
          description: 'Submit an online appointment application on the IBCC e-portal. Generate and pay the National Bank of Pakistan (NBP) fee challan.',
        },
        {
          stepNumber: 3,
          title: 'QR-Code Stamped Certificate Collection',
          description: 'Receive your document with the permanent IBCC digital QR verification stamp.',
        },
      ],
      criticalTips: [
        'German undergraduate programs (Bachelor) require IBCC equivalence demonstrating 12 years of continuous education.',
        'For O/A Level students, original Statement of Results and Cambridge Certificates are mandatory.',
      ],
    },
    germanTranslation: {
      id: 'germanTranslation',
      title: 'German Certified & Sworn Translations',
      badge: 'Strict German Visa & University Guideline',
      summary: 'German universities and state authorities strictly govern how non-English / non-German documents (such as Urdu birth certificates, marriage certificates, or financial bank proofs) must be translated.',
      estimatedTime: '2–5 business days',
      officialPortalUrl: 'https://pakistan.diplo.de',
      steps: [
        {
          stepNumber: 1,
          title: 'Check Language Acceptance of Program',
          description: 'Most English-taught Master programs at TUM, DAAD, and Erasmus accept English transcripts directly without German translation if your degree was taught in English.',
        },
        {
          stepNumber: 2,
          title: 'Urdu to German Sworn Translation (If Requested)',
          description: 'Documents in Urdu (e.g. FRC, Birth Certificate, Bank Tax returns) must be translated by a translator registered with the German Embassy Islamabad / Consulate General Karachi or a BDÜ sworn translator in Germany.',
          warning: 'Do NOT use unauthorized local typing shops or unauthorized notaries. The German Embassy and German university registrars explicitly blacklist uncertified translations.',
        },
        {
          stepNumber: 3,
          title: 'Embassy Attestation of Copies',
          description: 'When applying for German student visa (National Visa D), bring certified copies. German missions offer free copy certifications for applicants holding a valid German university admission letter.',
        },
      ],
      criticalTips: [
        'Ask your university for a "Certificate of Medium of Instruction in English" (MOI) from your Pakistani university registrar. This often waives unnecessary translation requests.',
        'Bank statements must be in English or accompanied by an authorized translation.',
      ],
    },
    anabin: {
      id: 'anabin',
      title: 'Anabin Database — University & Degree Equivalence',
      badge: 'Crucial for German Visa & University Eligibility',
      summary: 'The Central Office for Foreign Education (ZAB) maintains the Anabin database, classifying foreign universities to determine if your Pakistani degree is recognized in Germany.',
      estimatedTime: 'Instant Self-Check',
      officialPortalUrl: 'https://anabin.kmk.org',
      steps: [
        {
          stepNumber: 1,
          title: 'Search University Status on Anabin (Institutionen)',
          description: 'Go to anabin.kmk.org ➔ Institutionen ➔ Suchen. Select Pakistan and locate your university.',
        },
        {
          stepNumber: 2,
          title: 'Understand the Three Status Classifications',
          description: 'H+: Your institution is recognized as equivalent to a German higher education institution. H+/-: Certain degrees are recognized, but requires individual case check. H-: Not recognized as equivalent.',
          warning: 'If your university is H-, German universities cannot legally admit you directly to a Master program without prerequisite Studienkolleg or bachelor completion.',
        },
        {
          stepNumber: 3,
          title: 'Printout for German Student Visa',
          description: 'Print out the PDF summary of your university showing "H+" status and your specific degree classification ("Hochschulabschlüsse"). This printout is a mandatory requirement in the German Embassy student visa checklist.',
        },
      ],
      criticalTips: [
        'Top Pakistani universities like NUST, FAST-NUCES, LUMS, UET Lahore, COMSATS, GIKI, and Quaid-i-Azam University have full H+ status.',
        'If your university was recently chartered and is not yet listed, apply for a Statement of Comparability (ZAB Zeugnisbewertung).',
      ],
    },
  };

  getAllGuides(): ReadinessGuide[] {
    return Object.values(this.guides);
  }

  getGuide(id: string): ReadinessGuide | null {
    return this.guides[id] || null;
  }
}

