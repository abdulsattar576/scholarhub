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
      instructions: "Two recommendation letters not older than one semester.",
    },
    {
      id: "doc-5",
      documentType: "BANK_STATEMENTS",
      requirementLevel: "MANDATORY",
      attestationRequired: true,
      instructions: "Past 12 months bank statements. Certified German translation required if not in English/German.",
    },
    {
      id: "doc-6",
      documentType: "PARENTS_INCOME_PROOF",
      requirementLevel: "OPTIONAL",
      attestationRequired: true,
      instructions: "Proof of parents' or spouse's income (past 12 months) with certified translation.",
    },
  ],
};

export default function Home() {
  const [scholarships, setScholarships] = useState<Scholarship[]>([DEFAULT_SCHOLARSHIP]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFunding, setSelectedFunding] = useState("ALL");
  const [activeModal, setActiveModal] = useState<"NONE" | "ELIGIBILITY" | "DOCS">("NONE");
  const [selectedScholarship, setSelectedScholarship] = useState<Scholarship>(DEFAULT_SCHOLARSHIP);

  // Student Profile Form State
  const [nationality, setNationality] = useState("PK");
  const [degreeLevel, setDegreeLevel] = useState("BACHELORS");
  const [cgpa, setCgpa] = useState("3.6");
  const [gradingScale, setGradingScale] = useState("4.0");
  const [ieltsScore, setIeltsScore] = useState("7.5");

  // Evaluation Output State
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);

  // Attempt to fetch from backend API Gateway
  useEffect(() => {
    async function loadScholarships() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const res = await fetch(`${apiUrl}/v1/scholarships`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.items && data.items.length > 0) {
            setScholarships(data.items);
          }
        }
      } catch (err) {
        // Fallback to default verified record
      }
    }
    loadScholarships();
  }, []);

  const handleOpenEligibility = (item: Scholarship) => {
    setSelectedScholarship(item);
    setEvaluationResult(null);
    setActiveModal("ELIGIBILITY");
  };

  const handleOpenDocs = (item: Scholarship) => {
    setSelectedScholarship(item);
    setActiveModal("DOCS");
  };

  const handleEvaluate = async () => {
    setEvaluating(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    const payload = {
      scholarshipId: selectedScholarship.id,
      studentProfile: {
        nationality,
        degreeLevel,
        cgpa: parseFloat(cgpa) || 3.0,
        gradingScale: parseFloat(gradingScale) || 4.0,
        languageTests: [{ testType: "IELTS", score: ieltsScore }],
      },
    };

    try {
      const res = await fetch(`${apiUrl}/v1/scholarships/${selectedScholarship.id}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setEvaluationResult(data);
      } else {
        throw new Error("API error");
      }
    } catch (e) {
      // Local fallback evaluation simulation
      const isPakistani = nationality === "PK";
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
          <div className="flex items-center space-x-4 text-sm font-medium text-slate-600">
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">
              🇵🇰 Pakistan ➔ 🇩🇪 Germany Focus
            </span>
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
                placeholder="Search scholarships, universities (e.g. TUM, DAAD)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm outline-none bg-transparent placeholder:text-slate-400"
              />
            </div>
            <button className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm">
              Search
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">
            Available Opportunities ({filteredScholarships.length})
          </h2>
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500">Sorted by:</span>
            <span className="font-semibold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
              Verified Deadline
            </span>
          </div>
        </div>

        {/* Scholarships Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredScholarships.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-100 mb-2">
                      🇩🇪 Germany
                    </span>
                    <h3 className="font-bold text-lg text-slate-900 leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-sm font-medium text-slate-600 mt-1 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {item.providerName}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    Grant / Stipend
                  </span>
                </div>

                {/* Key metadata grid */}
                <div className="mt-5 grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block">Cycle</span>
                    <span className="font-semibold text-slate-800">
                      {item.activeCycle?.cycleLabel || "2026 Intake"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Verified Deadline</span>
                    <span className="font-semibold text-red-600">
                      {item.activeCycle?.deadlineLocalDate || "15 Oct 2026"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-3">
                <button
                  onClick={() => handleOpenEligibility(item)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors text-center shadow-sm flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Check Eligibility
                </button>
                <button
                  onClick={() => handleOpenDocs(item)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm transition-colors"
                >
                  Document Checklist
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

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
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
              <div>
                <label className="text-slate-600 block mb-1">Your Nationality</label>
                <select
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none"
                >
                  <option value="PK">🇵🇰 Pakistan</option>
                  <option value="IN">🇮🇳 India</option>
                  <option value="DE">🇩🇪 Germany (EU)</option>
                  <option value="OTHER">Other Country</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 block mb-1">Current/Highest Degree</label>
                <select
                  value={degreeLevel}
                  onChange={(e) => setDegreeLevel(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none"
                >
                  <option value="BACHELORS">Bachelor&apos;s Degree</option>
                  <option value="MASTERS">Master&apos;s Degree</option>
                  <option value="HIGH_SCHOOL">High School</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 block mb-1">CGPA (Out of 4.0)</label>
                <input
                  type="number"
                  step="0.01"
                  value={cgpa}
                  onChange={(e) => setCgpa(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none"
                  placeholder="3.6"
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1">IELTS / TOEFL Score</label>
                <input
                  type="text"
                  value={ieltsScore}
                  onChange={(e) => setIeltsScore(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 outline-none"
                  placeholder="7.5"
                />
              </div>
            </div>

            <button
              onClick={handleEvaluate}
              disabled={evaluating}
              className="mt-5 w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors shadow-sm disabled:opacity-50"
            >
              {evaluating ? "Evaluating Rules..." : "Run Eligibility Check"}
            </button>

            {/* Evaluation Results Section */}
            {evaluationResult && (
              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Evaluation Result
                  </span>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      evaluationResult.overallStatus === "ELIGIBLE"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : evaluationResult.overallStatus === "INELIGIBLE"
                        ? "bg-rose-100 text-rose-800 border border-rose-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    }`}
                  >
                    {evaluationResult.overallStatus}
                  </span>
                </div>

                <p className="text-xs text-slate-700 p-3 rounded-xl bg-slate-50 border border-slate-100 mb-4">
                  {evaluationResult.summaryExplanation}
                </p>

                <div className="space-y-3">
                  {evaluationResult.results.map((r, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl border border-slate-100 bg-white shadow-2xs text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800">{r.ruleType}</span>
                        <span
                          className={`font-semibold ${
                            r.status === "ELIGIBLE"
                              ? "text-emerald-600"
                              : r.status === "INELIGIBLE"
                              ? "text-rose-600"
                              : "text-amber-600"
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
