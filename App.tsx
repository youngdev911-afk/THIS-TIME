import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Sparkles, Monitor, Tablet, Smartphone, RefreshCw, ExternalLink, Code2, Settings,
  History, Plus, Trash2, Send, Check, Globe, Smartphone as DevicePhone, KeyRound,
  Search, ChevronDown, ChevronRight, Terminal, Download, Rocket, Flame, X, Clock3,
  PanelLeftClose, PanelLeft, MoreHorizontal, Copy, WandSparkles, ShieldCheck, Zap,
  HelpCircle,
} from "lucide-react";
import type { Project, ChatMessage, Snapshot, Theme, PreviewDevice, ViewType, ProjectType, ProjectFiles, GeminiResponse } from "./types";
import { STARTER_TEMPLATES, createBlankFiles } from "./templates";
import { generateAppWithGemini } from "./geminiClient";
import HelpPanel from "./HelpPanel";
import IntroPage from "./IntroPage";

interface Toast { id: number; message: string; type: "info" | "success" | "error"; }

const MAX_WORDS = 30;
const countWords = (s: string) => s.trim() ? s.trim().split(/\s+/).length : 0;

const formatUpdated = (timestamp: number) => {
  const minutes = Math.max(1, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

export default function App() {
  const [showIntro, setShowIntro] = useState(() => !localStorage.getItem("appforge_visited"));
  const handleEnterApp = () => { localStorage.setItem("appforge_visited", "true"); setShowIntro(false); };
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const [newAppModalOpen, setNewAppModalOpen] = useState(false);
  const [selectedCreationType, setSelectedCreationType] = useState<ProjectType>("website");
  const [theme, setTheme] = useState<Theme>("dark");
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>(() => [{
    id: "proj-1", name: "VibeCart E-Commerce", projectType: "website",
    description: "Modern storefront with shopping cart and filter tabs", updatedAt: Date.now() - 3600000,
    files: STARTER_TEMPLATES[0].files,
    chatHistory: [{ role: "assistant", text: "Welcome to VibeCart! Use the AI Chat on the left to customize your store or ask for new features." }],
    snapshots: [{ id: "snap-1", timestamp: Date.now() - 3600000, label: "Initial Creation", files: STARTER_TEMPLATES[0].files }],
  }]);
  const [activeProjectId, setActiveProjectId] = useState("proj-1");
  const activeProject = useMemo(() => projects.find((p) => p.id === activeProjectId) || projects[0], [projects, activeProjectId]);
  const [workspaceTab, setWorkspaceTab] = useState<"preview" | "code">("preview");
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const [activeFile, setActiveFile] = useState("index.html");
  const [editedCode, setEditedCode] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("");
  const [generationProgress, setGenerationProgress] = useState(0);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [helpPanelOpen, setHelpPanelOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { if (activeProject?.files?.[activeFile]) setEditedCode(activeProject.files[activeFile]); }, [activeProjectId, activeFile, activeProject]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeProject?.chatHistory, isGenerating]);
  useEffect(() => {
    const handleMsg = (e: MessageEvent) => { if (e.data?.type === "RUNTIME_ERROR") setRuntimeError(e.data.error?.message || "Unknown error"); };
    window.addEventListener("message", handleMsg); return () => window.removeEventListener("message", handleMsg);
  }, []);
  const showToast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Date.now() + Math.random(); setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const openProject = (id: string, type?: ProjectType) => {
    const project = projects.find((p) => p.id === id); setActiveProjectId(id); setCurrentView("workspace");
    setPreviewDevice((type || project?.projectType) === "mobile" ? "mobile" : "desktop");
  };

  const handleStartNewProject = (template: (typeof STARTER_TEMPLATES)[0] | null = null) => {
    const newId = `proj-${Date.now()}`; const pType: ProjectType = template ? template.type : selectedCreationType;
    const initialFiles: ProjectFiles = template ? template.files : createBlankFiles(pType);
    const newProj: Project = {
      id: newId, name: template ? template.name : pType === "mobile" ? "New Mobile App" : "New Website",
      projectType: pType, description: template ? template.description : "Created with AppForge AI", updatedAt: Date.now(), files: initialFiles,
      chatHistory: [{ role: "assistant", text: `Project created! Type in the chat below to start building your ${pType === "mobile" ? "mobile application" : "website"}.` }],
      snapshots: [{ id: `snap-${Date.now()}`, timestamp: Date.now(), label: "Initial Project", files: initialFiles }],
    };
    setProjects((prev) => [newProj, ...prev]); setActiveProjectId(newId); setNewAppModalOpen(false); setCurrentView("workspace"); setPreviewDevice(pType === "mobile" ? "mobile" : "desktop"); showToast("New project created!", "success");
  };

  const handleSendMessage = async (customPrompt: string | null = null) => {
    const promptToSend = customPrompt || chatInput.trim(); if (!promptToSend || isGenerating) return;
    if (!customPrompt && countWords(chatInput) > MAX_WORDS) { showToast(`Please keep your message to ${MAX_WORDS} words or fewer.`, "error"); return; }
    if (customPrompt && countWords(customPrompt) > MAX_WORDS) { showToast(`Please keep your message to ${MAX_WORDS} words or fewer.`, "error"); return; }
    setChatInput(""); setIsGenerating(true); setRuntimeError(null); setGenerationStep("Analyzing current project..."); setGenerationProgress(20);
    setProjects((prev) => prev.map((p) => p.id === activeProjectId ? { ...p, chatHistory: [...p.chatHistory, { role: "user", text: promptToSend, timestamp: Date.now() } as ChatMessage] } : p));
    try {
      const response: GeminiResponse = await generateAppWithGemini({ prompt: promptToSend, existingFiles: activeProject.files, projectType: activeProject.projectType, onProgress: (step, prog) => { setGenerationStep(step); setGenerationProgress(prog); } });
      setProjects((prev) => prev.map((p) => {
        if (p.id !== activeProjectId) return p; const updatedFiles: ProjectFiles = { ...p.files, ...response.files };
        const snapshot: Snapshot = { id: `snap-${Date.now()}`, timestamp: Date.now(), label: `After: "${promptToSend.slice(0, 20)}..."`, files: updatedFiles };
        return { ...p, updatedAt: Date.now(), files: updatedFiles, chatHistory: [...p.chatHistory, { role: "assistant", text: response.explanation, changesSummary: response.changesSummary, timestamp: Date.now() }], snapshots: [snapshot, ...(p.snapshots || [])] };
      }));
      setPreviewKey((k) => k + 1); setLastFailedPrompt(null); showToast("Application updated successfully!", "success"); setShowCelebration(true); if (celebrationTimer.current) clearTimeout(celebrationTimer.current); celebrationTimer.current = setTimeout(() => setShowCelebration(false), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error"; setLastFailedPrompt(promptToSend);
      const isRateLimit = msg.includes("429") || msg.includes("rate limit") || msg.includes("quota");
      const userMsg = isRateLimit ? "The Gemini API rate limit was hit. Please wait a moment and try again." : `Error: ${msg}`;
      showToast(userMsg, "error"); setProjects((prev) => prev.map((p) => p.id === activeProjectId ? { ...p, chatHistory: [...p.chatHistory, { role: "assistant", text: userMsg }] } : p));
    } finally { setIsGenerating(false); setGenerationStep(""); setGenerationProgress(0); }
  };

  const bundleHtml = useMemo(() => {
    if (!activeProject?.files) return ""; let bundle = activeProject.files["index.html"] || "<div>Empty</div>";
    const css = activeProject.files["styles.css"] || "", js = activeProject.files["app.js"] || "";
    if (css.trim()) { const tag = `<style>${css}</style>`; bundle = bundle.includes("</head>") ? bundle.replace("</head>", `${tag}</head>`) : tag + bundle; }
    if (js.trim()) { const tag = `<script>try{${js}}catch(e){console.error(e)}</script>`; bundle = bundle.includes("</body>") ? bundle.replace("</body>", `${tag}</body>`) : bundle + tag; }
    return bundle;
  }, [activeProject]);
  const previewHtml = useMemo(() => {
    if (!activeProject?.files) return ""; let bundle = activeProject.files["index.html"] || "<div>Empty</div>";
    const css = activeProject.files["styles.css"] || "", js = activeProject.files["app.js"] || "";
    if (css.trim()) { const tag = `<style>${css}</style>`; bundle = bundle.includes("</head>") ? bundle.replace("</head>", `${tag}</head>`) : tag + bundle; }
    const errors = `<script>window.onerror=function(m){window.parent.postMessage({type:'RUNTIME_ERROR',error:{message:m}},'*');return false}</script>`;
    bundle = bundle.includes("</head>") ? bundle.replace("</head>", `${errors}</head>`) : errors + bundle;
    if (js.trim()) { const tag = `<script>try{${js}}catch(e){window.parent.postMessage({type:'RUNTIME_ERROR',error:{message:e.message}},'*')}</script>`; bundle = bundle.includes("</body>") ? bundle.replace("</body>", `${tag}</body>`) : bundle + tag; }
    return bundle;
  }, [activeProject]);
  const isDark = theme === "dark";
  const filteredProjects = projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  const wordCount = countWords(chatInput);
  const overLimit = wordCount > MAX_WORDS;

  if (showIntro) return <IntroPage onEnter={handleEnterApp} />;
  if (currentView === "dashboard") return (
    <div className="app-shell min-h-screen bg-[#080808] text-[#f4f4f2]">
      <header className="topbar">
        <div className="brand-lockup"><div className="brand-mark"><Sparkles size={18} /></div><span>AppForge</span></div>
        <div className="topbar-user"><span className="user-pill">young.jhdev911@gmail.com</span><button className="ghost-button"><Download size={15} /> Sign Out</button></div>
      </header>
      <main className="dashboard-main">
        <section className="dashboard-hero-grid">
          <div className="hero-card panel-card">
            <div className="eyebrow"><Sparkles size={14} /> Architected by Sahil <span>•</span> AI Workspace Active</div>
            <h1>Build apps with AI. <span>Zero friction.</span></h1>
            <p>Describe your application in plain language. AI generates robust architecture, clean components, and production-ready layouts instantly.</p>
            <button className="light-action" onClick={() => setNewAppModalOpen(true)}><Plus size={17} /> New Project</button>
          </div>
          <div className="guide-card panel-card">
            <div className="section-label"><Code2 size={15} /> PLATFORM GUIDE — HOW TO USE</div>
            <div className="guide-list"><div><b>01</b><span>Click <strong>New Project</strong> to launch the generator.</span></div><div><b>02</b><span>Type your app concept or select a starter template.</span></div><div><b>03</b><span>Open your workspace to preview and refine code live.</span></div></div>
          </div>
        </section>
        <section className="beast-banner">
          <div className="beast-icon"><Flame size={30} /></div><div className="beast-copy"><h2>Hard Coding Mode <span>BEAST MODE</span></h2><p>For massive, ultra-complex prompts. Dual-model relay pipeline: Phase 1 builds foundation & premium design, Phase 2 deeply expands all components — zero truncation, zero timeouts.</p></div>
          <div className="pipeline"><span><Code2 size={13} /> Phase 1: Foundation</span><ChevronRight size={15} /><span><WandSparkles size={13} /> Phase 2: Expansion</span></div><button className="beast-action" onClick={() => { setNewAppModalOpen(true); showToast("Beast Mode is ready for your next build", "info"); }}><Rocket size={16} /> Launch Beast Mode</button>
        </section>
        <div className="project-toolbar"><div className="search-field"><Search size={17} /><input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} /></div><button className="sort-button">Last updated <ChevronDown size={15} /></button></div>
        <div className="workspace-heading"><Clock3 size={15} /> ACTIVE WORKSPACES <span>({projects.length})</span></div>
        <section className="project-grid">
          {filteredProjects.map((p) => <article key={p.id} className="project-card panel-card"><div className="project-card-top"><div className="project-symbol"><Sparkles size={20} /></div><button className="icon-button" onClick={() => { setProjects((prev) => prev.filter((i) => i.id !== p.id)); showToast("Project deleted"); }}><MoreHorizontal size={18} /></button></div><h3>{p.name}</h3><p>{p.description}</p><div className="project-card-bottom"><span className="status-dot">● {formatUpdated(p.updatedAt)}</span><button className="orange-link" onClick={() => openProject(p.id)}>Open workspace <ChevronRight size={15} /></button></div></article>)}
          <button className="new-project-card" onClick={() => setNewAppModalOpen(true)}><span><Plus size={23} /></span><strong>New Project</strong><small>Start from a blank canvas</small></button>
        </section>
      </main>
      <HelpTriggerButton onClick={() => setHelpPanelOpen(true)} />
      <HelpPanel open={helpPanelOpen} onClose={() => setHelpPanelOpen(false)} />
      {newAppModalOpen && <NewProjectModal selected={selectedCreationType} setSelected={setSelectedCreationType} onClose={() => setNewAppModalOpen(false)} onCreate={() => handleStartNewProject()} onTemplate={handleStartNewProject} />}
      <Toasts toasts={toasts} />
    </div>
  );

  return (
    <div className="workspace-shell min-h-screen bg-[#080808] text-[#f4f4f2]">
      <header className="workspace-topbar"><button className="back-button" onClick={() => setCurrentView("dashboard")}>‹</button><div className="workspace-title"><div className="brand-mark small"><Sparkles size={14} /></div><input value={activeProject.name} onChange={(e) => setProjects((prev) => prev.map((p) => p.id === activeProjectId ? { ...p, name: e.target.value } : p))} /><span className="draft-tag">draft</span></div><div className="workspace-actions"><button className="workspace-link" onClick={() => setHistoryModalOpen(true)}><History size={14} /> Versions</button><button className="workspace-link"><Download size={14} /> Export</button><button className="workspace-link" onClick={() => setSettingsModalOpen(true)}><Settings size={15} /></button><button className="publish-button"><Rocket size={14} /> Publish</button></div></header>
      <div className="workspace-body">
        {sidebarOpen && <aside className="file-sidebar"><div className="sidebar-title">Files <PanelLeftClose size={14} onClick={() => setSidebarOpen(false)} /></div>{Object.keys(activeProject.files).map((filename) => <button key={filename} onClick={() => { setActiveFile(filename); setWorkspaceTab("code"); }} className={`file-row ${activeFile === filename && workspaceTab === "code" ? "active" : ""}`}><span className="file-icon">{filename.endsWith("html") ? "◇" : filename.endsWith("css") ? "#" : "›_"}</span>{filename}</button>)}</aside>}
        {!sidebarOpen && <button className="sidebar-open" onClick={() => setSidebarOpen(true)}><PanelLeft size={15} /></button>}
        <main className="preview-area">
          <div className="preview-toolbar"><div className="browser-chrome"><span className="traffic red" /><span className="traffic yellow" /><span className="traffic green" /><span className="url-bar">appforge.preview/{activeProject.name.toLowerCase().replace(/\s+/g, "-")}</span></div><div className="device-switcher"><button className={previewDevice === "desktop" ? "selected" : ""} onClick={() => setPreviewDevice("desktop")}><Monitor size={14} /></button><button className={previewDevice === "tablet" ? "selected" : ""} onClick={() => setPreviewDevice("tablet")}><Tablet size={14} /></button><button className={previewDevice === "mobile" ? "selected" : ""} onClick={() => setPreviewDevice("mobile")}><Smartphone size={14} /></button><span className="live-status">● Live</span><button onClick={() => setPreviewKey((k) => k + 1)}><RefreshCw size={14} /></button><button onClick={() => { const url = URL.createObjectURL(new Blob([bundleHtml], { type: "text/html" })); window.open(url, "_blank"); setTimeout(() => URL.revokeObjectURL(url), 10000); }}><ExternalLink size={14} /></button></div></div>
          {runtimeError && !isGenerating && <div className="runtime-banner">Runtime error: {runtimeError}<button onClick={() => { setChatInput(`Fix this runtime error in the code: ${runtimeError}`); handleSendMessage(`Fix this runtime error in the code: ${runtimeError}`); }}>Fix automatically</button><X size={14} onClick={() => setRuntimeError(null)} /></div>}
          <div className={`preview-frame ${previewDevice}`}>
            {isGenerating && <div className="generation-overlay"><div className="generation-mark"><Sparkles size={28} /></div><h2>Building your app</h2><p>{generationStep || "AI is working on your request..."}</p><div className="progress-track"><div style={{ width: `${Math.max(5, generationProgress)}%` }} /></div><small>{generationProgress}% • Your existing app is being updated</small></div>}
            {workspaceTab === "preview" ? <iframe key={`${activeProject.id}-${activeProject.updatedAt}-${previewKey}`} title="Live App Preview" srcDoc={previewHtml} className="preview-iframe" sandbox="allow-scripts allow-modals allow-forms allow-same-origin" /> : <div className="code-editor"><div className="code-tabs">{Object.keys(activeProject.files).map((filename) => <button key={filename} onClick={() => setActiveFile(filename)} className={activeFile === filename ? "selected" : ""}>{filename}</button>)}<button className="save-code" onClick={() => { setProjects((prev) => prev.map((p) => p.id === activeProjectId ? { ...p, files: { ...p.files, [activeFile]: editedCode }, updatedAt: Date.now() } : p)); setPreviewKey((k) => k + 1); showToast(`Saved changes to ${activeFile}`, "success"); }}>Save file</button></div><textarea value={editedCode} onChange={(e) => setEditedCode(e.target.value)} spellCheck={false} /></div>}
          </div>
        </main>
        <aside className="ai-sidebar"><div className="ai-header"><div className="ai-agent"><div className="brand-mark small"><Sparkles size={14} /></div><div><strong>AI Agent</strong><small><span className="green-dot" /> Ready</small></div></div><MoreHorizontal size={17} /></div><div className="chat-scroll">{activeProject.chatHistory.map((msg, idx) => <div key={idx} className={`chat-message ${msg.role}`}><div>{msg.text}</div>{msg.changesSummary && <small>{msg.changesSummary}</small>}</div>)}{isGenerating && <div className="build-message"><span className="green-dot" /> {generationStep || "AI is building..."}<div className="mini-progress"><div style={{ width: `${generationProgress}%` }} /></div></div>}{lastFailedPrompt && !isGenerating && <button className="retry-button" onClick={() => { setLastFailedPrompt(null); handleSendMessage(lastFailedPrompt); }}>Retry last request</button>}<div ref={chatEndRef} /></div><div className="quick-prompts"><button onClick={() => handleSendMessage("Improve the design")}>✦ Improve design</button><button onClick={() => handleSendMessage("Make responsive")}>▣ Make responsive</button><button onClick={() => handleSendMessage("Add animations")}>ϟ Add animations</button><button onClick={() => handleSendMessage("Fix errors")}>⌁ Fix errors</button><button onClick={() => handleSendMessage("Add dark mode")}>◐ Add dark mode</button><button onClick={() => handleSendMessage("Refactor code")}>‹› Refactor code</button></div><div className="composer-glow-wrap"><div className="composer-particles">{Array.from({ length: 14 }).map((_, i) => { const isRed = i % 2 === 0; const left = 5 + ((i * 37) % 90); const top = 10 + ((i * 53) % 80); const delay = (i * 0.35) % 4; const duration = 3.5 + (i % 4) * 0.7; return <span key={i} className={`composer-particle ${isRed ? "p-red" : "p-blue"}`} style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${delay}s`, animationDuration: `${duration}s` }} />; })}</div><div className="chat-composer"><textarea value={chatInput} onChange={(e) => { const val = e.target.value; const words = countWords(val); if (words <= MAX_WORDS || val.length < chatInput.length) setChatInput(val); }} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder={`Tell AI what to build or change... (max ${MAX_WORDS} words)`} rows={3} disabled={isGenerating} /><div className="composer-bottom"><span className={`word-counter ${overLimit ? "over" : ""}`}>{wordCount}/{MAX_WORDS} words</span><button onClick={() => handleSendMessage()} disabled={!chatInput.trim() || isGenerating || overLimit}><Send size={17} /></button></div></div></div></aside>
      </div>
      <HelpTriggerButton onClick={() => setHelpPanelOpen(true)} />
      <HelpPanel open={helpPanelOpen} onClose={() => setHelpPanelOpen(false)} />
      {settingsModalOpen && <SettingsModal theme={theme} setTheme={setTheme} apiKeyInput={apiKeyInput} setApiKeyInput={setApiKeyInput} apiKeySaving={apiKeySaving} apiKeySaved={apiKeySaved} setApiKeySaving={setApiKeySaving} setApiKeySaved={setApiKeySaved} onClose={() => setSettingsModalOpen(false)} showToast={showToast} />}
      {historyModalOpen && <HistoryModal project={activeProject} onClose={() => setHistoryModalOpen(false)} onRestore={(snap) => { setProjects((prev) => prev.map((p) => p.id === activeProjectId ? { ...p, files: snap.files, updatedAt: Date.now() } : p)); setHistoryModalOpen(false); setPreviewKey((k) => k + 1); showToast("Snapshot restored successfully!", "success"); }} />}
      {showCelebration && <CelebrationOverlay />}
      <Toasts toasts={toasts} />
    </div>
  );
}

function NewProjectModal({ selected, setSelected, onClose, onCreate, onTemplate }: { selected: ProjectType; setSelected: (v: ProjectType) => void; onClose: () => void; onCreate: () => void; onTemplate: (t: (typeof STARTER_TEMPLATES)[0]) => void }) {
  return <div className="modal-backdrop"><div className="modal-card"><div className="modal-heading"><span className="eyebrow"><WandSparkles size={14} /> New workspace</span><button onClick={onClose}><X size={17} /></button><h2>What do you want to build?</h2><p>Choose a starting point. You can reshape everything with AI afterward.</p></div><div className="creation-options"><button className={selected === "website" ? "selected" : ""} onClick={() => setSelected("website")}><Globe size={24} /><strong>Website / Web App</strong><small>Dashboards, commerce, portfolios, SaaS.</small></button><button className={selected === "mobile" ? "selected" : ""} onClick={() => setSelected("mobile")}><DevicePhone size={24} /><strong>Mobile App</strong><small>Productivity, social, utility, and more.</small></button></div><div className="template-strip"><span>Start with a template</span>{STARTER_TEMPLATES.slice(0, 3).map((t) => <button key={t.id} onClick={() => onTemplate(t)}>{t.name}</button>)}</div><div className="modal-footer"><button className="ghost-button" onClick={onClose}>Cancel</button><button className="orange-action" onClick={onCreate}><Plus size={15} /> Continue</button></div></div></div>;
}

function SettingsModal({ theme, setTheme, apiKeyInput, setApiKeyInput, apiKeySaving, apiKeySaved, setApiKeySaving, setApiKeySaved, onClose, showToast }: { theme: Theme; setTheme: (v: Theme) => void; apiKeyInput: string; setApiKeyInput: (v: string) => void; apiKeySaving: boolean; apiKeySaved: boolean; setApiKeySaving: (v: boolean) => void; setApiKeySaved: (v: boolean) => void; onClose: () => void; showToast: (message: string, type?: Toast["type"]) => void }) {
  return <div className="modal-backdrop"><div className="modal-card settings-card"><div className="modal-heading"><button onClick={onClose}><X size={17} /></button><h2>Workspace settings</h2><p>Configure the project without leaving your build.</p></div><label>Theme<select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}><option value="dark">Dark workspace</option><option value="light">Light workspace</option></select></label><label>Gemini API key<div className="key-row"><input type="password" placeholder="AIzaSy..." value={apiKeyInput} onChange={(e) => { setApiKeyInput(e.target.value); setApiKeySaved(false); }} /><button className="orange-action" disabled={apiKeySaving || !apiKeyInput.trim()} onClick={async () => { if (apiKeyInput.trim().length < 10) { showToast("Please enter a valid API key", "error"); return; } setApiKeySaving(true); try { const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-api-key`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` }, body: JSON.stringify({ apiKey: apiKeyInput.trim() }) }); if (!res.ok) throw new Error("Failed to save key"); setApiKeySaved(true); setApiKeyInput(""); showToast("API key saved securely", "success"); } catch (err) { showToast(err instanceof Error ? err.message : "Failed to save key", "error"); } finally { setApiKeySaving(false); } }}>{apiKeySaving ? "Saving..." : apiKeySaved ? "Saved" : "Save key"}</button></div></label><div className="secure-note"><ShieldCheck size={16} /> Your key is stored securely on the server and never exposed in the browser.</div><div className="modal-footer"><button className="orange-action" onClick={onClose}>Done</button></div></div></div>;
}

function HistoryModal({ project, onClose, onRestore }: { project: Project; onClose: () => void; onRestore: (snapshot: Snapshot) => void }) {
  return <div className="modal-backdrop"><div className="modal-card"><div className="modal-heading"><button onClick={onClose}><X size={17} /></button><h2>Version history</h2><p>Restore a saved point in your project timeline.</p></div><div className="history-list">{project.snapshots?.map((snap) => <div className="history-row" key={snap.id}><div><strong>{snap.label}</strong><small>{new Date(snap.timestamp).toLocaleString()}</small></div><button className="orange-action" onClick={() => onRestore(snap)}>Restore</button></div>)}</div></div></div>;
}

function HelpTriggerButton({ onClick }: { onClick: () => void }) { return <button className="help-trigger-arrow" onClick={onClick} title="Open Help & Tips"><HelpCircle size={22} /></button>; }

function Toasts({ toasts }: { toasts: Toast[] }) { return <div className="toast-stack">{toasts.map((t) => <div className="toast" key={t.id}><Check size={15} className={t.type === "error" ? "error-icon" : "success-icon"} />{t.message}</div>)}</div>; }

function CelebrationOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const w = window.innerWidth, h = window.innerHeight, dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.width = w + "px"; canvas.style.height = h + "px"; ctx.scale(dpr, dpr);
    const cx = w / 2, cy = h / 2;
    const colors = ["#ff4757", "#3b82f6", "#ffffff", "#ff9f43", "#ff6b1b", "#54a0ff"];
    type P = { x: number; y: number; vx: number; vy: number; color: string; size: number; life: number; maxLife: number };
    const particles: P[] = [];
    for (let i = 0; i < 100; i++) { const angle = (Math.PI * 2 * i) / 100 + (Math.random() - 0.5) * 0.4; const speed = 3 + Math.random() * 7; particles.push({ x: cx, y: cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1, color: colors[Math.floor(Math.random() * colors.length)], size: 2 + Math.random() * 5, life: 0, maxLife: 80 + Math.random() * 50 }); }
    let frame = 0, animId = 0;
    const animate = () => {
      ctx.clearRect(0, 0, w, h); frame++;
      if (frame < 60) { const a1 = 1 - frame / 60; const r1 = (frame / 60) * Math.max(w, h) * 0.4; ctx.strokeStyle = `rgba(255,113,26,${a1 * 0.5})`; ctx.lineWidth = 3 * a1; ctx.beginPath(); ctx.arc(cx, cy, r1, 0, Math.PI * 2); ctx.stroke(); const r2 = (frame / 60) * Math.max(w, h) * 0.25; ctx.strokeStyle = `rgba(59,130,246,${a1 * 0.4})`; ctx.lineWidth = 2 * a1; ctx.beginPath(); ctx.arc(cx, cy, r2, 0, Math.PI * 2); ctx.stroke(); }
      particles.forEach((p) => { p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.vx *= 0.985; p.life++; const alpha = Math.max(0, 1 - p.life / p.maxLife); ctx.globalAlpha = alpha; ctx.fillStyle = p.color; ctx.shadowBlur = 12; ctx.shadowColor = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2); ctx.fill(); });
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      if (frame < 180) animId = requestAnimationFrame(animate); else ctx.clearRect(0, 0, w, h);
    };
    animate();
    return () => { cancelAnimationFrame(animId); };
  }, []);
  return (
    <div className="celebration-overlay">
      <canvas ref={canvasRef} />
      <div className="celebration-content">
        <div className="celebration-icon"><Sparkles size={32} /></div>
        <h2>App Updated</h2>
        <p>Your changes are now live</p>
      </div>
    </div>
  );
}
