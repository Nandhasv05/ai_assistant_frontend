import { useRef } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { getModule } from "../lib/modules.ts";
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

function appendToken(value: string, token: string): string {
  const prefix = value && !value.endsWith(" ") ? `${value} ` : value;
  return `${prefix}${token}`;
}

export function CommandBar({ value, disabled, workspace, suggestions, onChange, onSend, onQuickAsk }: CommandBarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const module = workspace === "overview" ? undefined : getModule(workspace);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  }

  function attachFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    onChange(appendToken(value, `[Attached: ${file.name}] `));
  }

  function startVoice() {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) {
      onChange(appendToken(value, ""));
      return;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      return;
    }
    const recognition = new Speech();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const spoken = event.results[0]?.[0]?.transcript?.trim();
      if (spoken) onChange(appendToken(value, spoken));
    };
    recognition.onend = () => {
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    recognition.start();
  }

  return (
    <div className="command-bar">
      {suggestions.length > 0 && (
        <div className="command-suggest">
          <span>Suggested</span>
          {suggestions.slice(0, 3).map((item) => (
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
        <input ref={fileRef} className="sr-only" type="file" onChange={attachFile} />
        <button type="button" className="command-tool" title="Attach a file reference" onClick={() => fileRef.current?.click()}>
          +
        </button>
        <button
          type="button"
          className="command-tool"
          title="Mention a sales document"
          onClick={() => onChange(appendToken(value, "sales order "))}
        >
          @
        </button>
        <label className="sr-only" htmlFor="copilot-input">
          Ask EVOLV
        </label>
        <textarea
          id="copilot-input"
          rows={1}
          placeholder={module?.placeholder ?? "Ask EVOLV about your SAP data…"}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button type="button" className="command-tool" title="Voice input" onClick={startVoice} disabled={disabled}>
          Mic
        </button>
        <button type="submit" className="btn-primary" disabled={disabled || value.trim().length === 0}>
          Send
        </button>
      </form>
      <p className="command-hint">Enter to send · Shift + Enter for a new line</p>
    </div>
  );
}

interface SpeechRecognitionResultList {
  [index: number]: { [index: number]: { transcript: string } };
}

interface SpeechRecognition {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: SpeechRecognitionResultList }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}
