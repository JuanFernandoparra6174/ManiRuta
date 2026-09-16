create table public.route_geometries (
  id uuid not null,
  route_id uuid not null,
  version integer not null,
  status text not null,
  provider text not null,
  profile text not null,
  geometry jsonb,
  distance_meters numeric,
  duration_seconds numeric,
  legs jsonb not null default '[]'::jsonb,
  snapped_waypoints jsonb not null default '[]'::jsonb,
  stop_sequence_hash text not null,
  calculated_at timestamp without time zone not null default now(),
  approved_at timestamp without time zone,
  error_code text,
  error_detail text,
  constraint route_geometries_pkey primary key (id),
  constraint route_geometries_route_fk
    foreign key (route_id)
    references public.routes(id)
    on delete cascade,
  constraint route_geometries_route_version_uq
    unique (route_id, version),
  constraint route_geometries_version_positive
    check (version > 0),
  constraint route_geometries_status_check
    check (status in ('DRAFT', 'READY', 'ACTIVE', 'FAILED', 'SUPERSEDED')),
  constraint route_geometries_provider_not_blank
    check (btrim(provider) <> ''),
  constraint route_geometries_profile_not_blank
    check (btrim(profile) <> ''),
  constraint route_geometries_stop_sequence_hash_sha256
    check (stop_sequence_hash ~ '^[0-9a-f]{64}$'),
  constraint route_geometries_distance_nonnegative
    check (distance_meters is null or distance_meters >= 0),
  constraint route_geometries_duration_nonnegative
    check (duration_seconds is null or duration_seconds >= 0),
  constraint route_geometries_geometry_linestring
    check (
      geometry is null
      or (
        jsonb_typeof(geometry) = 'object'
        and geometry ->> 'type' = 'LineString'
        and jsonb_typeof(geometry -> 'coordinates') = 'array'
        and jsonb_array_length(geometry -> 'coordinates') >= 2
      )
    ),
  constraint route_geometries_legs_array
    check (jsonb_typeof(legs) = 'array'),
  constraint route_geometries_snapped_waypoints_array
    check (jsonb_typeof(snapped_waypoints) = 'array'),
  constraint route_geometries_calculated_status_complete
    check (
      status in ('DRAFT', 'FAILED')
      or (
        geometry is not null
        and distance_meters is not null
        and duration_seconds is not null
      )
    ),
  constraint route_geometries_active_is_approved
    check (status <> 'ACTIVE' or approved_at is not null),
  constraint route_geometries_errors_only_for_failed
    check (
      (status = 'FAILED' and error_code is not null)
      or (status <> 'FAILED' and error_code is null and error_detail is null)
    )
);

create unique index route_geometries_one_active_per_route_uq
  on public.route_geometries (route_id)
  where status = 'ACTIVE';

create index route_geometries_route_calculated_at_idx
  on public.route_geometries (route_id, calculated_at desc);

alter table public.route_geometries enable row level security;

grant select, insert, update, delete on public.route_geometries to authenticated;
grant all on public.route_geometries to service_role;

create policy route_geometries_select_authorized
  on public.route_geometries
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.users as current_profile
      join public.routes as route on route.id = route_geometries.route_id
      where current_profile.id = (select auth.uid())
        and (
          current_profile.role_id = 3
          or (
            current_profile.role_id in (2, 4)
            and current_profile.company_id = route.company_id
          )
          or (
            current_profile.role_id = 1
            and route.status = 'ACTIVE'
            and route_geometries.status = 'ACTIVE'
          )
        )
    )
  );

create policy route_geometries_insert_company_or_admin
  on public.route_geometries
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.users as current_profile
      join public.routes as route on route.id = route_geometries.route_id
      where current_profile.id = (select auth.uid())
        and (
          current_profile.role_id = 3
          or (
            current_profile.role_id = 2
            and current_profile.company_id = route.company_id
          )
        )
    )
  );

create policy route_geometries_update_company_or_admin
  on public.route_geometries
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.users as current_profile
      join public.routes as route on route.id = route_geometries.route_id
      where current_profile.id = (select auth.uid())
        and (
          current_profile.role_id = 3
          or (
            current_profile.role_id = 2
            and current_profile.company_id = route.company_id
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from public.users as current_profile
      join public.routes as route on route.id = route_geometries.route_id
      where current_profile.id = (select auth.uid())
        and (
          current_profile.role_id = 3
          or (
            current_profile.role_id = 2
            and current_profile.company_id = route.company_id
          )
        )
    )
  );

create policy route_geometries_delete_company_or_admin
  on public.route_geometries
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.users as current_profile
      join public.routes as route on route.id = route_geometries.route_id
      where current_profile.id = (select auth.uid())
        and (
          current_profile.role_id = 3
          or (
            current_profile.role_id = 2
            and current_profile.company_id = route.company_id
          )
        )
    )
  );
