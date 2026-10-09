export interface ProjectFile {
  content: string;
}

export interface ProjectFiles {
  [path: string]: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  changesSummary?: string;
  timestamp?: number;
}

export interface Snapshot {
  id: string;
  timestamp: number;
  label: string;
  files: ProjectFiles;
}

export interface Project {
  id: string;
  name: string;
  projectType: "website" | "mobile";
  description: string;
  updatedAt: number;
  files: ProjectFiles;
  chatHistory: ChatMessage[];
  snapshots: Snapshot[];
}

export interface GeminiResponse {
  explanation: string;
  changesSummary: string;
  files: ProjectFiles;
}

export interface Template {
  id: string;
  name: string;
  type: "website" | "mobile";
  description: string;
  category: string;
  prompt: string;
  files: ProjectFiles;
}

export type Theme = "light" | "dark";
export type PreviewDevice = "desktop" | "tablet" | "mobile";
export type ViewType = "dashboard" | "workspace";
export type ProjectType = "website" | "mobile";
