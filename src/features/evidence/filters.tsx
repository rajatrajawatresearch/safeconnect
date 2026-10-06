"use client";

import { Search, X, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** A filter dropdown whose first entry clears it ("All types"). */
export function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options,
  allLabel,
  className,
}: {
  /** Read by screen readers; the visible text is the current choice. */
  label: string;
  value: T | "all";
  onChange: (value: T | "all") => void;
  options: { value: T; label: string }[];
  allLabel: string;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as T | "all")}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          "h-9 min-w-0 bg-card data-[size=default]:h-9",
          value !== "all" && "border-primary/50 text-foreground",
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="start">
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function SearchField({
  value,
  onChange,
  label,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn("relative min-w-0", className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        placeholder={placeholder}
        className="h-9 bg-card pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-1.5 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      )}
    </div>
  );
}

/** One-of-many switch. A choice is always selected; counts sit beside the labels they describe. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  stretch,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; count?: number; icon?: LucideIcon }[];
  /** Names the group for assistive technology, for example "Status". */
  label: string;
  className?: string;
  /** Let the segments share the full width. */
  stretch?: boolean;
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
      className={cn("max-w-full", stretch && "w-full", className)}
    >
      {options.map((option) => {
        const Icon = option.icon;
        return (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            className={cn(
              "min-w-0 bg-card px-2 text-[13px] text-muted-foreground data-[state=on]:bg-accent data-[state=on]:text-accent-foreground sm:px-3",
              stretch ? "flex-1" : "flex-none",
            )}
          >
            {Icon && <Icon aria-hidden />}
            <span className="truncate">{option.label}</span>
            {option.count !== undefined && (
              <span className="tnum text-xs opacity-70">{option.count}</span>
            )}
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
