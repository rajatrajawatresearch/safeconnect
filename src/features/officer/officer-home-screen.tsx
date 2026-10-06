"use client";

import {
  ArrowRight,
  Check,
  ChevronRight,
  ClipboardList,
  FlaskConical,
  MapPin,
  MessageSquare,
  Radar,
  Route,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CategoryIcon } from "@/components/shared/category-icon";
import { OpsMap } from "@/components/shared/ops-map";
import { Field, PageContainer } from "@/components/shared/page";
import { BlankState, EmptyState } from "@/components/shared/states";
import {
  OfficerStageChip,
  PriorityBadge,
  SeverityDot,
  UnitStatusChip,
} from "@/components/shared/status-chips";
import {
  EtaCountdown,
  RelativeTime,
  ResponseTimer,
} from "@/components/shared/timers";
import { Button } from "@/components/ui/button";
import { PRIORITY_META, TONE, UNIT_STATUS_META } from "@/config/incident";
import { useAction } from "@/hooks/use-action";
import { useActiveIncidents } from "@/hooks/use-demo-data";
import { useNow } from "@/hooks/use-now";
import { useSession } from "@/hooks/use-session";
import { useT } from "@/hooks/use-t";
import { formatKm } from "@/lib/format";
import { roadKm } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { services } from "@/services";
import { useDemoStore } from "@/stores/demo-store";
import type {
  Assignment,
  Incident,
  LatLng,
  Officer,
  Station,
  Unit,
  UnitStatus,
} from "@/types";
import { DeclineDialog } from "./assignment-dialogs";
import {
  CardHeading,
  CardLink,
  Metric,
  NoUnitState,
  OfficerCard,
  OfficerIncidentRow,
} from "./officer-ui";
import { useRouteProgress } from "./route-map";
import {
  formatRemaining,
  hasArrived,
  useNearbyIncidents,
  useOfficer,
  useUnitPosition,
  type NearbyIncident,
} from "./use-officer";

const NEARBY_RADIUS_KM = 3;

/* ───────────────────────── Duty header ───────────────────────── */

function DutyCard({
  unit,
  officer,
  engaged,
}: {
  unit: Unit;
  officer: Officer | undefined;
  engaged: boolean;
}) {
  const t = useT();
  const { actor, persona, can } = useSession();
  const now = useNow(30_000);
  const setStatus = useAction(
    async (status: UnitStatus) => {
      await services.units.setStatus(unit.id, status, actor);
      return status;
    },
    {
      success: (status) =>
        status === "available"
          ? "You are available for assignments"
          : "You are marked unavailable",
    },
  );
  const available = unit.status === "available";

  const option = (status: "available" | "unavailable", selected: boolean) => (
    <button
      type="button"
      aria-pressed={selected}
      disabled={setStatus.pending || selected}
      onClick={() => void setStatus.run(status)}
      className={cn(
        "flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-[15px] font-medium transition-colors disabled:cursor-default",
        selected
          ? status === "available"
            ? "border-resolved/35 bg-resolved-soft text-resolved-fg"
            : "border-input bg-muted text-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-60",
      )}
    >
      {selected && <Check aria-hidden className="size-4" />}
      {t(status === "available" ? "officer.available" : "officer.unavailable")}
    </button>
  );

  return (
    <OfficerCard className="p-4 sm:p-5" aria-label="Officer and unit">
      <div className="flex flex-wrap items-start gap-x-3.5 gap-y-2.5">
        <span
          aria-hidden
          className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-base font-semibold text-accent-foreground"
        >
          {persona.initials}
        </span>
        <div className="min-w-0 flex-1 basis-44">
          <p className="truncate text-lg leading-tight font-semibold">
            {officer?.name ?? persona.name}
          </p>
          <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
            {officer ? (
              <>
                {officer.rank} ·{" "}
                <span className="tnum font-mono text-xs">
                  {officer.badgeNo}
                </span>
              </>
            ) : (
              persona.title
            )}
          </p>
        </div>
        <UnitStatusChip status={unit.status} size="md" />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/70 pt-4 sm:grid-cols-4">
        <Field label={t("officer.unit")}>
          <span className="tnum font-mono">{unit.callSign}</span>
        </Field>
        <Field label={t("officer.vehicle")}>
          {unit.vehicle}
          <span className="tnum block font-mono text-xs font-normal text-muted-foreground">
            {unit.vehicleNo}
          </span>
        </Field>
        <Field label="Crew">
          {unit.crew} {unit.crew === 1 ? "officer" : "officers"}
        </Field>
        <Field label={t("officer.shiftEndsIn")}>
          <span className="tnum">{formatRemaining(unit.shiftEndsAt, now)}</span>
        </Field>
      </dl>

      <div className="mt-4 border-t border-border/70 pt-4">
        {engaged ? (
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {t("officer.statusLocked")}
          </p>
        ) : !can("unit.status.update") ? (
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Your role does not include changing unit status.
          </p>
        ) : (
          <div
            role="group"
            aria-label={`${t("officer.status")}: ${UNIT_STATUS_META[unit.status].label}`}
            className="grid grid-cols-2 gap-2"
          >
            {option("available", available)}
            {option("unavailable", unit.status === "unavailable")}
          </div>
        )}
      </div>
    </OfficerCard>
  );
}

