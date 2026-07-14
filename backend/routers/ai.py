import os
import json
import csv
import io
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from google import genai
from database import get_db
from models import Person, UserProfile
from schemas import EnrichRequest, EnrichResult

router = APIRouter(prefix="/ai", tags=["ai"])

MODEL = "gemini-2.5-flash-lite"


def get_client() -> genai.Client:
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise HTTPException(500, "GEMINI_API_KEY not configured — add it to backend/.env")
    return genai.Client(api_key=key)


ENRICH_SYSTEM = """You are a research assistant helping build a professional networking app.
When given a person's name and optional hints, search your knowledge to find:
- Current company and job title
- Location (city, state/country)
- A short professional bio (2-3 sentences)
- Email address — ONLY if publicly known and confirmed; otherwise null
- Phone number — ONLY if publicly known and confirmed; otherwise null

Return ONLY a JSON object with these exact keys:
name, email, phone, linkedin_url, company, title, location, photo_url, ai_bio, confidence, sources

STRICT RULES — violations cause data quality issues:
- linkedin_url: ALWAYS set to null. LinkedIn profile slugs cannot be reliably determined without live search access and guessed URLs are always wrong.
- photo_url: ALWAYS set to null. Image URLs cannot be verified without live access and broken links degrade the UI.
- email / phone: null unless you have confirmed public knowledge (e.g. a public company directory or press release). Do not guess formats.
- confidence: "high" if company/title/location are well-known public facts, "medium" if somewhat confident, "low" if mostly guessing.
- sources: list of strings describing where each piece of information came from."""

RESUME_PARSE_SYSTEM = """You are a resume parser. Extract structured information from the resume text provided.
Return ONLY a JSON object with these keys (omit or set null for anything not found):
{
  "name": str,
  "email": str,
  "phone": str,
  "linkedin_url": str,
  "location": str,
  "title": str,
  "company": str,
  "bio": str,
  "skills": str,
  "education": [{"school": str, "degree": str, "field": str, "graduation_year": str}],
  "work_history": [{"company": str, "title": str, "start": str, "end": str, "description": str}]
}
For "bio" write a 2-3 sentence professional summary based on the resume.
For "skills" produce a comma-separated list of key skills.
For "title" and "company" use the most recent position.
Do not invent anything — only extract what is present in the resume."""

RECOMMEND_SYSTEM = """You are a networking advisor. Given a user's professional profile and their existing network,
suggest 5 people they should consider connecting with. For each suggestion explain WHY based on the network data given.
Return JSON: { "suggestions": [ { "name": str, "reason": str, "search_hint": str } ] }
search_hint should help the user find this person (e.g. "CTO at Stripe, San Francisco")."""


def _gemini_call(client: genai.Client, prompt: str) -> str:
    from google.genai.errors import ClientError
    try:
        response = client.models.generate_content(model=MODEL, contents=prompt)
        return response.text
    except ClientError as e:
        code = e.status_code if hasattr(e, "status_code") else 0
        msg = str(e)
        if code == 401 or "API_KEY_INVALID" in msg:
            raise HTTPException(401, "Invalid Gemini API key — check GEMINI_API_KEY in backend/.env")
        if code == 429:
            raise HTTPException(429, "Gemini quota exceeded — check aistudio.google.com/apikey")
        raise HTTPException(500, f"Gemini error: {msg}")
    except Exception as e:
        raise HTTPException(500, f"Gemini error: {e}")


def _parse_json_response(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1]
        if text.startswith("json"):
            text = text[4:]
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        raise HTTPException(500, "AI returned malformed JSON")


def _call_and_parse(client: genai.Client, prompt: str) -> dict:
    return _parse_json_response(_gemini_call(client, prompt))


@router.post("/parse-resume")
def parse_resume(db: Session = Depends(get_db)):
    client = get_client()
    profile = db.get(UserProfile, 1)
    if not profile or not profile.resume_text:
        raise HTTPException(400, "No resume text found — upload a resume first")

    prompt = f"{RESUME_PARSE_SYSTEM}\n\nResume:\n{profile.resume_text}"
    return _call_and_parse(client, prompt)


@router.post("/enrich", response_model=EnrichResult)
def enrich_person(req: EnrichRequest):
    client = get_client()
    prompt = f"{ENRICH_SYSTEM}\n\nFind information about: {req.name}"
    if req.hints:
        prompt += f"\nAdditional context: {req.hints}"

    data = _call_and_parse(client, prompt)
    return EnrichResult(**{k: data.get(k) for k in EnrichResult.model_fields})


@router.get("/recommend")
def recommend_connections(db: Session = Depends(get_db)):
    client = get_client()
    people = db.query(Person).all()
    if not people:
        raise HTTPException(400, "No people in your network yet")

    user = db.get(UserProfile, 1)
    user_context_parts = []
    if user:
        if user.name:
            user_context_parts.append(f"Name: {user.name}")
        if user.title and user.company:
            user_context_parts.append(f"Role: {user.title} at {user.company}")
        if user.location:
            user_context_parts.append(f"Location: {user.location}")
        if user.bio:
            user_context_parts.append(f"Bio: {user.bio}")
        if user.skills:
            user_context_parts.append(f"Skills: {user.skills}")
        if user.education:
            edu = ", ".join(
                f"{e.get('degree', '')} in {e.get('field', '')} from {e.get('school', '')}"
                for e in (user.education or [])
            )
            user_context_parts.append(f"Education: {edu}")
        if user.resume_text:
            user_context_parts.append(f"Resume summary: {user.resume_text[:800]}")
    user_context = "\n".join(user_context_parts) or "Not provided"

    network_summary = "\n".join(
        f"- {p.name} | {p.title or 'unknown title'} at {p.company or 'unknown company'} | {p.location or 'unknown location'}"
        for p in people
    )
    prompt = f"{RECOMMEND_SYSTEM}\n\nUser profile:\n{user_context}\n\nCurrent network:\n{network_summary}"
    return _call_and_parse(client, prompt)


