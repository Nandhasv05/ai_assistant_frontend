import type { WorkspaceId } from "../types.ts";

const PATHS: Record<WorkspaceId | "mic" | "attach" | "insight", string> = {
  overview: "M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z",
  sales: "M4 18V8m5 10V4m5 14v-7m5 7V6",
  quotations: "M7 4h10a2 2 0 0 1 2 2v14l-3.5-2-3.5 2-3.5-2L5 20V6a2 2 0 0 1 2-2z",
  materials: "M4 7.5 12 4l8 3.5v9L12 20l-8-3.5z M12 20V11 M4 7.5 12 11l8-3.5",
  procurement: "M4 7h16l-1.5 10H5.5z M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7",
  bom: "M12 4v16 M6 8h12 M8 12h8 M9 16h6",
  trims: "M5 19 12 5l7 14 M8.2 13h7.6",
  fabric: "M4 8c3-4 6 4 8 0s5 4 8 0 M4 16c3-4 6 4 8 0s5 4 8 0",
  mic: "M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z M7 11a5 5 0 0 0 10 0 M12 16v4",
  attach: "M15 7.5 8.6 14a2.5 2.5 0 1 0 3.5 3.5L18 11.5a4 4 0 0 0-5.7-5.6L6.4 12",
  insight: "M12 4a6 6 0 0 1 4 10.6V17H8v-2.4A6 6 0 0 1 12 4z M10 19h4",
};

interface NavIconProps {
  name: keyof typeof PATHS;
}

export function NavIcon({ name }: NavIconProps) {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={PATHS[name]} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
