import { supabase } from "./supabaseClient.js";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  date.setDate(date.getDate() - diff);
  return date;
}

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getRangeStart(range) {
  const now = new Date();

  if (range === "today") return startOfToday();

  if (range === "7d") {
    const date = new Date(now);
    date.setDate(date.getDate() - 6);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  if (range === "30d") {
    const date = new Date(now);
    date.setDate(date.getDate() - 29);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  return null;
}

function isOnOrAfter(value, startDate) {
  if (!value) return false;
  if (!startDate) return true;
  return new Date(value) >= startDate;
}

function countBy(items, getKey) {
  const map = new Map();

  for (const item of items) {
    const key = getKey(item);
    map.set(key, (map.get(key) || 0) + 1);
  }

  return map;
}

function sortCountMap(map, formatter, limit = 5) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({
      key,
      label: formatter(key),
      count
    }));
}

function buildStackSegments(items) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return items.map((item) => ({
    ...item,
    width: total ? (item.value / total) * 100 : 0
  }));
}

function averageDurationMinutes(trips) {
  const durations = trips
    .filter((trip) => trip.start_at && trip.end_at)
    .map((trip) => (new Date(trip.end_at) - new Date(trip.start_at)) / 60000)
    .filter((minutes) => Number.isFinite(minutes) && minutes >= 0);

  if (!durations.length) return null;

  const total = durations.reduce((sum, value) => sum + value, 0);
  return Math.round(total / durations.length);
}

