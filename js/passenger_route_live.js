import { requireAuthAndRole } from "./guard.js";
import {
    fetchActiveTripsByRoute,
    fetchCurrentVehiclePosition,
    fetchPassengerRouteDetail
} from "./routes_passenger.js";

const state = {
    routeId: null,
    detail: null,
    trips: [],
    selectedTripId: null,
    passengerCoords: null,
    nearestStopId: null,
    map: null,
    routeLine: null,
    stopsLayer: null,
    vehicleMarker: null,
    passengerMarker: null,
    vehiclePollId: null
};

const busIcon = L.divIcon({
    className: "bus-marker-icon",
    html: `<div class="bus-marker-shell" aria-label="Vehiculo"><span>🚌</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16]
});

function $(id) {
    return document.getElementById(id);
}

function setMessage(target, message = "") {
    target.textContent = message;
    target.style.display = message ? "block" : "none";
}

function clearMessages() {
    setMessage($("routeErr"));
    setMessage($("routeOk"));
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getRouteIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("route_id");
}

function stopVehiclePolling() {
    if (state.vehiclePollId) {
        clearInterval(state.vehiclePollId);
        state.vehiclePollId = null;
    }
}

function initMap() {
    state.map = L.map("passengerMap").setView([5.067, -75.517], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap"
    }).addTo(state.map);
}

function drawRoute(stops) {
    const routeCoordinates = stops
        .filter((item) => item.stop)
        .map((item) => [item.stop.lat, item.stop.lng]);

    if (state.routeLine) {
        state.map.removeLayer(state.routeLine);
    }

    if (routeCoordinates.length >= 2) {
        state.routeLine = L.polyline(routeCoordinates, {
            color: "#ea580c",
            weight: 5,
            opacity: 0.85
        }).addTo(state.map);
        state.map.fitBounds(routeCoordinates, { padding: [24, 24] });
    }
}

function drawStops(stops) {
    if (state.stopsLayer) {
        state.map.removeLayer(state.stopsLayer);
    }

    state.stopsLayer = L.layerGroup(
        stops
            .filter((item) => item.stop)
            .map((item, index, all) => {
                const role = index === 0 ? "Origen" : index === all.length - 1 ? "Destino" : `Paradero ${item.stop_order}`;
                const isNearest = item.stop.id === state.nearestStopId;
                return L.circleMarker([item.stop.lat, item.stop.lng], {
                    radius: isNearest ? 10 : 7,
                    color: isNearest ? "#1d4ed8" : "#1d9d74",
                    fillColor: isNearest ? "#60a5fa" : "#54bcbd",
                    fillOpacity: 0.9,
                    weight: isNearest ? 3 : 2
                }).bindPopup(`
                    <strong>${escapeHtml(item.stop.name)}</strong><br>
                    ${escapeHtml(role)}<br>
                    ${escapeHtml(item.stop.address || "Sin direccion")}<br>
                    ${isNearest ? "<b>Paradero mas cercano a ti</b>" : ""}
                `);
            })
    ).addTo(state.map);
}

function drawPassengerPosition(coords) {
    if (!coords) return;

    if (state.passengerMarker) {
        state.map.removeLayer(state.passengerMarker);
    }

    state.passengerCoords = coords;
    state.passengerMarker = L.marker([coords.latitude, coords.longitude]).addTo(state.map);
    state.passengerMarker.bindPopup("Tu ubicacion");
}

function drawVehiclePosition(position) {
    if (state.vehicleMarker) {
        state.map.removeLayer(state.vehicleMarker);
        state.vehicleMarker = null;
    }

    if (!position) {
        setMessage($("routeOk"), "Este viaje aun no comparte ubicacion.");
        return;
    }

    setMessage($("routeOk"), `Ubicacion del vehiculo actualizada: ${new Date(position.recorded_at).toLocaleTimeString("es-CO")}`);
    state.vehicleMarker = L.marker([position.lat, position.lng], { icon: busIcon }).addTo(state.map);
    state.vehicleMarker.bindPopup("Vehiculo del viaje");
}

function renderRouteSummary(detail) {
    const routeStops = detail.stops.filter((item) => item.stop);
    const origin = routeStops[0]?.stop?.name || "Sin origen";
    const destination = routeStops[routeStops.length - 1]?.stop?.name || "Sin destino";

    $("routeTitle").textContent = detail.route.name;
    $("routeMeta").innerHTML = `
        <span class="badge">Sentido: ${escapeHtml(detail.route.direction || "IDA")}</span>
        <span class="badge">Origen: ${escapeHtml(origin)}</span>
        <span class="badge">Destino: ${escapeHtml(destination)}</span>
        <span class="badge">Paraderos: ${routeStops.length}</span>
    `;
}

function renderRouteTimeline(detail) {
    const container = $("routeTimeline");
    const routeStops = detail.stops.filter((item) => item.stop);

    if (!routeStops.length) {
        container.innerHTML = `<div class="route-empty">No hay paraderos configurados para esta ruta.</div>`;
        return;
    }

    container.innerHTML = routeStops.map((item, index) => {
        const role = index === 0 ? "Origen" : index === routeStops.length - 1 ? "Destino" : `Paradero ${item.stop_order}`;
        const tone = index === 0 ? "origin" : index === routeStops.length - 1 ? "destination" : "middle";
        const isNearest = item.stop.id === state.nearestStopId;

        return `
            <div class="timeline-item ${tone} ${isNearest ? "nearest" : ""}">
                <div class="timeline-node">
                    <span class="timeline-dot"></span>
                    ${index < routeStops.length - 1 ? '<span class="timeline-line"></span>' : ""}
                </div>
                <div class="timeline-content">
                    <span class="chip ${isNearest || tone !== "middle" ? "ok" : ""}">${escapeHtml(isNearest ? `${role} · Mas cercano` : role)}</span>
                    <strong>${escapeHtml(item.stop.name)}</strong>
                    <small class="help">${escapeHtml(item.stop.address || "Sin direccion")}</small>
                </div>
            </div>
        `;
    }).join("");
}

function haversineDistanceInMeters(lat1, lng1, lat2, lng2) {
    const toRad = (value) => (value * Math.PI) / 180;
    const earthRadius = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
}

function updateNearestStop() {
    const routeStops = state.detail?.stops?.filter((item) => item.stop) || [];
    if (!state.passengerCoords || !routeStops.length) return;

    let nearest = null;
    let shortestDistance = Number.POSITIVE_INFINITY;

    for (const item of routeStops) {
        const distance = haversineDistanceInMeters(
            state.passengerCoords.latitude,
            state.passengerCoords.longitude,
            Number(item.stop.lat),
            Number(item.stop.lng)
        );

        if (distance < shortestDistance) {
            shortestDistance = distance;
            nearest = item.stop;
        }
    }

    state.nearestStopId = nearest?.id || null;
    renderRouteTimeline(state.detail);
    drawStops(state.detail.stops);

    if (nearest) {
        setMessage($("routeOk"), `Paradero mas cercano: ${nearest.name} a ${Math.round(shortestDistance)} m de tu ubicacion.`);
    }
}

function renderTripsList(trips) {
    const container = $("activeTripsList");
    if (!trips.length) {
        container.innerHTML = `<div class="route-empty">No hay viajes activos para esta ruta.</div>`;
        return;
    }

    container.innerHTML = trips.map((trip) => `
        <button class="passenger-trip-card ${trip.id === state.selectedTripId ? "selected" : ""}" data-trip-id="${trip.id}">
            <strong>Viaje ${trip.id.slice(0, 8)}</strong>
            <span class="help">Inicio: ${new Date(trip.start_at).toLocaleString("es-CO")}</span>
            <span class="chip ok">${escapeHtml(trip.status)}</span>
        </button>
    `).join("");
}

async function selectTrip(tripId) {
    state.selectedTripId = tripId;
    renderTripsList(state.trips);
    stopVehiclePolling();
    clearMessages();

    const updateVehicle = async () => {
        try {
            const vehiclePosition = await fetchCurrentVehiclePosition(tripId);
            drawVehiclePosition(vehiclePosition);
        } catch (error) {
            setMessage($("routeErr"), error.message || "No fue posible consultar la ubicacion del vehiculo.");
        }
    };

    await updateVehicle();
    state.vehiclePollId = setInterval(updateVehicle, 5000);
}

function getPassengerLocation() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
        (position) => {
            drawPassengerPosition(position.coords);
            updateNearestStop();
        },
        () => {
            setMessage($("routeErr"), "No fue posible obtener tu ubicacion actual.");
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

async function loadRouteContext(routeId) {
    const [detail, trips] = await Promise.all([
        fetchPassengerRouteDetail(routeId),
        fetchActiveTripsByRoute(routeId)
    ]);

    state.detail = detail;
    state.trips = trips;

    renderRouteSummary(detail);
    renderRouteTimeline(detail);
    drawRoute(detail.stops);
    drawStops(detail.stops);
    renderTripsList(trips);
    updateNearestStop();

    if (trips.length) {
        await selectTrip(trips[0].id);
    } else {
        drawVehiclePosition(null);
    }
}

async function initPassengerRouteLivePage() {
    await requireAuthAndRole(1);

    state.routeId = getRouteIdFromUrl();
    if (!state.routeId) {
        setMessage($("routeErr"), "No se recibio la ruta a consultar.");
        return;
    }

    initMap();
    getPassengerLocation();
    await loadRouteContext(state.routeId);

    $("activeTripsList").addEventListener("click", async (event) => {
        const card = event.target.closest("[data-trip-id]");
        if (!card) return;
        await selectTrip(card.dataset.tripId);
    });

    window.addEventListener("beforeunload", stopVehiclePolling);
}

initPassengerRouteLivePage().catch((error) => {
    setMessage($("routeErr"), error.message || "No fue posible cargar la vista de ruta.");
});
