import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type Coord = [number, number];
type Stop = { id: string; lat: number; lng: number; order: number };
type Control = { id?: string; lat: number; lng: number; afterStopOrder: number };
type Point = { id: string; kind: "stop" | "controlPoint"; lat: number; lng: number; stopOrder?: number; afterStopOrder?: number };
type Code = "INVALID_INPUT" | "AUTH_REQUIRED" | "ROUTING_NOT_CONFIGURED" | "MAPBOX_AUTH_ERROR" | "MAPBOX_NO_SEGMENT" | "MAPBOX_RATE_LIMIT" | "MAPBOX_SERVER_ERROR" | "ROUTE_DISCONTINUITY" | "INVALID_MAPBOX_RESPONSE";

class RouteError extends Error { constructor(readonly code: Code, readonly status: number) { super(code); } }
const BLOCK_SIZE = 25, MAX_POINTS = 500, SNAP_RADIUS_M = 100, SNAP_WARNING_M = 30, CONTINUITY_M = 5, MAX_RETRIES = 2;
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const coordinate = (value: unknown): value is Coord => Array.isArray(value) && value.length >= 2 && finite(value[0]) && finite(value[1]);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function validatePoint(value: unknown, needsId: boolean): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new RouteError("INVALID_INPUT", 400);
  const point = value as Record<string, unknown>;
  if (!finite(point.lat) || !finite(point.lng) || point.lat < -90 || point.lat > 90 || point.lng < -180 || point.lng > 180 ||
    (needsId && (typeof point.id !== "string" || point.id.trim() === "")) ||
    (typeof point.id !== "undefined" && (typeof point.id !== "string" || point.id.trim() === ""))) throw new RouteError("INVALID_INPUT", 400);
  return point;
}

function inputPoints(value: unknown): Point[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new RouteError("INVALID_INPUT", 400);
  const body = value as { stops?: unknown; controlPoints?: unknown; profile?: unknown };
  if ((body.profile ?? "driving") !== "driving" || !Array.isArray(body.stops) || body.stops.length < 2 || body.stops.length > MAX_POINTS) throw new RouteError("INVALID_INPUT", 400);
  const stops = body.stops.map((item) => {
    const raw = validatePoint(item, true);
    if (!Number.isInteger(raw.order)) throw new RouteError("INVALID_INPUT", 400);
    return { id: raw.id as string, lat: raw.lat as number, lng: raw.lng as number, order: raw.order as number } as Stop;
  }).sort((a, b) => a.order - b.order);
  const ids = new Set<string>();
  stops.forEach((stop, i) => { if (ids.has(stop.id) || stop.order !== i + 1) throw new RouteError("INVALID_INPUT", 400); ids.add(stop.id); });
  const rawControls = body.controlPoints ?? [];
  if (!Array.isArray(rawControls) || rawControls.length + stops.length > MAX_POINTS) throw new RouteError("INVALID_INPUT", 400);
  const controls = rawControls.map((item, i) => {
    const raw = validatePoint(item, false);
    if (!Number.isInteger(raw.afterStopOrder) || (raw.afterStopOrder as number) < 1 || (raw.afterStopOrder as number) >= stops.length) throw new RouteError("INVALID_INPUT", 400);
    const id = (raw.id as string | undefined) ?? `control-${i + 1}`;
    if (ids.has(id)) throw new RouteError("INVALID_INPUT", 400); ids.add(id);
    return { id, lat: raw.lat as number, lng: raw.lng as number, afterStopOrder: raw.afterStopOrder as number, index: i };
  }).sort((a, b) => a.afterStopOrder - b.afterStopOrder || a.index - b.index);
  const points: Point[] = [];
  for (const stop of stops) {
    points.push({ ...stop, kind: "stop", stopOrder: stop.order });
    controls.filter((control) => control.afterStopOrder === stop.order).forEach((control) => points.push({ ...control, kind: "controlPoint" }));
  }
  return points;
}

