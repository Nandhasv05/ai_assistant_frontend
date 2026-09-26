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

export function MiniChart({ chart }: MiniChartProps) {
  const allValues = chart.series.flatMap((series) => series.values);
  const max = niceMax(Math.max(1, ...allValues));
  const plotW = WIDTH - PAD * 2;
  const plotH = HEIGHT - PAD * 2;
  const labels = chart.labels;
  const count = Math.max(labels.length, 1);

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
                    <circle key={index} cx={x(index)} cy={y(value)} r={2.6} fill={color} />
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
                const color = series.color ?? PALETTE[sIndex % PALETTE.length];
                return (
                  <g key={series.name}>
                    {series.values.map((value, index) => {
                      const bx = PAD + groupW * index + groupW * 0.15 + sIndex * barW;
                      const bh = (plotH * value) / max;
                      return <rect key={index} x={bx} y={PAD + plotH - bh} width={barW} height={bh} rx={2} fill={color} />;
                    })}
                  </g>
                );
              });
            })()}
      </svg>
      <div className="chart-x">
        {labels.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
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
