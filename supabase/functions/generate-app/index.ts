import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_MODEL = "gemini-2.0-flash";

const SYSTEM_INSTRUCTION = `You are AppForge AI, a world-class full-stack developer and UI/UX designer.
Your job is to generate or modify web application files based on the user's prompt.

CRITICAL RULES:
1. ALWAYS return a valid JSON object with exactly these keys: "explanation", "changesSummary", "files"
2. "files" must be an object mapping filenames to file contents (strings)
3. Always include "index.html", "styles.css", and "app.js" in the files object
4. The "index.html" should reference "styles.css" and "app.js" via <link> and <script> tags
5. Use Tailwind CSS via CDN (https://cdn.tailwindcss.com) in index.html for styling
6. Use Font Awesome via CDN for icons if needed
7. Make designs beautiful, modern, production-ready, and responsive
8. "explanation" should be a brief 1-2 sentence description of what was built/changed
9. "changesSummary" should be a short bullet-style summary of key changes (max 100 chars)
10. NEVER wrap the JSON in markdown code fences — return raw JSON only
11. Ensure all JavaScript is functional and error-free
12. Keep all code in the three files — do not create additional files`;

interface GeminiPart {
  text?: string;
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
  finishReason?: string;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

function buildPromptText(
  prompt: string,
  pType: string,
  existingFiles?: Record<string, string>
): string {
  let text = `User request: ${prompt}\n\nProject type: ${pType}\n\n`;

  if (existingFiles && Object.keys(existingFiles).length > 0) {
    text += `Current project files (modify these based on the request):\n\n`;
    for (const [filename, content] of Object.entries(existingFiles)) {
      text += `--- ${filename} ---\n${content}\n\n`;
    }
    text += `Please update the files based on the user's request. Return ALL three files (index.html, styles.css, app.js) with the changes applied.\n`;
  } else {
    text += `Create a complete new ${pType} application from scratch. Return ALL three files (index.html, styles.css, app.js).\n`;
  }

  return text;
}

async function callGemini(apiKey: string, promptText: string): Promise<Response> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  return fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ role: "user", parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    }),
  });
}

function tryParseJson(rawText: string): { parsed: Record<string, unknown> | null; truncated: boolean } {
  let text = rawText.trim();

  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
  }

  try {
    return { parsed: JSON.parse(text), truncated: false };
  } catch {
    // attempt salvage
  }

  const firstBrace = text.indexOf("{");
  if (firstBrace === -1) return { parsed: null, truncated: false };
  text = text.slice(firstBrace);

  let depth = 0;
  let inString = false;
  let escape = false;
  let lastValidClose = -1;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) lastValidClose = i; }
  }

  if (depth > 0 && !inString) {
    let salvaged = text;
    while (depth > 0) { salvaged += "}"; depth--; }
    try {
      return { parsed: JSON.parse(salvaged), truncated: true };
    } catch {
      // try closing open strings too
      if (inString) salvaged += '")';
    }
  }

  if (lastValidClose > 0) {
    try {
      return { parsed: JSON.parse(text.slice(0, lastValidClose + 1)), truncated: true };
    } catch {
      // fall through
    }
  }

  return { parsed: null, truncated: false };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { prompt, existingFiles, projectType } = body as {
      prompt?: string;
      existingFiles?: Record<string, string>;
      projectType?: string;
    };

    if (!prompt || typeof prompt !== "string") {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pType = projectType || "website";
    const promptText = buildPromptText(prompt, pType, existingFiles);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Collect API keys from env + database
    const keys: string[] = [];
    const envKey = Deno.env.get("GEMINI_API_KEY");
    if (envKey) keys.push(envKey);

    const { data: secretData } = await supabase
      .from("app_secrets")
      .select("value")
      .eq("key", "gemini_api_key")
      .maybeSingle();

    if (secretData?.value) keys.push(secretData.value);

    if (keys.length === 0) {
      return new Response(
        JSON.stringify({ error: "No Gemini API key configured. Please add your API key in Settings." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let geminiResponse: Response | null = null;
    let lastError = "";

    for (const key of keys) {
      const res = await callGemini(key, promptText);
      if (res.ok) {
        geminiResponse = res;
        break;
      }
      if (res.status === 429 || res.status === 503) {
        lastError = "Rate limit hit on API key";
        continue;
      }
      lastError = `API key error (${res.status})`;
    }

    if (!geminiResponse) {
      return new Response(
        JSON.stringify({ error: lastError || "All API keys exhausted. Please try again later." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data: GeminiResponse = await geminiResponse.json();
    const candidate = data.candidates?.[0];
    const rawText = candidate?.content?.parts?.[0]?.text;
    const finishReason = candidate?.finishReason;

    if (!rawText) {
      const msg = finishReason === "MAX_TOKENS"
        ? "The AI response was too large and got truncated. Please try a simpler request."
        : "No content returned from AI service.";
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { parsed, truncated } = tryParseJson(rawText);

    if (!parsed) {
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const files = parsed.files;
    if (!files || typeof files !== "object") {
      return new Response(
        JSON.stringify({ error: "Invalid AI response — no files returned." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const explanation = (parsed.explanation as string) || "Application updated.";
    let changesSummary = (parsed.changesSummary as string) || "";
    if (truncated && !changesSummary.includes("truncated")) {
      changesSummary += " (note: response was truncated)";
    }

    return new Response(
      JSON.stringify({ explanation, changesSummary, files }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
