import { supabase } from "./supabaseClient.js";
import { fetchRouteStops } from "./routes.js";

async function fetchTripsByDriver(driverId) {
  const { data, error } = await supabase
    .from("trips")
    .select("id, route_id, bus_id, driver_id, start_at, end_at, status")
    .eq("driver_id", driverId)
    .order("start_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function fetchMap(table, ids, selectFields) {
  const uniqueIds = [...new Set((ids || []).filter(Boolean))];
  if (!uniqueIds.length) return new Map();

  const { data, error } = await supabase
    .from(table)
    .select(selectFields)
    .in("id", uniqueIds);

  if (error) throw error;
  return new Map((data || []).map((item) => [item.id, item]));
}

export async function fetchDriverTrips(driverId) {
  const trips = await fetchTripsByDriver(driverId);

  const routeMap = await fetchMap(
    "routes",
    trips.map((trip) => trip.route_id),
    "id, company_id, name, origin_stop_id, end_stop_id, direction, status"
  );
  const busMap = await fetchMap(
    "buses",
    trips.map((trip) => trip.bus_id),
    "id, company_id, plate, internal_code, status"
  );

  return trips.map((trip) => ({
    ...trip,
    route: routeMap.get(trip.route_id) || null,
    bus: busMap.get(trip.bus_id) || null
  }));
}

export async function fetchActiveDriverTrip(driverId) {
  const trips = await fetchDriverTrips(driverId);
  return trips.find((trip) => trip.status === "IN_PROGRESS") || null;
}

export async function fetchDriverTripById(tripId, driverId) {
  const { data, error } = await supabase
    .from("trips")
    .select("id, route_id, bus_id, driver_id, start_at, end_at, status")
    .eq("id", tripId)
    .eq("driver_id", driverId)
    .single();

  if (error) throw error;

  const [routeMap, busMap, routeStops] = await Promise.all([
    fetchMap("routes", [data.route_id], "id, company_id, name, origin_stop_id, end_stop_id, direction, status"),
    fetchMap("buses", [data.bus_id], "id, company_id, plate, internal_code, status"),
    fetchRouteStops(data.route_id)
  ]);

  return {
    ...data,
    route: routeMap.get(data.route_id) || null,
    bus: busMap.get(data.bus_id) || null,
    route_stops: routeStops
  };
}
