-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

-- DROP EXTENSION pg_net;

-- CREATE ROLE supabase_privileged_role;

-- GRANT supabase_privileged_role TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

CREATE FUNCTION public.handle_new_auth_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
declare
  v_username text;
  v_phone text;
begin
  -- username y phone vienen de options.data en signUp()
  v_username := coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  v_phone := nullif(new.raw_user_meta_data->>'phone', '');

  insert into public.users (
    id,
    username,
    email,
    phone,
    password_hash,
    role_id,
    company_id,
    status,
    mfa_enabled,
    created_at
  )
  values (
    new.id,
    v_username,
    new.email,
    v_phone,
    'managed_by_supabase_auth',
    1,                -- PASAJERO por defecto
    null,
    'ACTIVE',
    false,
    now()
  )
  on conflict (id) do update set
    username = excluded.username,
    email    = excluded.email,
    phone    = excluded.phone;

  return new;
end;
$function$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

GRANT ALL ON FUNCTION public.handle_new_auth_user() TO anon;

GRANT ALL ON FUNCTION public.handle_new_auth_user() TO authenticated;

GRANT ALL ON FUNCTION public.handle_new_auth_user() TO service_role;

CREATE TABLE public.alerts (
  id                 uuid                        NOT NULL,
  created_by_user_id uuid                        NOT NULL,
  route_id           uuid,
  title              character varying           NOT NULL,
  message            text                        NOT NULL,
  alert_type         character varying           NOT NULL,
  severity           character varying           NOT NULL,
  starts_at          timestamp without time zone NOT NULL,
  ends_at            timestamp without time zone,
  status             character varying           NOT NULL,
  created_at         timestamp without time zone NOT NULL
);

COMMENT ON COLUMN public.alerts.alert_type IS 'DETOUR | EVENT | GENERAL';

COMMENT ON COLUMN public.alerts.severity IS 'INFO | WARNING | CRITICAL';

COMMENT ON COLUMN public.alerts.status IS 'ACTIVE | EXPIRED | CANCELED';

ALTER TABLE public.alerts
  ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);

GRANT ALL ON public.alerts TO anon;

GRANT ALL ON public.alerts TO authenticated;

GRANT ALL ON public.alerts TO service_role;

CREATE TABLE public.audit_logs (
  id          uuid                        NOT NULL,
  user_id     uuid                        NOT NULL,
  session_id  uuid,
  event_type  character varying           NOT NULL,
  function_id integer,
  created_at  timestamp without time zone NOT NULL,
  ip          character varying,
  metadata    text
);

COMMENT ON COLUMN public.audit_logs.event_type IS 'LOGIN | LOGOUT | FUNCTION_CALL | PERMISSION_DENIED';

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

GRANT ALL ON public.audit_logs TO anon;

GRANT ALL ON public.audit_logs TO authenticated;

GRANT ALL ON public.audit_logs TO service_role;

CREATE TABLE public.buses (
  id            uuid                        NOT NULL,
  company_id    uuid                        NOT NULL,
  plate         character varying           NOT NULL,
  internal_code character varying,
  status        character varying           NOT NULL,
  created_at    timestamp without time zone NOT NULL,
  updated_at    timestamp without time zone
);

COMMENT ON COLUMN public.buses.status IS 'ACTIVE | INACTIVE | MAINTENANCE';

ALTER TABLE public.buses
  ADD CONSTRAINT buses_pkey PRIMARY KEY (id);

ALTER TABLE public.buses
  ADD CONSTRAINT buses_plate_key UNIQUE (plate);

GRANT ALL ON public.buses TO anon;

GRANT ALL ON public.buses TO authenticated;

GRANT ALL ON public.buses TO service_role;

CREATE TABLE public.companies (
  id         uuid                        NOT NULL,
  name       character varying           NOT NULL,
  nit        character varying,
  phone      character varying,
  email      character varying,
  address    character varying,
  status     character varying           NOT NULL,
  created_at timestamp without time zone NOT NULL,
  updated_at timestamp without time zone
);

COMMENT ON COLUMN public.companies.status IS 'ACTIVE | INACTIVE';

ALTER TABLE public.companies
  ADD CONSTRAINT companies_name_key UNIQUE (name);

ALTER TABLE public.companies
  ADD CONSTRAINT companies_nit_key UNIQUE (nit);

ALTER TABLE public.companies
  ADD CONSTRAINT companies_pkey PRIMARY KEY (id);

ALTER TABLE public.buses
  ADD CONSTRAINT buses_company_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);

GRANT ALL ON public.companies TO anon;

GRANT ALL ON public.companies TO authenticated;

GRANT ALL ON public.companies TO service_role;

