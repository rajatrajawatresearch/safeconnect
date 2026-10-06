-- SafeConnect platform schema.
--
-- Each aggregate is one row: the columns a query needs are real, indexed columns, and the full
-- record is kept beside them as JSONB (`doc`). The API server holds the authoritative state in
-- memory and writes every change through to these tables inside one transaction per command.

create table if not exists platform_meta (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists incidents (
  id           text primary key,
  status       text not null,
  priority     text not null,
  category_id  text not null,
  source       text not null,
  station_id   text not null,
  district_id  text not null,
  citizen_id   text,
  lat          double precision not null,
  lng          double precision not null,
  created_at   timestamptz not null,
  resolved_at  timestamptz,
  doc          jsonb not null,
  updated_at   timestamptz not null default now()
);
create index if not exists incidents_open_idx on incidents (status, priority, created_at desc);
create index if not exists incidents_station_idx on incidents (station_id, created_at desc);
create index if not exists incidents_citizen_idx on incidents (citizen_id) where citizen_id is not null;

create table if not exists units (
  id                  text primary key,
  call_sign           text not null unique,
  station_id          text not null,
  status              text not null,
  current_incident_id text,
  doc                 jsonb not null,
  updated_at          timestamptz not null default now()
);
create index if not exists units_status_idx on units (status);

create table if not exists messages (
  id          text primary key,
  incident_id text not null,
  channel     text not null,
  sender_role text not null,
  sent_at     timestamptz not null,
  doc         jsonb not null,
  updated_at  timestamptz not null default now()
);
create index if not exists messages_incident_idx on messages (incident_id, sent_at);

create table if not exists evidence (
  id             text primary key,
  incident_id    text not null,
  type           text not null,
  classification text not null,
  integrity      text not null,
  source         text not null,
  hash           text not null,
  submitted_at   timestamptz not null,
  doc            jsonb not null,
  updated_at     timestamptz not null default now()
);
create index if not exists evidence_incident_idx on evidence (incident_id);

create table if not exists complaints (
  id           text primary key,
  citizen_id   text,
  station_id   text not null,
  status       text not null,
  kind         text not null,
  submitted_at timestamptz not null,
  doc          jsonb not null,
  updated_at   timestamptz not null default now()
);
create index if not exists complaints_citizen_idx on complaints (citizen_id) where citizen_id is not null;
create index if not exists complaints_status_idx on complaints (status, submitted_at desc);

create table if not exists journeys (
  id         text primary key,
  citizen_id text not null,
  status     text not null,
  started_at timestamptz not null,
  doc        jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists journeys_citizen_idx on journeys (citizen_id, started_at desc);

create table if not exists emergency_contacts (
  id         text primary key,
  citizen_id text not null,
  ord        integer not null default 0,
  doc        jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists emergency_contacts_citizen_idx on emergency_contacts (citizen_id);

create table if not exists communication_sessions (
  id          text primary key,
  incident_id text not null,
  type        text not null,
  status      text not null,
  started_at  timestamptz not null,
  doc         jsonb not null,
  updated_at  timestamptz not null default now()
);
create index if not exists communication_sessions_incident_idx on communication_sessions (incident_id);

create table if not exists notifications (
  id          text primary key,
  kind        text not null,
  tone        text not null,
  citizen_id  text,
  unit_id     text,
  incident_id text,
  created_at  timestamptz not null,
  doc         jsonb not null,
  updated_at  timestamptz not null default now()
);
create index if not exists notifications_created_idx on notifications (created_at desc);

create table if not exists escalations (
  id          text primary key,
  incident_id text not null,
  level       smallint not null,
  status      text not null,
  raised_at   timestamptz not null,
  doc         jsonb not null,
  updated_at  timestamptz not null default now()
);
create index if not exists escalations_status_idx on escalations (status, raised_at desc);

-- Configuration. Small, ordered lists: `ord` keeps the order the console shows them in.
create table if not exists roles (
  id text primary key, ord integer not null default 0, doc jsonb not null, updated_at timestamptz not null default now()
);
create table if not exists staff_users (
  id text primary key, role text not null, status text not null, ord integer not null default 0,
  doc jsonb not null, updated_at timestamptz not null default now()
);
create table if not exists incident_categories (
  id text primary key, grp text not null, enabled boolean not null, ord integer not null default 0,
  doc jsonb not null, updated_at timestamptz not null default now()
);
create table if not exists escalation_rules (
  id text primary key, priority text not null, enabled boolean not null, ord integer not null default 0,
  doc jsonb not null, updated_at timestamptz not null default now()
);
create table if not exists sla_policies (
  id text primary key, ord integer not null default 0, doc jsonb not null, updated_at timestamptz not null default now()
);
create table if not exists integrations (
  id text primary key, status text not null, ord integer not null default 0,
  doc jsonb not null, updated_at timestamptz not null default now()
);
create table if not exists notification_templates (
  id text primary key, ord integer not null default 0, doc jsonb not null, updated_at timestamptz not null default now()
);

-- Audit trail: append-only, each row chained to the one before it by SHA-256.
create table if not exists audit_events (
  seq         bigserial primary key,
  id          text not null unique,
  at          timestamptz not null,
  actor_name  text not null,
  actor_role  text not null,
  action      text not null,
  category    text not null,
  incident_id text,
  entity_id   text,
  detail      text not null,
  chain_hash  text not null
);
create index if not exists audit_events_at_idx on audit_events (at desc, seq desc);
create index if not exists audit_events_incident_idx on audit_events (incident_id) where incident_id is not null;

create or replace function audit_events_immutable() returns trigger language plpgsql as $$
begin
  raise exception 'audit_events is append-only: rows cannot be changed or deleted';
end;
$$;

drop trigger if exists audit_events_no_change on audit_events;
create trigger audit_events_no_change
  before update or delete on audit_events
  for each row execute function audit_events_immutable();
