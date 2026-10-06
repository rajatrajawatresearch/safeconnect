"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

/** One-of-many switch for scope, range and layer choices. A choice is always selected. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  /** Names the group for assistive technology, for example "Scope". */
  label: string;
  className?: string;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={0}
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as T);
      }}
      aria-label={label}
      className={cn("max-w-full", className)}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          className="min-w-0 flex-auto bg-card px-2 text-xs text-muted-foreground data-[state=on]:bg-accent data-[state=on]:text-accent-foreground sm:min-w-max sm:flex-none sm:px-3 sm:text-[13px]"
        >
          <span className="truncate">{option.label}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export type RangeDays = "7" | "14";

export const RANGE_OPTIONS: { value: RangeDays; label: string }[] = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
];