CREATE TABLE public.drivers (
  id         uuid                        NOT NULL,
  company_id uuid                        NOT NULL,
  full_name  character varying           NOT NULL,
  doc_type   character varying           NOT NULL,
  doc_number character varying           NOT NULL,
  phone      character varying,
  license_no character varying           NOT NULL,
  status     character varying           NOT NULL,
  created_at timestamp without time zone NOT NULL,
  updated_at timestamp without time zone,
  user_id    uuid
);

COMMENT ON COLUMN public.drivers.doc_type IS 'CC | CE | PASSPORT';

COMMENT ON COLUMN public.drivers.status IS 'ACTIVE | INACTIVE';

ALTER TABLE public.drivers
  ADD CONSTRAINT drivers_company_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE public.drivers
  ADD CONSTRAINT drivers_pkey PRIMARY KEY (id);

GRANT ALL ON public.drivers TO anon;

GRANT ALL ON public.drivers TO authenticated;

GRANT ALL ON public.drivers TO service_role;

CREATE UNIQUE INDEX drivers_company_doc_uq ON public.drivers (company_id, doc_type, doc_number);

CREATE UNIQUE INDEX drivers_user_id_unique_idx ON public.drivers (user_id)
  WHERE user_id IS NOT NULL;

CREATE TABLE public.functions (
  id    integer           GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  name  character varying NOT NULL,
  route character varying
);

COMMENT ON COLUMN public.functions.name IS 'Acción controlada por permisos';

COMMENT ON COLUMN public.functions.route IS 'Pantalla o endpoint (opcional)';

ALTER TABLE public.functions
  ADD CONSTRAINT functions_name_key UNIQUE (name);

ALTER TABLE public.functions
  ADD CONSTRAINT functions_pkey PRIMARY KEY (id);

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_function_fk FOREIGN KEY (function_id) REFERENCES public.functions(id);

GRANT ALL ON public.functions TO anon;

GRANT ALL ON public.functions TO authenticated;

GRANT ALL ON public.functions TO service_role;

CREATE TABLE public.incident_categories (
  id   integer           GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  name character varying NOT NULL
);

COMMENT ON COLUMN public.incident_categories.name IS 'ACOSO | ROBO | MAL_COMPORTAMIENTO | OTRO';

ALTER TABLE public.incident_categories
  ADD CONSTRAINT incident_categories_name_key UNIQUE (name);

ALTER TABLE public.incident_categories
  ADD CONSTRAINT incident_categories_pkey PRIMARY KEY (id);

GRANT ALL ON public.incident_categories TO anon;

GRANT ALL ON public.incident_categories TO authenticated;

GRANT ALL ON public.incident_categories TO service_role;

CREATE TABLE public.incidents (
  id                 uuid                        NOT NULL,
  category_id        integer                     NOT NULL,
  created_by_user_id uuid,
  route_id           uuid,
  bus_id             uuid,
  driver_id          uuid,
  occurred_at        timestamp without time zone NOT NULL,
  lat                numeric,
  lng                numeric,
  description        text                        NOT NULL,
  status             character varying           NOT NULL,
  created_at         timestamp without time zone NOT NULL
);

COMMENT ON COLUMN public.incidents.status IS 'NEW | IN_REVIEW | RESOLVED | REJECTED';

ALTER TABLE public.incidents
  ADD CONSTRAINT incidents_bus_fk FOREIGN KEY (bus_id) REFERENCES public.buses(id);

ALTER TABLE public.incidents
  ADD CONSTRAINT incidents_category_fk FOREIGN KEY (category_id) REFERENCES public.incident_categories(id);

ALTER TABLE public.incidents
  ADD CONSTRAINT incidents_driver_fk FOREIGN KEY (driver_id) REFERENCES public.drivers(id);

ALTER TABLE public.incidents
  ADD CONSTRAINT incidents_pkey PRIMARY KEY (id);

GRANT ALL ON public.incidents TO anon;

GRANT ALL ON public.incidents TO authenticated;

GRANT ALL ON public.incidents TO service_role;

CREATE TABLE public.role_permissions (
  role_id     integer NOT NULL,
  function_id integer NOT NULL,
  allowed     boolean DEFAULT true NOT NULL
);

ALTER TABLE public.role_permissions
  ADD CONSTRAINT role_permissions_function_fk FOREIGN KEY (function_id) REFERENCES public.functions(id);

ALTER TABLE public.role_permissions
  ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, function_id);

GRANT ALL ON public.role_permissions TO anon;

GRANT ALL ON public.role_permissions TO authenticated;

GRANT ALL ON public.role_permissions TO service_role;

CREATE INDEX role_permissions_role_id_idx ON public.role_permissions (role_id);

CREATE INDEX role_permissions_function_id_idx ON public.role_permissions (function_id);

CREATE TABLE public.roles (
  id   integer           GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  name character varying NOT NULL
);

