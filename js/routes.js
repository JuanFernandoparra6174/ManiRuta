import { supabase } from "./supabaseClient.js";

function unique(values) {
    return [...new Set(values)];
}

export function hasDuplicateStops(stopIds) {
    return unique(stopIds).length !== stopIds.length;
}

export function buildRouteStopsPayload(routeId, stopIds) {
    return stopIds.map((stopId, index) => ({
        route_id: routeId,
        stop_id: stopId,
        stop_order: index + 1
    }));
}

export function validateRoutePayload({ name, company_id, stop_ids }) {
    if (!String(name || "").trim()) {
        throw new Error("El nombre de la ruta es obligatorio.");
    }

    if (!company_id) {
        throw new Error("La empresa actual no tiene company_id asignado.");
    }

    if (!Array.isArray(stop_ids) || stop_ids.length < 2) {
        throw new Error("La ruta debe tener al menos origen y destino.");
    }

    if (hasDuplicateStops(stop_ids)) {
        throw new Error("No puedes repetir paraderos en la misma ruta.");
    }

    if (stop_ids[0] === stop_ids[stop_ids.length - 1]) {
        throw new Error("El origen y el destino no pueden ser el mismo paradero.");
    }
}

async function fetchStopsMapByIds(stopIds) {
    const uniqueStopIds = unique(stopIds);
    if (!uniqueStopIds.length) return new Map();

    const { data, error } = await supabase
        .from("stops")
        .select("id, name, lat, lng, address, status")
        .in("id", uniqueStopIds);

    if (error) throw error;
    return new Map((data || []).map((stop) => [stop.id, stop]));
}

export async function fetchActiveGeometriesByRouteIds(routeIds) {
    const uniqueRouteIds = unique(routeIds).filter(Boolean);
    if (!uniqueRouteIds.length) return new Map();

    const { data, error } = await supabase
        .from("route_geometries")
        .select("id, route_id, version, status, provider, profile, geometry, distance_meters, duration_seconds, stop_sequence_hash")
        .in("route_id", uniqueRouteIds)
        .eq("status", "ACTIVE");

    if (error) throw error;
    return new Map((data || []).map((geometry) => [geometry.route_id, geometry]));
}

export async function fetchAllRoutes() {
    const { data, error } = await supabase
        .from("routes")
        .select("id, company_id, name, origin_stop_id, end_stop_id, direction, status, created_at, updated_at")
        .order("name");

    if (error) throw error;
    return data || [];
}

export async function fetchCompanyRoutes(companyId) {
    let routesQuery = supabase
        .from("routes")
        .select("id, company_id, name, origin_stop_id, end_stop_id, direction, status, created_at, updated_at")
        .order("created_at", { ascending: false });

    if (companyId) {
        routesQuery = routesQuery.eq("company_id", companyId);
    }

    const { data: routes, error: routesError } = await routesQuery;
    if (routesError) throw routesError;

    const routeIds = (routes || []).map((route) => route.id);
    if (!routeIds.length) return [];

    const { data: routeStops, error: routeStopsError } = await supabase
        .from("route_stops")
        .select("route_id, stop_id, stop_order")
        .in("route_id", routeIds)
        .order("stop_order");

    if (routeStopsError) throw routeStopsError;

    const [stopMap, geometryMap] = await Promise.all([
        fetchStopsMapByIds((routeStops || []).map((item) => item.stop_id)),
        fetchActiveGeometriesByRouteIds(routeIds)
    ]);
    const stopsByRoute = new Map();

    for (const item of routeStops || []) {
        if (!stopsByRoute.has(item.route_id)) {
            stopsByRoute.set(item.route_id, []);
        }

        stopsByRoute.get(item.route_id).push({
            ...item,
            stop: stopMap.get(item.stop_id) || null
        });
    }

    return (routes || []).map((route) => {
        const orderedStops = stopsByRoute.get(route.id) || [];
        return {
            ...route,
            activeGeometry: geometryMap.get(route.id) || null,
            stops: orderedStops,
            stop_count: orderedStops.length,
            origin_stop: orderedStops[0]?.stop || null,
            end_stop: orderedStops[orderedStops.length - 1]?.stop || null
        };
    });
}

