import { useState } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}

export function AutosuggestInput({ value, onChange, options, placeholder }: Props) {
  const [focused, setFocused] = useState(false);

  const matches =
    focused && value.trim()
      ? options.filter((o) => o.toLowerCase().includes(value.trim().toLowerCase())).slice(0, 6)
      : [];

  return (
    <div className="autosuggest">
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
      />
      {matches.length > 0 && (
        <div className="autosuggest-list">
          {matches.map((opt) => (
            <button key={opt} type="button" onMouseDown={() => onChange(opt)}>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
