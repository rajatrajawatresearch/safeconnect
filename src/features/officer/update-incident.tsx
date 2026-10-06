"use client";

import { ClipboardPen } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  MEDIA_KIND_META,
  MediaPicker,
  type PickedMedia,
} from "@/components/shared/media-picker";
import { RestrictedState } from "@/components/shared/states";
import { IntegrityChip } from "@/components/shared/status-chips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { useIncidentEvidence } from "@/hooks/use-demo-data";
import { useSession } from "@/hooks/use-session";
import { useT } from "@/hooks/use-t";
import { services } from "@/services";
import type { Incident, Unit } from "@/types";
import { CardHeading, OfficerCard } from "./officer-ui";

/**
 * Record what is happening: a field note for the control room, and evidence captured on scene.
 * Stage buttons valid for the moment are passed in as `children` so they sit at the top.
 */
export function UpdateIncident({
  incident,
  unit,
  arrived,
  children,
}: {
  incident: Incident;
  unit: Unit;
  arrived: boolean;
  children?: ReactNode;
}) {
  const t = useT();
  const { actor, can } = useSession();
  const [note, setNote] = useState("");
  const [caption, setCaption] = useState("");
  const evidence = useIncidentEvidence(incident.id);
  const mine = evidence.filter((e) => e.source === "officer");

  const addNote = useAction(services.incidents.addNote, {
    success: "Field note added",
    onSuccess: () => setNote(""),
  });
  const upload = useAction(services.evidence.upload, {
    success: (record) => `Evidence ${record.id} uploaded`,
    onSuccess: () => setCaption(""),
  });

  const submitNote = (event: FormEvent) => {
    event.preventDefault();
    const text = note.trim();
    if (!text || addNote.pending) return;
    void addNote.run(incident.id, text, actor);
  };

  const onPick = (media: PickedMedia) => {
    if (upload.pending) return;
    void upload.run(
      {
        incidentId: incident.id,
        type: media.kind,
        title:
          caption.trim() || `${MEDIA_KIND_META[media.kind].label} from scene`,
        fileName: media.name,
        sizeBytes: media.sizeBytes,
        durationSec: media.durationSec,
        source: "officer",
        device: `Officer app · ${unit.callSign}`,
      },
      actor,
    );
  };

  return (
    <OfficerCard className="p-4" aria-labelledby="update-title">
      <CardHeading
        id="update-title"
        icon={ClipboardPen}
        title={t("officer.updateIncident")}
      />

      {children && <div className="mt-4 grid gap-2.5">{children}</div>}

      {can("incident.note") ? (
        <form onSubmit={submitNote} className="mt-4 grid gap-2">
          <Label htmlFor="field-note">{t("officer.fieldNote")}</Label>
          <Textarea
            id="field-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            className="rounded-xl"
            aria-describedby="field-note-hint"
            placeholder="What you see, who is present, what you have done"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p
              id="field-note-hint"
              className="min-w-0 flex-1 basis-40 text-xs leading-relaxed text-muted-foreground"
            >
              Internal. The control room sees it; the citizen never does.
            </p>
            <Button
              type="submit"
              size="xl"
              variant="secondary"
              disabled={!note.trim() || addNote.pending}
            >
              {addNote.pending ? "Adding…" : t("officer.addNote")}
            </Button>
          </div>
        </form>
      ) : (
        <RestrictedState
          compact
          className="py-5"
          description="Your role does not include adding notes."
        />
      )}

      <div className="mt-4 border-t border-border/70 pt-4">
        <h3 className="text-sm font-medium">{t("officer.addEvidence")}</h3>
        {!can("evidence.upload") ? (
          <RestrictedState
            compact
            className="py-5"
            description="Your role does not include uploading evidence."
          />
        ) : !arrived ? (
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            Evidence capture opens once you mark yourself arrived.
          </p>
        ) : (
          <div className="mt-2 grid gap-2.5">
            <div className="grid gap-1.5">
              <Label
                htmlFor="evidence-caption"
                className="text-[13px] font-normal text-muted-foreground"
              >
                Caption (optional)
              </Label>
              <Input
                id="evidence-caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={80}
                className="h-11 rounded-xl"
                placeholder="Shop entrance, facing the road"
              />
            </div>
            <MediaPicker onPick={onPick} size="sm" />
            {upload.pending && (
              <div
                role="status"
                className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5"
              >
                <Skeleton className="size-9 shrink-0 rounded-lg" />
                <p className="text-[13px] text-muted-foreground">
                  Uploading and recording the digest…
                </p>
              </div>
            )}
            {mine.length > 0 && (
              <ul className="grid gap-2" aria-label="Evidence you uploaded">
                {mine.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.title}
                      </p>
                      <p className="tnum truncate font-mono text-xs text-muted-foreground">
                        {item.id}
                      </p>
                    </div>
                    <IntegrityChip value={item.integrity} />
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs leading-relaxed text-muted-foreground">
              Originals are never modified. Each upload is linked to{" "}
              <span className="tnum font-mono">{incident.id}</span> with a
              recorded digest.
            </p>
          </div>
        )}
      </div>
    </OfficerCard>
  );
}
