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
You are provided with a list of claims and some web search context for each.
Evaluate the claims and provide:
1. "claim": The exact claim text provided to you.
2. "verdict": Exactly one of ["Likely True", "Disputed", "Unverifiable"].
3. "explanation": A concise reasoning for the verdict, incorporating the search context if relevant.
4. "manipulation_flags": An array of strings identifying manipulation tactics used (e.g., "False Urgency", "Fear Appeal", "Vague Authority", "Cherry-picked stats"). Leave empty if none.

You must also provide a "main_tip", which is a short 1-2 sentence summary of the main red flag or overall assessment.

Respond in STRICT JSON format:
{
  "claims": [
    {
      "claim": "string",
      "verdict": "Likely True" | "Disputed" | "Unverifiable",
      "explanation": "string",
      "manipulation_flags": ["string"]
    }
  ],
  "main_tip": "string"
}
Do not output any markdown formatting, just the raw JSON.`

async function searchWeb(query: string) {
  if (!SERPAPI_KEY) return "Web search disabled (missing SERPAPI_KEY).";
  try {
    const res = await fetch(`https://serpapi.com/search.json?q=${encodeURIComponent(query)}&engine=google&api_key=${SERPAPI_KEY}`, { cache: 'no-store' });
    const data = await res.json();
    if (data.organic_results && data.organic_results.length > 0) {
      return data.organic_results.slice(0, 2).map((r: any) => r.snippet).join(" ");
    }
    return "No direct context found.";
  } catch (error) {
    return "Web search failed or timed out.";
  }
}

async function callGroq(messages: any[], model = "llama-3.3-70b-versatile") {
  if (!GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY environment variable.");

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
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("rate_limit");
    throw new Error("api_error");
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("empty_response");
  
  return JSON.parse(content);
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Invalid text input" }, { status: 400 });
    }

    // Step 1: Extract Claims (using the faster model to save time)
    let extracted;
    try {
      extracted = await callGroq([
        { role: "system", content: EXTRACT_PROMPT },
        { role: "user", content: `Text to analyze:\n\n${text}` }
      ], "llama-3.1-8b-instant");
    } catch (error: any) {
      if (error.message === "rate_limit") return NextResponse.json({ error: "Too many checks right now — try again in a minute." }, { status: 429 });
      throw error;
    }

    if (!extracted || !Array.isArray(extracted.claims)) {
      return NextResponse.json({ error: "Failed to extract claims." }, { status: 500 });
    }

    // Step 2: Search web for each claim (in parallel)
    const claims = extracted.claims.slice(0, 8); // Cap at 8
    const searchPromises = claims.map(async (claim: string) => {
      const context = await searchWeb(claim);
      return `Claim: "${claim}"\nSearch Context: ${context}`;
    });
    const searchResults = await Promise.all(searchPromises);

    // Step 3: Analyze with Context
    const analysisInput = `Evaluate the following claims based on the provided web search context:\n\n${searchResults.join("\n\n")}`;
    
    let parsedResult;
    try {
      parsedResult = await callGroq([
        { role: "system", content: ANALYZE_PROMPT },
        { role: "user", content: analysisInput }
      ], "llama-3.3-70b-versatile");
    } catch (error: any) {
      if (error.message === "rate_limit") return NextResponse.json({ error: "Too many checks right now — try again in a minute." }, { status: 429 });
      throw error;
    }

    if (!parsedResult || !Array.isArray(parsedResult.claims)) {
      return NextResponse.json({ error: "Invalid response format from AI." }, { status: 500 });
    }

    return NextResponse.json(parsedResult);
  } catch (error) {
    console.error("Route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
