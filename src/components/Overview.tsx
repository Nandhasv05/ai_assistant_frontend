import { APP_MODULES } from "../lib/modules.ts";
import type { Conversation, WorkspaceId } from "../types.ts";

interface OverviewProps {
  conversations: Conversation[];
  health: "checking" | "ok" | "down";
  onOpenModule: (id: Exclude<WorkspaceId, "overview">) => void;
  onAsk: (question: string, module: Exclude<WorkspaceId, "overview">) => void;
  onOpenChat: (id: string) => void;
}

const TONES = ["violet", "sky", "rose", "amber", "mint", "indigo", "coral"];

export function Overview({ conversations, health, onOpenModule, onAsk, onOpenChat }: OverviewProps) {
  const recent = conversations.filter((conversation) => conversation.messages.length > 0).slice(0, 4);
  const status = health === "ok" ? "Live" : health === "down" ? "Offline" : "…";

  return (
    <section className="overview">
      <div className="gpt-hero">
        <span className={`live-pill is-${health}`}>{status} SAP</span>
        <h2>How can I help you today?</h2>
        <p>Ask like ChatGPT — sales, quotations, materials, procurement, BOM, trims, or fabric from live SAP.</p>
      </div>

      <div className="module-grid">
        {APP_MODULES.map((module, index) => (
          <article key={module.id} className={`ent-card tone-${TONES[index % TONES.length]}`}>
            <header>
              <span className="module-code">{module.code}</span>
              <h3>{module.name}</h3>
            </header>
            <p>{module.blurb}</p>
            <div className="card-actions">
              <button type="button" className="btn-primary" onClick={() => onOpenModule(module.id)}>
                Open
              </button>
              {module.actions[0] && (
                <button type="button" className="btn-ghost" onClick={() => onAsk(module.actions[0].question, module.id)}>
                  {module.actions[0].label}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {recent.length > 0 && (
        <div className="recent-strip">
          {recent.map((conversation) => (
            <button key={conversation.id} type="button" className="recent-chip" onClick={() => onOpenChat(conversation.id)}>
              {conversation.title}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