COMMENT ON COLUMN public.roles.name IS 'PASAJERO | EMPRESA_BUSES | SUPER_ADMIN';

ALTER TABLE public.roles
  ADD CONSTRAINT roles_name_key UNIQUE (name);

ALTER TABLE public.roles
  ADD CONSTRAINT roles_pkey PRIMARY KEY (id);

ALTER TABLE public.role_permissions
  ADD CONSTRAINT role_permissions_role_fk FOREIGN KEY (role_id) REFERENCES public.roles(id);

GRANT ALL ON public.roles TO anon;

GRANT ALL ON public.roles TO authenticated;

GRANT ALL ON public.roles TO service_role;

CREATE TABLE public.route_stops (
  route_id   uuid    NOT NULL,
  stop_id    uuid    NOT NULL,
  stop_order integer NOT NULL
);

ALTER TABLE public.route_stops
  ADD CONSTRAINT route_stops_pkey PRIMARY KEY (route_id, stop_order);

GRANT ALL ON public.route_stops TO anon;

GRANT ALL ON public.route_stops TO authenticated;

GRANT ALL ON public.route_stops TO service_role;

CREATE UNIQUE INDEX route_stops_route_stop_uq ON public.route_stops (route_id, stop_id);

CREATE TABLE public.routes (
  id             uuid                        NOT NULL,
  company_id     uuid                        NOT NULL,
  name           character varying           NOT NULL,
  origin_stop_id uuid                        NOT NULL,
  end_stop_id    uuid                        NOT NULL,
  direction      character varying           NOT NULL,
  status         character varying           NOT NULL,
  created_at     timestamp without time zone NOT NULL,
  updated_at     timestamp without time zone
);

COMMENT ON COLUMN public.routes.direction IS 'IDA | VUELTA';

COMMENT ON COLUMN public.routes.status IS 'ACTIVE | INACTIVE';

ALTER TABLE public.routes
  ADD CONSTRAINT routes_company_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE public.routes
  ADD CONSTRAINT routes_pkey PRIMARY KEY (id);

ALTER TABLE public.alerts
  ADD CONSTRAINT alerts_route_fk FOREIGN KEY (route_id) REFERENCES public.routes(id);

ALTER TABLE public.incidents
  ADD CONSTRAINT incidents_route_fk FOREIGN KEY (route_id) REFERENCES public.routes(id);

ALTER TABLE public.route_stops
  ADD CONSTRAINT route_stops_route_fk FOREIGN KEY (route_id) REFERENCES public.routes(id);

GRANT ALL ON public.routes TO anon;

GRANT ALL ON public.routes TO authenticated;

GRANT ALL ON public.routes TO service_role;

CREATE TABLE public.sessions (
  id        uuid                        NOT NULL,
  user_id   uuid                        NOT NULL,
  status    character varying           NOT NULL,
  opened_at timestamp without time zone NOT NULL,
  closed_at timestamp without time zone,
  ip        character varying
);

COMMENT ON COLUMN public.sessions.status IS 'OPEN | CLOSED';

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_session_fk FOREIGN KEY (session_id) REFERENCES public.sessions(id);

GRANT ALL ON public.sessions TO anon;

GRANT ALL ON public.sessions TO authenticated;

GRANT ALL ON public.sessions TO service_role;

CREATE TABLE public.stops (
  id      uuid              NOT NULL,
  name    character varying NOT NULL,
  lat     numeric           NOT NULL,
  lng     numeric           NOT NULL,
  address character varying,
  status  character varying NOT NULL
);

COMMENT ON COLUMN public.stops.status IS 'ACTIVE | INACTIVE';

ALTER TABLE public.stops
  ADD CONSTRAINT stops_pkey PRIMARY KEY (id);

ALTER TABLE public.route_stops
  ADD CONSTRAINT route_stops_stop_fk FOREIGN KEY (stop_id) REFERENCES public.stops(id);

ALTER TABLE public.routes
  ADD CONSTRAINT routes_end_stop_fk FOREIGN KEY (end_stop_id) REFERENCES public.stops(id);

ALTER TABLE public.routes
  ADD CONSTRAINT routes_origin_stop_fk FOREIGN KEY (origin_stop_id) REFERENCES public.stops(id);

GRANT ALL ON public.stops TO anon;

GRANT ALL ON public.stops TO authenticated;

GRANT ALL ON public.stops TO service_role;

CREATE TABLE public.trips (
  id        uuid                        NOT NULL,
  route_id  uuid                        NOT NULL,
  bus_id    uuid                        NOT NULL,
  driver_id uuid,
  start_at  timestamp without time zone NOT NULL,
  end_at    timestamp without time zone,
  status    character varying           NOT NULL
);

COMMENT ON COLUMN public.trips.status IS 'IN_PROGRESS | FINISHED | CANCELED';