/* ───────────────────────── Assignment ───────────────────────── */

function NewAssignmentCard({
  incident,
  assignment,
  unit,
  className,
}: {
  incident: Incident;
  assignment: Assignment;
  unit: Unit;
  className?: string;
}) {
  const t = useT();
  const router = useRouter();
  const { actor } = useSession();
  const [declineOpen, setDeclineOpen] = useState(false);
  const accept = useAction(services.units.acceptAssignment, {
    success: "Assignment accepted. You are en route.",
    onSuccess: () => router.push("/officer/assignment"),
  });
  const meta = PRIORITY_META[incident.priority];
  const tone = TONE[meta.tone];
  const { area, landmark } = incident.location;

  return (
    <OfficerCard
      className={cn("overflow-hidden", tone.border, className)}
      aria-labelledby="home-assignment"
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3 px-4 py-2.5 text-[13px] font-medium",
          tone.soft,
        )}
      >
        <span className="flex items-center gap-2">
          <SeverityDot tone={meta.tone} pulse />
          {t("officer.newAssignment")}
          {assignment.role === "backup" && " · backup unit"}
        </span>
        <ResponseTimer
          since={incident.createdAt}
          priority={incident.priority}
          size="sm"
        />
      </div>
      <div className="p-4">
        <p
          className={cn(
            "text-4xl leading-none font-semibold tracking-tight",
            tone.text,
          )}
        >
          <span className="sr-only">{t("officer.priority")}: </span>
          {meta.label}
        </p>
        <h2
          id="home-assignment"
          className="mt-3 flex items-start gap-2 text-lg leading-snug font-semibold"
        >
          <CategoryIcon
            categoryId={incident.categoryId}
            className="mt-1 size-[18px] text-muted-foreground"
          />
          {incident.title}
        </h2>
        <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
          <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            {area}
            {landmark && ` · near ${landmark}`}
          </span>
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3">
          <Metric label={t("officer.distance")}>
            {formatKm(assignment.distanceKm)}
          </Metric>
          <Metric label={t("officer.eta")}>{assignment.etaMin} min</Metric>
        </dl>
        <div className="mt-4 flex gap-2.5">
          <Button
            variant="outline"
            size="2xl"
            className="px-5 font-medium"
            disabled={accept.pending}
            onClick={() => setDeclineOpen(true)}
          >
            {t("officer.decline")}
          </Button>
          <Button
            size="2xl"
            className="flex-1"
            disabled={accept.pending}
            onClick={() => void accept.run(incident.id, unit.id, actor)}
          >
            <Check aria-hidden />
            {accept.pending ? "Accepting…" : t("officer.accept")}
          </Button>
        </div>
        <Button
          asChild
          variant="ghost"
          size="xl"
          className="mt-1.5 w-full text-primary"
        >
          <Link href="/officer/assignment">
            {t("officer.viewAssignment")}
            <ChevronRight aria-hidden />
          </Link>
        </Button>
      </div>
      <DeclineDialog
        open={declineOpen}
        onOpenChange={setDeclineOpen}
        incident={incident}
        unitId={unit.id}
      />
    </OfficerCard>
  );
}

