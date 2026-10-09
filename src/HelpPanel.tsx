import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, X, CircleHelp as HelpCircle, Lightbulb } from "lucide-react";
import { askHelpAssistant, type HelpChatMessage } from "./helpChatClient";

interface HelpPanelProps {
  open: boolean;
  onClose: () => void;
}

const QUICK_HELP = [
  "How do I create a new project?",
  "What is Beast Mode?",
  "How do I use version history?",
  "What are the quick prompts?",
  "How do I edit code manually?",
  "Any tips or tricks?",
];

export default function HelpPanel({ open, onClose }: HelpPanelProps) {
  const [messages, setMessages] = useState<HelpChatMessage[]>([
    { role: "assistant", text: "Hi! I'm your AppForge guide. Ask me anything about how to use this platform — features, tips, tricks, secrets. I'm here to help you get the most out of it!" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    const newHistory = [...messages, { role: "user" as const, text: msg }];
    setMessages(newHistory);
    setLoading(true);
    try {
      const reply = await askHelpAssistant(msg, newHistory.slice(0, -1));
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", text: `Sorry, I couldn't get a response right now. ${err instanceof Error ? err.message : "Please try again."}` }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="help-panel-backdrop" onClick={onClose} />
      <aside className="help-panel">
        <div className="help-panel-header">
          <div className="help-agent">
            <div className="help-mark"><HelpCircle size={15} /></div>
            <div>
              <strong>Platform Guide</strong>
              <small><span className="green-dot" /> {loading ? "Thinking..." : "Ready to help"}</small>
            </div>
          </div>
          <button className="help-close" onClick={onClose}><X size={17} /></button>
        </div>

        <div className="help-scroll" ref={scrollRef}>
          {messages.map((msg, idx) => (
            <div key={idx} className={`help-message ${msg.role}`}>
              {msg.role === "assistant" && <Sparkles size={11} className="help-msg-icon" />}
              <div>{msg.text}</div>
            </div>
          ))}
          {loading && (
            <div className="help-typing">
              <span /> <span /> <span />
            </div>
          )}
        </div>

        <div className="help-quick">
          {QUICK_HELP.map((q) => (
            <button key={q} onClick={() => send(q)} disabled={loading}>
              <Lightbulb size={9} /> {q}
            </button>
          ))}
        </div>

        <div className="help-composer">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask about using AppForge..."
            rows={2}
            disabled={loading}
          />
          <button onClick={() => send()} disabled={!input.trim() || loading}>
            <Send size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}
