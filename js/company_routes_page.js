import { fetchStops } from "./stops.js";
import { createRouteWithStops, deleteRoute, fetchCompanyRoutes } from "./routes.js";
import { requireAuthAndRole } from "./guard.js";
import { signOut } from "./auth.js";

const state = {
    profile: null,
    companyId: null,
    stops: [],
    routes: [],
    selectedStopIds: [],
    map: null,
    markersLayer: null,
    previewLine: null,
    selectedMarkers: [],
    selectedStopIdSet: new Set()
};

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

function getSelectedStops() {
    return state.selectedStopIds
        .map((stopId) => state.stops.find((stop) => stop.id === stopId))
        .filter(Boolean);
}

function getStopRoleLabel(index, total) {
    if (index === 0) return "Origen";
    if (index === total - 1) return "Destino";
    return "Intermedio";
}

function clearPreviewLine() {
    if (state.previewLine) {
        state.map.removeLayer(state.previewLine);
        state.previewLine = null;
    }
}

function clearSelectedMarkers() {
    for (const marker of state.selectedMarkers) {
        state.map.removeLayer(marker);
    }
    state.selectedMarkers = [];
}

function renderStopsOnMap() {
    if (state.markersLayer) {
        state.map.removeLayer(state.markersLayer);
    }

    state.markersLayer = L.layerGroup(
        state.stops.map((stop) => {
            const isSelected = state.selectedStopIdSet.has(stop.id);
            return L.circleMarker([stop.lat, stop.lng], {
                radius: isSelected ? 9 : 7,
                color: isSelected ? "#0f766e" : "#1d9d74",
                fillColor: isSelected ? "#0ea5a4" : "#54bcbd",
                fillOpacity: 0.9,
                weight: isSelected ? 3 : 2
            })
                .bindPopup(`
                    <strong>${escapeHtml(stop.name)}</strong><br>
                    ${escapeHtml(stop.address || "Sin direccion")}<br>
                    <button class="map-stop-action" data-stop-id="${stop.id}">Agregar</button>
                `)
                .on("click", () => addStopToSequence(stop.id));
        })
    ).addTo(state.map);
}

function drawCurrentRoutePreview() {
    clearPreviewLine();
    clearSelectedMarkers();

    const selectedStops = getSelectedStops();
    if (!selectedStops.length) return;

    const latLngs = selectedStops.map((stop) => [stop.lat, stop.lng]);
    if (latLngs.length >= 2) {
        state.previewLine = L.polyline(latLngs, {
            color: "#ea580c",
            weight: 5,
            opacity: 0.85
        }).addTo(state.map);
    }

    state.selectedMarkers = selectedStops.map((stop, index) => {
        const role = getStopRoleLabel(index, selectedStops.length);
        const marker = L.marker([stop.lat, stop.lng]).addTo(state.map);
        marker.bindPopup(`${role}: ${escapeHtml(stop.name)}`);
        return marker;
    });
}

function renderSelectedSequence() {
    const list = $("selectedStopsList");
    const selectedStops = getSelectedStops();

    $("selectedStopsCount").textContent = `${selectedStops.length} seleccionados`;

    if (!selectedStops.length) {
        list.innerHTML = `<div class="route-empty">Selecciona paraderos en el mapa para construir la ruta.</div>`;
        drawCurrentRoutePreview();
        renderStopsOnMap();
        return;
    }

    list.innerHTML = selectedStops.map((stop, index) => `
        <div class="route-stop-item">
            <div class="route-stop-meta">
                <span class="chip">${index + 1}</span>
                <div>
                    <div class="route-stop-name">${escapeHtml(stop.name)}</div>
                    <div class="help">${escapeHtml(stop.address || "Sin direccion")}</div>
                </div>
            </div>
            <div class="route-stop-actions">
                <span class="chip ${index === 0 || index === selectedStops.length - 1 ? "ok" : ""}">${getStopRoleLabel(index, selectedStops.length)}</span>
                <button class="btn-mini secondary" data-action="up" data-index="${index}" ${index === 0 ? "disabled" : ""}>Subir</button>
                <button class="btn-mini secondary" data-action="down" data-index="${index}" ${index === selectedStops.length - 1 ? "disabled" : ""}>Bajar</button>
                <button class="btn-mini route-remove-btn" data-action="remove" data-index="${index}">Quitar</button>
            </div>
        </div>
    `).join("");

    drawCurrentRoutePreview();
    renderStopsOnMap();
}

function renderRoutesTable() {
    const tbody = $("routesTable");
    if (!state.routes.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="route-empty">No hay rutas registradas para esta empresa.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = state.routes.map((route) => `
        <tr>
            <td><b>${escapeHtml(route.name)}</b></td>
            <td>${escapeHtml(route.origin_stop?.name || "Sin origen")}</td>
            <td>${escapeHtml(route.end_stop?.name || "Sin destino")}</td>
            <td>${escapeHtml(route.direction || "IDA")}</td>
            <td><span class="chip ${route.status === "ACTIVE" ? "ok" : "bad"}">${escapeHtml(route.status)}</span></td>
            <td class="stop-row-actions">
                <span class="chip">${route.stop_count} paraderos</span>
                <button class="btn-mini secondary" data-route-action="view" data-route-id="${route.id}">Ver</button>
                <button class="btn-mini route-remove-btn" data-route-action="delete" data-route-id="${route.id}">Eliminar</button>
            </td>
        </tr>
    `).join("");
}

function addStopToSequence(stopId) {
    clearMessages();

    if (state.selectedStopIdSet.has(stopId)) {
        setMessage($("routeErr"), "Ese paradero ya hace parte del recorrido actual.");
        return;
    }

    state.selectedStopIds.push(stopId);
    state.selectedStopIdSet = new Set(state.selectedStopIds);
    renderSelectedSequence();
}

function removeStopFromSequence(index) {
    state.selectedStopIds.splice(index, 1);
    state.selectedStopIdSet = new Set(state.selectedStopIds);
    renderSelectedSequence();
}

function moveStop(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= state.selectedStopIds.length) return;

    const next = [...state.selectedStopIds];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    state.selectedStopIds = next;
    state.selectedStopIdSet = new Set(next);
    renderSelectedSequence();
}

