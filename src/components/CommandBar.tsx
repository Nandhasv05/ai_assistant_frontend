import type { KeyboardEvent } from "react";
import type { WorkspaceId } from "../types.ts";

interface CommandBarProps {
  value: string;
  disabled: boolean;
  workspace: WorkspaceId;
  suggestions: Array<{ label: string; question: string }>;
  onChange: (value: string) => void;
  onSend: () => void;
  onQuickAsk: (question: string) => void;
}

export function CommandBar({ value, disabled, workspace, suggestions, onChange, onSend, onQuickAsk }: CommandBarProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  }

  return (
    <div className="command-bar" data-module={workspace}>
      {suggestions.length > 0 && (
        <div className="command-suggest">
          {suggestions.slice(0, 4).map((item) => (
            <button key={item.question} type="button" disabled={disabled} onClick={() => onQuickAsk(item.question)}>
              {item.label}
            </button>
          ))}
        </div>
      )}
      <form
        className="command-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
      >
        <label className="sr-only" htmlFor="copilot-input">
          Ask a sales question
        </label>
        <textarea
          id="copilot-input"
          rows={1}
          placeholder="Ask a sales question..."
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button type="submit" className="btn-send" disabled={disabled || value.trim().length === 0}>
          Send
        </button>
      </form>
    </div>
  );
}
