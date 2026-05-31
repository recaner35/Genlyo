import React from 'react';

export default function EngineCard({
  title,
  subtitle,
  bullets,
  multipliers,
  explanation
}: {
  title: string;
  subtitle?: string;
  bullets?: string[];
  multipliers?: { label: string; value: number | string | number[] }[];
  explanation?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 border shadow-sm border-slate-100">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-black text-slate-800">{title}</h3>
          {subtitle && <div className="text-[11px] font-bold text-slate-400 mt-1">{subtitle}</div>}
        </div>
      </div>

      {bullets && bullets.length > 0 && (
        <ul className="mt-4 list-disc list-inside text-sm text-slate-600 space-y-1">
          {bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      )}

      {multipliers && multipliers.length > 0 && (
        <div className="mt-4">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Çarpanlar</div>
          <div className="grid grid-cols-2 gap-2">
            {multipliers.map((m, i) => (
              <div key={i} className="bg-slate-50 rounded-lg p-2 text-sm font-bold flex justify-between items-center">
                <span className="text-slate-600">{m.label}</span>
                <span className="text-indigo-600">
                  {Array.isArray(m.value)
                    ? m.value.map(v => (typeof v === 'number' ? v.toFixed(2) : String(v))).join(', ')
                    : (typeof m.value === 'number' ? (m.value as number).toFixed(2) : String(m.value))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {explanation && (
        <div className="mt-4 text-sm text-slate-600">
          {explanation}
        </div>
      )}
    </div>
  );
}
