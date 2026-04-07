import { supabase } from "./supabaseClient.js";

function unique(values) {
    return [...new Set((values || []).filter(Boolean))];
}

async function fetchStopsMap(stopIds) {
    const uniqueIds = unique(stopIds);
    if (!uniqueIds.length) return new Map();

    const { data, error } = await supabase
        .from("stops")
        .select("id, name, lat, lng, address, status")
        .in("id", uniqueIds);

    if (error) throw error;
    return new Map((data || []).map((stop) => [stop.id, stop]));
}

export async function fetchAllRoutes() {
    const { data, error } = await supabase
        .from("routes")
        .select("id, company_id, name, direction, status, origin_stop_id, end_stop_id")
        .eq("status", "ACTIVE")
        .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function fetchPassengerRouteById(routeId) {
    const { data, error } = await supabase
        .from("routes")
        .select("id, company_id, name, direction, status, origin_stop_id, end_stop_id")
        .eq("id", routeId)
        .single();

    if (error) throw error;
    return data;
}

export async function fetchPassengerRouteStops(routeId) {
    const { data, error } = await supabase
        .from("route_stops")
        .select("route_id, stop_id, stop_order")
        .eq("route_id", routeId)
        .order("stop_order", { ascending: true });

    if (error) throw error;

    const stopMap = await fetchStopsMap((data || []).map((item) => item.stop_id));
    return (data || []).map((item) => ({
        ...item,
        stop: stopMap.get(item.stop_id) || null
    }));
}

export async function fetchPassengerRouteDetail(routeId) {
    const [route, routeStops] = await Promise.all([
        fetchPassengerRouteById(routeId),
        fetchPassengerRouteStops(routeId)
    ]);

    return {
        route,
        stops: routeStops
    };
}

export async function fetchActiveTripsByRoute(routeId) {
    const { data, error } = await supabase
        .from("trips")
        .select("id, route_id, bus_id, driver_id, start_at, end_at, status")
        .eq("route_id", routeId)
        .eq("status", "IN_PROGRESS")
        .order("start_at", { ascending: false });

    if (error) throw error;
    return data || [];
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