function blocks(points: Point[]): Point[][] {
  const result: Point[][] = [];
  for (let start = 0; start < points.length - 1; start += BLOCK_SIZE - 1) result.push(points.slice(start, Math.min(start + BLOCK_SIZE, points.length)));
  return result;
}

function meters(a: Coord, b: Coord): number {
  const r = Math.PI / 180, dLat = (b[1] - a[1]) * r, dLng = (b[0] - a[0]) * r, p = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLng / 2) ** 2;
  return 12_742_000 * Math.atan2(Math.sqrt(p), Math.sqrt(1 - p));
}

function mapboxError(status: number, body: unknown): RouteError {
  const providerCode = body && typeof body === "object" ? (body as Record<string, unknown>).code : undefined;
  if (status === 401 || status === 403) return new RouteError("MAPBOX_AUTH_ERROR", 502);
  if (status === 429) return new RouteError("MAPBOX_RATE_LIMIT", 503);
  if (status >= 500) return new RouteError("MAPBOX_SERVER_ERROR", 502);
  if (providerCode === "NoSegment" || providerCode === "NoRoute") return new RouteError("MAPBOX_NO_SEGMENT", 422);
  return new RouteError("INVALID_MAPBOX_RESPONSE", 502);
}

async function directions(token: string, points: Point[]): Promise<{ route: Record<string, unknown>; waypoints: unknown[]; status: number }> {
  const path = points.map((point) => `${point.lng},${point.lat}`).join(";");
  const query = new URLSearchParams({ access_token: token, geometries: "geojson", overview: "full", steps: "false", waypoints_per_route: "true", radiuses: points.map(() => String(SNAP_RADIUS_M)).join(";") });
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${path}?${query}`;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    let response: Response;
    try { response = await fetch(url); } catch { throw new RouteError("MAPBOX_SERVER_ERROR", 502); }
    let body: unknown = null; try { body = await response.json(); } catch { /* validated below */ }
    if (response.ok) {
      const result = body as Record<string, unknown>, route = Array.isArray(result?.routes) ? result.routes[0] as Record<string, unknown> : undefined;
      if (result?.code !== "Ok") throw mapboxError(response.status, result);
      if (Array.isArray(result?.routes) && result.routes.length === 0) throw new RouteError("MAPBOX_NO_SEGMENT", 422);
      const waypoints = Array.isArray(route?.waypoints) ? route.waypoints : result?.waypoints;
      if (!route || !Array.isArray(waypoints) || waypoints.length !== points.length) throw new RouteError("INVALID_MAPBOX_RESPONSE", 502);
      return { route, waypoints, status: response.status };
    }
    const error = mapboxError(response.status, body);
    if ((response.status !== 429 && response.status < 500) || attempt === MAX_RETRIES) throw error;
    const retry = Number(response.headers.get("Retry-After"));
    await sleep(Number.isFinite(retry) && retry > 0 ? Math.min(retry * 1000, 5000) : 250 * (attempt + 1));
  }
  throw new RouteError("MAPBOX_SERVER_ERROR", 502);
}

async function sequenceHash(points: Point[]): Promise<string> {
  const source = JSON.stringify({ profile: "mapbox/driving", points: points.map(({ id, kind, lat, lng, stopOrder, afterStopOrder }) => ({ id, kind, lat, lng, stopOrder: stopOrder ?? null, afterStopOrder: afterStopOrder ?? null })) });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, "0")).join("");
}

async function requireUser(req: Request): Promise<void> {
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) throw new RouteError("AUTH_REQUIRED", 401);
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) throw new RouteError("AUTH_REQUIRED", 401);
  const client = createClient(url, key, { global: { headers: { Authorization: authorization } } });
  const { data, error } = await client.auth.getUser(authorization.slice(7));
  if (error || !data.user) throw new RouteError("AUTH_REQUIRED", 401);
}

Deno.serve(async (req) => {
  const started = Date.now(); let stops = 0, blockCount = 0; const statuses: number[] = [];
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ ok: false, error: { code: "INVALID_INPUT" } }, 405);
  try {
    await requireUser(req);
    let payload: unknown; try { payload = await req.json(); } catch { throw new RouteError("INVALID_INPUT", 400); }
    const points = inputPoints(payload); stops = points.filter((point) => point.kind === "stop").length;
    const token = Deno.env.get("MAPBOX_ACCESS_TOKEN"); if (!token) throw new RouteError("ROUTING_NOT_CONFIGURED", 503);
    const routeBlocks = blocks(points); blockCount = routeBlocks.length;
    const geometry: Coord[] = [], legs: unknown[] = [], snappedWaypoints: unknown[] = [], warnings: unknown[] = []; const seen = new Set<number>(); let distanceMeters = 0, durationSeconds = 0;
    for (let i = 0; i < routeBlocks.length; i += 1) {
      const block = routeBlocks[i], { route, waypoints, status } = await directions(token, block); statuses.push(status);
      const shape = route.geometry as Record<string, unknown>, vertices = shape?.coordinates, rawLegs = route.legs;
      if (shape?.type !== "LineString" || !Array.isArray(vertices) || vertices.length < 2 || !vertices.every(coordinate) || !Array.isArray(rawLegs) || !finite(route.distance) || !finite(route.duration)) throw new RouteError("INVALID_MAPBOX_RESPONSE", 502);
      if (geometry.length) { if (meters(geometry[geometry.length - 1], vertices[0]) > CONTINUITY_M) throw new RouteError("ROUTE_DISCONTINUITY", 502); geometry.push(...vertices.slice(1)); } else geometry.push(...vertices);
      distanceMeters += route.distance; durationSeconds += route.duration;
      rawLegs.forEach((leg, legIndex) => { const data = leg as Record<string, unknown>; if (!data || !finite(data.distance) || !finite(data.duration)) throw new RouteError("INVALID_MAPBOX_RESPONSE", 502); legs.push({ from: { id: block[legIndex]?.id, kind: block[legIndex]?.kind, stopOrder: block[legIndex]?.stopOrder ?? null }, to: { id: block[legIndex + 1]?.id, kind: block[legIndex + 1]?.kind, stopOrder: block[legIndex + 1]?.stopOrder ?? null }, distanceMeters: data.distance, durationSeconds: data.duration }); });
      waypoints.forEach((waypoint, index) => { const raw = waypoint as Record<string, unknown>, globalIndex = i * (BLOCK_SIZE - 1) + index; if (!raw || !coordinate(raw.location)) throw new RouteError("INVALID_MAPBOX_RESPONSE", 502); if (seen.has(globalIndex)) return; seen.add(globalIndex); const point = block[index], displacementMeters = meters([point.lng, point.lat], raw.location); snappedWaypoints.push({ id: point.id, kind: point.kind, stopOrder: point.stopOrder ?? null, original: [point.lng, point.lat], snapped: raw.location, displacementMeters }); if (displacementMeters > SNAP_WARNING_M) warnings.push({ code: "STOP_SNAPPED_AWAY_FROM_INPUT", pointId: point.id, displacementMeters }); });
    }
    const result = { ok: true, provider: "mapbox", profile: "mapbox/driving", geometry: { type: "LineString", coordinates: geometry }, distanceMeters, durationSeconds, legs, snappedWaypoints, stopSequenceHash: await sequenceHash(points), warnings };
    console.info(JSON.stringify({ event: "calculate_route", outcome: "ok", stopCount: stops, blockCount, mapboxStatuses: statuses, elapsedMs: Date.now() - started }));
    return reply(result);
  } catch (error) {
    const failure = error instanceof RouteError ? error : new RouteError("INVALID_MAPBOX_RESPONSE", 502);
    console.error(JSON.stringify({ event: "calculate_route", outcome: "error", code: failure.code, stopCount: stops, blockCount, mapboxStatuses: statuses, elapsedMs: Date.now() - started }));
    return reply({ ok: false, error: { code: failure.code } }, failure.status);
  }
});
