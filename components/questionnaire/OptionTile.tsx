import { Check, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type OptionTileProps = {
  type: "radio" | "checkbox";
  name: string;
  value: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
  checked: boolean;
  onChange: (checked: boolean) => void;
  preview?: ReactNode;
  compact?: boolean;
  describedBy?: string;
};

/**
 * A selectable tile backed by a native radio/checkbox input, so keyboard
 * behaviour (arrow keys for radios, Space for checkboxes) comes for free.
 */
export function OptionTile({
  type,
  name,
  value,
  label,
  description,
  icon: Icon,
  checked,
  onChange,
  preview,
  compact = false,
  describedBy,
}: OptionTileProps) {
  return (
    <label
      className={`group relative flex cursor-pointer flex-col border bg-white/70 transition-[border-color,background-color,box-shadow] duration-300 ease-[var(--ease-island)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-lagoon-500 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-sand-100 ${
        checked
          ? "border-ink bg-white shadow-[0_18px_40px_-28px_rgba(19,32,28,0.55)]"
          : "border-ink/12 hover:border-ink/40 hover:bg-white"
      } ${compact ? "px-4 py-3.5" : "p-5"}`}
    >
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
        aria-describedby={describedBy}
      />

      {preview ? <div className="mb-4">{preview}</div> : null}

      <div className={`flex gap-3.5 ${compact ? "items-center" : "items-start"}`}>
        {Icon ? (
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
              checked ? "bg-ink text-sand-50" : "bg-sand-100 text-lagoon-700 group-hover:bg-lagoon-100"
            }`}
          >
            <Icon aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.6} />
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="block text-[0.95rem] leading-snug font-semibold text-ink">{label}</span>
          {description ? <span className="mt-1 block text-sm leading-snug text-mist">{description}</span> : null}
        </span>
        <span
          aria-hidden
          className={`flex h-5 w-5 shrink-0 items-center justify-center border transition-colors duration-300 ${
            type === "radio" ? "rounded-full" : "rounded-[3px]"
          } ${checked ? "border-ink bg-ink text-sand-50" : "border-ink/25 bg-white"}`}
        >
          {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
        </span>
      </div>
    </label>
  );
}
