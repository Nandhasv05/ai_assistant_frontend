import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fallbackSuggestions } from "../lib/suggestions.ts";
import type { ChatMessage } from "../types.ts";
import { ResultView } from "./ResultView.tsx";

interface MessageBubbleProps {
  message: ChatMessage;
  index?: number;
  isLast?: boolean;
  onSuggest?: (question: string) => void;
  onRegenerate?: () => void;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function MessageBubble({ message, index = 0, isLast = false, onSuggest, onRegenerate }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const suggestions = message.suggestions?.length ? message.suggestions : fallbackSuggestions(message.content, Boolean(message.view));

  async function handleCopy() {
    const ok = await copyText(message.content);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  }

  return (
    <article
      className={`bubble-row ${isUser ? "bubble-row-user" : "bubble-row-assistant"}`}
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <div className={`avatar ${isUser ? "avatar-user" : "avatar-assistant"}`} aria-hidden="true">
        {isUser ? "You" : "AI"}
      </div>
      <div className={`bubble ${isUser ? "bubble-user" : "bubble-assistant"} ${message.error ? "bubble-error" : ""} ${message.view ? "bubble-rich" : ""}`}>
        <p className="bubble-label">{isUser ? "You asked" : "AI Assistant"}</p>
        {isUser || message.error ? (
          <p className="bubble-text">{message.content}</p>
        ) : (
          <>
            {message.content ? (
              <div className="markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
              </div>
            ) : null}
            {message.view && <ResultView view={message.view} workspace="overview" />}
          </>
        )}
        {!isUser && (
          <div className="bubble-tools">
            <button type="button" className="ghost-action" onClick={() => void handleCopy()}>
              {copied ? "Copied" : "Copy"}
            </button>
            {isLast && onRegenerate && (
              <button type="button" className="ghost-action" onClick={onRegenerate}>
                Retry
              </button>
            )}
          </div>
        )}
        {!isUser && !message.error && suggestions.length > 0 && onSuggest && (
          <div className="suggestion-row">
            {suggestions.map((item) => (
              <button key={item.question} type="button" className="chip" onClick={() => onSuggest(item.question)}>
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