async function fetchCompanyStatsBase(companyId) {
  const [busesResult, driversResult, routesResult, tripsResult, positionsResult, incidentsResult] = await Promise.all([
    supabase
      .from("buses")
      .select("id, plate, status, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("drivers")
      .select("id, full_name, status, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("routes")
      .select("id, name, status, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("trips")
      .select("id, route_id, bus_id, driver_id, start_at, end_at, status")
      .order("start_at", { ascending: false }),
    supabase
      .from("vehicle_positions")
      .select("id, trip_id, bus_id, recorded_at, lat, lng, speed_kmh, heading")
      .order("recorded_at", { ascending: false }),
    supabase
      .from("incidents")
      .select("id, route_id, bus_id, driver_id, occurred_at, created_at, status")
      .order("occurred_at", { ascending: false })
  ]);

  if (busesResult.error) throw busesResult.error;
  if (driversResult.error) throw driversResult.error;
  if (routesResult.error) throw routesResult.error;
  if (tripsResult.error) throw tripsResult.error;
  if (positionsResult.error) throw positionsResult.error;
  if (incidentsResult.error) throw incidentsResult.error;

  const buses = busesResult.data || [];
  const drivers = driversResult.data || [];
  const routes = routesResult.data || [];
  const busIds = new Set(buses.map((item) => item.id));
  const driverIds = new Set(drivers.map((item) => item.id));
  const routeIds = new Set(routes.map((item) => item.id));

  const trips = (tripsResult.data || []).filter((trip) => routeIds.has(trip.route_id));
  const tripIds = new Set(trips.map((item) => item.id));

  const positions = (positionsResult.data || []).filter((position) =>
    busIds.has(position.bus_id) || tripIds.has(position.trip_id)
  );

  const incidents = (incidentsResult.data || []).filter((incident) =>
    routeIds.has(incident.route_id) ||
    busIds.has(incident.bus_id) ||
    driverIds.has(incident.driver_id)
  );

  return { buses, drivers, routes, trips, positions, incidents };
}

export async function loadCompanyStats(companyId, range = "30d") {
  const { buses, drivers, routes, trips, positions, incidents } = await fetchCompanyStatsBase(companyId);
  const rangeStart = getRangeStart(range);
  const now = new Date();
  const gpsThreshold = new Date(now.getTime() - (10 * 60 * 1000));

  const tripsInRange = trips.filter((trip) => isOnOrAfter(trip.start_at, rangeStart));
  const finishedTripsInRange = tripsInRange.filter((trip) => trip.status === "FINISHED");
  const canceledTripsInRange = tripsInRange.filter((trip) => trip.status === "CANCELED");
  const activeTrips = trips.filter((trip) => trip.status === "IN_PROGRESS");

  const incidentsInRange = incidents.filter((incident) =>
    isOnOrAfter(incident.occurred_at || incident.created_at, rangeStart)
  );

  const latestPositionByBus = new Map();
  for (const position of positions) {
    if (!position.bus_id || latestPositionByBus.has(position.bus_id)) continue;
    latestPositionByBus.set(position.bus_id, position);
  }

  const recentReportingBusIds = [...latestPositionByBus.values()]
    .filter((position) => new Date(position.recorded_at) >= gpsThreshold)
    .map((position) => position.bus_id);

  const routeMap = new Map(routes.map((route) => [route.id, route]));
  const busMap = new Map(buses.map((bus) => [bus.id, bus]));
  const driverMap = new Map(drivers.map((driver) => [driver.id, driver]));

  const routeUsage = sortCountMap(
    countBy(tripsInRange, (trip) => trip.route_id),
    (routeId) => routeMap.get(routeId)?.name || "Ruta desconocida"
  );

  const busUsage = sortCountMap(
    countBy(tripsInRange, (trip) => trip.bus_id),
    (busId) => busMap.get(busId)?.plate || "Bus desconocido"
  );

  const driverUsage = sortCountMap(
    countBy(tripsInRange.filter((trip) => trip.driver_id), (trip) => trip.driver_id),
    (driverId) => driverMap.get(driverId)?.full_name || "Conductor desconocido"
  );

  const incidentsByRoute = sortCountMap(
    countBy(incidentsInRange.filter((incident) => incident.route_id), (incident) => incident.route_id),
    (routeId) => routeMap.get(routeId)?.name || "Ruta desconocida",
    3
  );

  return {
    overview: {
      tripsToday: trips.filter((trip) => isOnOrAfter(trip.start_at, startOfToday())).length,
      tripsInProgress: activeTrips.length,
      finishedInRange: finishedTripsInRange.length,
      canceledInRange: canceledTripsInRange.length
    },
    travelWindows: {
      today: trips.filter((trip) => isOnOrAfter(trip.start_at, startOfToday())).length,
      week: trips.filter((trip) => isOnOrAfter(trip.start_at, startOfWeek())).length,
      month: trips.filter((trip) => isOnOrAfter(trip.start_at, startOfMonth())).length,
      selectedRangeLabel: range === "today" ? "Hoy" : range === "7d" ? "Ultimos 7 dias" : range === "30d" ? "Ultimos 30 dias" : "Todo el historial"
    },
    operations: {
      totalTripsInRange: tripsInRange.length,
      averageDurationMinutes: averageDurationMinutes(finishedTripsInRange),
      routesConfigured: routes.length,
      routesActive: routes.filter((route) => route.status === "ACTIVE").length,
      routesWithTripsInRange: new Set(tripsInRange.map((trip) => trip.route_id)).size,
      busesReportingRecently: new Set(recentReportingBusIds).size,
      busesTotal: buses.length
    },
    fleet: {
      buses: {
        total: buses.length,
        active: buses.filter((bus) => bus.status === "ACTIVE").length,
        maintenance: buses.filter((bus) => bus.status === "MAINTENANCE").length,
        inactive: buses.filter((bus) => bus.status === "INACTIVE").length
      },
      drivers: {
        total: drivers.length,
        active: drivers.filter((driver) => driver.status === "ACTIVE").length,
        inactive: drivers.filter((driver) => driver.status === "INACTIVE").length
      },
      recentGpsBuses: recentReportingBusIds
        .map((busId) => busMap.get(busId)?.plate)
        .filter(Boolean)
        .slice(0, 8)
    },
    rankings: {
      routes: routeUsage,
      buses: busUsage,
      drivers: driverUsage
    },
    incidents: {
      totalInRange: incidentsInRange.length,
      new: incidentsInRange.filter((incident) => incident.status === "NEW").length,
      inReview: incidentsInRange.filter((incident) => incident.status === "IN_REVIEW").length,
      resolved: incidentsInRange.filter((incident) => incident.status === "RESOLVED").length,
      rejected: incidentsInRange.filter((incident) => incident.status === "REJECTED").length,
      topRoutes: incidentsByRoute
    },
    segments: {
      tripStatus: buildStackSegments([
        { label: "En progreso", value: activeTrips.length, color: "#1d9d74" },
        { label: "Finalizados", value: finishedTripsInRange.length, color: "#54bcbd" },
        { label: "Cancelados", value: canceledTripsInRange.length, color: "#ef4444" }
      ]),
      fleetStatus: buildStackSegments([
        { label: "Buses activos", value: buses.filter((bus) => bus.status === "ACTIVE").length, color: "#3a6357" },
        { label: "Buses mantenimiento", value: buses.filter((bus) => bus.status === "MAINTENANCE").length, color: "#f59e0b" },
        { label: "Buses inactivos", value: buses.filter((bus) => bus.status === "INACTIVE").length, color: "#ef4444" },
        { label: "Conductores activos", value: drivers.filter((driver) => driver.status === "ACTIVE").length, color: "#54bcbd" },
        { label: "Conductores inactivos", value: drivers.filter((driver) => driver.status === "INACTIVE").length, color: "#0f172a" }
      ])
    },
    notes: [
      "Puntualidad real no se puede medir bien todavia porque no existe horario programado por viaje o por paradero.",
      "Ocupacion por ruta no esta disponible porque no hay datos de abordajes o validaciones.",
      "Actividad por paradero requeriria guardar eventos de paso o llegada por paradero, no solo la posicion actual del vehiculo."
    ]
  };
}
