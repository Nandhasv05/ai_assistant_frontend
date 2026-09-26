import { useEffect, useState } from "react";
import { getModule } from "../lib/modules.ts";
import type { WorkspaceId } from "../types.ts";

interface LandingProps {
  workspace: WorkspaceId;
}

const DEFAULT_PROMPTS = ["What's on the agenda today?", "What can I help you with?"];

export function Landing({ workspace }: LandingProps) {
  const module = workspace === "overview" ? undefined : getModule(workspace);
  const lines = module
    ? [`Ask about ${module.name}`, `What can I help you with in ${module.name}?`]
    : DEFAULT_PROMPTS;
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"in" | "out">("in");

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPhase("out");
      window.setTimeout(() => {
        setIndex((current) => (current + 1) % lines.length);
        setPhase("in");
      }, 320);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [lines.length, workspace]);

  return (
    <section className="landing landing-hero" aria-live="polite">
      <div className={`landing-hero-copy is-${phase}`}>
        <p className="landing-hero-kicker">{module ? `${module.name} assistant` : "Evolv Chatbot"}</p>
        <h2 key={`${workspace}-${index}`}>{lines[index % lines.length]}</h2>
      </div>
    </section>
  );
}
