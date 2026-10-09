import { useState, useRef, useEffect } from "react";
import { Sparkles, Play, ArrowRight, Zap, Code2, Rocket } from "lucide-react";

const VIDEO_SRC = "/videos/AI_website_builder_advertisement…_20261002145710.mp4";

type Phase = "hero" | "playing" | "done";

export default function IntroPage({ onEnter }: { onEnter: () => void }) {
  const [phase, setPhase] = useState<Phase>("hero");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (phase !== "playing") return;
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      if (v.duration) setProgress((v.currentTime / v.duration) * 100);
    };
    const onEnded = () => { setPhase("done"); setTimeout(onEnter, 900); };
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onEnded);
    v.play().catch(() => {});
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", onEnded);
    };
  }, [phase, onEnter]);

  if (phase === "playing" || phase === "done") {
    return (
      <div className={`intro-video-overlay ${phase === "done" ? "intro-fade-out" : ""}`}>
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          className="intro-video"
          autoPlay
          playsInline
          muted
        />
        <div className="intro-progress-bar">
          <div className="intro-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        {phase === "done" && (
          <div className="intro-enter-flash">
            <Sparkles size={40} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="intro-root">
      {/* Animated background */}
      <div className="intro-bg-grid" />
      <div className="intro-bg-orb intro-orb-1" />
      <div className="intro-bg-orb intro-orb-2" />
      <div className="intro-bg-orb intro-orb-3" />
      <div className="intro-particles">
        {Array.from({ length: 30 }).map((_, i) => (
          <span
            key={i}
            className="intro-particle"
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 53) % 100}%`,
              animationDelay: `${(i * 0.23) % 5}s`,
              animationDuration: `${4 + (i % 5)}s`,
            }}
          />
        ))}
      </div>

      {/* Center content */}
      <div className="intro-center">
        <div className="intro-badge">
          <Zap size={12} /> AI-Powered App Builder
        </div>

        <div className="intro-logo-mark">
          <Sparkles size={36} />
        </div>

        <h1 className="intro-title">
          <span className="intro-title-line">APPFORGE</span>
          <span className="intro-title-accent">.AI</span>
        </h1>

        <p className="intro-subtitle">
          Build production-ready apps with AI. Describe it. Watch it come alive.
        </p>

        <div className="intro-features">
          <div className="intro-feature">
            <Code2 size={18} /> Instant Code Generation
          </div>
          <div className="intro-feature">
            <Rocket size={18} /> Beast Mode for Complex Builds
          </div>
          <div className="intro-feature">
            <Sparkles size={18} /> Live Preview & Edit
          </div>
        </div>

        <button className="intro-cta" onClick={() => setPhase("playing")}>
          <Play size={20} /> GET STARTED
          <ArrowRight size={18} className="intro-cta-arrow" />
        </button>

        <p className="intro-footer">
          Architected by Sahil Wagh · A 15-year-old innovator
        </p>
      </div>
    </div>
  );
}
