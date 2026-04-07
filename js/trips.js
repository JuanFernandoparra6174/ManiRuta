import { supabase } from "./supabaseClient.js";
import { fetchCompanyRoutes } from "./routes.js";
import { fetchCompanyBuses } from "./buses.js";
import { fetchCompanyDrivers } from "./drivers.js";

export const TRIP_STATUSES = ["IN_PROGRESS", "FINISHED", "CANCELED"];

function escapeValue(value) {
    return value ?? null;
}

export async function fetchCompanyTripFormOptions(companyId) {
    const [routes, buses, drivers] = await Promise.all([
        fetchCompanyRoutes(companyId),
        fetchCompanyBuses(companyId),
        fetchCompanyDrivers(companyId)
    ]);

    return {
        routes: routes.filter((route) => route.status === "ACTIVE"),
        buses: buses.filter((bus) => bus.status === "ACTIVE"),
        drivers: drivers.filter((driver) => driver.status === "ACTIVE")
    };
}

export async function checkActiveTripConflicts({ busId, driverId, excludeTripId = null }) {
    let busQuery = supabase
        .from("trips")
        .select("id, bus_id, driver_id, status")
        .eq("bus_id", busId)
        .eq("status", "IN_PROGRESS");

    let driverQuery = supabase
        .from("trips")
        .select("id, bus_id, driver_id, status")
        .eq("driver_id", driverId)
        .eq("status", "IN_PROGRESS");

    if (excludeTripId) {
        busQuery = busQuery.neq("id", excludeTripId);
        driverQuery = driverQuery.neq("id", excludeTripId);
    }

    const [{ data: busTrips, error: busError }, { data: driverTrips, error: driverError }] = await Promise.all([
        busQuery,
        driverQuery
    ]);

    if (busError) throw busError;
    if (driverError) throw driverError;

    return {
        busBusy: (busTrips || []).length > 0,
        driverBusy: (driverTrips || []).length > 0
    };
}

export function validateTripPayload({ companyId, routeId, busId, driverId, startAt, route, bus, driver }) {
    if (!companyId) {
        throw new Error("Tu usuario no tiene company_id asignado.");
    }

    if (!routeId) {
        throw new Error("Debes seleccionar una ruta.");
    }

    if (!busId) {
        throw new Error("Debes seleccionar un bus.");
    }

    if (!driverId) {
        throw new Error("Debes seleccionar un conductor.");
    }

    if (!startAt) {
        throw new Error("Debes indicar la fecha y hora de inicio.");
    }

    if (!route || route.company_id !== companyId) {
        throw new Error("La ruta seleccionada no pertenece a tu empresa.");
    }

    if (!bus || bus.company_id !== companyId || bus.status !== "ACTIVE") {
        throw new Error("El bus seleccionado no esta disponible para crear viajes.");
    }

    if (!driver || driver.company_id !== companyId || driver.status !== "ACTIVE") {
        throw new Error("El conductor seleccionado no esta disponible para crear viajes.");
    }
}

export async function createTrip({ companyId, routeId, busId, driverId, startAt, route, bus, driver }) {
    validateTripPayload({ companyId, routeId, busId, driverId, startAt, route, bus, driver });

    const conflicts = await checkActiveTripConflicts({ busId, driverId });
    if (conflicts.busBusy) {
        throw new Error("Ese bus ya tiene un viaje en progreso.");
    }
    if (conflicts.driverBusy) {
        throw new Error("Ese conductor ya tiene un viaje en progreso.");
    }

    const payload = {
        id: crypto.randomUUID(),
        route_id: routeId,
        bus_id: busId,
        driver_id: driverId,
        start_at: new Date(startAt).toISOString(),
        end_at: null,
        status: "IN_PROGRESS"
    };

    const { error } = await supabase.from("trips").insert([payload]);
    if (error) throw error;

    return payload;
}

export async function fetchCompanyTrips(companyId) {
    const [routes, buses, drivers, tripsResult] = await Promise.all([
        fetchCompanyRoutes(companyId),
        fetchCompanyBuses(companyId),
        fetchCompanyDrivers(companyId),
        supabase
            .from("trips")
            .select("id, route_id, bus_id, driver_id, start_at, end_at, status")
            .order("start_at", { ascending: false })
    ]);

    const { data: trips, error: tripsError } = tripsResult;
    if (tripsError) throw tripsError;

    const routesMap = new Map(routes.map((route) => [route.id, route]));
    const busesMap = new Map(buses.map((bus) => [bus.id, bus]));
    const driversMap = new Map(drivers.map((driver) => [driver.id, driver]));

    return (trips || [])
        .filter((trip) => {
            const route = routesMap.get(trip.route_id);
            return route && route.company_id === companyId;
        })
        .map((trip) => ({
            ...trip,
            route: routesMap.get(trip.route_id) || null,
            bus: busesMap.get(trip.bus_id) || null,
            driver: driversMap.get(trip.driver_id) || null
        }));
}

export async function fetchCompanyTripById(tripId, companyId) {
    const trips = await fetchCompanyTrips(companyId);
    const trip = trips.find((item) => item.id === tripId);

    if (!trip) {
        throw new Error("No se encontro el viaje solicitado.");
    }

    return {
        ...trip,
        route_stops: trip.route?.stops || []
    };
}

export async function updateTripStatus(tripId, companyId, { status, end_at }) {
    if (!TRIP_STATUSES.includes(status)) {
        throw new Error("Estado de viaje no valido.");
    }

    const trips = await fetchCompanyTrips(companyId);
    const trip = trips.find((item) => item.id === tripId);

    if (!trip) {
        throw new Error("No se encontro el viaje solicitado.");
    }

    if (trip.status !== "IN_PROGRESS") {
        throw new Error("Solo puedes cambiar viajes que esten en progreso.");
    }

    const payload = {
        status,
        end_at: escapeValue(end_at || new Date().toISOString())
    };

    const { error } = await supabase
        .from("trips")
        .update(payload)
        .eq("id", tripId);

    if (error) throw error;
}

export async function deleteTrip(tripId, companyId) {
    const trips = await fetchCompanyTrips(companyId);
    const trip = trips.find((item) => item.id === tripId);

    if (!trip) {
        throw new Error("No se encontro el viaje solicitado.");
    }

    const { error: vehiclePositionError } = await supabase
        .from("vehicle_positions")
        .delete()
        .eq("trip_id", tripId);

    if (vehiclePositionError) throw vehiclePositionError;

    const { error } = await supabase
        .from("trips")
        .delete()
        .eq("id", tripId);

    if (error) throw error;
}
