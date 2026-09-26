import { ArrowUp, Paperclip } from "lucide-react";
import { useRef, type ChangeEvent, type KeyboardEvent } from "react";
import type { WorkspaceId } from "../types.ts";

interface CommandBarProps {
  value: string;
  disabled: boolean;
  workspace: WorkspaceId;
  suggestions: Array<{ label: string; question: string }>;
  onChange: (value: string) => void;
  onSend: () => void;
  onQuickAsk: (question: string) => void;
  onUpload?: (file: File) => void;
}

export function CommandBar({
  value,
  disabled,
  workspace,
  suggestions,
  onChange,
  onSend,
  onQuickAsk,
  onUpload,
}: CommandBarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const canSend = value.trim().length > 0;

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend && !disabled) onSend();
    }
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file && onUpload) onUpload(file);
    event.target.value = "";
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
          if (canSend && !disabled) onSend();
        }}
      >
        <input
          ref={fileRef}
          type="file"
          className="sr-only"
          accept=".csv,.xlsx,.xls,.pdf,.txt,.png,.jpg,.jpeg"
          onChange={handleFile}
          tabIndex={-1}
        />
        <button
          type="button"
          className="command-icon-btn"
          title="Upload file"
          aria-label="Upload file"
          disabled={disabled}
          onClick={() => fileRef.current?.click()}
        >
          <Paperclip size={18} strokeWidth={2} />
        </button>

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

        <button
          type="submit"
          className="btn-send-icon"
          disabled={disabled || !canSend}
          title="Send"
          aria-label="Send"
        >
          <ArrowUp size={18} strokeWidth={2.4} />
        </button>
      </form>
    </div>
  );
}
