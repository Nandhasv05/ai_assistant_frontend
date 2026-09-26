import { APP_MODULES } from "../lib/modules.ts";
import { LANDING_CARDS, LANDING_EXAMPLES, WORKSPACE_CHIPS } from "../lib/copilot.ts";
import { getModule } from "../lib/modules.ts";
import type { AssistantView, WorkspaceId } from "../types.ts";
import { MetricStrip } from "./MetricStrip.tsx";
import { NavIcon } from "./NavIcon.tsx";

interface LandingProps {
  workspace: WorkspaceId;
  snapshot?: AssistantView;
  snapshotLoading?: boolean;
  onAsk: (question: string, module?: Exclude<WorkspaceId, "overview">) => void;
  onOpenModule?: (id: Exclude<WorkspaceId, "overview">) => void;
}

export function Landing({ workspace, snapshot, snapshotLoading, onAsk, onOpenModule }: LandingProps) {
  const module = workspace === "overview" ? undefined : getModule(workspace);
  const chips = module?.actions.length ? module.actions : WORKSPACE_CHIPS;
  const cards = module
    ? module.actions.map((action) => ({ label: action.label, question: action.question, module: module.id }))
    : LANDING_CARDS;

  return (
    <section className={`landing ${snapshot || snapshotLoading ? "has-snapshot" : ""}`}>
      <div className="landing-intro">
        <div>
          <p className="eyebrow">{module ? `${module.code} · ${module.name.toUpperCase()}` : "EVOLV AI COPILOT"}</p>
          <h2>{module ? `${module.name} intelligence` : "Ask across all SAP business modules"}</h2>
          <p>
            {module?.blurb ??
              "One AI assistant for Sales, Quotations, Materials, Procurement, BOM/COOIS, Trims, and Fabric — live SAP data, structured answers, insights, and actions."}
          </p>
        </div>
        <div className="data-assurance" aria-label="Capabilities">
          <span>7 live SAP modules</span>
          <span>KPI · table · insight · export</span>
          <span>Traceable data source</span>
        </div>
      </div>

      {!module && (
        <div className="feature-grid">
          {APP_MODULES.map((item) => (
            <button
              key={item.id}
              type="button"
              className="feature-card"
              onClick={() => (onOpenModule ? onOpenModule(item.id) : onAsk(item.actions[0]?.question ?? item.blurb, item.id))}
            >
              <NavIcon name={item.id} />
              <strong>{item.name}</strong>
              <span>{item.code}</span>
              <em>{item.blurb}</em>
            </button>
          ))}
        </div>
      )}

      <MetricStrip view={snapshot} loading={snapshotLoading} />

      <p className="section-kicker">{module ? `${module.name} prompts` : "Cross-module prompts"}</p>
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
        <section className="example-block">
          <p className="section-kicker">Example questions</p>
          <ul className="example-list">
            {LANDING_EXAMPLES.map((example) => (
              <li key={example}>
                <button type="button" onClick={() => onAsk(example)}>
                  <span>{example}</span>
                  <b aria-hidden="true">→</b>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