function resetForm() {
    $("routeForm").reset();
    $("routeDirection").value = "IDA";
    $("routeStatus").value = "ACTIVE";
    state.selectedStopIds = [];
    state.selectedStopIdSet = new Set();
    clearMessages();
    renderSelectedSequence();
}

function validateRouteForm() {
    const name = $("routeName").value.trim();
    const direction = $("routeDirection").value;
    const status = $("routeStatus").value;

    if (!name) {
        throw new Error("El nombre de la ruta es obligatorio.");
    }

    if (!state.companyId) {
        throw new Error("Tu usuario no tiene company_id asignado.");
    }

    if (state.selectedStopIds.length < 2) {
        throw new Error("Debes seleccionar al menos origen y destino.");
    }

    return {
        company_id: state.companyId,
        name,
        direction,
        status,
        stop_ids: [...state.selectedStopIds]
    };
}

async function loadRoutes() {
    state.routes = await fetchCompanyRoutes(state.companyId);
    renderRoutesTable();
}

async function loadInitialData() {
    state.stops = (await fetchStops()).filter((stop) => stop.status === "ACTIVE");
    renderStopsOnMap();
    await loadRoutes();
    renderSelectedSequence();
}

function focusRoute(routeId) {
    const route = state.routes.find((item) => item.id === routeId);
    if (!route || !route.stops.length) return;

    const coordinates = route.stops
        .filter((item) => item.stop)
        .map((item) => [item.stop.lat, item.stop.lng]);

    if (!coordinates.length) return;

    clearPreviewLine();
    clearSelectedMarkers();
    if (coordinates.length >= 2) {
        state.previewLine = L.polyline(coordinates, {
            color: "#1d4ed8",
            weight: 5,
            opacity: 0.85
        }).addTo(state.map);
    }

    state.map.fitBounds(coordinates, { padding: [24, 24] });
    setMessage($("routeOk"), `Vista previa cargada para la ruta ${route.name}.`);
}

async function handleSaveRoute(event) {
    event.preventDefault();

    try {
        clearMessages();
        const payload = validateRouteForm();
        await createRouteWithStops(payload);
        await loadRoutes();
        resetForm();
        setMessage($("routeOk"), "Ruta guardada correctamente.");
    } catch (error) {
        setMessage($("routeErr"), error.message || "No fue posible guardar la ruta.");
    }
}

async function handleRoutesTableClick(event) {
    const button = event.target.closest("button");
    if (!button) return;

    const action = button.dataset.routeAction;
    const routeId = button.dataset.routeId;
    if (!action || !routeId) return;

    if (action === "view") {
        focusRoute(routeId);
        return;
    }

    if (action === "delete") {
        if (!confirm("¿Seguro que quieres eliminar esta ruta?")) return;

        try {
            clearMessages();
            await deleteRoute(routeId, state.companyId);
            await loadRoutes();
            setMessage($("routeOk"), "Ruta eliminada correctamente.");
        } catch (error) {
            setMessage($("routeErr"), error.message || "No fue posible eliminar la ruta.");
        }
    }
}

function handleSelectedListClick(event) {
    const button = event.target.closest("button");
    if (!button) return;

    const action = button.dataset.action;
    const index = Number.parseInt(button.dataset.index, 10);
    if (!action || Number.isNaN(index)) return;

    if (action === "remove") {
        removeStopFromSequence(index);
        return;
    }

    if (action === "up") {
        moveStop(index, -1);
        return;
    }

    if (action === "down") {
        moveStop(index, 1);
    }
}

async function init() {
    state.profile = await requireAuthAndRole(2);
    if (!state.profile) return;

    state.companyId = state.profile.company_id;
    $("who").textContent = `@${state.profile.username}`;
    $("companyChip").textContent = state.companyId
        ? `company_id: ${state.companyId}`
        : "Sin company_id";

    state.map = L.map("routesMap").setView([5.067, -75.517], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap"
    }).addTo(state.map);

    $("routeForm").addEventListener("submit", handleSaveRoute);
    $("selectedStopsList").addEventListener("click", handleSelectedListClick);
    $("routesTable").addEventListener("click", handleRoutesTableClick);
    $("clearSelectionBtn").addEventListener("click", resetForm);
    $("logout").addEventListener("click", async () => {
        await signOut();
        window.location.href = "login.html";
    });

    await loadInitialData();
}

init().catch((error) => {
    setMessage($("routeErr"), error.message || "No fue posible cargar el modulo de rutas.");
});
