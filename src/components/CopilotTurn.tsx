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
  if (message.role === "user") {
    return (
      <article className="turn turn-user">
        <span>You</span>
        <p>{message.content}</p>
      </article>
    );
  }

  if (message.error || isEmptyAnswer(message.content)) {
    const order = lastUser?.match(/\b(\d{4,12})\b/)?.[1];
    return (
      <article className="empty-card">
        <p className="result-mode">{message.error ? "Request failed" : "No data found"}</p>
        <h3>{message.error ? "SAP data could not be retrieved" : "We could not find matching SAP records"}</h3>
        <p>{message.content}</p>
        <ul>
          <li>The sales order may not contain that information</li>
          <li>SAP data has not synchronized</li>
          <li>The document number may be incorrect</li>
        </ul>
        <div className="action-row">
          {onRetry && (
            <button type="button" className="btn-primary" onClick={onRetry}>
              Try again
            </button>
          )}
          <button type="button" className="btn-secondary" onClick={() => onAsk(order ? `Show sales order ${order}` : "This month's sales summary")}>
            Check sales order
          </button>
          <button type="button" className="btn-secondary" onClick={() => onAsk("How many sales orders today?")}>
            Search SAP
          </button>
        </div>
      </article>
    );
  }

  const followUps = message.suggestions?.length ? message.suggestions : followUpsFor(workspace, lastUser);

  return (
    <article className="turn turn-assistant">
      <span>AI Copilot</span>
      {message.view ? (
        <ResultView view={message.view} workspace={workspace} onAsk={onAsk} />
      ) : (
        <div className="text-card">
          <p>{message.content}</p>
        </div>
      )}
      {followUps.length > 0 && (
        <div className="follow-row">
          <span>Follow-up</span>
          {followUps.map((item) => (
            <button key={item.question} type="button" className="prompt-chip" onClick={() => onAsk(item.question)}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
