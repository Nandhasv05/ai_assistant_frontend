import { getModule } from "../lib/modules.ts";
import type { WorkspaceId } from "../types.ts";

interface ContextPanelProps {
  open: boolean;
  workspace: WorkspaceId;
  order: string | null;
  facts: Array<{ label: string; value: string }>;
  onAction: (question: string) => void;
  onClose: () => void;
}

export function ContextPanel({ open, workspace, order, facts, onAction, onClose }: ContextPanelProps) {
  const module = workspace === "overview" ? undefined : getModule(workspace);

  return (
    <aside className={`context-panel ${open ? "is-open" : ""}`}>
      <header>
        <div>
          <p>Context</p>
          <h2>Current inquiry</h2>
        </div>
        <button type="button" className="ghost-action" onClick={onClose}>
          Hide
        </button>
      </header>

      <dl>
        <div>
          <dt>Current module</dt>
          <dd>{module?.name ?? "Overview"}</dd>
        </div>
        <div>
          <dt>Selected sales order</dt>
          <dd>{order ?? "Not selected"}</dd>
        </div>
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>

      <p className="sidebar-label">Quick actions</p>
      <div className="context-actions">
        <button type="button" className="btn-secondary" onClick={() => onAction(order ? `Show sales order ${order}` : "This month's sales summary")}>
          View sales order
        </button>
        <button type="button" className="btn-secondary" onClick={() => onAction(order ? `Show BOM components for ${order}` : "Show BOM components for a sales order")}>
          View BOM
        </button>
        <button type="button" className="btn-secondary" onClick={() => onAction(order ? `View procurement details for ${order}` : "View procurement details for a sales order")}>
          View procurement
        </button>
        <button type="button" className="btn-secondary" onClick={() => onAction("Materials created this month")}>
          View materials
        </button>
        <button type="button" className="btn-secondary" onClick={() => onAction(order ? `Show fabric utilization for ${order}` : "Show fabric utilization for a sales order")}>
          View fabric
        </button>
      </div>
    </aside>
  );
}
