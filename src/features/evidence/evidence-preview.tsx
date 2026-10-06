import { ImageIcon, Play } from "lucide-react";
import { formatBytes, formatDuration } from "@/lib/format";
import type { Evidence } from "@/types";

const CAPTION =
  "Preview is not available in the demonstration. The original is stored untouched.";

/** Four crop marks, as on a photographic frame. */
function CornerMarks() {
  return (
    <>
      <span
        aria-hidden
        className="absolute top-3 left-3 size-4 rounded-tl-sm border-t-2 border-l-2 border-input"
      />
      <span
        aria-hidden
        className="absolute top-3 right-3 size-4 rounded-tr-sm border-t-2 border-r-2 border-input"
      />
      <span
        aria-hidden
        className="absolute bottom-3 left-3 size-4 rounded-bl-sm border-b-2 border-l-2 border-input"
      />
      <span
        aria-hidden
        className="absolute right-3 bottom-3 size-4 rounded-br-sm border-r-2 border-b-2 border-input"
      />
    </>
  );
}

function PhotoPlaceholder() {
  return (
    <div className="relative grid aspect-[16/10] place-items-center rounded-lg border border-border bg-card">
      <CornerMarks />
      <div className="text-center">
        <ImageIcon aria-hidden className="mx-auto size-7 text-subtle" />
        <p className="mt-2 text-xs text-muted-foreground">Still image</p>
      </div>
    </div>
  );
}

function VideoPlaceholder({ durationSec }: { durationSec?: number }) {
  return (
    <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-card">
      <CornerMarks />
      <div className="absolute inset-0 grid place-items-center">
        <span
          aria-hidden
          className="grid size-12 place-items-center rounded-full border border-input bg-inset text-muted-foreground"
        >
          <Play className="size-5 translate-x-px" />
        </span>
      </div>
      <div className="absolute inset-x-8 bottom-3 flex items-center gap-2.5">
        <span aria-hidden className="h-1 flex-1 rounded-full bg-muted" />
        <span className="tnum rounded bg-inset px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
          {durationSec ? formatDuration(durationSec) : "--:--"}
        </span>
      </div>
    </div>
  );
}

function AudioPlaceholder({
  hash,
  durationSec,
}: {
  hash: string;
  durationSec?: number;
}) {
  // Bar heights come from the record's digest so the same item always draws the same shape.
  const bars = hash.slice(0, 48).split("");
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-5">
      <div aria-hidden className="flex h-16 items-center gap-[3px]">
        {bars.map((char, index) => (
          <span
            key={index}
            className="flex-1 rounded-full bg-input"
            style={{ height: `${18 + (parseInt(char, 16) / 15) * 82}%` }}
          />
        ))}
      </div>
      <div className="tnum mt-3 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
        <span>00:00</span>
        <span>{durationSec ? formatDuration(durationSec) : "--:--"}</span>
      </div>
    </div>
  );
}

function DocumentPlaceholder() {
  return (
    <div className="grid place-items-center rounded-lg border border-border bg-card py-5">
      <div
        aria-hidden
        className="relative aspect-[3/4] w-32 rounded-sm border border-input bg-inset p-3.5"
      >
        <span className="absolute top-0 right-0 size-5 rounded-bl-sm border-b border-l border-input bg-card" />
        <span className="block h-2 w-3/5 rounded-full bg-input" />
        <span className="mt-3 block h-1 w-full rounded-full bg-muted" />
        <span className="mt-1.5 block h-1 w-11/12 rounded-full bg-muted" />
        <span className="mt-1.5 block h-1 w-4/5 rounded-full bg-muted" />
        <span className="mt-3 block h-1 w-full rounded-full bg-muted" />
        <span className="mt-1.5 block h-1 w-10/12 rounded-full bg-muted" />
        <span className="mt-1.5 block h-1 w-2/3 rounded-full bg-muted" />
        <span className="mt-3 block h-1 w-11/12 rounded-full bg-muted" />
        <span className="mt-1.5 block h-1 w-1/2 rounded-full bg-muted" />
      </div>
    </div>
  );
}

/**
 * Stands in for the media viewer. The demonstration stores no files, so each type gets a quiet
 * placeholder and the caption says so plainly.
 */
export function EvidencePreview({ evidence }: { evidence: Evidence }) {
  return (
    <figure className="rounded-xl border border-border/70 bg-inset p-3">
      {evidence.type === "photo" && <PhotoPlaceholder />}
      {evidence.type === "video" && (
        <VideoPlaceholder durationSec={evidence.durationSec} />
      )}
      {evidence.type === "audio" && (
        <AudioPlaceholder
          hash={evidence.hash}
          durationSec={evidence.durationSec}
        />
      )}
      {evidence.type === "document" && <DocumentPlaceholder />}
      <figcaption className="mt-3 px-0.5">
        <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <span className="min-w-0 font-mono text-xs break-all">
            {evidence.fileName}
          </span>
          <span className="tnum shrink-0 text-xs text-muted-foreground">
            {formatBytes(evidence.sizeBytes)}
          </span>
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          {CAPTION}
        </p>
      </figcaption>
    </figure>
  );
}
