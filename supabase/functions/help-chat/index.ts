import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_MODEL = "gemini-2.0-flash";

const SYSTEM_INSTRUCTION = `You are the AppForge AI Platform Guide — a helpful assistant embedded in the AppForge AI app builder.
Your job is to help users understand how to use AppForge AI effectively.

AppForge AI is a platform where users:
1. Create new projects (websites or mobile apps) from the dashboard
2. Describe what they want in plain language via the AI Chat sidebar
3. The AI generates/updates code (HTML, CSS, JS) in real-time
4. Preview their app live in an iframe with desktop/tablet/mobile views
5. Edit code manually in the code editor
6. Save version snapshots and restore them from Version History
7. Use Quick Prompts for common actions (improve design, make responsive, add animations, etc.)
8. Use Beast Mode for complex, multi-phase builds
9. Save their Gemini API key in Settings

Be concise, friendly, and practical. Keep answers under 3-4 sentences unless the user asks for detail.
If a question is not related to AppForge AI, gently redirect them back to platform features.`;

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { message, history } = body as { message?: string; history?: ChatMessage[] };

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Collect API keys
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

    // Build conversation contents from history + current message
    const contents = (history || []).map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.text }],
    }));
    contents.push({ role: "user", parts: [{ text: message }] });

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${keys[0]}`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!res.ok) {
      // Try next key if available
      if (keys.length > 1) {
        const endpoint2 = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${keys[1]}`;
        const res2 = await fetch(endpoint2, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
            contents,
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
          }),
        });

        if (!res2.ok) {
          return new Response(
            JSON.stringify({ error: "AI service is currently unavailable. Please try again." }),
            { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const data2 = await res2.json();
        const reply2 = data2?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!reply2) {
          return new Response(
            JSON.stringify({ error: "No reply from AI service." }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ reply: reply2 }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI service is currently unavailable. Please try again." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      return new Response(
        JSON.stringify({ error: "No reply from AI service." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ reply }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
