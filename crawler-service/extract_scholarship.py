#!/usr/bin/env python3
"""
Scholarship Extractor using Gemini API
Fetches an official scholarship page and extracts structured JSON.
"""

import os
import sys
import json
import re
import urllib.request
from pathlib import Path

# Load .env file from project root
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    with open(env_path, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

# Target JSON Schema description for Gemini
PROMPT_TEMPLATE = """
You are an expert academic scholarship analyst. Your task is to extract structured scholarship details from the provided webpage text into strict JSON format.

RULES:
1. Extract ONLY facts explicitly stated in the source text. Do NOT guess, extrapolate, or hallucinate.
2. If any field (e.g. GPA requirement, age limit, deadline hour) is not mentioned, set it to null.
3. Every eligibility requirement must include the exact quote from the webpage as evidence.
4. Output ONLY valid JSON matching the schema below, with no markdown code fences and no conversational text.

Target JSON Schema:
{
  "title": "string (Official scholarship name)",
  "provider": "string (Organization offering the scholarship, e.g., DAAD)",
  "official_url": "string (Official website link)",
  "target_countries": ["ISO 2-letter country code, e.g. DE"],
  "degree_levels": ["BACHELORS" | "MASTERS" | "PHD" | "POSTDOC" | "OTHER"],
  "funding": {
    "funding_type": "FULL" | "PARTIAL" | "TUITION_ONLY" | "STIPEND_ONLY",
    "monthly_stipend": number or null,
    "currency": "EUR" | "USD" | "GBP" | null,
    "covers_tuition": boolean or null,
    "covers_travel": boolean or null,
    "covers_health_insurance": boolean or null
  },
  "cycle": {
    "cycle_label": "string (e.g., 2026/2027)",
    "open_date": "YYYY-MM-DD" or null,
    "deadline_date": "YYYY-MM-DD" or null,
    "deadline_timezone": "string or null",
    "deadline_precision": "DATETIME" | "DATE_ONLY"
  },
  "eligibility_rules": [
    {
      "rule_type": "DEGREE_LEVEL" | "NATIONALITY" | "GPA" | "LANGUAGE" | "WORK_EXPERIENCE" | "OTHER",
      "operator": "EQUALS" | "GTE" | "IN" | "MAX_YEARS",
      "value": "string or number",
      "evidence_quote": "Exact sentence quoted from webpage"
    }
  ],
  "document_requirements": [
    {
      "document_type": "ACADEMIC_CV" | "LETTER_OF_MOTIVATION" | "DEGREE_CERTIFICATE" | "TRANSCRIPT" | "RECOMMENDATION_LETTER" | "LANGUAGE_CERTIFICATE" | "OTHER",
      "is_mandatory": boolean,
      "attestation_required": boolean,
      "instructions": "string or null"
    }
  ]
}

Source Webpage Text:
----------------------------------------
{text}
----------------------------------------
"""


def fetch_webpage_text(url: str) -> str:
    """Fetch webpage and strip HTML tags to get clean plain text."""
    print(f"[*] Fetching webpage: {url}")
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"}
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        html = resp.read().decode("utf-8", errors="ignore")

    # Clean HTML: remove script, style, nav, footer
    html = re.sub(r"<(script|style|nav|footer|header)[^>]*>.*?</\1>", "", html, flags=re.DOTALL | re.IGNORECASE)
    # Strip remaining tags
    text = re.sub(r"<[^>]+>", " ", html)
    # Collapse multiple whitespaces
    text = re.sub(r"\s+", " ", text).strip()
    return text[:15000]  # Limit to 15k characters to keep token count clean


def call_gemini(text: str, api_key: str) -> dict:
    """Call Gemini REST API to extract structured JSON."""
    model_id = os.getenv("GEMINI_MODEL_ID", "gemini-3.8-flash")
    print(f"[*] Sending extracted text to Gemini API ({model_id})...")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent?key={api_key}"
    
    prompt = PROMPT_TEMPLATE.replace("{text}", text)
    payload = {
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.1
        }
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            candidate_text = data["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(candidate_text)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        print(f"[!] Gemini API Error ({e.code}): {error_body}")
        raise


def main():
    if not GEMINI_API_KEY:
        print("[!] Error: GEMINI_API_KEY is not set in .env file.")
        sys.exit(1)

    # Example DAAD scholarship page URL or take from CLI arg
    target_url = sys.argv[1] if len(sys.argv) > 1 else "https://www2.daad.de/deutschland/stipendien/datenbank/en/21148-scholarship-database/?status=3&origin=14&subjectGrps=&daad=1&q=&page=1&detail=50026200"

    print("==================================================")
    print(" Scholarship AI Extractor (Gemini 2.5 Flash)      ")
    print("==================================================")
    
    try:
        clean_text = fetch_webpage_text(target_url)
        extracted_data = call_gemini(clean_text, GEMINI_API_KEY)
        
        output_file = Path(__file__).resolve().parent / "extracted_sample.json"
        with open(output_file, "w") as f:
            json.dump(extracted_data, f, indent=2)

        print("\n[+] SUCCESS! Extracted Scholarship JSON:")
        print("--------------------------------------------------")
        print(json.dumps(extracted_data, indent=2))
        print("--------------------------------------------------")
        print(f"[+] Saved to: {output_file}")

    except Exception as e:
        print(f"[!] Extraction failed: {e}")


if __name__ == "__main__":
    main()