function ActiveIncidentCard({
  incident,
  assignment,
  unit,
  className,
}: {
  incident: Incident;
  assignment: Assignment;
  unit: Unit;
  className?: string;
}) {
  const t = useT();
  const { km } = useRouteProgress(unit, incident);
  const arrived = hasArrived(assignment, unit);
  return (
    <OfficerCard className={cn("p-4", className)} aria-labelledby="home-active">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-muted-foreground">
          {t("officer.activeIncident")}
        </p>
        <ResponseTimer
          since={incident.createdAt}
          priority={incident.priority}
          size="lg"
          className="text-xl"
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <PriorityBadge priority={incident.priority} size="md" />
        <OfficerStageChip stage={assignment.stage} size="md" />
      </div>
      <h2
        id="home-active"
        className="mt-3 flex items-start gap-2 text-lg leading-snug font-semibold"
      >
        <CategoryIcon
          categoryId={incident.categoryId}
          className="mt-1 size-[18px] text-muted-foreground"
        />
        {incident.title}
      </h2>
      <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
        <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>
          {incident.location.area}
          {incident.location.landmark &&
            ` · near ${incident.location.landmark}`}
        </span>
      </p>
      {!arrived && (
        <dl className="mt-4 grid grid-cols-2 gap-3">
          <Metric label={t("officer.distance")}>{formatKm(km)}</Metric>
          <Metric label={t("officer.eta")}>
            <EtaCountdown at={incident.etaAt} />
          </Metric>
        </dl>
      )}
      <Button asChild size="2xl" className="mt-4 w-full">
        <Link href="/officer/assignment">
          {t("officer.continue")}
          <ArrowRight aria-hidden />
        </Link>
      </Button>
    </OfficerCard>
  );
}

function NoAssignmentCard({
  unit,
  className,
}: {
  unit: Unit;
  className?: string;
}) {
  const t = useT();
  const open = useActiveIncidents();
  const { position, id: unitId } = unit;
  // The dispatcher's choice in the demo: the nearest incident nobody has been sent to yet.
  const candidate = useMemo(
    () =>
      open
        .filter(
          (i) =>
            (i.status === "new" || i.status === "acknowledged") &&
            !i.assignments.some((a) => a.unitId === unitId),
        )
        .map((incident) => ({
          incident,
          km: roadKm(position, incident.location),
        }))
        .sort((a, b) => a.km - b.km)[0],
    [open, position, unitId],
  );
  const request = useAction(services.demo.requestAssignment, {
    success: "Demo assignment sent to your unit",
  });
  const available = unit.status === "available";

  return (
    <OfficerCard className={className} aria-label={t("officer.noAssignment")}>
      <EmptyState
        icon={ShieldCheck}
        title={t("officer.noAssignment")}
        description={
          available
            ? t("officer.noAssignmentBody")
            : "Set your status to Available to receive assignments."
        }
        className="py-10"
      />
      <div className="border-t border-dashed border-border px-4 py-4">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <FlaskConical aria-hidden className="size-3.5" />
          Demo shortcut
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          {!available
            ? "Go available first. The shortcut then stands in for the dispatcher."
            : candidate
              ? `Stands in for the dispatcher and assigns the nearest unassigned incident to your unit: ${candidate.incident.title}, ${candidate.incident.location.area}, ${formatKm(candidate.km)} away.`
              : "Every open incident already has a unit. The simulation raises a new one within about half a minute."}
        </p>
        <Button
          variant="outline"
          size="xl"
          className="mt-3 w-full"
          disabled={!candidate || !available || request.pending}
          onClick={() => {
            if (candidate)
              void request.run(unitId);
          }}
        >
          {request.pending ? "Requesting…" : t("officer.requestDemo")}
        </Button>
      </div>
    </OfficerCard>
  );
}

/* ───────────────────────── Patrol ───────────────────────── */

