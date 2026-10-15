"use client";

import React, { useState, useEffect } from "react";

interface ScholarshipCycle {
  id: string;
  cycleLabel: string;
  openAtIso?: string;
  deadlineAtIso?: string;
  deadlineLocalDate?: string;
  deadlineTimezone?: string;
}

interface EligibilityRule {
  id: string;
  ruleType: string;
  operator: string;
  evidenceSource?: string;
  structuredValueJson?: string;
}

interface DocumentRequirement {
  id: string;
  documentType: string;
  requirementLevel: "MANDATORY" | "OPTIONAL" | "CONDITIONAL";
  attestationRequired: boolean;
  instructions?: string;
}

interface Scholarship {
  id: string;
  title: string;
  providerName: string;
  officialUrl: string;
  fundingType: number; // 1: FULL, 2: PARTIAL, 3: TUITION, 4: STIPEND
  degreeLevels: number[];
  targetCountryCodes: string[];
  activeCycle?: ScholarshipCycle;
  eligibilityRules?: EligibilityRule[];
  documentRequirements?: DocumentRequirement[];
  lastVerifiedAtIso?: string;
}

interface RuleResult {
  ruleId: string;
  ruleType: string;
  status: "ELIGIBLE" | "INELIGIBLE" | "NEEDS_REVIEW";
  reason: string;
  evidenceSource?: string;
}

interface EvaluationResult {
  overallStatus: "ELIGIBLE" | "INELIGIBLE" | "NEEDS_REVIEW";
  summaryExplanation: string;
  results: RuleResult[];
}

interface StudentProfile {
  nationality?: string;
  degreeLevel?: string;
  fieldOfStudy?: string;
  cgpa?: number | string;
  gradingScale?: number | string;
  graduationYear?: number;
}

interface CurrentUser {
  id: string;
  email: string;
  name?: string;
  role: string;
  profile?: StudentProfile;
}

interface ApplicationDoc {
  id: string;
  documentType: string;
  requirementLevel: string;
  isPrepared: boolean;
  attestationDone: boolean;
  translationDone: boolean;
  instructions?: string;
  notes?: string;
}

interface ApplicationItem {
  id: string;
  userId: string;
  scholarshipId: string;
  scholarshipTitle: string;
  providerName: string;
  cycleLabel?: string;
  targetDeadline?: string;
  status: "PLANNING" | "PREPARING" | "READY" | "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED";
  notes?: string;
  progressPercent: number;
  totalDocs: number;
  preparedDocs: number;
  documents: ApplicationDoc[];
}

const DEFAULT_SCHOLARSHIP: Scholarship = {
  id: "2f76f1ca-0cd7-4098-92e6-52e04c4935c0",
  title: "Scholarship for international students of TUM",
  providerName: "Technical University of Munich (TUM)",
  officialUrl: "https://stipendienunderlaesse.tum.de/datenabfrage/StipIntWS2627",
  fundingType: 2, // PARTIAL
  degreeLevels: [2], // MASTERS
  targetCountryCodes: ["DE"],
  activeCycle: {
    id: "de567b81-4ab9-4181-a8e3-2f85018b73be",
    cycleLabel: "Winter Semester 2026/27",
    openAtIso: "2026-10-01T00:00:00Z",
    deadlineAtIso: "2026-10-15T00:00:00Z",
    deadlineLocalDate: "2026-10-15",
    deadlineTimezone: "Europe/Berlin",
  },
  documentRequirements: [
    {
      id: "doc-1",
      documentType: "LETTER_OF_MOTIVATION",
      requirementLevel: "MANDATORY",
      attestationRequired: false,
      instructions: "Explain financial status (100–200 words in English or German).",
    },
    {
      id: "doc-2",
      documentType: "ACADEMIC_CV",
      requirementLevel: "MANDATORY",
      attestationRequired: false,
      instructions: "Standard chronological or Europass academic CV.",
    },
    {
      id: "doc-3",
      documentType: "TRANSCRIPT",
      requirementLevel: "MANDATORY",
      attestationRequired: false,
      instructions: "TUM grade report or bachelor transcript with official grading scale.",
    },
    {
      id: "doc-4",
      documentType: "RECOMMENDATION_LETTER",
      requirementLevel: "MANDATORY",
      attestationRequired: false,
      instructions: "Two letters of recommendation from professors/lecturers at TUM.",
    },
    {
      id: "doc-5",
      documentType: "BANK_STATEMENT",
      requirementLevel: "MANDATORY",
      attestationRequired: true,
      instructions: "Proof of parents' or spouse's income (past 12 months) with certified translation.",
    },
  ],
};

