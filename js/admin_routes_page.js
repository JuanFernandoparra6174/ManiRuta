import { fetchAdminRoutes } from "./routes.js";
import { requireAuthAndRole } from "./guard.js";

const state = {
    routes: [],
    filteredRoutes: [],
    selectedRouteId: null,
    map: null,
    routesLayer: null,
    selectedLine: null,
    selectedMarkers: []
};

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

function getStopRoleLabel(index, total) {
    if (index === 0) return "Origen";
    if (index === total - 1) return "Destino";
    return "Intermedio";
}

function getSelectedRoute() {
    return state.routes.find((route) => route.id === state.selectedRouteId) || null;
}

function clearSelectedRouteLayers() {
    if (state.selectedLine) {
        state.map.removeLayer(state.selectedLine);
        state.selectedLine = null;
    }

    for (const marker of state.selectedMarkers) {
        state.map.removeLayer(marker);
    }
    state.selectedMarkers = [];
}

function renderRoutesOverview() {
    if (state.routesLayer) {
        state.map.removeLayer(state.routesLayer);
    }

    const palette = ["#1d4ed8", "#0f766e", "#ea580c", "#7c3aed", "#dc2626"];
    const polylines = state.routes
        .map((route, index) => {
            const coordinates = route.stops
                .filter((item) => item.stop)
                .map((item) => [item.stop.lat, item.stop.lng]);

            if (coordinates.length < 2) return null;

            return L.polyline(coordinates, {
                color: palette[index % palette.length],
                weight: 4,
                opacity: 0.35
            }).bindPopup(`
                <strong>${escapeHtml(route.name)}</strong><br>
                ${escapeHtml(route.company_name || "Sin empresa")}
            `);
        })
        .filter(Boolean);

    state.routesLayer = L.layerGroup(polylines).addTo(state.map);
}

