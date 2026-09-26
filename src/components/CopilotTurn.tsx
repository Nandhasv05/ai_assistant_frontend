import { useState } from "react";
import { followUpsFor, isEmptyAnswer } from "../lib/copilot.ts";
import type { ChatMessage, WorkspaceId } from "../types.ts";
import { ResultView } from "./ResultView.tsx";

interface CopilotTurnProps {
  message: ChatMessage;
  lastUser?: string;
  workspace: WorkspaceId;
  onAsk: (question: string) => void;
  onRetry?: () => void;
}

export function CopilotTurn({ message, lastUser, workspace, onAsk, onRetry }: CopilotTurnProps) {
  const [copied, setCopied] = useState(false);

  if (message.role === "user") {
    return (
      <article className="turn turn-user">
        <div className="turn-avatar avatar-user" aria-hidden="true">
          You
        </div>
        <div className="turn-body">
          <p className="turn-role">You asked</p>
          <div className="turn-user-bubble">{message.content}</div>
        </div>
      </article>
    );
  }

  if (message.error || isEmptyAnswer(message.content)) {
    const order = lastUser?.match(/\b(\d{4,12})\b/)?.[1];
    return (
      <article className="turn turn-assistant">
        <div className="turn-avatar avatar-ai" aria-hidden="true">
          EV
        </div>
        <div className="turn-body">
          <p className="turn-role">EVOLV Copilot</p>
          <div className="empty-card">
            <span className={`empty-badge ${message.error ? "is-error" : "is-warn"}`}>
              {message.error ? "Request failed" : "No data found"}
            </span>
            <h3>{message.error ? "SAP data could not be retrieved" : "We could not find matching SAP records"}</h3>
            <p>{message.content}</p>
            <ul>
              <li>The sales order may not contain that information</li>
              <li>SAP data may not have synchronized yet</li>
              <li>The document number may be incorrect</li>
            </ul>
            <div className="action-row">
              {onRetry && (
                <button type="button" className="btn-primary" onClick={onRetry}>
                  Try again
                </button>
              )}
              <button
                type="button"
                className="btn-secondary"
                onClick={() => onAsk(order ? `Show sales order ${order}` : "This month's sales summary")}
              >
                Check sales order
              </button>
              <button type="button" className="btn-secondary" onClick={() => onAsk("How many sales orders today?")}>
                Search SAP
              </button>
            </div>
          </div>
        </div>
      </article>
    );
  }

  const followUps = message.suggestions?.length ? message.suggestions : followUpsFor(workspace, lastUser);

  function copyAnswer() {
    const text = message.view
      ? [message.view.title, ...message.view.kpis.map((kpi) => `${kpi.label}: ${kpi.value}`)].join("\n")
      : message.content;
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    });
  }

  return (
    <article className="turn turn-assistant">
      <div className="turn-avatar avatar-ai" aria-hidden="true">
        EV
      </div>
      <div className="turn-body">
        <div className="turn-role-row">
          <p className="turn-role">EVOLV Copilot</p>
          <button type="button" className="ghost-action" onClick={copyAnswer}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        {message.view ? (
          <ResultView view={message.view} workspace={workspace} onAsk={onAsk} />
        ) : (
          <div className="text-card">
            <p>{message.content}</p>
          </div>
        )}
        {followUps.length > 0 && (
          <div className="follow-row">
            <span>Suggested follow-up</span>
            <div className="follow-chips">
              {followUps.map((item) => (
                <button key={item.question} type="button" className="prompt-chip" onClick={() => onAsk(item.question)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
