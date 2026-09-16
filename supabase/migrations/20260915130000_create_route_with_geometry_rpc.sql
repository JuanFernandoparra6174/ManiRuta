create or replace function public.create_route_with_geometry(
  p_company_id uuid,
  p_name text,
  p_direction text,
  p_status text,
  p_stop_ids uuid[],
  p_provider text,
  p_profile text,
  p_geometry jsonb,
  p_distance_meters numeric,
  p_duration_seconds numeric,
  p_legs jsonb,
  p_snapped_waypoints jsonb,
  p_stop_sequence_hash text
)
returns table(route_id uuid, geometry_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_route_id uuid := extensions.gen_random_uuid();
  v_geometry_id uuid := extensions.gen_random_uuid();
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.users profile
    where profile.id = auth.uid()
      and (profile.role_id = 3 or (profile.role_id = 2 and profile.company_id = p_company_id))
  ) then
    raise exception 'not authorized for company' using errcode = '42501';
  end if;

  if nullif(btrim(p_name), '') is null
    or p_direction not in ('IDA', 'VUELTA')
    or p_status not in ('ACTIVE', 'INACTIVE')
    or coalesce(array_length(p_stop_ids, 1), 0) < 2
    or p_stop_ids[1] = p_stop_ids[array_length(p_stop_ids, 1)]
    or cardinality(p_stop_ids) <> cardinality(array(select distinct unnest(p_stop_ids))) then
    raise exception 'invalid route payload' using errcode = '22023';
  end if;

  insert into public.routes (
    id, company_id, name, origin_stop_id, end_stop_id, direction, status, created_at, updated_at
  ) values (
    v_route_id, p_company_id, btrim(p_name), p_stop_ids[1], p_stop_ids[array_length(p_stop_ids, 1)], p_direction, p_status, now(), now()
  );

  insert into public.route_stops (route_id, stop_id, stop_order)
  select v_route_id, stop_id, stop_order
  from unnest(p_stop_ids) with ordinality as stops(stop_id, stop_order);

  insert into public.route_geometries (
    id, route_id, version, status, provider, profile, geometry, distance_meters, duration_seconds,
    legs, snapped_waypoints, stop_sequence_hash, calculated_at, approved_at
  ) values (
    v_geometry_id, v_route_id, 1, 'ACTIVE', p_provider, p_profile, p_geometry, p_distance_meters, p_duration_seconds,
    p_legs, p_snapped_waypoints, p_stop_sequence_hash, now(), now()
  );

  return query select v_route_id, v_geometry_id;
end;
$$;

revoke all on function public.create_route_with_geometry(uuid, text, text, text, uuid[], text, text, jsonb, numeric, numeric, jsonb, jsonb, text) from public, anon;
grant execute on function public.create_route_with_geometry(uuid, text, text, text, uuid[], text, text, jsonb, numeric, numeric, jsonb, jsonb, text) to authenticated;