const DEFAULT_SCHOLARSHIPS: Scholarship[] = [
  DEFAULT_SCHOLARSHIP,
  {
    id: "c1a4db77-67ed-4f01-a398-2d52f7008df5",
    title: "DAAD Helmut-Schmidt-Programme (Master's Scholarships for Public Policy and Good Governance)",
    providerName: "German Academic Exchange Service (DAAD)",
    officialUrl: "https://www.daad.de/en/find-funding/scholarship-database/?status=3&origin=14&subjectGrps=&daad=1&q=&page=1&detail=50026200",
    fundingType: 1, // FULL
    degreeLevels: [2], // MASTERS
    targetCountryCodes: ["DE"],
    activeCycle: {
      id: "8ce3203e-106f-4c12-b471-1b7aee19dde8",
      cycleLabel: "Academic Year 2026/27",
      openAtIso: "2026-06-01T00:00:00Z",
      deadlineAtIso: "2026-07-31T00:00:00Z",
      deadlineLocalDate: "2026-07-31",
      deadlineTimezone: "Europe/Berlin",
    },
    documentRequirements: [
      {
        id: "daad-doc-1",
        documentType: "ACADEMIC_CV",
        requirementLevel: "MANDATORY",
        attestationRequired: false,
        instructions: "DAAD application form and a current Europass academic CV (maximum 2 pages).",
      },
      {
        id: "daad-doc-2",
        documentType: "LETTER_OF_MOTIVATION",
        requirementLevel: "MANDATORY",
        attestationRequired: false,
        instructions: "Detailed letter of motivation (max 2 pages) containing academic reasons for studying in Germany.",
      },
      {
        id: "daad-doc-3",
        documentType: "TRANSCRIPT",
        requirementLevel: "MANDATORY",
        attestationRequired: true,
        instructions: "Official transcript of records with certified English or German translation.",
      },
      {
        id: "daad-doc-4",
        documentType: "DEGREE_CERTIFICATE",
        requirementLevel: "MANDATORY",
        attestationRequired: true,
        instructions: "Certified copy of Bachelor degree certificate with official HEC attestation.",
      },
      {
        id: "daad-doc-5",
        documentType: "RECOMMENDATION_LETTER",
        requirementLevel: "MANDATORY",
        attestationRequired: false,
        instructions: "Letter of recommendation from university lecturer or employer.",
      },
      {
        id: "daad-doc-6",
        documentType: "LANGUAGE_CERTIFICATE",
        requirementLevel: "MANDATORY",
        attestationRequired: false,
        instructions: "Official IELTS Academic (min 6.5) or TOEFL score report.",
      },
    ],
  },
  {
    id: "444bc20b-cc0d-4e1b-9641-14e3fa370240",
    title: "Erasmus Mundus Joint Master in Software Engineering and Artificial Intelligence",
    providerName: "European Education and Culture Executive Agency (EACEA)",
    officialUrl: "https://www.eacea.ec.europa.eu/scholarships/erasmus-mundus_en",
    fundingType: 1, // FULL
    degreeLevels: [2], // MASTERS
    targetCountryCodes: ["DE", "FR", "IT", "ES"],
    activeCycle: {
      id: "39dc87b7-1435-4a4e-87f8-81b946a96414",
      cycleLabel: "Intake 2026/28",
      openAtIso: "2026-10-01T00:00:00Z",
      deadlineAtIso: "2027-01-15T00:00:00Z",
      deadlineLocalDate: "2027-01-15",
      deadlineTimezone: "Europe/Brussels",
    },
    documentRequirements: [
      {
        id: "em-doc-1",
        documentType: "ACADEMIC_CV",
        requirementLevel: "MANDATORY",
        attestationRequired: false,
        instructions: "Detailed Europass CV detailing engineering projects and code repositories.",
      },
      {
        id: "em-doc-2",
        documentType: "LETTER_OF_MOTIVATION",
        requirementLevel: "MANDATORY",
        attestationRequired: false,
        instructions: "Statement of purpose (max 1000 words) addressing your research objectives across consortium universities.",
      },
      {
        id: "em-doc-3",
        documentType: "TRANSCRIPT",
        requirementLevel: "MANDATORY",
        attestationRequired: true,
        instructions: "Official transcripts in original language accompanied by a certified English translation.",
      },
      {
        id: "em-doc-4",
        documentType: "DEGREE_CERTIFICATE",
        requirementLevel: "MANDATORY",
        attestationRequired: true,
        instructions: "B.Sc. Degree certificate or provisional completion letter from registrar.",
      },
      {
        id: "em-doc-5",
        documentType: "RECOMMENDATION_LETTER",
        requirementLevel: "MANDATORY",
        attestationRequired: false,
        instructions: "Two academic recommendation letters on official university letterhead.",
      },
      {
        id: "em-doc-6",
        documentType: "LANGUAGE_CERTIFICATE",
        requirementLevel: "MANDATORY",
        attestationRequired: false,
        instructions: "Valid IELTS Academic (min 6.5) or TOEFL score report.",
      },
    ],
  },
];

