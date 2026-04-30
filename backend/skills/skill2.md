---
name: geo-optimizer
description: 'Optimize any written article for Generative Engine Optimization (GEO) — making it citation-worthy and answer-ready for AI search engines like ChatGPT, Perplexity, Google SGE/AI Overviews, and Gemini. Trigger after an article is written when the user says "make this GEO-ready", "optimize for AI search", "optimize for Perplexity", "AI Overview optimization", "generative search", "LLM-friendly content", "make this citable by AI", or "GEO optimize this". Also trigger when the user asks how to rank in AI answers, get cited by ChatGPT, or appear in Google AI Overviews. Supports Khired Networks (khired.com), Padel Cafe (padelcafe.pk), and Teeth and Gums (teethandgums.co).'
license: Apache-2.0
metadata:
  author: custom-build
  version: "1.0.0"
  tags:
    - geo
    - generative-engine-optimization
    - ai-search
    - sge
    - perplexity
    - chatgpt-seo
    - ai-overviews
    - llm-content
    - content-optimization
---

# GEO Optimizer

Generative Engine Optimization (GEO) is the practice of making content citation-worthy and answer-ready for AI-powered search engines — ChatGPT, Perplexity, Google AI Overviews (SGE), Gemini, and similar systems. Unlike traditional SEO that targets blue-link rankings, GEO targets being **quoted, summarized, or referenced** by an AI as the authoritative source.

**System role**: Post-write optimization layer. Takes a finished SEO article and applies GEO signals without rewriting the core content.

---

## Step 0 — Identify Platform

Before doing anything, ask (or infer from context):

> "Which platform is this content for — Khired Networks, Padel Cafe, or Teeth and Gums?"

Then apply the matching Platform GEO Profile from Section 5 below. Each platform has different citation priorities and AI query patterns.

---

## Step 1 — GEO Audit (Run First)

Before making changes, score the existing draft on these 8 GEO signals. Output a quick audit table:

| GEO Signal | Status | Notes |
|---|---|---|
| Direct Answer Block | ✅ / ⚠️ / ❌ | Does content open with a clear, quotable answer? |
| Conversational Query Coverage | ✅ / ⚠️ / ❌ | Does it answer how a human would ask an AI? |
| Citation Triggers | ✅ / ⚠️ / ❌ | Stats, data, expert claims with sources present? |
| Structured Definitions | ✅ / ⚠️ / ❌ | Key terms defined clearly for AI extraction? |
| FAQ / Q&A Format | ✅ / ⚠️ / ❌ | Questions phrased as natural language queries? |
| Schema Readiness | ✅ / ⚠️ / ❌ | Content structured for FAQ / HowTo / Article schema? |
| Authority Signals | ✅ / ⚠️ / ❌ | Author expertise, credentials, or brand authority present? |
| Semantic Completeness | ✅ / ⚠️ / ❌ | Topic covered comprehensively — no obvious gaps? |

**Scoring**: 8/8 = GEO-Ready | 5–7 = Needs Light Optimization | Below 5 = Needs Full GEO Pass

---

## Step 2 — Apply GEO Optimizations

Work through each signal that scored ⚠️ or ❌. Make targeted edits — do not rewrite the whole article.

### 2.1 Direct Answer Block
Add or improve an opening paragraph (40–60 words) that directly answers the primary query in one clear statement. This is what AI engines pull as the answer snippet.

**Format:**
```
[Primary keyword] is/refers to/means [concise definition or answer]. [One sentence of context]. [One sentence of why it matters or what to do next].
```

### 2.2 Conversational Query Coverage
AI engines receive queries phrased as natural questions — not keyword strings. Ensure the article answers at least 3–5 of these patterns:

- "What is [topic]?"
- "How does [topic] work?"
- "Why should I [action related to topic]?"
- "What is the best [option] for [audience]?"
- "How much does [topic] cost in [location]?"

If any of these are missing, add a brief H3 section or FAQ entry that answers them.

### 2.3 Citation Triggers
AI engines prefer to cite content that includes:
- Specific statistics with named sources (e.g., "According to WHO, 80% of...")
- Named expert opinions or professional consensus
- Data comparisons or before/after metrics
- Dates and recency markers (e.g., "As of 2024/2025...")

**Action**: Flag any vague claims and replace or supplement with sourced data. If no data is available, restructure the claim to reflect professional reasoning rather than bare assertion.

### 2.4 Structured Definitions
For every key term in the article, ensure there is at least one clean, extractable definition. Format:

```
**[Term]**: [Clear 1–2 sentence definition that could stand alone out of context.]
```

### 2.5 FAQ Section (GEO-Enhanced)
Review existing FAQ or add one. GEO-optimized FAQ questions must:
- Be phrased exactly as a user would type or speak to an AI
- Have answers of 40–70 words — short enough to quote, complete enough to satisfy
- Cover the "also asked" and "people ask" query patterns around the topic

Minimum: 4 FAQ entries. Ideal: 6–8.

### 2.6 Schema Readiness Recommendations
Output a block of schema recommendations (no code required — just content guidance):

```
### Schema Recommendations

Content Type: [Article / FAQPage / HowTo / MedicalWebPage / LocalBusiness]
Suggested schemas to implement on this page:
- FAQPage schema: [Yes/No — FAQ section present]
- HowTo schema: [Yes/No — step-by-step present]
- Article schema: [Yes — always for blog posts]
- Breadcrumb schema: [Recommended]
- Author schema: [Recommended for E-E-A-T]
```

