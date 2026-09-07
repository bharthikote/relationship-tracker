import type { ColorByMode, InfoField } from "../types";

interface Props {
  colorBy: ColorByMode;
  onColorByChange: (mode: ColorByMode) => void;
  infoFields: Set<InfoField>;
  onInfoFieldsChange: (fields: Set<InfoField>) => void;
}

const COLOR_OPTIONS: { mode: ColorByMode; label: string }[] = [
  { mode: "village", label: "Village" },
  { mode: "location", label: "Location" },
  { mode: "caste", label: "Caste" },
  { mode: "subcaste", label: "Subcaste" },
];

const INFO_FIELD_OPTIONS: { field: InfoField; label: string }[] = [
  { field: "age", label: "Age" },
  { field: "currentLocation", label: "Current location" },
  { field: "nativeLocation", label: "Native location" },
  { field: "caste", label: "Caste" },
  { field: "subcaste", label: "Sub-caste" },
];

export function SettingsPanel({ colorBy, onColorByChange, infoFields, onInfoFieldsChange }: Props) {
  function toggleInfoField(field: InfoField, checked: boolean) {
    const next = new Set(infoFields);
    if (checked) next.add(field);
    else next.delete(field);
    onInfoFieldsChange(next);
  }

  return (
    <div className="settings-panel">
      <div className="settings-panel-title">Settings</div>
      <div className="settings-section-title">Shape color</div>
      {COLOR_OPTIONS.map((opt) => (
        <label key={opt.mode} className="settings-row">
          <input
            type="checkbox"
            checked={colorBy === opt.mode}
            onChange={(e) => onColorByChange(e.target.checked ? opt.mode : "none")}
          />
          {opt.label}
        </label>
      ))}

      <div className="settings-section-title settings-section-title-spaced">Show below name</div>
      {INFO_FIELD_OPTIONS.map((opt) => (
        <label key={opt.field} className="settings-row">
          <input
            type="checkbox"
            checked={infoFields.has(opt.field)}
            onChange={(e) => toggleInfoField(opt.field, e.target.checked)}
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
