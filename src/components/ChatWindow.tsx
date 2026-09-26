import { useEffect, useRef, useState } from "react";
import { LOADING_STEPS } from "../lib/copilot.ts";
import type { ChatMessage, WorkspaceId } from "../types.ts";
import { CopilotTurn } from "./CopilotTurn.tsx";
import { Landing } from "./Landing.tsx";

interface ChatWindowProps {
  messages: ChatMessage[];
  loading: boolean;
  workspace: WorkspaceId;
  onAsk: (question: string, module?: Exclude<WorkspaceId, "overview">) => void;
  onRetry: () => void;
}

export function ChatWindow({ messages, loading, workspace, onAsk, onRetry }: ChatWindowProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, step]);

  useEffect(() => {
    if (!loading) {
      setStep(0);
      return;
    }
    const timer = window.setInterval(() => setStep((current) => (current + 1) % LOADING_STEPS.length), 900);
    return () => window.clearInterval(timer);
  }, [loading]);

  const lastUser = [...messages].reverse().find((message) => message.role === "user")?.content;

  if (messages.length === 0 && !loading) {
    return <Landing workspace={workspace} onAsk={onAsk} />;
  }

  return (
    <section className="workspace" aria-live="polite">
      {messages.map((message) => (
        <CopilotTurn
          key={message.id}
          message={message}
          lastUser={lastUser}
          workspace={workspace}
          onAsk={(question) => onAsk(question)}
          onRetry={message.role === "assistant" ? onRetry : undefined}
        />
      ))}
      {loading && (
        <article className="loading-card" role="status">
          <span className="skeleton" />
          <p>{LOADING_STEPS[step]}</p>
        </article>
      )}
      <div ref={endRef} />
    </section>
  );
}
