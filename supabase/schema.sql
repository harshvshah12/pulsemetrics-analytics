-- PulseMetrics Cloud Analytics database bootstrap
-- Apply once in the SQL Editor of a dedicated Supabase project.
-- Never expose the service/secret key. All workspace data is protected by RLS.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector with schema extensions;
create schema if not exists private;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  monthly_event_quota bigint not null default 1000000 check (monthly_event_quota > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index if not exists workspace_members_user_idx on public.workspace_members(user_id);

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  public_id uuid not null unique,
  key_prefix text not null,
  secret_hash text not null,
  label text not null,
  scopes text[] not null default array['telemetry:write']::text[],
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index if not exists api_keys_workspace_idx on public.api_keys(workspace_id);

create table if not exists public.telemetry_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  service text not null,
  event_name text,
  message text,
  severity text not null default 'info' check (severity in ('debug', 'info', 'warn', 'error', 'critical')),
  status_code integer check (status_code between 100 and 599),
  latency_ms double precision check (latency_ms >= 0),
  occurred_at timestamptz not null default now(),
  received_at timestamptz not null default now(),
  region text,
  attributes jsonb not null default '{}'::jsonb
);
create index if not exists telemetry_events_workspace_received_idx on public.telemetry_events(workspace_id, received_at desc);
create index if not exists telemetry_events_workspace_service_idx on public.telemetry_events(workspace_id, service, received_at desc);
create index if not exists telemetry_events_workspace_severity_idx on public.telemetry_events(workspace_id, severity, received_at desc);
create index if not exists telemetry_events_workspace_status_idx on public.telemetry_events(workspace_id, status_code, received_at desc);
create index if not exists telemetry_events_attributes_idx on public.telemetry_events using gin(attributes);

create table if not exists public.event_embeddings (
  event_id uuid primary key references public.telemetry_events(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  embedding extensions.vector(1536) not null,
  model text not null,
  created_at timestamptz not null default now()
);
create index if not exists event_embeddings_workspace_idx on public.event_embeddings(workspace_id);

create table if not exists public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  metric text not null check (metric in ('error_rate', 'p95_latency_ms', 'error_count')),
  operator text not null default '>=' check (operator in ('>=', '>')),
  threshold double precision not null check (threshold >= 0),
  window_minutes integer not null default 5 check (window_minutes between 1 and 1440),
  cooldown_minutes integer not null default 15 check (cooldown_minutes between 1 and 1440),
  enabled boolean not null default true,
  last_triggered_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists alert_rules_workspace_enabled_idx on public.alert_rules(workspace_id, enabled);

create table if not exists public.alert_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  rule_id uuid references public.alert_rules(id) on delete set null,
  rule_name text not null,
  metric text not null,
  observed_value double precision not null,
  threshold double precision not null,
  triggered_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb
);
create index if not exists alert_events_workspace_triggered_idx on public.alert_events(workspace_id, triggered_at desc);

create table if not exists public.ingestion_usage (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  period_start date not null,
  event_count bigint not null default 0 check (event_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, period_start)
);

-- A new Auth user receives a personal workspace and owner membership.
create or replace function private.create_default_pulsemetrics_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_workspace_id uuid;
  workspace_name text;
  workspace_slug text;