function renderRoutesTable() {
    const tbody = $("routesTable");
    if (!state.filteredRoutes.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="route-empty">No hay rutas para mostrar con ese filtro.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = state.filteredRoutes.map((route) => `
        <tr class="${route.id === state.selectedRouteId ? "route-row-selected" : ""}">
            <td>
                <b>${escapeHtml(route.name)}</b><br>
                <small>${escapeHtml(route.direction || "IDA")} · ${route.stop_count} paraderos</small>
            </td>
            <td>${escapeHtml(route.company_name || "Sin empresa")}</td>
            <td><span class="chip ${route.status === "ACTIVE" ? "ok" : "bad"}">${escapeHtml(route.status)}</span></td>
            <td><button class="btn-mini secondary" data-route-id="${route.id}">Ver</button></td>
        </tr>
    `).join("");
}

function renderRouteDetail() {
    const route = getSelectedRoute();
    const container = $("routeDetail");

    if (!route) {
        $("routeDetailHint").textContent = "Selecciona una ruta del listado para ver sus datos.";
        container.innerHTML = `<div class="route-empty">Aun no has seleccionado una ruta.</div>`;
        return;
    }

    $("routeDetailHint").textContent = "Detalle general de la ruta seleccionada.";
    container.innerHTML = `
        <div class="route-detail-item">
            <span class="route-detail-label">Ruta</span>
            <span class="route-detail-value">${escapeHtml(route.name)}</span>
        </div>
        <div class="route-detail-item">
            <span class="route-detail-label">Empresa</span>
            <span class="route-detail-value">${escapeHtml(route.company_name || "Sin empresa asignada")}</span>
        </div>
        <div class="route-detail-item">
            <span class="route-detail-label">Sentido</span>
            <span class="route-detail-value">${escapeHtml(route.direction || "IDA")}</span>
        </div>
        <div class="route-detail-item">
            <span class="route-detail-label">Estado</span>
            <span class="route-detail-value">${escapeHtml(route.status || "Sin estado")}</span>
        </div>
        <div class="route-detail-item">
            <span class="route-detail-label">Origen</span>
            <span class="route-detail-value">${escapeHtml(route.origin_stop?.name || "Sin origen")}</span>
        </div>
        <div class="route-detail-item">
            <span class="route-detail-label">Destino</span>
            <span class="route-detail-value">${escapeHtml(route.end_stop?.name || "Sin destino")}</span>
        </div>
    `;
}

function renderRouteStops() {
    const route = getSelectedRoute();
    const list = $("selectedStopsList");

    if (!route || !route.stops.length) {
        $("selectedStopsCount").textContent = "0 paraderos";
        list.innerHTML = `<div class="route-empty">Selecciona una ruta para consultar su recorrido.</div>`;
        return;
    }

    $("selectedStopsCount").textContent = `${route.stop_count} paraderos`;
    list.innerHTML = route.stops.map((item, index) => `
        <div class="route-stop-item">
            <div class="route-stop-meta">
                <span class="chip">${index + 1}</span>
                <div>
                    <div class="route-stop-name">${escapeHtml(item.stop?.name || "Paradero sin datos")}</div>
                    <div class="help">${escapeHtml(item.stop?.address || "Sin direccion")}</div>
                </div>
            </div>
            <div class="route-stop-actions">
                <span class="chip ${index === 0 || index === route.stops.length - 1 ? "ok" : ""}">${getStopRoleLabel(index, route.stops.length)}</span>
            </div>
        </div>
    `).join("");
}

function drawSelectedRoute() {
    clearSelectedRouteLayers();

    const route = getSelectedRoute();
    if (!route) return;

    const stops = route.stops.filter((item) => item.stop);
    const coordinates = stops.map((item) => [item.stop.lat, item.stop.lng]);

    if (coordinates.length >= 2) {
        state.selectedLine = L.polyline(coordinates, {
            color: "#ea580c",
            weight: 5,
            opacity: 0.95
        }).addTo(state.map);
    }

    state.selectedMarkers = stops.map((item, index) => {
        const stop = item.stop;
        const marker = L.marker([stop.lat, stop.lng]).addTo(state.map);
        marker.bindPopup(`${getStopRoleLabel(index, stops.length)}: ${escapeHtml(stop.name)}`);
        return marker;
    });

    if (coordinates.length) {
        state.map.fitBounds(coordinates, { padding: [24, 24] });
    }
}

function applySearch() {
    const term = $("routeSearch").value.trim().toLowerCase();
    state.filteredRoutes = state.routes.filter((route) => {
        const haystack = `${route.name || ""} ${route.company_name || ""}`.toLowerCase();
        return !term || haystack.includes(term);
    });

    if (!state.filteredRoutes.some((route) => route.id === state.selectedRouteId)) {
        state.selectedRouteId = state.filteredRoutes[0]?.id || null;
    }

    renderRoutesTable();
    renderRouteDetail();
    renderRouteStops();
    drawSelectedRoute();
}

function selectRoute(routeId) {
    state.selectedRouteId = routeId;
    renderRoutesTable();
    renderRouteDetail();
    renderRouteStops();
    drawSelectedRoute();
}

async function loadRoutes() {
    state.routes = await fetchAdminRoutes();
    state.filteredRoutes = [...state.routes];
    state.selectedRouteId = state.routes[0]?.id || null;
    renderRoutesOverview();
    applySearch();
}

async function init() {
    await requireAuthAndRole(3);

    state.map = L.map("routesMap").setView([5.067, -75.517], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap"
    }).addTo(state.map);

    $("routeSearch").addEventListener("input", applySearch);
    $("routesTable").addEventListener("click", (event) => {
        const button = event.target.closest("button[data-route-id]");
        if (!button) return;
        selectRoute(button.dataset.routeId);
    });

    await loadRoutes();
}

init().catch((error) => {
    setMessage($("routeErr"), error.message || "No fue posible cargar la consulta de rutas.");
});