export async function fetchAdminRoutes() {
    const [routesResult, companiesResult] = await Promise.all([
        supabase
            .from("routes")
            .select("id, company_id, name, origin_stop_id, end_stop_id, direction, status, created_at, updated_at")
            .order("name", { ascending: true }),
        supabase
            .from("companies")
            .select("id, name")
    ]);

    const { data: routes, error: routesError } = routesResult;
    const { data: companies, error: companiesError } = companiesResult;

    if (routesError) throw routesError;
    if (companiesError) throw companiesError;

    const routeIds = (routes || []).map((route) => route.id);
    if (!routeIds.length) return [];

    const { data: routeStops, error: routeStopsError } = await supabase
        .from("route_stops")
        .select("route_id, stop_id, stop_order")
        .in("route_id", routeIds)
        .order("stop_order");

    if (routeStopsError) throw routeStopsError;

    const companyMap = new Map((companies || []).map((company) => [company.id, company]));
    const [stopMap, geometryMap] = await Promise.all([
        fetchStopsMapByIds((routeStops || []).map((item) => item.stop_id)),
        fetchActiveGeometriesByRouteIds(routeIds)
    ]);
    const stopsByRoute = new Map();

    for (const item of routeStops || []) {
        if (!stopsByRoute.has(item.route_id)) {
            stopsByRoute.set(item.route_id, []);
        }

        stopsByRoute.get(item.route_id).push({
            ...item,
            stop: stopMap.get(item.stop_id) || null
        });
    }

    return (routes || []).map((route) => {
        const orderedStops = stopsByRoute.get(route.id) || [];
        const company = companyMap.get(route.company_id) || null;
        return {
            ...route,
            activeGeometry: geometryMap.get(route.id) || null,
            company: company || null,
            company_name: company?.name || null,
            stops: orderedStops,
            stop_count: orderedStops.length,
            origin_stop: orderedStops[0]?.stop || null,
            end_stop: orderedStops[orderedStops.length - 1]?.stop || null
        };
    });
}

export async function fetchRouteStops(routeId) {
    const { data, error } = await supabase
        .from("route_stops")
        .select("route_id, stop_id, stop_order")
        .eq("route_id", routeId)
        .order("stop_order");

    if (error) throw error;

    const stopMap = await fetchStopsMapByIds((data || []).map((item) => item.stop_id));
    return (data || []).map((item) => ({
        ...item,
        stop: stopMap.get(item.stop_id) || null
    }));
}

export async function createRoute({ name, company_id, origin_id, end_id, direction, status = "ACTIVE" }) {
    const now = new Date().toISOString();
    const payload = {
        id: crypto.randomUUID(),
        name: String(name || "").trim(),
        company_id,
        origin_stop_id: origin_id || null,
        end_stop_id: end_id || null,
        direction: direction || "IDA",
        status,
        created_at: now,
        updated_at: now
    };

    const { error } = await supabase.from("routes").insert([payload]);
    if (error) throw error;

    return payload;
}

export async function createRouteWithStops({ company_id, name, direction = "IDA", status = "ACTIVE", stop_ids }) {
    validateRoutePayload({ name, company_id, stop_ids });

    const now = new Date().toISOString();
    const route = {
        id: crypto.randomUUID(),
        company_id,
        name: String(name || "").trim(),
        origin_stop_id: stop_ids[0],
        end_stop_id: stop_ids[stop_ids.length - 1],
        direction,
        status,
        created_at: now,
        updated_at: now
    };

    const { error: routeError } = await supabase.from("routes").insert([route]);
    if (routeError) throw routeError;

    const routeStopsPayload = buildRouteStopsPayload(route.id, stop_ids);
    const { error: routeStopsError } = await supabase.from("route_stops").insert(routeStopsPayload);

    if (routeStopsError) {
        await supabase.from("routes").delete().eq("id", route.id);
        throw routeStopsError;
    }

    return route;
}

export async function createRouteWithStopsAndGeometry({ company_id, name, direction = "IDA", status = "ACTIVE", stop_ids }, calculation) {
    validateRoutePayload({ name, company_id, stop_ids });

    if (!calculation?.ok || calculation.geometry?.type !== "LineString" || !calculation.stopSequenceHash) {
        throw new Error("Debes calcular un recorrido válido antes de guardar la ruta.");
    }

    const { data, error } = await supabase.rpc("create_route_with_geometry", {
        p_company_id: company_id,
        p_name: String(name || "").trim(),
        p_direction: direction,
        p_status: status,
        p_stop_ids: stop_ids,
        p_provider: calculation.provider,
        p_profile: calculation.profile,
        p_geometry: calculation.geometry,
        p_distance_meters: calculation.distanceMeters,
        p_duration_seconds: calculation.durationSeconds,
        p_legs: calculation.legs,
        p_snapped_waypoints: calculation.snappedWaypoints,
        p_stop_sequence_hash: calculation.stopSequenceHash
    });

    if (error) throw error;
    return data?.[0] || null;
}

export async function deleteRoute(id, companyId = null) {
    const { error: routeStopsError } = await supabase
        .from("route_stops")
        .delete()
        .eq("route_id", id);

    if (routeStopsError) throw routeStopsError;

    let query = supabase.from("routes").delete().eq("id", id);
    if (companyId) {
        query = query.eq("company_id", companyId);
    }

    const { error } = await query;
    if (error) throw error;
}
