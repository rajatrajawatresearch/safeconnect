"use client";

import { ArrowUpRight, Building2, Flame, Hospital, X } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { IncidentRow } from "@/components/shared/incident-row";
import type { MapSelection } from "@/components/shared/ops-map";
import { BlankState } from "@/components/shared/states";
import { ToneChip, UnitStatusChip } from "@/components/shared/status-chips";
import { Button } from "@/components/ui/button";
import { TONE, UNIT_STATUS_META } from "@/config/incident";
import { DISTRICTS, FACILITIES, STATIONS } from "@/data/demo/geo";
import { isActive, nearestAreaName } from "@/features/incidents/incident-rules";
import { UNIT_STATUSES, stationShort } from "@/features/units/unit-meta";
import {
  byUrgency,
  officerOfUnit,
  useIncidents,
  useUnit,
  useUnits,
} from "@/hooks/use-demo-data";
import { formatCoords, formatKm } from "@/lib/format";
import { distanceKm } from "@/lib/geo";
import { cn } from "@/lib/utils";
import type { Facility } from "@/types";
import { DetailHeader } from "./detail-panel";

const FACILITY_META: Record<
  Facility["kind"],
  { label: string; icon: typeof Hospital }
> = {
  hospital: { label: "Hospital", icon: Hospital },
  fire_station: { label: "Fire station", icon: Flame },
};

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-x-3">
      <dt className="text-xs leading-5 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm leading-5 break-words">{children}</dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/** A station's jurisdiction at a glance: who runs it, what is open there, which units it has. */
