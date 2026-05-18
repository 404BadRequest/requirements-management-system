"use client";

export const DateRangeFilter = ({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (value: { from: string; to: string }) => void;
}) => (
  <div className="flex gap-2">
    <input type="date" value={from} className="field-control py-1.5 text-sm" onChange={(e) => onChange({ from: e.target.value, to })} />
    <input type="date" value={to} className="field-control py-1.5 text-sm" onChange={(e) => onChange({ from, to: e.target.value })} />
  </div>
);
