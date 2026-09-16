import { requireAuthAndRole } from "./guard.js";
import { signOut } from "./auth.js";
import { fetchCompanyTripById } from "./trips.js";
import { fetchCurrentVehiclePosition } from "./vehicle_positions.js";
import {
    computeRemainingStops,
    detectCurrentGeofenceStop,
    GEOFENCE_RADIUS_METERS
} from "./trip_tracking_shared.js";
import { routeLatLngsWithFallback } from "./route_geometry.js";

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

const visualIcons = {
    inProgress: "https://ruunbwmuizhaetgubzjt.supabase.co/storage/v1/object/public/MOVANZA/Empresa/Iconos_buses/Icono_Correcto.png",
    finished: "https://ruunbwmuizhaetgubzjt.supabase.co/storage/v1/object/public/MOVANZA/Empresa/Iconos_buses/Icono_Correcto.png",
    canceled: "https://ruunbwmuizhaetgubzjt.supabase.co/storage/v1/object/public/MOVANZA/Empresa/Iconos_buses/Icono_Incorrecto.png",
    route: "https://ruunbwmuizhaetgubzjt.supabase.co/storage/v1/object/public/MOVANZA/Empresa/Iconos_buses/Ruta.png",
    bus: "https://ruunbwmuizhaetgubzjt.supabase.co/storage/v1/object/public/MOVANZA/Empresa/Iconos_buses/Bus.png",
    driver: "https://ruunbwmuizhaetgubzjt.supabase.co/storage/v1/object/public/MOVANZA/Empresa/Iconos_buses/conductor.png"
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

function formatDateTime(value) {
    if (!value) return "Sin finalizar";
    return new Date(value).toLocaleString("es-CO");
}

function statusLabel(status) {
    const labels = {
        IN_PROGRESS: "En curso",
        FINISHED: "Finalizado",
        CANCELED: "Cancelado"
    };

    return labels[status] || "Sin estado";
}

function statusTone(status) {
    if (status === "IN_PROGRESS") return "ok";
    if (status === "FINISHED") return "warn";
    return "bad";
}

function statusIcon(status) {
    if (status === "IN_PROGRESS") return visualIcons.inProgress;
    if (status === "FINISHED") return visualIcons.finished;
    return visualIcons.canceled;
}

function renderMetaIcon(src) {
    if (!src) return "";
    return `<span class="trip-meta-icon"><img src="${src}" alt="" aria-hidden="true"/></span>`;
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
        <article class="trip-meta-item">
            <div class="trip-meta-item-head">
                <span class="badge ${statusTone(trip.status)}">${escapeHtml(statusLabel(trip.status))}</span>
                ${renderMetaIcon(statusIcon(trip.status))}
            </div>
            <strong>Estado del viaje</strong>
            <small>Seguimiento operativo actual</small>
        </article>
        <article class="trip-meta-item">
            <div class="trip-meta-item-head">
                <span class="badge">Ruta</span>
                ${renderMetaIcon(visualIcons.route)}
            </div>
            <strong>${escapeHtml(trip.route?.name || "Ruta no disponible")}</strong>
            <small>${escapeHtml(trip.route_stops?.length ? `${trip.route_stops.length} paraderos asociados` : "Sin paraderos asociados")}</small>
        </article>
        <article class="trip-meta-item">
            <div class="trip-meta-item-head">
                <span class="badge">Vehiculo</span>
                ${renderMetaIcon(visualIcons.bus)}
            </div>
            <strong>${escapeHtml(trip.bus?.plate || "Bus no disponible")}</strong>
            <small>Unidad asignada al recorrido</small>
        </article>
        <article class="trip-meta-item">
            <div class="trip-meta-item-head">
                <span class="badge">Conductor</span>
                ${renderMetaIcon(visualIcons.driver)}
            </div>
            <strong>${escapeHtml(trip.driver?.full_name || "Sin conductor")}</strong>
            <small>Inicio: ${escapeHtml(formatDateTime(trip.start_at))}</small>
        </article>
    `;
}

function drawRoute(routeStops, activeGeometry) {
    const coordinates = routeLatLngsWithFallback(activeGeometry, routeStops);

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
        <div class="trip-geofence-grid">
            <div class="trip-geofence-item">
                <span class="chip ok">Paradero actual</span>
                <strong>${escapeHtml(event.stop.name)}</strong>
                <small class="help">${escapeHtml(event.stop.address || "Sin direccion")}</small>
            </div>
            <div class="trip-geofence-item">
                <span class="chip ok">Distancia</span>
                <strong>${Math.round(event.distanceMeters)} m</strong>
                <small class="help">Dentro del radio configurado de ${GEOFENCE_RADIUS_METERS} m</small>
            </div>
            <div class="trip-geofence-item">
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
    $("companyChip").textContent = state.companyId ? "Empresa" : "Sin empresa";

    const tripId = getTripIdFromUrl();
    if (!tripId) {
        setMessage($("err"), "No se recibio el viaje a seguir.");
        return;
    }

    state.trip = await fetchCompanyTripById(tripId, state.companyId);
    renderTripMeta(state.trip);
    initMap();
    drawRoute(state.trip.route_stops, state.trip.route?.activeGeometry);
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
