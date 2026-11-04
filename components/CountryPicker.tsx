"use client";
import { COUNTRIES, getCountry } from "@/lib/countries";

export default function CountryPicker({ value, onChange, className = "" }: { value: string; onChange: (code: string) => void; className?: string }) {
  const c = getCountry(value);
  return (
    <label className={`country-picker glass ${className}`} title={`Trains in ${c.name}`}>
      <span aria-hidden="true">{c.flag}</span>
      <span className="country-code" aria-hidden="true">{c.code}</span>
      <select value={c.code} onChange={(e) => onChange(e.target.value)} aria-label="Country">
        {COUNTRIES.map((x) => (
          <option key={x.code} value={x.code}>
            {x.flag} {x.name}
          </option>
        ))}
      </select>
    </label>
  );
}