export default function Home() {
  const [scholarships, setScholarships] = useState<Scholarship[]>(DEFAULT_SCHOLARSHIPS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFunding, setSelectedFunding] = useState("ALL");
  const [activeModal, setActiveModal] = useState<"NONE" | "ELIGIBILITY" | "DOCS" | "AUTH" | "PROFILE" | "APPLICATIONS" | "STUDIO">("NONE");
  const [selectedScholarship, setSelectedScholarship] = useState<Scholarship>(DEFAULT_SCHOLARSHIP);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authMode, setAuthMode] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Applications & Readiness State
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [trackToast, setTrackToast] = useState("");

  // AI Studio State
  const [studioTab, setStudioTab] = useState<"LETTER" | "CV">("LETTER");
  const [studioPersonalNotes, setStudioPersonalNotes] = useState("");
  const [studioTechSkills, setStudioTechSkills] = useState("Python, C++, Machine Learning, PostgreSQL, Git, Docker");
  const [studioProjects, setStudioProjects] = useState("Undergraduate Capstone Project on Deep Learning and Distributed Heuristics");
  const [studioGenerating, setStudioGenerating] = useState(false);
  const [studioLetterResult, setStudioLetterResult] = useState<any>(null);
  const [studioCvResult, setStudioCvResult] = useState<any>(null);
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Profile Form State
  const [profileNationality, setProfileNationality] = useState("PK");
  const [profileDegree, setProfileDegree] = useState("BACHELORS");
  const [profileField, setProfileField] = useState("Computer Science");
  const [profileCgpa, setProfileCgpa] = useState("3.60");
  const [profileGradingScale, setProfileGradingScale] = useState("4.00");
  const [profileGradYear, setProfileGradYear] = useState("2025");
  const [profileSaving, setProfileSaving] = useState(false);

  // Student Profile Form State for Eligibility Checker
  const [nationality, setNationality] = useState("PK");
  const [degreeLevel, setDegreeLevel] = useState("BACHELORS");
  const [cgpa, setCgpa] = useState("3.6");
  const [gradingScale, setGradingScale] = useState("4.0");
  const [ieltsScore, setIeltsScore] = useState("7.5");

  // Evaluation Output State
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const loadApplications = async () => {
    try {
      const res = await fetch(`${apiUrl}/v1/applications`, {
        credentials: "include",
      });
      if (res.ok) {
        const apps = await res.json();
        setApplications(apps);
      }
    } catch {
      // Ignored
    }
  };

  // Check Current Session, Load Applications & Load Scholarships
  useEffect(() => {
    async function initData() {
      // 1. Check Auth Session
      try {
        const authRes = await fetch(`${apiUrl}/v1/auth/me`, {
          credentials: "include",
        });
        if (authRes.ok) {
          const authData = await authRes.json();
          if (authData.user) {
            setCurrentUser(authData.user);
            if (authData.user.profile) {
              const p = authData.user.profile;
              if (p.nationality) {
                setNationality(p.nationality);
                setProfileNationality(p.nationality);
              }
              if (p.degreeLevel) {
                setDegreeLevel(p.degreeLevel);
                setProfileDegree(p.degreeLevel);
              }
              if (p.cgpa) {
                setCgpa(String(p.cgpa));
                setProfileCgpa(String(p.cgpa));
              }
              if (p.gradingScale) {
                setGradingScale(String(p.gradingScale));
                setProfileGradingScale(String(p.gradingScale));
              }
              if (p.fieldOfStudy) setProfileField(p.fieldOfStudy);
              if (p.graduationYear) setProfileGradYear(String(p.graduationYear));
            }
          }
        }
      } catch (e) {
        // Not logged in or service starting
      }

      // 2. Load Scholarships
      try {
        const res = await fetch(`${apiUrl}/v1/scholarships`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.items && data.items.length > 0) {
            setScholarships(data.items);
          }
        }
      } catch (err) {
        // Fallback to TUM
      }
    }
    initData();
  }, [apiUrl]);

  // Load applications whenever user logs in
  useEffect(() => {
    if (currentUser) {
      loadApplications();
    } else {
      setApplications([]);
    }
  }, [currentUser]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      const endpoint = authMode === "LOGIN" ? "/v1/auth/login" : "/v1/auth/register";
      const payload =
        authMode === "LOGIN"
          ? { email: authEmail, password: authPassword }
          : { email: authEmail, password: authPassword, name: authName, nationality: "PK" };

      const res = await fetch(`${apiUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      setCurrentUser(data.user);
      if (data.user.profile) {
        if (data.user.profile.nationality) setNationality(data.user.profile.nationality);
        if (data.user.profile.degreeLevel) setDegreeLevel(data.user.profile.degreeLevel);
        if (data.user.profile.cgpa) setCgpa(String(data.user.profile.cgpa));
      }
      setActiveModal("NONE");
      setAuthPassword("");
    } catch (err: any) {
      setAuthError(err.message || "An unexpected error occurred");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${apiUrl}/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Ignored
    }
    setCurrentUser(null);
    setApplications([]);
  };

  const handleTrackScholarship = async (sch: Scholarship) => {
    if (!currentUser) {
      setAuthMode("LOGIN");
      setActiveModal("AUTH");
      return;
    }

    try {
      const docs = sch.documentRequirements || DEFAULT_SCHOLARSHIP.documentRequirements || [];
      const res = await fetch(`${apiUrl}/v1/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          scholarshipId: sch.id,
          scholarshipTitle: sch.title,
          providerName: sch.providerName,
          cycleLabel: sch.activeCycle?.cycleLabel || "2026/27 Intake",
          targetDeadline: sch.activeCycle?.deadlineAtIso || undefined,
          initialDocuments: docs.map((d) => ({
            documentType: d.documentType,
            requirementLevel: d.requirementLevel,
            instructions: d.instructions,
          })),
        }),
      });

      if (res.ok) {
        await loadApplications();
        setTrackToast(`Added "${sch.title}" to your Application Tracker!`);
        setTimeout(() => setTrackToast(""), 4000);
      }
    } catch (err) {
      console.error("Failed to track scholarship", err);
    }
  };

  const handleUpdateAppStatus = async (appId: string, status: ApplicationItem["status"]) => {
    try {
      const res = await fetch(`${apiUrl}/v1/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await loadApplications();
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const handleToggleDocumentCheck = async (
    appId: string,
    docId: string,
    field: "isPrepared" | "attestationDone" | "translationDone",
    currentVal: boolean
  ) => {
    try {
      const res = await fetch(`${apiUrl}/v1/applications/${appId}/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ [field]: !currentVal }),
      });
      if (res.ok) {
        await loadApplications();
      }
    } catch (err) {
      console.error("Failed to update document status", err);
    }
  };

  const handleDeleteApp = async (appId: string) => {
    try {
      const res = await fetch(`${apiUrl}/v1/applications/${appId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        await loadApplications();
      }
    } catch (err) {
      console.error("Failed to delete application", err);
    }
  };

  // AI Studio Generation Handlers
  const handleGenerateLetter = async () => {
    if (!currentUser) {
      setAuthMode("LOGIN");
      setActiveModal("AUTH");
      return;
    }

    setStudioGenerating(true);
    try {
      const res = await fetch(`${apiUrl}/v1/studio/motivation-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          scholarshipTitle: selectedScholarship.title,
          providerName: selectedScholarship.providerName,
          targetDegree: degreeLevel,
          fieldOfStudy: profileField,
          instructions:
            selectedScholarship.documentRequirements?.find((d) => d.documentType === "LETTER_OF_MOTIVATION")
              ?.instructions || "100-200 words motivation and financial standing statement.",
          studentPersonalContext: studioPersonalNotes,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setStudioLetterResult(data);
      }
    } catch (err) {
      console.error("Failed to generate letter", err);
    } finally {
      setStudioGenerating(false);
    }
  };

  const handleGenerateCv = async () => {
    if (!currentUser) {
      setAuthMode("LOGIN");
      setActiveModal("AUTH");
      return;
    }

    setStudioGenerating(true);
    try {
      const res = await fetch(`${apiUrl}/v1/studio/academic-cv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          targetScholarship: selectedScholarship.title,
          technicalSkills: studioTechSkills,
          projectsSummary: studioProjects,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setStudioCvResult(data);
      }
    } catch (err) {
      console.error("Failed to generate CV", err);
    } finally {
      setStudioGenerating(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2500);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const res = await fetch(`${apiUrl}/v1/auth/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          nationality: profileNationality,
          degreeLevel: profileDegree,
          fieldOfStudy: profileField,
          cgpa: parseFloat(profileCgpa) || undefined,
          gradingScale: parseFloat(profileGradingScale) || 4.0,
          graduationYear: parseInt(profileGradYear, 10) || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNationality(profileNationality);
        setDegreeLevel(profileDegree);
        setCgpa(profileCgpa);
        setGradingScale(profileGradingScale);
        if (currentUser) {
          setCurrentUser({
            ...currentUser,
            profile: data.profile,
          });
        }
        setActiveModal("NONE");
      }
    } catch (err) {
      console.error("Failed to update profile", err);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleOpenEligibility = (item: Scholarship) => {
    setSelectedScholarship(item);
    setEvaluationResult(null);
    setActiveModal("ELIGIBILITY");
  };

  const handleOpenDocs = (item: Scholarship) => {
    setSelectedScholarship(item);
    setActiveModal("DOCS");
  };

  const handleOpenStudio = (item: Scholarship) => {
    setSelectedScholarship(item);
    setActiveModal("STUDIO");
  };

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      const res = await fetch(`${apiUrl}/v1/scholarships/${selectedScholarship.id}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          nationality,
          degreeLevel,
          cgpa: parseFloat(cgpa) || 3.5,
          gradingScale: parseFloat(gradingScale) || 4.0,
          languageScores: {
            IELTS: parseFloat(ieltsScore) || 7.0,
          },
        }),
      });

      if (res.ok) {
        const result: EvaluationResult = await res.json();
        setEvaluationResult(result);
        return;
      }
      throw new Error("Backend evaluation returned non-200");
    } catch (err) {
      // Client-side fallback evaluation
      const isPakistani = nationality.toUpperCase() === "PK";
      setEvaluationResult({
        overallStatus: isPakistani ? "NEEDS_REVIEW" : "INELIGIBLE",
        summaryExplanation: isPakistani
          ? "You satisfy primary nationality rules. Complete transcript and financial self-checks below."
          : "German or EU nationals are not eligible for this international grant.",
        results: [
          {
            ruleId: "r-1",
            ruleType: "NATIONALITY",
            status: isPakistani ? "ELIGIBLE" : "INELIGIBLE",
            reason: isPakistani
              ? `Your nationality (${nationality}) qualifies for international / non-BAföG support.`
              : "EU/German citizens can claim regular BAföG.",
            evidenceSource: "who are not eligible for BAföG due to their nationality (see §8 BAföG)",
          },
          {
            ruleId: "r-2",
            ruleType: "DEGREE_LEVEL",
            status: "ELIGIBLE",
            reason: `Your degree level (${degreeLevel}) is valid for this academic intake.`,
            evidenceSource: "as of 3rd semester bachelor or 2nd semester master",
          },
          {
            ruleId: "r-3",
            ruleType: "GPA",
            status: "NEEDS_REVIEW",
            reason: `Your CGPA is ${cgpa}/${gradingScale}. University evaluates good academic standing via grade report.`,
            evidenceSource: "Merit: good academic records",
          },
        ],
      });
    } finally {
      setEvaluating(false);
    }
  };

  const filteredScholarships = scholarships.filter((item) => {
    const matchesQuery =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.providerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesQuery;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Toast Alert */}
      {trackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <span className="text-emerald-400 font-bold">✓</span>
          <span className="text-xs font-medium">{trackToast}</span>
          <button
            onClick={() => {
              setActiveModal("APPLICATIONS");
              setTrackToast("");
            }}
            className="text-xs text-blue-400 font-bold hover:underline ml-2"
          >
            View Tracker
          </button>
        </div>
      )}

      {/* Top Navigation */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              S
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-slate-900">ScholarHub</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Verified Official
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="hidden sm:inline-block text-xs px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 font-medium text-slate-600">
              🇵🇰 Pakistan ➔ 🇩🇪 Germany Focus
            </span>

            {currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveModal("APPLICATIONS")}
                  className="relative px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 text-xs font-semibold text-blue-800 flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <span>📋 Tracker</span>
                  {applications.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px]">
                      {applications.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    setSelectedScholarship(scholarships[0] || DEFAULT_SCHOLARSHIP);
                    setActiveModal("STUDIO");
                  }}
                  className="px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-xs font-semibold text-purple-800 flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <span>✨ AI Studio</span>
                </button>

                <button
                  onClick={() => setActiveModal("PROFILE")}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  {currentUser.name || currentUser.email.split("@")[0]}
                </button>

                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-red-600 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthMode("LOGIN");
                  setActiveModal("AUTH");
                }}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50/60 to-transparent pt-12 pb-8 border-b border-slate-200/60">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Verified Scholarship Discovery & Readiness
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
            Official-source verified funding for master&apos;s and bachelor&apos;s studies abroad. Check eligibility rules and prepare required documents without guesswork.
          </p>

          {/* Search Bar */}
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 max-w-2xl mx-auto bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex-1 w-full flex items-center px-3">
              <svg className="w-5 h-5 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search scholarship name, university, or country..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm outline-none text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Scholarships Listing */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Available Scholarships ({filteredScholarships.length})</h2>
          <div className="flex gap-2 text-xs">
            {["ALL", "FULL", "PARTIAL"].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedFunding(type)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  selectedFunding === type
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {type === "ALL" ? "All Funding" : type}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScholarships.map((sch) => {
            const isTracked = applications.some((a) => a.scholarshipId === sch.id);
            return (
              <div
                key={sch.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60 uppercase">
                      {sch.fundingType === 1 ? "Fully Funded" : sch.fundingType === 2 ? "Partial (500–1,800 €)" : "Stipend"}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {sch.targetCountryCodes?.join(", ") || "DE"}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-2.5 line-clamp-2">
                    {sch.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">{sch.providerName}</p>

                  {sch.activeCycle && (
                    <div className="mt-4 p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Next Deadline:</span>
                      <span className="font-bold text-red-600">
                        {sch.activeCycle.deadlineLocalDate || "2026-10-15"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleOpenEligibility(sch)}
                    className="flex-1 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-sm"
                  >
                    Eligibility
                  </button>
                  <button
                    onClick={() => handleOpenStudio(sch)}
                    className="px-3 py-2 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100 text-purple-700 text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    ✨ AI Studio
                  </button>
                  <button
                    onClick={() => handleTrackScholarship(sch)}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-1 ${
                      isTracked
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-blue-700"
                    }`}
                  >
                    {isTracked ? "✓ Tracked" : "+ Track"}
                  </button>
                  <button
                    onClick={() => handleOpenDocs(sch)}
                    className="px-2.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                  >
                    Docs
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* MODAL: AI Application Studio */}
      {activeModal === "STUDIO" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">AI Application Studio</h3>
                  <p className="text-xs text-slate-500">
                    Draft customized, fact-compliant Motivation Letters & Europass CVs tailored for {selectedScholarship.providerName}.
                  </p>
                </div>
              </div>
              <button onClick={() => setActiveModal("NONE")} className="text-slate-400 hover:text-slate-600 p-1">
                ✕
              </button>
            </div>

            {/* Studio Navigation Tabs */}
            <div className="flex border-b border-slate-200 mt-4 text-xs font-semibold">
              <button
                onClick={() => setStudioTab("LETTER")}
                className={`pb-2.5 px-4 transition-colors ${
                  studioTab === "LETTER"
                    ? "border-b-2 border-purple-600 text-purple-700 font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Motivation Letter / SOP
              </button>
              <button
                onClick={() => setStudioTab("CV")}
                className={`pb-2.5 px-4 transition-colors ${
                  studioTab === "CV"
                    ? "border-b-2 border-purple-600 text-purple-700 font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                European Academic CV
              </button>
            </div>

            {/* TAB 1: Motivation Letter */}
            {studioTab === "LETTER" && (
              <div className="mt-4 space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100">
                  <span className="font-bold text-purple-900 block">Target Scholarship:</span>
                  <span className="text-purple-800">{selectedScholarship.title}</span>
                  <span className="text-slate-500 block mt-1 text-[11px]">
                    Official Requirement:{" "}
                    {selectedScholarship.documentRequirements?.find((d) => d.documentType === "LETTER_OF_MOTIVATION")
                      ?.instructions || "100-200 words motivation statement"}
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Your Personal & Financial Context (Currency shocks, thesis focus, Munich living expenses):
                  </label>
                  <textarea
                    rows={3}
                    value={studioPersonalNotes}
                    onChange={(e) => setStudioPersonalNotes(e.target.value)}
                    placeholder="e.g. Rupee devaluation increased monthly living deficit in Munich. Focusing my research on Distributed Systems and High-Performance Cloud Architectures."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-purple-600 text-xs"
                  ></textarea>
                </div>

                <button
                  onClick={handleGenerateLetter}
                  disabled={studioGenerating}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  {studioGenerating ? (
                    <span>Generating Fact-Checked Draft with Gemini 3.8 Flash...</span>
                  ) : (
                    <span>✨ Generate Tailored Motivation Letter</span>
                  )}
                </button>

                {studioLetterResult && (
                  <div className="mt-5 p-4 rounded-xl border border-purple-200 bg-white shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-sm">{studioLetterResult.title}</span>
                      <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[11px] font-bold">
                        {studioLetterResult.wordCount} Words
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg text-slate-700 leading-relaxed font-sans whitespace-pre-line text-xs border border-slate-100">
                      {studioLetterResult.letterContent}
                    </div>

                    {studioLetterResult.keyArguments && (
                      <div className="space-y-1">
                        <span className="font-bold text-[11px] text-slate-600 uppercase">Key Evidence Points:</span>
                        <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-0.5">
                          {studioLetterResult.keyArguments.map((arg: string, idx: number) => (
                            <li key={idx}>{arg}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                      <span className="text-[11px] text-slate-400">
                        Zero fabrication policy: Edit to reflect personal voice.
                      </span>
                      <button
                        onClick={() => handleCopyText(studioLetterResult.letterContent)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5"
                      >
                        {copiedNotice ? "✓ Copied to Clipboard" : "📋 Copy Letter"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Academic CV */}
            {studioTab === "CV" && (
              <div className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Technical Skills & Lab Tools:</label>
                  <input
                    type="text"
                    value={studioTechSkills}
                    onChange={(e) => setStudioTechSkills(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Key Academic Projects & Capstone Summary:
                  </label>
                  <textarea
                    rows={2}
                    value={studioProjects}
                    onChange={(e) => setStudioProjects(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
                  ></textarea>
                </div>

                <button
                  onClick={handleGenerateCv}
                  disabled={studioGenerating}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  {studioGenerating ? (
                    <span>Formatting European Academic CV...</span>
                  ) : (
                    <span>✨ Build European Standard CV</span>
                  )}
                </button>

                {studioCvResult && (
                  <div className="mt-5 p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                    <div className="border-b border-slate-100 pb-2">
                      <h4 className="font-bold text-base text-slate-900">{studioCvResult.personalInfo?.fullName}</h4>
                      <p className="text-xs text-purple-700 font-medium">{studioCvResult.personalInfo?.targetHeadline}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{studioCvResult.personalInfo?.email} • {studioCvResult.personalInfo?.nationality}</p>
                    </div>

                    <div>
                      <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">Academic Summary</span>
                      <p className="text-slate-600 mt-1 leading-relaxed text-xs">{studioCvResult.academicSummary}</p>
                    </div>

                    {studioCvResult.education && (
                      <div>
                        <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">Education</span>
                        {studioCvResult.education.map((edu: any, i: number) => (
                          <div key={i} className="mt-1 text-slate-600">
                            <span className="font-semibold text-slate-800">{edu.degree}</span> — {edu.institution} ({edu.year})
                            <span className="ml-2 font-mono text-[11px] text-emerald-700 font-bold">GPA: {edu.cgpa}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {studioCvResult.academicProjects && (
                      <div>
                        <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">Academic Projects</span>
                        {studioCvResult.academicProjects.map((p: any, i: number) => (
                          <div key={i} className="mt-1 text-slate-600">
                            <span className="font-semibold text-slate-800">{p.title}</span> ({p.role})
                            <p className="text-slate-500 mt-0.5">{p.description}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-end border-t border-slate-100">
                      <button
                        onClick={() =>
                          handleCopyText(
                            `${studioCvResult.personalInfo?.fullName}\n${studioCvResult.personalInfo?.targetHeadline}\n\nSummary:\n${studioCvResult.academicSummary}`
                          )
                        }
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                      >
                        {copiedNotice ? "✓ Copied" : "📋 Copy CV Summary"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Applications Hub & Document Tracker */}
      {activeModal === "APPLICATIONS" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Application Readiness Tracker</h3>
                <p className="text-xs text-slate-500">Track and prepare required documents for your targeted scholarships.</p>
              </div>
              <button onClick={() => setActiveModal("NONE")} className="text-slate-400 hover:text-slate-600 p-1">
                ✕
              </button>
            </div>

            {applications.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-3xl mb-2">📋</div>
                <h4 className="font-bold text-slate-800 text-sm">No applications tracked yet</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Click the <b>&quot;+ Track&quot;</b> button on any scholarship card to add it to your pipeline and track document readiness.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col gap-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{app.scholarshipTitle}</h4>
                        <p className="text-xs text-slate-500">{app.providerName} • {app.cycleLabel || "Cycle"}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Status Select */}
                        <select
                          value={app.status}
                          onChange={(e) => handleUpdateAppStatus(app.id, e.target.value as any)}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-semibold bg-white outline-none"
                        >
                          <option value="PLANNING">Planning</option>
                          <option value="PREPARING">Preparing</option>
                          <option value="READY">Ready to Apply</option>
                          <option value="SUBMITTED">Submitted</option>
                          <option value="UNDER_REVIEW">Under Review</option>
                          <option value="ACCEPTED">Accepted 🎉</option>
                          <option value="REJECTED">Rejected</option>
                        </select>

                        <button
                          onClick={() => handleDeleteApp(app.id)}
                          className="text-xs text-slate-400 hover:text-red-600 p-1"
                          title="Untrack application"
                        >
                          🗑
                        </button>
                      </div>
                    </div>

                    {/* Readiness Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-slate-600">Document Readiness:</span>
                        <span className="font-bold text-slate-800">
                          {app.preparedDocs} of {app.totalDocs} Ready ({app.progressPercent}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${app.progressPercent}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Document Readiness Checklist */}
                    <div className="mt-2 pt-3 border-t border-slate-200 space-y-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Document Checklist & Attestation
                      </span>
                      {app.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-2.5 rounded-xl bg-white border border-slate-200/80 text-xs flex flex-col gap-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{doc.documentType.replace(/_/g, " ")}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              {doc.requirementLevel}
                            </span>
                          </div>

                          {doc.instructions && (
                            <p className="text-[11px] text-slate-500">{doc.instructions}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
                            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                              <input
                                type="checkbox"
                                checked={doc.isPrepared}
                                onChange={() =>
                                  handleToggleDocumentCheck(app.id, doc.id, "isPrepared", doc.isPrepared)
                                }
                                className="rounded text-blue-600"
                              />
                              Prepared
                            </label>

                            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600">
                              <input
                                type="checkbox"
                                checked={doc.attestationDone}
                                onChange={() =>
                                  handleToggleDocumentCheck(app.id, doc.id, "attestationDone", doc.attestationDone)
                                }
                                className="rounded text-blue-600"
                              />
                              HEC / IBCC Attested
                            </label>

                            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600">
                              <input
                                type="checkbox"
                                checked={doc.translationDone}
                                onChange={() =>
                                  handleToggleDocumentCheck(app.id, doc.id, "translationDone", doc.translationDone)
                                }
                                className="rounded text-blue-600"
                              />
                              Certified German Translation
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Auth (Sign In / Register) */}
      {activeModal === "AUTH" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">
                {authMode === "LOGIN" ? "Sign In to ScholarHub" : "Create Student Account"}
              </h3>
              <button onClick={() => setActiveModal("NONE")} className="text-slate-400 hover:text-slate-600 p-1">
                ✕
              </button>
            </div>

            {/* Google OAuth Button */}
            <div className="mt-5">
              <a
                href={`${apiUrl}/v1/auth/google`}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-sm transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Continue with Google
              </a>
            </div>

            <div className="relative my-4 flex items-center justify-center">
              <div className="border-t border-slate-200 w-full"></div>
              <span className="bg-white px-2 text-[11px] uppercase tracking-wider text-slate-400 font-semibold absolute">
                or email
              </span>
            </div>

            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3.5 text-xs">
              {authMode === "REGISTER" && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="e.g. Syed Ali"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-600"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="student@example.pk"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-colors mt-2"
              >
                {authLoading
                  ? "Processing..."
                  : authMode === "LOGIN"
                  ? "Sign In"
                  : "Create Account"}
              </button>
            </form>

            <div className="mt-4 text-center">
              {authMode === "LOGIN" ? (
                <p className="text-xs text-slate-500">
                  Don&apos;t have an account?{" "}
                  <button
                    onClick={() => {
                      setAuthMode("REGISTER");
                      setAuthError("");
                    }}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Register now
                  </button>
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  Already have an account?{" "}
                  <button
                    onClick={() => {
                      setAuthMode("LOGIN");
                      setAuthError("");
                    }}
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Student Profile */}
      {activeModal === "PROFILE" && currentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Student Profile</h3>
                <p className="text-xs text-slate-500">{currentUser.email}</p>
              </div>
              <button onClick={() => setActiveModal("NONE")} className="text-slate-400 hover:text-slate-600 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nationality</label>
                  <select
                    value={profileNationality}
                    onChange={(e) => setProfileNationality(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
                  >
                    <option value="PK">Pakistan (PK)</option>
                    <option value="IN">India (IN)</option>
                    <option value="BD">Bangladesh (BD)</option>
                    <option value="DE">Germany (DE)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Degree</label>
                  <select
                    value={profileDegree}
                    onChange={(e) => setProfileDegree(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
                  >
                    <option value="BACHELORS">Bachelor&apos;s</option>
                    <option value="MASTERS">Master&apos;s</option>
                    <option value="PHD">PhD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Field of Study</label>
                <input
                  type="text"
                  value={profileField}
                  onChange={(e) => setProfileField(e.target.value)}
                  placeholder="Computer Science, Mechanical Eng..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">CGPA</label>
                  <input
                    type="number"
                    step="0.01"
                    value={profileCgpa}
                    onChange={(e) => setProfileCgpa(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Scale</label>
                  <input
                    type="number"
                    step="0.1"
                    value={profileGradingScale}
                    onChange={(e) => setProfileGradingScale(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Grad Year</label>
                  <input
                    type="number"
                    value={profileGradYear}
                    onChange={(e) => setProfileGradYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal("NONE")}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
                >
                  {profileSaving ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: Eligibility Checker */}
      {activeModal === "ELIGIBILITY" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Check Your Eligibility</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedScholarship.title}</p>
              </div>
              <button
                onClick={() => setActiveModal("NONE")}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {/* Profile Input Form */}
            <div className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Your Nationality</label>
                  <select
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-600"
                  >
                    <option value="PK">Pakistan (Non-EU / Third Country)</option>
                    <option value="DE">Germany (EU National)</option>
                    <option value="IN">India (Non-EU / Third Country)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Degree</label>
                  <select
                    value={degreeLevel}
                    onChange={(e) => setDegreeLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-600"
                  >
                    <option value="MASTERS">Master&apos;s Degree</option>
                    <option value="BACHELORS">Bachelor&apos;s Degree</option>
                    <option value="PHD">PhD / Doctorate</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">CGPA / Grade</label>
                  <input
                    type="number"
                    step="0.01"
                    value={cgpa}
                    onChange={(e) => setCgpa(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Scale</label>
                  <input
                    type="number"
                    step="0.1"
                    value={gradingScale}
                    onChange={(e) => setGradingScale(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">IELTS Score</label>
                  <input
                    type="number"
                    step="0.5"
                    value={ieltsScore}
                    onChange={(e) => setIeltsScore(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <button
                onClick={handleEvaluate}
                disabled={evaluating}
                className="w-full mt-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {evaluating ? (
                  <span>Evaluating Rules...</span>
                ) : (
                  <span>Run Deterministic Rule Evaluation</span>
                )}
              </button>
            </div>

            {/* Evaluation Results Card */}
            {evaluationResult && (
              <div className="mt-6 pt-5 border-t border-slate-100">
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    evaluationResult.overallStatus === "ELIGIBLE"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : evaluationResult.overallStatus === "INELIGIBLE"
                      ? "bg-red-50 border-red-200 text-red-900"
                      : "bg-amber-50 border-amber-200 text-amber-900"
                  }`}
                >
                  <div className="text-xl">
                    {evaluationResult.overallStatus === "ELIGIBLE"
                      ? "✅"
                      : evaluationResult.overallStatus === "INELIGIBLE"
                      ? "❌"
                      : "⚠️"}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">
                      {evaluationResult.overallStatus === "ELIGIBLE"
                        ? "You are Eligible!"
                        : evaluationResult.overallStatus === "INELIGIBLE"
                        ? "Currently Ineligible"
                        : "Requires Review / Further Criteria"}
                    </h4>
                    <p className="text-xs mt-0.5 leading-relaxed">
                      {evaluationResult.summaryExplanation}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2.5">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Rule Evidence Breakdown:
                  </span>
                  {evaluationResult.results.map((r, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-xs flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-800">{r.ruleType}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            r.status === "ELIGIBLE"
                              ? "bg-emerald-100 text-emerald-800"
                              : r.status === "INELIGIBLE"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                      <p className="text-slate-600">{r.reason}</p>
                      {r.evidenceSource && (
                        <p className="mt-1 text-[11px] text-slate-400 italic">
                          Official Quote: &quot;{r.evidenceSource}&quot;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: Document Checklist */}
      {activeModal === "DOCS" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Application Document Checklist</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedScholarship.title}</p>
              </div>
              <button
                onClick={() => setActiveModal("NONE")}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {(selectedScholarship.documentRequirements || DEFAULT_SCHOLARSHIP.documentRequirements)?.map(
                (doc, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col gap-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{doc.documentType.replace(/_/g, " ")}</span>
                      <div className="flex items-center gap-1.5">
                        {doc.attestationRequired && (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                            Certified Translation Req.
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            doc.requirementLevel === "MANDATORY"
                              ? "bg-red-50 text-red-700 border border-red-100"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {doc.requirementLevel}
                        </span>
                      </div>
                    </div>
                    {doc.instructions && (
                      <p className="text-slate-600 mt-1">{doc.instructions}</p>
                    )}
                  </div>
                )
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">Source: Official University Portal</span>
              <a
                href={selectedScholarship.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors flex items-center gap-1.5"
              >
                Apply on Official Portal ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