begin
  workspace_name := coalesce(
    nullif(new.raw_user_meta_data->>'workspace_name', ''),
    split_part(coalesce(new.email, 'My'), '@', 1) || '''s Workspace'
  );
  workspace_slug := 'ws-' || replace(new.id::text, '-', '');

  insert into public.workspaces (name, slug, owner_id)
  values (workspace_name, workspace_slug, new.id)
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner')
  on conflict (workspace_id, user_id) do nothing;
  return new;
end;
$$;
revoke all on function private.create_default_pulsemetrics_workspace() from public, anon, authenticated;
drop trigger if exists on_pulsemetrics_auth_user_created on auth.users;
create trigger on_pulsemetrics_auth_user_created
  after insert on auth.users
  for each row execute procedure private.create_default_pulsemetrics_workspace();

-- Atomic monthly quota accounting; callable only from the trusted server role.
create or replace function public.consume_pulsemetrics_quota(p_workspace_id uuid, p_count bigint)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  updated_count bigint;
begin
  if p_count < 1 or p_count > 100 then return false; end if;
  insert into public.ingestion_usage (workspace_id, period_start, event_count)
  values (p_workspace_id, date_trunc('month', now())::date, 0)
  on conflict (workspace_id, period_start) do nothing;

  update public.ingestion_usage usage
  set event_count = usage.event_count + p_count, updated_at = now()
  from public.workspaces workspace
  where usage.workspace_id = p_workspace_id
    and usage.period_start = date_trunc('month', now())::date
    and workspace.id = p_workspace_id
    and usage.event_count + p_count <= workspace.monthly_event_quota
  returning usage.event_count into updated_count;
  return updated_count is not null;
end;
$$;
revoke all on function public.consume_pulsemetrics_quota(uuid, bigint) from public, anon, authenticated;
grant execute on function public.consume_pulsemetrics_quota(uuid, bigint) to service_role;

-- SQL-side metrics. Counts and percentiles are derived only from persisted records.
create or replace function public.pulsemetrics_analytics_summary(p_workspace_id uuid, p_since timestamptz)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
with filtered as (
  select * from public.telemetry_events
  where workspace_id = p_workspace_id and received_at >= p_since
),
totals as (
  select
    count(*)::bigint as total_events,
    count(*) filter (where severity in ('error', 'critical') or status_code >= 500)::bigint as error_count,
    percentile_cont(0.50) within group (order by latency_ms) filter (where latency_ms is not null) as p50_latency_ms,
    percentile_cont(0.95) within group (order by latency_ms) filter (where latency_ms is not null) as p95_latency_ms,
    percentile_cont(0.99) within group (order by latency_ms) filter (where latency_ms is not null) as p99_latency_ms
  from filtered
),
series as (
  select date_trunc(case when p_since < now() - interval '48 hours' then 'day' else 'hour' end, received_at) as bucket,
    count(*)::bigint as events,
    count(*) filter (where severity in ('error', 'critical') or status_code >= 500)::bigint as errors
  from filtered group by 1 order by 1
),
services as (
  select service, count(*)::bigint as events from filtered group by service order by events desc limit 8
),
regions as (
  select region, count(*)::bigint as events from filtered where region is not null group by region order by events desc limit 12
)
select jsonb_build_object(
  'totalEvents', totals.total_events,
  'errorCount', totals.error_count,
  'errorRate', case when totals.total_events = 0 then 0 else round((totals.error_count::numeric / totals.total_events::numeric) * 100, 3) end,
  'p50LatencyMs', coalesce(round(totals.p50_latency_ms::numeric, 2), 0),
  'p95LatencyMs', coalesce(round(totals.p95_latency_ms::numeric, 2), 0),
  'p99LatencyMs', coalesce(round(totals.p99_latency_ms::numeric, 2), 0),
  'series', coalesce((select jsonb_agg(jsonb_build_object('bucket', bucket, 'events', events, 'errors', errors) order by bucket) from series), '[]'::jsonb),
  'topServices', coalesce((select jsonb_agg(jsonb_build_object('service', service, 'events', events)) from services), '[]'::jsonb),
  'regions', coalesce((select jsonb_agg(jsonb_build_object('region', region, 'events', events)) from regions), '[]'::jsonb)
)
from totals;
$$;
revoke all on function public.pulsemetrics_analytics_summary(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.pulsemetrics_analytics_summary(uuid, timestamptz) to service_role;

-- Workspace-scoped vector similarity query. Dimension is intentionally fixed to 1536.
create or replace function public.match_pulsemetrics_events(
  p_workspace_id uuid,
  p_embedding extensions.vector(1536),
  p_match_count integer default 25
)
returns table (
  event_id uuid,
  service text,
  event_name text,
  message text,
  severity text,
  status_code integer,
  latency_ms double precision,
  occurred_at timestamptz,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public, extensions, pg_temp
as $$
  select e.id, e.service, e.event_name, e.message, e.severity, e.status_code, e.latency_ms, e.occurred_at,
    1 - (embedding.embedding <=> p_embedding) as similarity
  from public.event_embeddings embedding
  join public.telemetry_events e on e.id = embedding.event_id
  where embedding.workspace_id = p_workspace_id and e.workspace_id = p_workspace_id
  order by embedding.embedding <=> p_embedding
  limit greatest(1, least(p_match_count, 50));
$$;
revoke all on function public.match_pulsemetrics_events(uuid, extensions.vector, integer) from public, anon, authenticated;
grant execute on function public.match_pulsemetrics_events(uuid, extensions.vector, integer) to service_role;

-- Threshold alerts are checked against rolling event windows with per-rule cooldown.
create or replace function public.evaluate_pulsemetrics_alerts(p_workspace_id uuid)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  rule_row record;
  total_events bigint;
  error_events bigint;
  p95_latency double precision;
  observed double precision;
  triggered integer := 0;
begin
  for rule_row in
    select * from public.alert_rules where workspace_id = p_workspace_id and enabled = true
  loop
    select count(*)::bigint,
      count(*) filter (where severity in ('error', 'critical') or status_code >= 500)::bigint,
      percentile_cont(0.95) within group (order by latency_ms) filter (where latency_ms is not null)
    into total_events, error_events, p95_latency
    from public.telemetry_events
    where workspace_id = p_workspace_id
      and received_at >= now() - make_interval(mins => rule_row.window_minutes);

    if rule_row.metric = 'error_rate' then
      observed := case when total_events = 0 then 0 else (error_events::double precision / total_events::double precision) * 100 end;
    elsif rule_row.metric = 'error_count' then
      observed := error_events::double precision;
    else
      observed := coalesce(p95_latency, 0);
    end if;

    if ((rule_row.operator = '>=' and observed >= rule_row.threshold)
      or (rule_row.operator = '>' and observed > rule_row.threshold))
      and (rule_row.last_triggered_at is null
        or rule_row.last_triggered_at < now() - make_interval(mins => rule_row.cooldown_minutes)) then
      insert into public.alert_events (workspace_id, rule_id, rule_name, metric, observed_value, threshold, details)
      values (p_workspace_id, rule_row.id, rule_row.name, rule_row.metric, observed, rule_row.threshold,
        jsonb_build_object('windowMinutes', rule_row.window_minutes, 'totalEvents', total_events, 'errorEvents', error_events));
      update public.alert_rules set last_triggered_at = now() where id = rule_row.id;
      triggered := triggered + 1;
    end if;
  end loop;
  return triggered;
end;
$$;
revoke all on function public.evaluate_pulsemetrics_alerts(uuid) from public, anon, authenticated;
grant execute on function public.evaluate_pulsemetrics_alerts(uuid) to service_role;

-- RLS: users can read only their own workspace membership and the records of those workspaces.
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.api_keys enable row level security;
alter table public.telemetry_events enable row level security;
alter table public.event_embeddings enable row level security;
alter table public.alert_rules enable row level security;
alter table public.alert_events enable row level security;
alter table public.ingestion_usage enable row level security;

grant select on public.workspaces, public.workspace_members, public.telemetry_events, public.alert_rules, public.alert_events to authenticated;

drop policy if exists "workspace members can read their workspace" on public.workspaces;
create policy "workspace members can read their workspace" on public.workspaces
  for select to authenticated
  using (exists (
    select 1 from public.workspace_members m
    where m.workspace_id = workspaces.id and m.user_id = (select auth.uid())
  ));

drop policy if exists "users can read their own workspace memberships" on public.workspace_members;
create policy "users can read their own workspace memberships" on public.workspace_members
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "members can read workspace telemetry" on public.telemetry_events;
create policy "members can read workspace telemetry" on public.telemetry_events
  for select to authenticated
  using (exists (
    select 1 from public.workspace_members m
    where m.workspace_id = telemetry_events.workspace_id and m.user_id = (select auth.uid())
  ));

drop policy if exists "members can read workspace alert rules" on public.alert_rules;
create policy "members can read workspace alert rules" on public.alert_rules
  for select to authenticated
  using (exists (
    select 1 from public.workspace_members m
    where m.workspace_id = alert_rules.workspace_id and m.user_id = (select auth.uid())
  ));

drop policy if exists "admins can manage alert rules" on public.alert_rules;
create policy "admins can manage alert rules" on public.alert_rules
  for all to authenticated
  using (exists (
    select 1 from public.workspace_members m
    where m.workspace_id = alert_rules.workspace_id and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin')
  ))
  with check (exists (
    select 1 from public.workspace_members m
    where m.workspace_id = alert_rules.workspace_id and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin')
  ));

drop policy if exists "members can read alert history" on public.alert_events;
create policy "members can read alert history" on public.alert_events
  for select to authenticated
  using (exists (
    select 1 from public.workspace_members m
    where m.workspace_id = alert_events.workspace_id and m.user_id = (select auth.uid())
  ));

-- API keys, vector contents and quota counters must never be exposed to browser roles.
revoke all on public.api_keys, public.event_embeddings, public.ingestion_usage from anon, authenticated;

-- Enable tenant-filtered Realtime insert notifications for the event feed.
do $$
begin
  alter publication supabase_realtime add table public.telemetry_events;
exception when duplicate_object then
  null;
end;
$$;

comment on table public.telemetry_events is 'Persisted workspace-scoped telemetry. Product metrics are calculated from these records.';
comment on table public.api_keys is 'Server-only API key metadata and SHA-256 secret digests; plaintext secrets are never stored.';
comment on table public.event_embeddings is 'Optional pgvector embeddings from a configured OpenAI-compatible provider.';


-- Traffic anomaly detector: compare the current five-minute bucket with twelve
-- previous five-minute buckets. It reports insufficient data until a baseline
-- contains enough stored events, rather than manufacturing an anomaly score.
create or replace function public.pulsemetrics_anomaly_summary(p_workspace_id uuid, p_now timestamptz default now())
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
with bucketed as (
  select floor(extract(epoch from received_at) / 300)::bigint as bucket_id,
    count(*)::double precision as events,
    count(*) filter (where severity in ('error', 'critical') or status_code >= 500)::double precision as errors
  from public.telemetry_events
  where workspace_id = p_workspace_id
    and received_at >= p_now - interval '65 minutes'
    and received_at <= p_now
  group by 1
),
current_bucket as (
  select coalesce(sum(events), 0)::double precision as events,
    coalesce(sum(errors), 0)::double precision as errors
  from bucketed
  where bucket_id = floor(extract(epoch from p_now) / 300)::bigint
),
baseline as (
  select
    avg(coalesce(bucketed.events, 0))::double precision as mean_events,
    coalesce(stddev_samp(coalesce(bucketed.events, 0)), 0)::double precision as std_events,
    avg(coalesce(bucketed.errors, 0))::double precision as mean_errors,
    coalesce(stddev_samp(coalesce(bucketed.errors, 0)), 0)::double precision as std_errors,
    sum(coalesce(bucketed.events, 0))::double precision as baseline_events
  from generate_series(
    floor(extract(epoch from p_now) / 300)::bigint - 12,
    floor(extract(epoch from p_now) / 300)::bigint - 1
  ) as buckets(bucket_id)
  left join bucketed on bucketed.bucket_id = buckets.bucket_id
)
select jsonb_build_object(
  'status', case when baseline.baseline_events < 10 then 'insufficient_baseline' else 'analyzed' end,
  'windowMinutes', 5,
  'baselineWindows', 12,
  'baselineEvents', coalesce(baseline.baseline_events, 0),
  'currentEvents', current_bucket.events,
  'averageEventsPerWindow', round(coalesce(baseline.mean_events, 0)::numeric, 2),
  'currentErrors', current_bucket.errors,
  'averageErrorsPerWindow', round(coalesce(baseline.mean_errors, 0)::numeric, 2),
  'eventAnomaly', baseline.baseline_events >= 10
    and current_bucket.events > greatest(baseline.mean_events + 3 * baseline.std_events, baseline.mean_events * 1.5, 2),
  'errorAnomaly', baseline.baseline_events >= 10
    and current_bucket.errors > greatest(baseline.mean_errors + 3 * baseline.std_errors, baseline.mean_errors * 1.5, 2)
)
from current_bucket cross join baseline;
$$;
revoke all on function public.pulsemetrics_anomaly_summary(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.pulsemetrics_anomaly_summary(uuid, timestamptz) to service_role;


-- Per-key request throttling: one atomic fixed-window counter per API key.
create table if not exists public.api_key_rate_limits (
  api_key_id uuid primary key references public.api_keys(id) on delete cascade,
  window_start timestamptz not null default date_trunc('minute', now()),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);
alter table public.api_key_rate_limits enable row level security;
revoke all on public.api_key_rate_limits from anon, authenticated;

create or replace function public.consume_pulsemetrics_rate_limit(p_api_key_id uuid, p_limit integer default 120)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  current_count integer;
  current_window timestamptz := date_trunc('minute', now());
begin
  insert into public.api_key_rate_limits (api_key_id, window_start, request_count)
  values (p_api_key_id, current_window, 1)
  on conflict (api_key_id) do update
    set window_start = case
          when api_key_rate_limits.window_start < current_window then current_window
          else api_key_rate_limits.window_start
        end,
        request_count = case
          when api_key_rate_limits.window_start < current_window then 1
          else api_key_rate_limits.request_count + 1
        end,
        updated_at = now()
  returning request_count into current_count;
  return current_count <= greatest(1, least(p_limit, 1000));
end;
$$;
revoke all on function public.consume_pulsemetrics_rate_limit(uuid, integer) from public, anon, authenticated;
grant execute on function public.consume_pulsemetrics_rate_limit(uuid, integer) to service_role;

-- Compensate a quota reservation if persistence fails after the atomic check.
create or replace function public.release_pulsemetrics_quota(p_workspace_id uuid, p_count bigint)
returns void
language sql
security invoker
set search_path = public, pg_temp
as $$
  update public.ingestion_usage
  set event_count = greatest(0, event_count - greatest(0, p_count)),
      updated_at = now()
  where workspace_id = p_workspace_id
    and period_start = date_trunc('month', now())::date;
$$;
revoke all on function public.release_pulsemetrics_quota(uuid, bigint) from public, anon, authenticated;
grant execute on function public.release_pulsemetrics_quota(uuid, bigint) to service_role;