function PatrolCard({
  unit,
  station,
  position,
  nearby,
  className,
}: {
  unit: Unit;
  station: Station | undefined;
  position: LatLng;
  nearby: NearbyIncident[];
  className?: string;
}) {
  const t = useT();
  const incidents = useMemo(() => nearby.map((n) => n.incident), [nearby]);
  const stations = useMemo(() => (station ? [station] : []), [station]);
  const anchor = unit.position;
  const focus = useMemo(
    () => [anchor, ...incidents.slice(0, 6).map((i) => i.location)],
    [anchor, incidents],
  );

  return (
    <OfficerCard
      className={cn("overflow-hidden", className)}
      aria-labelledby="home-patrol"
    >
      <CardHeading
        id="home-patrol"
        icon={Route}
        title={t("officer.patrol")}
        description={
          station ? `${station.name} · ${station.area}` : "No station linked"
        }
        className="p-4"
      />
      <OpsMap
        className="h-48 sm:h-56"
        me={position}
        stations={stations}
        incidents={incidents}
        focus={focus}
        zoom={14}
        interactive={false}
        label="Patrol area with your position and nearby open incidents"
      />
      <p className="px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
        {nearby.length === 0
          ? `No open incidents within ${NEARBY_RADIUS_KM} km.`
          : `${nearby.length} open ${nearby.length === 1 ? "incident" : "incidents"} within ${NEARBY_RADIUS_KM} km.`}{" "}
        Position reported <RelativeTime at={unit.positionAt} />, shared only
        while on duty.
      </p>
    </OfficerCard>
  );
}

/* ───────────────────────── Messages ───────────────────────── */

function MessagesCard({
  history,
  className,
}: {
  history: Incident[];
  className?: string;
}) {
  const t = useT();
  const { persona } = useSession();
  const messages = useDemoStore((s) => s.messages);
  const latest = useMemo(() => {
    const mine = new Set(history.map((i) => i.id));
    return messages
      .filter(
        (m) =>
          mine.has(m.incidentId) &&
          m.channel === "internal" &&
          m.senderRole !== "system",
      )
      .sort((a, b) => b.at - a.at)[0];
  }, [messages, history]);
  const incident = history.find((i) => i.id === latest?.incidentId);

  return (
    <OfficerCard className={cn("p-4", className)} aria-labelledby="home-msgs">
      <CardHeading
        id="home-msgs"
        icon={MessageSquare}
        title={t("officer.messages")}
        action={
          <CardLink href="/officer/messages" label="Open all messages">
            {t("action.viewAll")}
          </CardLink>
        }
      />
      {latest ? (
        <Link
          href={`/officer/messages?id=${latest.incidentId}`}
          className="mt-3 block rounded-xl border border-dashed border-border bg-inset px-3 py-3 hover:bg-muted"
        >
          <span className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
            <span className="truncate font-medium text-foreground">
              {latest.senderName.startsWith(persona.name)
                ? "You"
                : latest.senderName}
            </span>
            <RelativeTime at={latest.at} />
          </span>
          <span className="mt-1 line-clamp-2 block text-sm leading-relaxed">
            {latest.text}
          </span>
          <span className="mt-1.5 block truncate text-xs text-muted-foreground">
            {t("officer.controlRoom")} · internal
            {incident ? ` · ${incident.title}` : ""}
          </span>
        </Link>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          No internal messages on your incidents yet.
        </p>
      )}
    </OfficerCard>
  );
}

/* ───────────────────────── Nearby & reports ───────────────────────── */

function NearbyCard({
  nearby,
  className,
}: {
  nearby: NearbyIncident[];
  className?: string;
}) {
  const t = useT();
  return (
    <OfficerCard className={cn("p-4", className)} aria-labelledby="home-near">
      <CardHeading
        id="home-near"
        icon={Radar}
        title={t("officer.nearby")}
        description={`Open, within about ${NEARBY_RADIUS_KM} km. For awareness only.`}
        action={
          <CardLink
            href="/officer/incidents?filter=nearby"
            label="View all nearby incidents"
          >
            {t("action.viewAll")}
          </CardLink>
        }
      />
      {nearby.length === 0 ? (
        <BlankState
          compact
          className="py-6"
          title="Nothing open nearby"
          description={`No open incidents within ${NEARBY_RADIUS_KM} km of your unit.`}
        />
      ) : (
        <ul className="mt-3 grid gap-2.5">
          {nearby.slice(0, 4).map(({ incident, km }) => (
            <li key={incident.id}>
              <OfficerIncidentRow incident={incident} km={km} />
            </li>
          ))}
        </ul>
      )}
      {nearby.length > 4 && (
        <p className="mt-2.5 text-xs text-muted-foreground">
          {nearby.length - 4} more in the incidents list.
        </p>
      )}
    </OfficerCard>
  );
}

