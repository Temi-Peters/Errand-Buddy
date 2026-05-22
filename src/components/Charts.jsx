import {
  Bar, BarChart, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';

// ─── Shared palette ───────────────────────────────────────────────────────────

export const COLORS = ['#1C1917', '#57534E', '#A8A29E', '#D6D3D1', '#78716C', '#292524'];

const tooltipStyle = {
  contentStyle: {
    background: 'var(--tw-color-surface, #fff)',
    border: '1px solid #E7E5E4',
    borderRadius: '10px',
    fontSize: '13px',
    color: '#1C1917'
  },
  cursor: { fill: 'rgba(0,0,0,0.04)' }
};

const EmptyState = ({ message = 'No data yet' }) => (
  <div className="flex h-48 items-center justify-center rounded-xl bg-surface-hi text-sm text-muted">{message}</div>
);

// ─── Donut chart ─────────────────────────────────────────────────────────────

export function DonutChart({ data, title }) {
  const filled = data.filter((d) => d.value > 0);
  if (!filled.length) return <EmptyState message="No bookings yet" />;

  return (
    <div>
      {title && <p className="mb-3 text-sm font-bold text-muted">{title}</p>}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie data={filled} cx="50%" cy="50%" innerRadius={48} outerRadius={72}
              dataKey="value" paddingAngle={2} stroke="none">
              {filled.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} formatter={(value, name) => [value, name]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-x-4 gap-y-2 sm:flex-col">
          {filled.map((item, index) => (
            <div key={item.name} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />
              <span className="text-sm text-muted">{item.name}</span>
              <span className="text-sm font-bold text-ink">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Vertical bar chart ───────────────────────────────────────────────────────

export function BarChartVertical({ data, dataKey, xKey, title, prefix = '', suffix = '', color = '#1C1917' }) {
  if (!data.length) return <EmptyState />;

  return (
    <div>
      {title && <p className="mb-3 text-sm font-bold text-muted">{title}</p>}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barCategoryGap="30%">
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#78716C' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#78716C' }} axisLine={false} tickLine={false}
            tickFormatter={(v) => `${prefix}${v}${suffix}`} width={40} />
          <Tooltip {...tooltipStyle} formatter={(v) => [`${prefix}${v}${suffix}`]} />
          <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Horizontal bar chart ─────────────────────────────────────────────────────

export function BarChartHorizontal({ data, dataKey, yKey, title, prefix = '', suffix = '', color = '#1C1917' }) {
  if (!data.length) return <EmptyState />;

  return (
    <div>
      {title && <p className="mb-3 text-sm font-bold text-muted">{title}</p>}
      <ResponsiveContainer width="100%" height={Math.max(data.length * 52, 120)}>
        <BarChart data={data} layout="vertical" barCategoryGap="25%">
          <XAxis type="number" tick={{ fontSize: 11, fill: '#78716C' }} axisLine={false} tickLine={false}
            tickFormatter={(v) => `${prefix}${v}${suffix}`} />
          <YAxis type="category" dataKey={yKey} tick={{ fontSize: 12, fill: '#1C1917', fontWeight: 600 }}
            axisLine={false} tickLine={false} width={110} />
          <Tooltip {...tooltipStyle} formatter={(v) => [`${prefix}${v}${suffix}`]} />
          <Bar dataKey={dataKey} fill={color} radius={[0, 6, 6, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Multi-bar chart ──────────────────────────────────────────────────────────

export function MultiBarChart({ data, bars, xKey, title, prefix = '' }) {
  if (!data.length) return <EmptyState />;

  return (
    <div>
      {title && <p className="mb-3 text-sm font-bold text-muted">{title}</p>}
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barCategoryGap="30%">
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#78716C' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#78716C' }} axisLine={false} tickLine={false}
            tickFormatter={(v) => `${prefix}${v}`} width={44} />
          <Tooltip {...tooltipStyle} formatter={(v) => [`${prefix}${Number(v) % 1 === 0 ? v : Number(v).toFixed(2)}`]} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#78716C', paddingTop: 8 }} />
          {bars.map(({ key, label, color }) => (
            <Bar key={key} dataKey={key} name={label} fill={color} radius={[4, 4, 0, 0]} maxBarSize={36} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
