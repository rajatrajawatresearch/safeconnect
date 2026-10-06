"use client";

import { Camera, FileText, Mic, Video, X, type LucideIcon } from "lucide-react";
import { useRef } from "react";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EvidenceType } from "@/types";

export interface PickedMedia {
  name: string;
  kind: EvidenceType;
  sizeBytes: number;
  durationSec?: number;
}

const KINDS: Record<
  EvidenceType,
  { label: string; icon: LucideIcon; accept: string; sample: () => PickedMedia }
> = {
  photo: {
    label: "Photo",
    icon: Camera,
    accept: "image/*",
    sample: () => ({
      name: `photo-${stamp()}.jpg`,
      kind: "photo",
      sizeBytes: 2_340_000,
    }),
  },
  video: {
    label: "Video",
    icon: Video,
    accept: "video/*",
    sample: () => ({
      name: `video-${stamp()}.mp4`,
      kind: "video",
      sizeBytes: 14_800_000,
      durationSec: 22,
    }),
  },
  audio: {
    label: "Audio",
    icon: Mic,
    accept: "audio/*",
    sample: () => ({
      name: `audio-${stamp()}.m4a`,
      kind: "audio",
      sizeBytes: 420_000,
      durationSec: 15,
    }),
  },
  document: {
    label: "Document",
    icon: FileText,
    accept: ".pdf,.doc,.docx,.txt,image/*",
    sample: () => ({
      name: `document-${stamp()}.pdf`,
      kind: "document",
      sizeBytes: 310_000,
    }),
  },
};

const stamp = () => new Date().toISOString().slice(11, 19).replace(/:/g, "");

export const MEDIA_KIND_META = KINDS;

/**
 * Lets someone attach a photo, video, audio clip or document.
 *
 * Only the file's name, type and size are read to create the demo record — nothing is uploaded
 * anywhere and the file itself never leaves the device. A "sample" link adds a clearly-named
 * placeholder entry so the flow can be shown without choosing a real file.
 */
export function MediaPicker({
  onPick,
  kinds = ["photo", "video", "audio", "document"],
  size = "md",
  className,
}: {
  onPick: (media: PickedMedia) => void;
  kinds?: EvidenceType[];
  size?: "sm" | "md";
  className?: string;
}) {
  const inputs = useRef<Partial<Record<EvidenceType, HTMLInputElement | null>>>(
    {},
  );

  return (
    <div className={className}>
      <div
        className={cn(
          "grid gap-2",
          kinds.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2",
        )}
      >
        {kinds.map((kind) => {
          const { label, icon: Icon, accept } = KINDS[kind];
          return (
            <div key={kind}>
              <input
                ref={(el) => {
                  inputs.current[kind] = el;
                }}
                type="file"
                accept={accept}
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file)
                    onPick({ name: file.name, kind, sizeBytes: file.size });
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => inputs.current[kind]?.click()}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl border border-border bg-card text-left font-medium transition-colors hover:bg-muted",
                  size === "md"
                    ? "min-h-14 px-3.5 text-sm"
                    : "min-h-11 px-3 text-[13px]",
                )}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <Icon aria-hidden className="size-4" />
                </span>
                Add {label.toLowerCase()}
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Files stay on this device in the demo.{" "}
        <button
          type="button"
          onClick={() => onPick(KINDS[kinds[0]].sample())}
          className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-2 hover:underline"
        >
          Add a sample {KINDS[kinds[0]].label.toLowerCase()} instead
        </button>
      </p>
    </div>
  );
}

export function PickedMediaList({
  items,
  onRemove,
  className,
}: {
  items: PickedMedia[];
  onRemove?: (index: number) => void;
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <ul className={cn("space-y-2", className)}>
      {items.map((item, index) => {
        const Icon = KINDS[item.kind].icon;
        return (
          <li
            key={`${item.name}-${index}`}
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
              <Icon aria-hidden className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {KINDS[item.kind].label} · {formatBytes(item.sizeBytes)}
              </p>
            </div>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(index)}
                aria-label={`Remove ${item.name}`}
                className="grid size-11 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X aria-hidden className="size-4" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
