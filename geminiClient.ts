import type {
  GeminiResponse,
  ProjectFiles,
  ProjectType,
} from "./types";

interface GenerateParams {
  prompt: string;
  existingFiles?: ProjectFiles;
  projectType?: ProjectType;
  onProgress?: (step: string, progress: number) => void;
}

export async function generateAppWithGemini({
  prompt,
  existingFiles = {},
  projectType = "website",
  onProgress,
}: GenerateParams): Promise<GeminiResponse> {
  if (onProgress) onProgress("Understanding your request...", 15);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase is not configured. Please check your environment.");
  }

  if (onProgress) onProgress("Planning application architecture...", 40);

  const endpoint = `${supabaseUrl}/functions/v1/generate-app`;

  if (onProgress) onProgress("Generating code with Gemini...", 70);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      prompt,
      existingFiles,
      projectType,
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: `Request failed (${res.status})` }));
    throw new Error(errBody.error || `Request failed (${res.status})`);
  }

  if (onProgress) onProgress("Validating generated application...", 90);

  const data = await res.json();

  if (!data || !data.files) {
    throw new Error("Invalid response from AI service — no files returned.");
  }

  return data as GeminiResponse;
}