### 2.7 Authority Signals
Add or strengthen:
- Author byline with relevant credentials (even a brief one-liner)
- Brand positioning statement that reflects expertise
- "Last reviewed / updated" date marker
- 1–2 references to professional bodies, standards, or industry sources

### 2.8 Semantic Completeness Check
Ask: "If someone asked an AI about [topic], what subtopics would it expect to find in a thorough answer?" 

List any gaps and either:
- Add a brief H3 covering the missing angle
- Or note it as a recommended addition for the next content update

---

## Step 3 — GEO Content Additions Output

After applying changes, deliver a clearly labeled output:

```markdown
## GEO Optimization Output

### Changes Applied
| Change | Location in Article | Reason |
|---|---|---|
| Added direct answer block | Introduction | AI snippet extraction |
| Rewrote FAQ Q3 | FAQ section | Conversational phrasing |
| Added stat with source | Section 2 | Citation trigger |

### New / Rewritten Sections
[Show only the added or edited content — not the full article unless requested]

### Schema Recommendations
[From Step 2.6]

### GEO Score (After)
[Re-run the 8-signal audit and show updated score]
```

---

## Step 4 — Conversational Query Map

Produce a short "AI Query Map" — the specific queries this content is now positioned to answer in AI engines:

```markdown
## AI Query Map

This content is now optimized to appear as a cited source when users ask:

1. "[Natural language question 1]"
2. "[Natural language question 2]"
3. "[Natural language question 3]"
4. "[Natural language question 4]"
5. "[Natural language question 5]"

Target AI engines: Google AI Overviews, Perplexity, ChatGPT Search, Gemini
```

---

## Section 5 — Platform GEO Profiles

### Khired Networks (khired.com) — B2B Tech & SaaS

**GEO Priority**: Perplexity and ChatGPT Search (B2B buyers research tools/vendors via AI before booking calls)

**Citation goal**: Be the source AI cites when a CTO or founder asks "What is [service]?" or "Best [SaaS/tech solution] for startups?"

**GEO-specific rules**:
- Every claim must be backed by business logic, cost data, or industry benchmarks — AI engines distrust vague B2B assertions
- Include at least one comparison structure (e.g., "vs" table or "Option A vs Option B") — AI engines frequently pull these for comparison queries
- Use formal, precise language — AI engines serving professional queries favor authoritative tone
- Author authority signal required: state the author's role or Khired's expertise domain explicitly
- Conversational queries to cover: "What does [service] cost?", "How does [service] work?", "When should a startup use [service]?", "What is the difference between X and Y?"

**Schema priority**: Article + FAQPage + Organization

---

### Padel Cafe (padelcafe.pk) — Sports Lifestyle & Community

**GEO Priority**: Google AI Overviews and Gemini (local/lifestyle queries dominate here)

**Citation goal**: Be the source AI cites for padel-related queries in Pakistan, especially beginner guides, gear, and local court information

**GEO-specific rules**:
- Include local context naturally — "in Lahore", "in Pakistan", "at DHA" — AI engines use geo-signals to serve localized answers
- Conversational and casual phrasing in FAQ is fine — matches how Pakistani sports enthusiasts ask AI questions
- Include beginner-friendly definitions of padel terminology — AI engines pull these for "what is [term]?" queries
- Community-driven claims ("popular among players in Lahore") are credible if framed as observation, not fact
- Conversational queries to cover: "What is padel?", "How do I start playing padel in Lahore?", "What gear do I need for padel?", "Where can I play padel in DHA Lahore?", "Is padel easy for beginners?"

**Schema priority**: Article + FAQPage + LocalBusiness + SportsEvent (for tournament content)

---

### Teeth and Gums (teethandgums.co) — Dental Health Pakistan

**GEO Priority**: Google AI Overviews (health queries heavily surface in AI Overviews; patients research before booking)

**Citation goal**: Be the source AI cites when Pakistani patients ask about dental procedures, costs, or treatment options

**GEO-specific rules**:
- This is YMYL (Your Money or Your Life) content — AI engines apply stricter citation standards. Every medical claim needs a source or professional framing ("Dentists recommend...", "According to dental guidelines...")
- Include Pakistan-specific cost context — AI engines serving local health queries favor localized pricing data
- Use reassuring, patient-friendly definitions — anxious patients search in plain language
- Never use absolute medical claims without qualification (e.g., avoid "completely painless" — use "generally well-tolerated")
- Author/clinic authority signal is critical: name the dental professional or clinic credentials
- Conversational queries to cover: "Is [procedure] painful?", "How much does [procedure] cost in Pakistan?", "How long does [procedure] take?", "Is [procedure] safe?", "What happens during [procedure]?"

**Schema priority**: MedicalWebPage + FAQPage + LocalBusiness + Physician (if dentist named)

---

## GEO Quick Reference

| What AI Engines Want | What to Give Them |
|---|---|
| Quotable opening answer | Direct Answer Block (40–60 words) |
| Conversational query match | Natural language FAQ (40–70 word answers) |
| Trustworthy citations | Named stats, expert references, dates |
| Clear term definitions | Bolded definitions (standalone sentences) |
| Structured data signals | Schema recommendations |
| Author authority | Byline + credentials + brand expertise |
| Topic completeness | Semantic gap check + additions |

---

## Next Best Skill

- **Before GEO**: `seo-content-writer` — write the full article first, then bring it here
- **After GEO**: Publish. Content is now optimized for both traditional search and AI engines.