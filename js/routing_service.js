import { supabase } from "./supabaseClient.js";

const KNOWN_ERROR_CODES = new Set([
  "INVALID_INPUT",
  "AUTH_REQUIRED",
  "ROUTING_NOT_CONFIGURED",
  "MAPBOX_AUTH_ERROR",
  "MAPBOX_NO_SEGMENT",
  "MAPBOX_RATE_LIMIT",
  "MAPBOX_SERVER_ERROR",
  "ROUTE_DISCONTINUITY",
  "INVALID_MAPBOX_RESPONSE",
]);

export class RoutingServiceError extends Error {
  constructor(code, { status = null, details = null, cause = null } = {}) {
    super(code);
    this.name = "RoutingServiceError";
    this.code = KNOWN_ERROR_CODES.has(code) ? code : "ROUTING_SERVICE_ERROR";
    this.status = status;
    this.details = details;
    this.cause = cause;
  }
}

async function responsePayload(error) {
  if (!(error?.context instanceof Response)) return null;

  try {
    return await error.context.clone().json();
  } catch {
    return null;
  }
}

async function normalizeInvocationError(error) {
  const payload = await responsePayload(error);
  const code = payload?.error?.code ?? payload?.code ?? "ROUTING_SERVICE_ERROR";

  return new RoutingServiceError(code, {
    status: error?.context instanceof Response ? error.context.status : null,
    details: payload?.error ?? payload ?? null,
    cause: error,
  });
}

function normalizeResult(data) {
  if (!data || data.ok !== true || data.geometry?.type !== "LineString") {
    throw new RoutingServiceError(data?.error?.code ?? "INVALID_MAPBOX_RESPONSE", {
      details: data?.error ?? data ?? null,
    });
  }

  return {
    ok: true,
    provider: data.provider,
    profile: data.profile,
    geometry: data.geometry,
    distanceMeters: data.distanceMeters,
    durationSeconds: data.durationSeconds,
    legs: data.legs,
    snappedWaypoints: data.snappedWaypoints,
    stopSequenceHash: data.stopSequenceHash,
    warnings: data.warnings,
  };
}

export async function calculateRoute({ stops, controlPoints, profile = "driving" } = {}) {
  const payload = { stops, profile };
  if (controlPoints !== undefined) payload.controlPoints = controlPoints;

  const { data, error } = await supabase.functions.invoke("calculate-route", {
    body: payload,
  });

  if (error) throw await normalizeInvocationError(error);
  return normalizeResult(data);
}

export const RoutingService = Object.freeze({ calculateRoute });
