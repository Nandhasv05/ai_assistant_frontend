import type { KeyboardEvent } from "react";
import { getModule } from "../lib/modules.ts";
import { QUICK_ASKS } from "../lib/suggestions.ts";
import type { WorkspaceId } from "../types.ts";

interface ChatInputProps {
  value: string;
  disabled: boolean;
  canRegenerate: boolean;
  workspace: WorkspaceId;
  onChange: (value: string) => void;
  onSend: () => void;
  onQuickAsk: (question: string) => void;
  onRegenerate: () => void;
}

export function ChatInput({
  value,
  disabled,
  canRegenerate,
  workspace,
  onChange,
  onSend,
  onQuickAsk,
  onRegenerate,
}: ChatInputProps) {
  const module = workspace === "overview" ? undefined : getModule(workspace);
  const chips = module?.actions ?? QUICK_ASKS;

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  }

  return (
    <div className="composer-wrap">
      {chips.length > 0 && (
        <div className="quick-asks">
          {chips.map((item) => (
            <button key={item.question} type="button" className="chip" disabled={disabled} onClick={() => onQuickAsk(item.question)}>
              {item.label}
            </button>
          ))}
        </div>
      )}
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
      >
        <label className="sr-only" htmlFor="chat-input">
          Message EVOLV Assistant
        </label>
        <textarea
          id="chat-input"
          rows={1}
          placeholder={module?.placeholder ?? "Message EVOLV Assistant…"}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button type="button" className="ghost-action" disabled={disabled || !canRegenerate} onClick={onRegenerate}>
          Retry
        </button>
        <button type="submit" disabled={disabled || value.trim().length === 0}>
          Send
        </button>
      </form>
      <p className="composer-hint">Enter to run · Shift+Enter for a new line · answers use live SAP only</p>
    </div>
  );
}