class DiscoverRequest(BaseModel):
    exclude_names: list[str] = []


@router.post("/discover")
def discover_connections(req: DiscoverRequest, db: Session = Depends(get_db)):
    client = get_client()

    user = db.get(UserProfile, 1)

    # ── Build user profile context ──────────────────────────────────────────
    profile_parts = []
    if user:
        if user.name:     profile_parts.append(f"Name: {user.name}")
        if user.title:    profile_parts.append(f"Title: {user.title}")
        if user.company:  profile_parts.append(f"Company: {user.company}")
        if user.location: profile_parts.append(f"Location: {user.location}")
        if user.bio:      profile_parts.append(f"Bio: {user.bio}")
        if user.skills:   profile_parts.append(f"Skills: {user.skills}")
        if user.education:
            schools = [e.get("school", "") for e in (user.education or []) if e.get("school")]
            degrees = [
                f"{e.get('degree','')} in {e.get('field','')} from {e.get('school','')}"
                for e in (user.education or []) if e.get("school")
            ]
            if degrees:
                profile_parts.append(f"Education: {'; '.join(degrees)}")
        if user.work_history:
            recent = user.work_history[:3]
            history = "; ".join(
                f"{w.get('title','')} at {w.get('company','')}" for w in recent if w.get("company")
            )
            if history:
                profile_parts.append(f"Work history (recent): {history}")
    user_context = "\n".join(profile_parts) or "No profile information provided."

    # ── Build network context ───────────────────────────────────────────────
    people = db.query(Person).all()
    network_lines = []
    orgs = set()
    for p in people:
        line = f"- {p.name}"
        if p.title:    line += f", {p.title}"
        if p.company:  line += f" at {p.company}"; orgs.add(p.company)
        if p.location: line += f" ({p.location})"
        network_lines.append(line)
    network_summary = "\n".join(network_lines) if network_lines else "No connections yet."
    orgs_summary = ", ".join(sorted(orgs)) if orgs else "none"

    # Alumni schools from profile
    alumni_schools = []
    if user and user.education:
        alumni_schools = [e.get("school", "") for e in (user.education or []) if e.get("school")]
    schools_str = ", ".join(alumni_schools) if alumni_schools else "not specified"

    # ── Prompt 1: generate tailored search criteria ─────────────────────────
    criteria_prompt = f"""You are a professional career advisor helping find highly specific and relevant connections.

My profile:
{user_context}

Schools I attended (alumni network): {schools_str}

My current network ({len(people)} people):
{network_summary}

Organizations already represented in my network: {orgs_summary}

Write 2-3 sentences describing the ideal new connections for me. Be specific — mention:
- Alumni from my schools who work in relevant industries
- People at companies related to organizations in my network
- Roles and seniority levels that would most benefit my career"""

    criteria = _gemini_call(client, criteria_prompt).strip()

    # ── Prompt 2: generate 10 rich suggestions ──────────────────────────────
    exclude_clause = ""
    if req.exclude_names:
        exclude_clause = f"\n\nDo NOT suggest anyone named: {', '.join(req.exclude_names)}."

    suggest_prompt = f"""{criteria}{exclude_clause}

Generate exactly 10 connection archetypes — types of real professionals I should search for. Do NOT invent specific named individuals; instead describe the role clearly so I can find real people on LinkedIn.

Return ONLY a valid JSON array — no markdown fences, no explanation, nothing else:
[
  {{
    "label": "Short descriptive title for this type of connection (e.g. 'Alumni FinTech PM', 'Senior ML Engineer at Big Tech')",
    "role": "Specific job title to search for",
    "company_type": "Type or example of company (e.g. 'Series B healthtech startup' or 'Google, Meta, or similar')",
    "location": "City, State where this type of role is typically found",
    "bio": "1-2 sentences describing the professional background of this archetype.",
    "reason": "One sentence on why connecting with this type of person is valuable.",
    "relevance": "1-2 sentences on their specific relevance — mention alumni network, mutual org connections, or complementary skills explicitly.",
    "linkedin_search": "Keywords to search on LinkedIn People search (role + industry + location, no quotes)"
  }}
]"""

    raw = _gemini_call(client, suggest_prompt)
    suggestions = _parse_json_response(raw)

    if isinstance(suggestions, dict) and "suggestions" in suggestions:
        suggestions = suggestions["suggestions"]

    return {"criteria": criteria, "suggestions": suggestions[:10]}


@router.get("/export/csv")
def export_csv(db: Session = Depends(get_db)):
    people = db.query(Person).order_by(Person.name).all()
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "id", "name", "email", "phone", "linkedin_url",
        "company", "title", "location", "ai_bio", "notes", "created_at"
    ])
    writer.writeheader()
    for p in people:
        writer.writerow({
            "id": p.id, "name": p.name, "email": p.email or "",
            "phone": p.phone or "", "linkedin_url": p.linkedin_url or "",
            "company": p.company or "", "title": p.title or "",
            "location": p.location or "", "ai_bio": p.ai_bio or "",
            "notes": p.notes or "", "created_at": p.created_at.isoformat(),
        })
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=mynetwork.csv"},
    )