function ReportsCard({
  due,
  submitted,
  className,
}: {
  due: number;
  submitted: number;
  className?: string;
}) {
  const t = useT();
  return (
    <OfficerCard className={cn("p-4", className)} aria-labelledby="home-rep">
      <CardHeading
        id="home-rep"
        icon={ClipboardList}
        title={t("officer.reports")}
        action={
          <CardLink href="/officer/reports" label="Open reports">
            {due > 0 ? t("officer.writeReport") : t("action.viewAll")}
          </CardLink>
        }
      />
      <dl className="mt-3 grid grid-cols-2 gap-3">
        <div
          className={cn(
            "rounded-xl px-3 py-2.5",
            due > 0 ? "bg-medium-soft text-medium-fg" : "bg-muted",
          )}
        >
          <dt className="text-xs">{t("officer.reportsDue")}</dt>
          <dd className="tnum mt-0.5 text-2xl font-semibold tracking-tight">
            {due}
          </dd>
        </div>
        <div className="rounded-xl bg-muted px-3 py-2.5">
          <dt className="text-xs text-muted-foreground">Submitted</dt>
          <dd className="tnum mt-0.5 text-2xl font-semibold tracking-tight">
            {submitted}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        A preliminary response report becomes due when you complete a response.
      </p>
    </OfficerCard>
  );
}

/* ───────────────────────── Screen ───────────────────────── */

function HomeContent({ unit, unitId }: { unit: Unit; unitId: string }) {
  const t = useT();
  const { officer, station, work } = useOfficer();
  const live = useUnitPosition(unit);
  const position = live ?? unit.position;
  const nearby = useNearbyIncidents(position, unitId, NEARBY_RADIUS_KM);
  const { pending, active, reportsDue, history } = work;
  const engaged = Boolean(pending || active);
  const submitted = history.filter(
    (i) =>
      i.handoff.reportStatus === "submitted" ||
      i.handoff.reportStatus === "reviewed",
  ).length;

  return (
    <PageContainer width="wide">
      <header className="mb-4 sm:mb-5">
        {station && (
          <p className="mb-1 text-sm text-muted-foreground">{station.name}</p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">
          {t(unit.status === "off_duty" ? "officer.offDuty" : "officer.onDuty")}
        </h1>
      </header>

      <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:items-start lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="contents md:flex md:flex-col md:gap-4">
          <div className="order-1 md:order-none">
            <DutyCard unit={unit} officer={officer} engaged={engaged} />
          </div>
          {pending && (
            <NewAssignmentCard
              key={pending.incident.id}
              incident={pending.incident}
              assignment={pending.assignment}
              unit={unit}
              className="order-2 md:order-none"
            />
          )}
          {active && (
            <ActiveIncidentCard
              incident={active.incident}
              assignment={active.assignment}
              unit={unit}
              className="order-2 md:order-none"
            />
          )}
          {!engaged && (
            <NoAssignmentCard unit={unit} className="order-2 md:order-none" />
          )}
          <NearbyCard nearby={nearby} className="order-5 md:order-none" />
        </div>
        <div className="contents md:flex md:flex-col md:gap-4">
          <PatrolCard
            unit={unit}
            station={station}
            position={position}
            nearby={nearby}
            className="order-3 md:order-none"
          />
          <MessagesCard history={history} className="order-4 md:order-none" />
          <ReportsCard
            due={reportsDue.length}
            submitted={submitted}
            className="order-6 md:order-none"
          />
        </div>
      </div>
    </PageContainer>
  );
}

/** `/officer` — who is on duty, what needs answering now, and what is around the unit. */
export function OfficerHomeScreen() {
  const { unit, unitId } = useOfficer();
  if (!unit || !unitId) return <NoUnitState />;
  return <HomeContent unit={unit} unitId={unitId} />;
}
