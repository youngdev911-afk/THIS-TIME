export interface HelpChatMessage {
  role: "user" | "assistant";
  text: string;
}

export async function askHelpAssistant(
  message: string,
  history: HelpChatMessage[] = []
): Promise<string> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase is not configured.");
  }

  const endpoint = `${supabaseUrl}/functions/v1/help-chat`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ message, history }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: `Request failed (${res.status})` }));
    throw new Error(errBody.error || `Request failed (${res.status})`);
  }

  const data = await res.json();
  if (!data.reply) throw new Error("No reply from help assistant.");
  return data.reply as string;
}
