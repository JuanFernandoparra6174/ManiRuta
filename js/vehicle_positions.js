import { supabase } from "./supabaseClient.js";

let watchId = null;
let lastSentAt = 0;

export async function upsertCurrentVehiclePosition({ tripId, busId, lat, lng, speedKmh = null, heading = null }) {
  const payload = {
    trip_id: tripId,
    bus_id: busId,
    recorded_at: new Date().toISOString(),
    lat,
    lng,
    speed_kmh: speedKmh,
    heading
  };

  const current = await fetchCurrentVehiclePosition(tripId);

  if (!current) {
    const insertPayload = {
      id: crypto.randomUUID(),
      ...payload
    };

    const { error: insertError } = await supabase
      .from("vehicle_positions")
      .insert([insertPayload]);

    if (insertError) throw insertError;
    return insertPayload;
  }

  const { error: updateError } = await supabase
    .from("vehicle_positions")
    .update(payload)
    .eq("trip_id", tripId);

  if (updateError) throw updateError;
  return {
    ...current,
    ...payload
  };
}

export async function fetchCurrentVehiclePosition(tripId) {
  const { data, error } = await supabase
    .from("vehicle_positions")
    .select("id, trip_id, bus_id, recorded_at, lat, lng, speed_kmh, heading")
    .eq("trip_id", tripId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export function stopTripTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

export function startTripTracking({ tripId, busId, onUpdate, onError, minIntervalMs = 5000 }) {
  if (!navigator.geolocation) {
    throw new Error("Este navegador no soporta geolocalizacion.");
  }

  stopTripTracking();
  lastSentAt = 0;

  watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const now = Date.now();
      if (now - lastSentAt < minIntervalMs) return;
      lastSentAt = now;

      const payload = {
        tripId,
        busId,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        speedKmh: position.coords.speed != null ? Number(position.coords.speed) * 3.6 : null,
        heading: position.coords.heading != null ? Math.round(position.coords.heading) : null
      };

      try {
        const saved = await upsertCurrentVehiclePosition(payload);
        if (onUpdate) onUpdate(saved, position);
      } catch (error) {
        if (onError) onError(error);
      }
    },
    (error) => {
      if (onError) onError(error);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 15000
    }
  );

  return watchId;
}
