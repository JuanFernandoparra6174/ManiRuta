import { requireAuthAndRole } from "./guard.js";
import { signOut } from "./auth.js";
import { fetchCompanyTripById } from "./trips.js";
import { fetchCurrentVehiclePosition } from "./vehicle_positions.js";
import {
    computeRemainingStops,
    detectCurrentGeofenceStop,
    GEOFENCE_RADIUS_METERS
} from "./trip_tracking_shared.js";

const state = {
    companyId: null,
    trip: null,
    map: null,
    routeLine: null,
    stopsLayer: null,
    vehicleMarker: null,
    pollId: null,
    lastEventKey: null
};

const busIcon = L.divIcon({
    className: "bus-marker-icon",
    html: `<div class="bus-marker-shell company-bus-shell" aria-label="Vehiculo"><span>BUS</span></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -18]
});

function $(id) {
    return document.getElementById(id);
}

function setMessage(target, message = "") {
    target.textContent = message;
    target.style.display = message ? "block" : "none";
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getTripIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("trip_id");
}

function stopPolling() {
    if (state.pollId) {
        clearInterval(state.pollId);
        state.pollId = null;
    }
}

function initMap() {
    state.map = L.map("companyTripMap").setView([5.067, -75.517], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap"
    }).addTo(state.map);
}

function renderTripMeta(trip) {
    $("tripTitle").textContent = trip.route?.name || "Seguimiento de viaje";
    $("tripMeta").innerHTML = `
        <span class="badge">Bus: ${escapeHtml(trip.bus?.plate || "Bus")}</span>
        <span class="badge">Conductor: ${escapeHtml(trip.driver?.full_name || "Sin conductor")}</span>
        <span class="badge">Inicio: ${new Date(trip.start_at).toLocaleString("es-CO")}</span>
        <span class="badge">Estado: ${escapeHtml(trip.status)}</span>
    `;
}

function drawRoute(routeStops) {
    const coordinates = routeStops
        .filter((item) => item.stop)
        .map((item) => [Number(item.stop.lat), Number(item.stop.lng)]);

    if (state.routeLine) {
        state.map.removeLayer(state.routeLine);
    }

    if (state.stopsLayer) {
        state.map.removeLayer(state.stopsLayer);
    }

    state.stopsLayer = L.layerGroup(
        routeStops
            .filter((item) => item.stop)
            .map((item, index, all) => {
                const role = index === 0 ? "Origen" : index === all.length - 1 ? "Destino" : `Paradero ${item.stop_order}`;
                return L.circleMarker([item.stop.lat, item.stop.lng], {
                    radius: 7,
                    color: "#1d9d74",
                    fillColor: "#54bcbd",
                    fillOpacity: 0.9,
                    weight: 2
                }).bindPopup(`
                    <strong>${escapeHtml(item.stop.name)}</strong><br>
                    ${escapeHtml(role)}<br>
                    ${escapeHtml(item.stop.address || "Sin direccion")}
                `);
            })
    ).addTo(state.map);

    if (coordinates.length >= 2) {
        state.routeLine = L.polyline(coordinates, {
            color: "#ea580c",
            weight: 5,
            opacity: 0.85
        }).addTo(state.map);
        state.map.fitBounds(coordinates, { padding: [24, 24] });
    }
}

function renderGeofenceIdle() {
    $("geofenceCard").innerHTML = `
        <div class="route-empty">El bus aun no esta dentro del radio de ${GEOFENCE_RADIUS_METERS} m de un paradero.</div>
    `;
}

function renderGeofenceEvent(event) {
    $("geofenceCard").innerHTML = `
        <div class="trip-summary-grid company-monitor-grid">
            <div class="trip-summary-item">
                <span class="chip ok">Paradero actual</span>
                <strong>${escapeHtml(event.stop.name)}</strong>
                <small class="help">${escapeHtml(event.stop.address || "Sin direccion")}</small>
            </div>
            <div class="trip-summary-item">
                <span class="chip ok">Distancia</span>
                <strong>${Math.round(event.distanceMeters)} m</strong>
                <small class="help">Dentro del radio configurado de ${GEOFENCE_RADIUS_METERS} m</small>
            </div>
            <div class="trip-summary-item">
                <span class="chip ok">Paraderos restantes</span>
                <strong>${event.remainingStops}</strong>
                <small class="help">Faltan para llegar al paradero destino</small>
            </div>
        </div>
    `;
}

function updateVehicleMarker(position) {
    if (state.vehicleMarker) {
        state.map.removeLayer(state.vehicleMarker);
        state.vehicleMarker = null;
    }

    if (!position) {
        setMessage($("ok"), "El conductor aun no comparte ubicacion para este viaje.");
        return;
    }

    state.vehicleMarker = L.marker([position.lat, position.lng], { icon: busIcon }).addTo(state.map);
    state.vehicleMarker.bindPopup("Ubicacion actual del bus");
}

async function refreshTracking() {
    try {
        const position = await fetchCurrentVehiclePosition(state.trip.id);
        updateVehicleMarker(position);

        if (!position) {
            renderGeofenceIdle();
            setMessage($("err"), "");
            return;
        }

        const event = detectCurrentGeofenceStop(position, state.trip.route_stops);
        const timestamp = new Date(position.recorded_at).toLocaleTimeString("es-CO");

        if (!event) {
            renderGeofenceIdle();
            setMessage($("ok"), `Ubicacion actualizada a las ${timestamp}.`);
            setMessage($("err"), "");
            return;
        }

        const normalizedStops = state.trip.route_stops.filter((item) => item.stop);
        const eventWithRemaining = {
            ...event,
            remainingStops: computeRemainingStops(event.stopOrder, normalizedStops.length)
        };
        const eventKey = `${event.stop.id}:${event.stopOrder}`;
        renderGeofenceEvent(eventWithRemaining);
        setMessage(
            $("ok"),
            state.lastEventKey === eventKey
                ? `Bus dentro del geofence de ${event.stop.name}. Actualizado a las ${timestamp}.`
                : `Evento detectado: bus en ${event.stop.name}. Faltan ${eventWithRemaining.remainingStops} paraderos para el destino.`
        );
        setMessage($("err"), "");
        state.lastEventKey = eventKey;
    } catch (error) {
        setMessage($("err"), error.message || "No fue posible actualizar el seguimiento del viaje.");
    }
}

async function init() {
    const profile = await requireAuthAndRole(2);
    if (!profile) return;

    state.companyId = profile.company_id;
    $("who").textContent = `@${profile.username}`;
    $("companyChip").textContent = state.companyId
        ? `company_id: ${state.companyId}`
        : "Sin company_id";

    const tripId = getTripIdFromUrl();
    if (!tripId) {
        setMessage($("err"), "No se recibio el viaje a seguir.");
        return;
    }

    state.trip = await fetchCompanyTripById(tripId, state.companyId);
    renderTripMeta(state.trip);
    initMap();
    drawRoute(state.trip.route_stops);
    renderGeofenceIdle();
    await refreshTracking();
    state.pollId = setInterval(refreshTracking, 5000);

    $("logout").addEventListener("click", async () => {
        stopPolling();
        await signOut();
        window.location.href = "login.html";
    });

    window.addEventListener("beforeunload", stopPolling);
}

init().catch((error) => {
    setMessage($("err"), error.message || "No fue posible cargar el seguimiento del viaje.");
});
