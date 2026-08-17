import { NextResponse } from "next/server"

const GROQ_API_KEY = process.env.GROQ_API_KEY
const SERPAPI_KEY = process.env.SERPAPI_KEY
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

// Step 1: Extract claims
const EXTRACT_PROMPT = `You are a precise claim extractor. Extract 3 to 8 distinct, checkable factual claims from the provided text.
Respond in STRICT JSON format matching this structure:
{
  "claims": ["string"]
}
Do not output any markdown formatting, just the raw JSON.`

// Step 2: Analyze claims with context
const ANALYZE_PROMPT = `You are an expert fact-checker and misinformation detection AI.
Evaluate the provided claims using ONLY the web search results provided.

For each claim, you must analyze the search results and determine:
1. Verdict:
   - "SUPPORTED": The evidence is highly credible and strongly supports the claim.
   - "CONTRADICTED": The evidence is highly credible and directly refutes/contradicts the claim.
   - "MISLEADING": The claim contains elements of truth but exaggerates facts, omits crucial context, or misrepresents scientific findings.
   - "INSUFFICIENT EVIDENCE": There is little to no search results, or the available sources are conflicting, outdated, or fail to address the claim.
2. Confidence score (0-100) based on source strength and agreement.
3. Source classification for EACH search result provided:
   - "source_name": Clean name of the publisher (e.g. "World Health Organization", "Reuters", "Personal Blog").
   - "url": The EXACT url from the search result. Do not alter or invent this.
   - "credibility_score": A score from 0 to 100 estimating the credibility based on this guidelines:
     * Government/WHO/Official Health Organizations/Peer-reviewed research: 90-100
     * Major established news orgs/Reputable fact checkers: 75-89
     * Specialist/Expert-authored blogs or industry publications: 50-74
     * Individual blogs/opinion sites/unsourced articles: 30-49
     * Anonymous sites/social media posts/content farms: 0-29
   - "credibility_tier": A number from 1 (highest) to 5 (lowest) representing:
     * TIER 1 (★★★★★): Government, official public health, peer-reviewed research, universities.
     * TIER 2 (★★★★☆): Major established news, reputable fact checkers, professional research orgs.
     * TIER 3 (★★★☆☆): Industry publications, specialist sites, expert articles.
     * TIER 4 (★★☆☆☆): General blogs, opinion websites, unsourced posts.
     * TIER 5 (★☆☆☆☆): Anonymous sites, social media posts, content farms.
   - "relationship": Exactly one of ["SUPPORTS", "CONTRADICTS", "PROVIDES CONTEXT", "DOES NOT DIRECTLY ADDRESS"].
   - "summary": A brief 1-2 sentence explanation of what this source specifically says regarding the claim.
   - "published_year": The publication year (e.g., "2026", "2024") or "N/A" if unknown.
4. Summary counts of how many sources supported, contradicted, or provided context.
5. A concise overall explanation for the verdict.
6. List of manipulation flags present in the claim (e.g., "False Urgency", "Fear Appeal", "Vague Authority", "Cherry-picked stats"). Leave empty if none.

ANTI-HALLUCINATION RULES:
- Never invent sources, URLs, authors, or dates. ONLY analyze and output the sources that are actually provided to you in the search results context.
- If no search results are provided or they do not address the claim, assign "INSUFFICIENT EVIDENCE".

Respond in STRICT JSON format:
{
  "claims": [
    {
      "claim": "string",
      "verdict": "SUPPORTED" | "CONTRADICTED" | "MISLEADING" | "INSUFFICIENT EVIDENCE",
      "confidence": number,
      "explanation": "string",
      "manipulation_flags": ["string"],
      "evidence_summary": {
        "supporting": number,
        "contradicting": number,
        "contextual": number
      },
      "sources": [
        {
          "source_name": "string",
          "url": "string",
          "credibility_score": number,
          "credibility_tier": number,
          "relationship": "SUPPORTS" | "CONTRADICTS" | "PROVIDES CONTEXT" | "DOES NOT DIRECTLY ADDRESS",
          "summary": "string",
          "published_year": "string"
        }
      ]
    }
  ],
  "main_tip": "string"
}
Do not include any markdown format (like \`\`\`json). Output raw valid JSON only.`

interface SearchResult {
  title: string
  link: string
  snippet: string
  source: string
  date?: string
}

