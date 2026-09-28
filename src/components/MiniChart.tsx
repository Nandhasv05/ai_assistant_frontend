import type { ChartSpec } from "../types.ts";

interface MiniChartProps {
  chart: ChartSpec;
}

const PALETTE = ["#0f766e", "#c2410c", "#d6b15a", "#1c1917", "#be123c", "#0e7490"];
const WIDTH = 460;
const HEIGHT = 180;
const PAD = 28;

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(value)));
  return Math.ceil(value / pow) * pow;
}

function compact(value: number): string {
  return value.toLocaleString("en-US", { notation: value >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 });
}

function DonutChart({ chart }: MiniChartProps) {
  const values = chart.series[0]?.values ?? [];
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);
  const colors = chart.colors ?? PALETTE;
  const radius = 60;
  const stroke = 26;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <figure className="mini-chart mini-donut">
      <figcaption>{chart.title}</figcaption>
      <div className="donut-body">
        <svg viewBox="0 0 160 160" role="img" aria-label={chart.title}>
          <circle cx={80} cy={80} r={radius} fill="none" stroke="#eef2f7" strokeWidth={stroke} />
          {total > 0 &&
            values.map((value, index) => {
              const length = (Math.max(0, value) / total) * circumference;
              const segment = (
                <circle
                  key={chart.labels[index] ?? index}
                  cx={80}
                  cy={80}
                  r={radius}
                  fill="none"
                  stroke={colors[index % colors.length]}
                  strokeWidth={stroke}
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 80 80)"
                >
                  <title>{`${chart.labels[index]}: ${value.toLocaleString("en-US")}`}</title>
                </circle>
              );
              offset += length;
              return segment;
            })}
          <text x={80} y={76} textAnchor="middle" className="donut-total">
            {compact(total)}
          </text>
          <text x={80} y={94} textAnchor="middle" className="donut-caption">
            {chart.series[0]?.name ?? "Total"}
          </text>
        </svg>
        <ul className="donut-legend">
          {chart.labels.map((label, index) => (
            <li key={`${label}-${index}`}>
              <i style={{ background: colors[index % colors.length] }} />
              <span title={label}>{label}</span>
              <strong>{total > 0 ? `${Math.round(((values[index] ?? 0) / total) * 100)}%` : "—"}</strong>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}

export function MiniChart({ chart }: MiniChartProps) {
  if (chart.kind === "donut") return <DonutChart chart={chart} />;

  const allValues = chart.series.flatMap((series) => series.values);
  const max = niceMax(Math.max(1, ...allValues));
  const plotW = WIDTH - PAD * 2;
  const plotH = HEIGHT - PAD * 2;
  const labels = chart.labels;
  const count = Math.max(labels.length, 1);
  const perBarColors = chart.kind === "bar" && chart.series.length === 1 && chart.colors?.length ? chart.colors : null;

  const x = (index: number) => PAD + (count === 1 ? plotW / 2 : (plotW * index) / (count - 1));
  const y = (value: number) => PAD + plotH - (plotH * value) / max;

  return (
    <figure className="mini-chart">
      <figcaption>{chart.title}</figcaption>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={chart.title} preserveAspectRatio="none">
        <line x1={PAD} y1={PAD + plotH} x2={WIDTH - PAD} y2={PAD + plotH} stroke="rgba(15,118,110,0.22)" />
        <line x1={PAD} y1={PAD} x2={PAD} y2={PAD + plotH} stroke="rgba(15,118,110,0.22)" />
        {chart.kind === "line"
          ? chart.series.map((series, sIndex) => {
              const color = series.color ?? PALETTE[sIndex % PALETTE.length];
              const points = series.values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
              return (
                <g key={series.name}>
                  <polyline points={points} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                  {series.values.map((value, index) => (
                    <circle key={index} cx={x(index)} cy={y(value)} r={2.6} fill={color}>
                      <title>{`${labels[index]}: ${value.toLocaleString("en-US")}`}</title>
                    </circle>
                  ))}
                </g>
              );
            })
          : (() => {
              const groups = labels.length;
              const groupW = plotW / Math.max(groups, 1);
              const seriesCount = chart.series.length;
              const barW = Math.max(3, (groupW * 0.7) / seriesCount);
              return chart.series.map((series, sIndex) => {
                const seriesColor = series.color ?? PALETTE[sIndex % PALETTE.length];
                return (
                  <g key={series.name}>
                    {series.values.map((value, index) => {
                      const bx = PAD + groupW * index + groupW * 0.15 + sIndex * barW;
                      const bh = (plotH * value) / max;
                      const color = perBarColors ? perBarColors[index % perBarColors.length] : seriesColor;
                      return (
                        <rect key={index} x={bx} y={PAD + plotH - bh} width={barW} height={bh} rx={3} fill={color}>
                          <title>{`${labels[index]}: ${value.toLocaleString("en-US")}`}</title>
                        </rect>
                      );
                    })}
                  </g>
                );
              });
            })()}
      </svg>
      {perBarColors ? (
        <div className="chart-x chart-x-bars" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
          {labels.map((label, index) => (
            <span key={`${label}-${index}`}>
              <b style={{ color: perBarColors[index % perBarColors.length] }}>{compact(chart.series[0]?.values[index] ?? 0)}</b>
              {label}
            </span>
          ))}
        </div>
      ) : (
        <div className="chart-x">
          {labels.map((label, index) => {
            const longest = Math.max(...labels.map((item) => item.length));
            const every = Math.ceil(labels.length / (longest > 4 ? 5 : 8));
            if (index % every !== 0 && index !== labels.length - 1) return null;
            return (
              <span key={`${label}-${index}`} title={label}>
                {label}
              </span>
            );
          })}
        </div>
      )}
      {chart.series.length > 1 && (
        <div className="chart-legend">
          {chart.series.map((series, index) => (
            <span key={series.name}>
              <i style={{ background: series.color ?? PALETTE[index % PALETTE.length] }} />
              {series.name}
            </span>
          ))}
        </div>
      )}
    </figure>
  );
}