export function StationDetail({
  stationId,
  onClose,
  onSelectIncident,
}: {
  stationId: string;
  onClose?: () => void;
  onSelectIncident?: (incidentId: string) => void;
}) {
  const station = STATIONS.find((s) => s.id === stationId);
  const incidents = useIncidents();
  const units = useUnits();

  const open = useMemo(
    () =>
      incidents
        .filter((i) => isActive(i) && i.location.stationId === stationId)
        .sort(byUrgency),
    [incidents, stationId],
  );
  const stationUnits = useMemo(
    () => units.filter((u) => u.stationId === stationId),
    [units, stationId],
  );

  if (!station)
    return (
      <div className="flex h-full min-h-0 flex-col bg-card">
        <DetailHeader title="Station" onClose={onClose} />
        <BlankState className="flex-1" title="Station not found" />
      </div>
    );

  const district = DISTRICTS.find((d) => d.id === station.districtId);

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <DetailHeader
        title={
          <span className="flex items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
              <Building2 aria-hidden className="size-4" />
            </span>
            {station.name}
          </span>
        }
        subtitle={`Station code ${station.code} · ${district?.name ?? station.area}`}
        onClose={onClose}
      />
      <div className="scroll-thin min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        <dl className="space-y-2">
          <Row label="In charge">{station.inChargeName}</Row>
          <Row label="Desk phone">
            <span className="tnum font-mono text-xs">
              {station.phoneMasked}
            </span>
          </Row>
          <Row label="Area">{station.area}</Row>
          <Row label="Coordinates">
            <span className="tnum font-mono text-xs">
              {formatCoords(station.position)}
            </span>
          </Row>
        </dl>

        <Section title={`Units based here (${stationUnits.length})`}>
          {stationUnits.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No units are based at this station.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {UNIT_STATUSES.map((status) => {
                const count = stationUnits.filter(
                  (u) => u.status === status,
                ).length;
                if (count === 0) return null;
                return (
                  <li
                    key={status}
                    className="inline-flex h-7 items-center gap-2 rounded-full border border-border bg-card px-2.5 text-xs"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "size-1.5 rounded-full",
                        TONE[UNIT_STATUS_META[status].tone].dot,
                      )}
                    />
                    {UNIT_STATUS_META[status].label}
                    <span className="tnum font-medium">{count}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title={`Open incidents in this area (${open.length})`}>
          {open.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-3.5 py-3 text-sm text-muted-foreground">
              All clear. No open incidents in this station&apos;s area.
            </p>
          ) : (
            <ul className="space-y-2">
              {open.map((incident) => (
                <li key={incident.id}>
                  <IncidentRow
                    incident={incident}
                    compact
                    onSelect={
                      onSelectIncident
                        ? (i) => onSelectIncident(i.id)
                        : undefined
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Button variant="outline" asChild className="w-full">
          <Link href={`/control/stations?id=${station.id}`}>
            Open station dashboard <ArrowUpRight aria-hidden />
          </Link>
        </Button>
      </div>
    </div>
  );
}

/** Hospitals and fire stations are reference points for coordination, not live connections. */
export function FacilityDetail({
  facilityId,
  onClose,
  onSelectIncident,
}: {
  facilityId: string;
  onClose?: () => void;
  onSelectIncident?: (incidentId: string) => void;
}) {
  const facility = FACILITIES.find((f) => f.id === facilityId);
  const incidents = useIncidents();

  const nearby = useMemo(() => {
    if (!facility) return [];
    return incidents
      .filter(isActive)
      .map((incident) => ({
        incident,
        km: distanceKm(facility.position, incident.location),
      }))
      .filter((entry) => entry.km <= 3)
      .sort((a, b) => a.km - b.km)
      .slice(0, 4);
  }, [incidents, facility]);

  if (!facility)
    return (
      <div className="flex h-full min-h-0 flex-col bg-card">
        <DetailHeader title="Facility" onClose={onClose} />
        <BlankState className="flex-1" title="Facility not found" />
      </div>
    );

  const meta = FACILITY_META[facility.kind];
  const Icon = meta.icon;

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <DetailHeader
        title={
          <span className="flex items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
              <Icon aria-hidden className="size-4" />
            </span>
            {facility.name}
          </span>
        }
        subtitle={`${meta.label} · ${facility.area}`}
        onClose={onClose}
      />
      <div className="scroll-thin min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        <dl className="space-y-2">
          <Row label="Type">{meta.label}</Row>
          <Row label="Area">{facility.area}</Row>
          <Row label="Coordinates">
            <span className="tnum font-mono text-xs">
              {formatCoords(facility.position)}
            </span>
          </Row>
        </dl>

        <Section title="Open incidents within 3 km">
          {nearby.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-3.5 py-3 text-sm text-muted-foreground">
              No open incidents near this facility.
            </p>
          ) : (
            <ul className="space-y-2">
              {nearby.map(({ incident, km }) => (
                <li key={incident.id}>
                  <IncidentRow
                    incident={incident}
                    compact
                    onSelect={
                      onSelectIncident
                        ? (i) => onSelectIncident(i.id)
                        : undefined
                    }
                  />
                  <p className="tnum mt-1 pl-1 text-xs text-muted-foreground">
                    {formatKm(km)} away in a straight line
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <p className="rounded-lg bg-inset px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          Shown as a reference point for coordinating with other agencies. This
          demonstration has no live link to the facility.
        </p>
      </div>
    </div>
  );
}

/**
 * A small card for the overview map: enough to recognise what was clicked, with a link to the
 * screen that owns it. Incidents are not handled here — they open in the inspector.
 */
export function MapInfoCard({
  selection,
  onClose,
  className,
}: {
  selection: MapSelection;
  onClose: () => void;
  className?: string;
}) {
  const unit = useUnit(selection.type === "unit" ? selection.id : null);
  const station =
    selection.type === "station"
      ? STATIONS.find((s) => s.id === selection.id)
      : undefined;
  const facility =
    selection.type === "facility"
      ? FACILITIES.find((f) => f.id === selection.id)
      : undefined;

  let body: React.ReactNode = null;
  if (unit) {
    const officer = officerOfUnit(unit);
    body = (
      <>
        <p className="flex flex-wrap items-center gap-2">
          <span className="tnum font-mono text-sm font-semibold">
            {unit.callSign}
          </span>
          <UnitStatusChip status={unit.status} />
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {officer?.name ?? "Officer not set"} · {unit.vehicle}
        </p>
        <p className="text-xs text-muted-foreground">
          {stationShort(unit.stationId)} · near {nearestAreaName(unit.position)}
        </p>
        <Button variant="outline" size="sm" asChild className="mt-2.5">
          <Link href={`/control/units?id=${unit.id}`}>
            Open unit <ArrowUpRight aria-hidden />
          </Link>
        </Button>
      </>
    );
  } else if (station) {
    body = (
      <>
        <p className="text-sm font-semibold">{station.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {station.inChargeName} · code {station.code}
        </p>
        <Button variant="outline" size="sm" asChild className="mt-2.5">
          <Link href={`/control/stations?id=${station.id}`}>
            Open station <ArrowUpRight aria-hidden />
          </Link>
        </Button>
      </>
    );
  } else if (facility) {
    body = (
      <>
        <p className="text-sm font-semibold">{facility.name}</p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <ToneChip tone="neutral" variant="outline">
            {FACILITY_META[facility.kind].label}
          </ToneChip>
          {facility.area}
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Reference point only. No live link in this demonstration.
        </p>
      </>
    );
  }

  if (!body) return null;
  return (
    <div
      role="status"
      className={cn(
        "relative w-64 max-w-full rounded-xl border border-border bg-card py-3 pr-9 pl-3.5 shadow-raised",
        className,
      )}
    >
      {body}
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={onClose}
        aria-label="Dismiss"
        className="absolute top-2 right-2 text-muted-foreground"
      >
        <X aria-hidden />
      </Button>
    </div>
  );
}
