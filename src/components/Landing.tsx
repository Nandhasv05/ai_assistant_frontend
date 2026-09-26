import { LANDING_CARDS, LANDING_EXAMPLES, WORKSPACE_CHIPS } from "../lib/copilot.ts";
import { getModule } from "../lib/modules.ts";
import type { WorkspaceId } from "../types.ts";

interface LandingProps {
  workspace: WorkspaceId;
  onAsk: (question: string, module?: Exclude<WorkspaceId, "overview">) => void;
}

export function Landing({ workspace, onAsk }: LandingProps) {
  const module = workspace === "overview" ? undefined : getModule(workspace);
  const chips = module?.actions.length ? module.actions : WORKSPACE_CHIPS;
  const cards = module
    ? module.actions.map((action) => ({ label: action.label, question: action.question, module: module.id }))
    : LANDING_CARDS;

  return (
    <section className="landing">
      <p className="eyebrow">EVOLV AI COPILOT</p>
      <h2>{module ? `Ask questions about ${module.name}` : "How can I help with your SAP data?"}</h2>
      <p>{module?.blurb ?? "Ask questions about your SAP business data. Every answer is structured as data, insight, and recommended action."}</p>

      <div className="landing-chips">
        {chips.map((chip) => (
          <button key={chip.question} type="button" className="prompt-chip" onClick={() => onAsk(chip.question, module?.id)}>
            {chip.label}
          </button>
        ))}
      </div>

      <div className="landing-grid">
        {cards.map((card) => (
          <button key={card.label} type="button" className="landing-card" onClick={() => onAsk(card.question, card.module)}>
            <span>{card.module.toUpperCase()}</span>
            <strong>{card.label}</strong>
            <em>{card.question}</em>
          </button>
        ))}
      </div>

      {!module && (
        <ul className="example-list">
          {LANDING_EXAMPLES.map((example) => (
            <li key={example}>
              <button type="button" onClick={() => onAsk(example)}>
                {example}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