ALTER TABLE public.trips
  ADD CONSTRAINT trips_bus_fk FOREIGN KEY (bus_id) REFERENCES public.buses(id);

ALTER TABLE public.trips
  ADD CONSTRAINT trips_driver_fk FOREIGN KEY (driver_id) REFERENCES public.drivers(id);

ALTER TABLE public.trips
  ADD CONSTRAINT trips_pkey PRIMARY KEY (id);

ALTER TABLE public.trips
  ADD CONSTRAINT trips_route_fk FOREIGN KEY (route_id) REFERENCES public.routes(id);

GRANT ALL ON public.trips TO anon;

GRANT ALL ON public.trips TO authenticated;

GRANT ALL ON public.trips TO service_role;

CREATE TABLE public.user_alert_subscriptions (
  user_id    uuid    NOT NULL,
  route_id   uuid    NOT NULL,
  is_enabled boolean DEFAULT true NOT NULL
);

ALTER TABLE public.user_alert_subscriptions
  ADD CONSTRAINT subs_route_fk FOREIGN KEY (route_id) REFERENCES public.routes(id);

ALTER TABLE public.user_alert_subscriptions
  ADD CONSTRAINT user_alert_subscriptions_pkey PRIMARY KEY (user_id, route_id);

GRANT ALL ON public.user_alert_subscriptions TO anon;

GRANT ALL ON public.user_alert_subscriptions TO authenticated;

GRANT ALL ON public.user_alert_subscriptions TO service_role;

CREATE TABLE public.users (
  id            uuid                        NOT NULL,
  username      character varying           NOT NULL,
  email         character varying,
  phone         character varying,
  password_hash character varying           NOT NULL,
  role_id       integer                     NOT NULL,
  company_id    uuid,
  status        character varying           NOT NULL,
  mfa_enabled   boolean                     DEFAULT false NOT NULL,
  created_at    timestamp without time zone NOT NULL,
  updated_at    timestamp without time zone,
  last_login_at timestamp without time zone
);

COMMENT ON COLUMN public.users.status IS 'ACTIVE | INACTIVE | SUSPENDED';

ALTER TABLE public.users
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.users
  ADD CONSTRAINT users_company_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE public.users
  ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE public.users
  ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE public.alerts
  ADD CONSTRAINT alerts_created_by_fk FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_user_fk FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.drivers
  ADD CONSTRAINT drivers_user_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.incidents
  ADD CONSTRAINT incidents_user_fk FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.user_alert_subscriptions
  ADD CONSTRAINT subs_user_fk FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.users
  ADD CONSTRAINT users_role_fk FOREIGN KEY (role_id) REFERENCES public.roles(id);

ALTER TABLE public.users
  ADD CONSTRAINT users_username_key UNIQUE (username);

GRANT ALL ON public.users TO anon;

GRANT ALL ON public.users TO authenticated;

GRANT ALL ON public.users TO service_role;

CREATE POLICY users_insert_own_profile ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK ((id = auth.uid()));

CREATE POLICY users_select_own_profile ON public.users
  FOR SELECT
  TO authenticated
  USING ((id = auth.uid()));

CREATE POLICY users_update_own_profile ON public.users
  FOR UPDATE
  TO authenticated
  USING ((id = auth.uid()))
  WITH CHECK ((id = auth.uid()));

CREATE TABLE public.vehicle_positions (
  id          uuid                        NOT NULL,
  trip_id     uuid                        NOT NULL,
  bus_id      uuid                        NOT NULL,
  recorded_at timestamp without time zone NOT NULL,
  lat         numeric                     NOT NULL,
  lng         numeric                     NOT NULL,
  speed_kmh   numeric,
  heading     integer
);

ALTER TABLE public.vehicle_positions
  ADD CONSTRAINT vehicle_positions_bus_fk FOREIGN KEY (bus_id) REFERENCES public.buses(id);

ALTER TABLE public.vehicle_positions
  ADD CONSTRAINT vehicle_positions_pkey PRIMARY KEY (id);

ALTER TABLE public.vehicle_positions
  ADD CONSTRAINT vehicle_positions_trip_fk FOREIGN KEY (trip_id) REFERENCES public.trips(id);

GRANT ALL ON public.vehicle_positions TO anon;

GRANT ALL ON public.vehicle_positions TO authenticated;

GRANT ALL ON public.vehicle_positions TO service_role;

CREATE INDEX vehicle_positions_bus_time_idx ON public.vehicle_positions (bus_id, recorded_at);

CREATE UNIQUE INDEX vehicle_positions_trip_id_unique_idx ON public.vehicle_positions (trip_id);

CREATE INDEX vehicle_positions_trip_time_idx ON public.vehicle_positions (trip_id, recorded_at);
