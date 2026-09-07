import type { ColorByMode } from "../types";

interface Props {
  colorBy: ColorByMode;
  onChange: (mode: ColorByMode) => void;
}

const OPTIONS: { mode: ColorByMode; label: string }[] = [
  { mode: "village", label: "Same color for same Village" },
  { mode: "location", label: "Same color for same Location" },
  { mode: "caste", label: "Same color for same Caste" },
  { mode: "subcaste", label: "Same color for same Subcaste" },
];

export function SettingsPanel({ colorBy, onChange }: Props) {
  return (
    <div className="settings-panel">
      <div className="settings-panel-title">Settings</div>
      <div className="settings-section-title">Shape color</div>
      {OPTIONS.map((opt) => (
        <label key={opt.mode} className="settings-row">
          <input
            type="checkbox"
            checked={colorBy === opt.mode}
            onChange={(e) => onChange(e.target.checked ? opt.mode : "none")}
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