async function searchWeb(query: string): Promise<SearchResult[]> {
  if (!SERPAPI_KEY) {
    console.warn("SERPAPI_KEY is not defined. Web search is disabled.")
    return []
  }
  try {
    const res = await fetch(`https://serpapi.com/search.json?q=${encodeURIComponent(query)}&engine=google&api_key=${SERPAPI_KEY}`, { cache: 'no-store' })
    const data = await res.json()
    if (data.organic_results && Array.isArray(data.organic_results)) {
      return data.organic_results.slice(0, 4).map((r: any) => ({
        title: r.title || "",
        link: r.link || "",
        snippet: r.snippet || "",
        source: r.source || new URL(r.link || "https://unknown.com").hostname.replace("www.", ""),
        date: r.date || undefined
      }))
    }
    return []
  } catch (error) {
    console.error("Web search failed or timed out:", error)
    return []
  }
}

async function callGroq(messages: any[], model = "openai/gpt-oss-20b") {
  if (!GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY environment variable.")

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.1,
      response_format: { type: "json_object" }
    })
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "No error body")
    console.error(`Groq API Error: Status ${response.status}. Body:`, errorText)
    if (response.status === 429) throw new Error("rate_limit")
    throw new Error(`api_error: Status ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error("empty_response")
  
  return JSON.parse(content)
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json()
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Invalid text input" }, { status: 400 })
    }

    // Step 1: Extract Claims
    let extracted
    try {
      extracted = await callGroq([
        { role: "system", content: EXTRACT_PROMPT },
        { role: "user", content: `Text to analyze:\n\n${text}` }
      ], "openai/gpt-oss-20b")
    } catch (error: any) {
      if (error.message === "rate_limit") return NextResponse.json({ error: "Too many checks right now — try again in a minute." }, { status: 429 })
      throw error
    }

    if (!extracted || !Array.isArray(extracted.claims)) {
      return NextResponse.json({ error: "Failed to extract claims." }, { status: 500 })
    }

    // Step 2: Search web for each claim (in parallel)
    const claims = extracted.claims.slice(0, 5) // Limit to max 5 claims for performance and cost
    const searchPromises = claims.map(async (claim: string) => {
      const results = await searchWeb(claim)
      return { claim, search: results }
    })
    const searchResults = await Promise.all(searchPromises)

    // Format search results clearly for the LLM
    const searchResultsString = searchResults.map((result, idx) => {
      const searchContext = result.search.length > 0 
        ? result.search.map((r: SearchResult, sIdx: number) => `[Source ${sIdx + 1}]
Title: ${r.title}
Source: ${r.source}
URL: ${r.link}
Snippet: ${r.snippet}
Date: ${r.date || "N/A"}`).join("\n\n")
        : "No search results found."

      return `=== Claim ${idx + 1}: ${result.claim} ===\nSearch Results:\n${searchContext}`
    }).join("\n\n\n")

    // Step 3: Analyze with Context
    const analysisInput = `Analyze the following claims and their associated search results:\n\n${searchResultsString}`
    
    let parsedResult
    try {
      parsedResult = await callGroq([
        { role: "system", content: ANALYZE_PROMPT },
        { role: "user", content: analysisInput }
      ], "openai/gpt-oss-120b")
    } catch (error: any) {
      if (error.message === "rate_limit") return NextResponse.json({ error: "Too many checks right now — try again in a minute." }, { status: 429 })
      
      console.warn("First attempt failed, retrying once...", error)
      try {
        parsedResult = await callGroq([
          { role: "system", content: ANALYZE_PROMPT },
          { role: "user", content: analysisInput }
        ], "openai/gpt-oss-120b")
      } catch (retryError: any) {
        if (retryError.message === "rate_limit") {
           return NextResponse.json({ error: "Too many checks right now — try again in a minute." }, { status: 429 })
        }
        console.error("Retry failed:", retryError)
        return NextResponse.json({ error: "Failed to process the analysis. Please check your API key." }, { status: 500 })
      }
    }

    if (!parsedResult || !Array.isArray(parsedResult.claims)) {
      return NextResponse.json({ error: "Invalid response format from AI." }, { status: 500 })
    }

    return NextResponse.json(parsedResult)
  } catch (error) {
    console.error("Route error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
