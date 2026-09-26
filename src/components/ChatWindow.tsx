import { useEffect, useRef, useState } from "react";
import { LOADING_STEPS } from "../lib/copilot.ts";
import type { AssistantView, ChatMessage, WorkspaceId } from "../types.ts";
import { CopilotTurn } from "./CopilotTurn.tsx";
import { Landing } from "./Landing.tsx";

interface ChatWindowProps {
  messages: ChatMessage[];
  loading: boolean;
  workspace: WorkspaceId;
  snapshot?: AssistantView;
  snapshotLoading?: boolean;
  onAsk: (question: string, module?: Exclude<WorkspaceId, "overview">) => void;
  onOpenModule?: (id: Exclude<WorkspaceId, "overview">) => void;
  onRetry: () => void;
}

export function ChatWindow({ messages, loading, workspace, snapshot, snapshotLoading, onAsk, onOpenModule, onRetry }: ChatWindowProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, step]);

  useEffect(() => {
    if (!loading) return;
    const timer = window.setInterval(() => setStep((current) => (current + 1) % LOADING_STEPS.length), 900);
    return () => window.clearInterval(timer);
  }, [loading]);

  const lastUser = [...messages].reverse().find((message) => message.role === "user")?.content;

  if (messages.length === 0 && !loading) {
    return (
      <Landing
        workspace={workspace}
        snapshot={snapshot}
        snapshotLoading={snapshotLoading}
        onAsk={onAsk}
        onOpenModule={onOpenModule}
      />
    );
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
        <article className="turn turn-assistant" role="status">
          <div className="turn-avatar avatar-ai is-thinking" aria-hidden="true">
            EV
          </div>
          <div className="turn-body">
            <p className="turn-role">EVOLV Copilot</p>
            <div className="loading-card">
              <div className="loading-status">
                <span className="loading-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <p>{LOADING_STEPS[step]}</p>
              </div>
              <ol className="loading-steps">
                {LOADING_STEPS.map((label, index) => (
                  <li key={label} className={index < step ? "is-done" : index === step ? "is-active" : ""}>
                    {label.replace(/…$/, "")}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </article>
      )}
      <div ref={endRef} />
    </section>
  );
}
