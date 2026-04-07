import { requireAuthAndRole } from "./guard.js";
import { signOut } from "./auth.js";
import {
    createTrip,
    deleteTrip,
    fetchCompanyTripById,
    fetchCompanyTripFormOptions,
    fetchCompanyTrips,
    updateTripStatus
} from "./trips.js";

const state = {
    profile: null,
    companyId: null,
    routes: [],
    buses: [],
    drivers: [],
    trips: []
};

function $(id) {
    return document.getElementById(id);
}

function setMessage(target, message = "") {
    target.textContent = message;
    target.style.display = message ? "block" : "none";
}

function clearMessages() {
    setMessage($("tripErr"));
    setMessage($("tripOk"));
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDateTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    return date.toLocaleString("es-CO");
}

function renderSelectOptions(selectId, items, getLabel, placeholder) {
    const select = $(selectId);
    select.innerHTML = `<option value="">${placeholder}</option>` + items.map((item) =>
        `<option value="${item.id}">${escapeHtml(getLabel(item))}</option>`
    ).join("");
}

function getSelectedRoute() {
    return state.routes.find((route) => route.id === $("tripRoute").value) || null;
}

function getSelectedBus() {
    return state.buses.find((bus) => bus.id === $("tripBus").value) || null;
}

function getSelectedDriver() {
    return state.drivers.find((driver) => driver.id === $("tripDriver").value) || null;
}

function renderSelectionSummary() {
    const route = getSelectedRoute();
    const bus = getSelectedBus();
    const driver = getSelectedDriver();

    $("tripSummary").innerHTML = `
        <div class="trip-summary-grid">
            <div class="trip-summary-item">
                <span class="chip ok">Ruta</span>
                <strong>${escapeHtml(route?.name || "Sin seleccionar")}</strong>
                <small class="help">${escapeHtml(route ? `${route.origin_stop?.name || "Sin origen"} -> ${route.end_stop?.name || "Sin destino"}` : "Selecciona una ruta activa")}</small>
            </div>
            <div class="trip-summary-item">
                <span class="chip ok">Bus</span>
                <strong>${escapeHtml(bus?.plate || "Sin seleccionar")}</strong>
                <small class="help">${escapeHtml(bus ? `Estado: ${bus.status}` : "Selecciona un bus activo")}</small>
            </div>
            <div class="trip-summary-item">
                <span class="chip ok">Conductor</span>
                <strong>${escapeHtml(driver?.full_name || "Sin seleccionar")}</strong>
                <small class="help">${escapeHtml(driver ? `Licencia: ${driver.license_no}` : "Selecciona un conductor activo")}</small>
            </div>
        </div>
    `;
}

function renderTripsTable() {
    const tbody = $("tripsTable");
    if (!state.trips.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="route-empty">No hay viajes registrados para esta empresa.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = state.trips.map((trip) => `
        <tr>
            <td><b>${escapeHtml(trip.route?.name || "Ruta eliminada")}</b></td>
            <td>${escapeHtml(trip.bus?.plate || "Bus no disponible")}</td>
            <td>${escapeHtml(trip.driver?.full_name || "Conductor no disponible")}</td>
            <td>${formatDateTime(trip.start_at)}</td>
            <td>${formatDateTime(trip.end_at)}</td>
            <td><span class="chip ${trip.status === "IN_PROGRESS" ? "ok" : trip.status === "FINISHED" ? "" : "bad"}">${escapeHtml(trip.status)}</span></td>
            <td class="stop-row-actions">
                <button class="btn-mini secondary" data-trip-action="follow" data-trip-id="${trip.id}" ${trip.status !== "IN_PROGRESS" ? "disabled" : ""}>Seguir viaje</button>
                <button class="btn-mini secondary" data-trip-action="finish" data-trip-id="${trip.id}" ${trip.status !== "IN_PROGRESS" ? "disabled" : ""}>Finalizar</button>
                <button class="btn-mini route-remove-btn" data-trip-action="cancel" data-trip-id="${trip.id}" ${trip.status !== "IN_PROGRESS" ? "disabled" : ""}>Cancelar</button>
                <button class="btn-mini route-remove-btn" data-trip-action="delete" data-trip-id="${trip.id}">Eliminar</button>
            </td>
        </tr>
    `).join("");
}

async function loadTrips() {
    state.trips = await fetchCompanyTrips(state.companyId);
    renderTripsTable();
}

async function loadFormOptions() {
    const { routes, buses, drivers } = await fetchCompanyTripFormOptions(state.companyId);
    state.routes = routes;
    state.buses = buses;
    state.drivers = drivers;

    renderSelectOptions("tripRoute", routes, (route) => route.name, "Selecciona una ruta");
    renderSelectOptions("tripBus", buses, (bus) => bus.plate, "Selecciona un bus");
    renderSelectOptions("tripDriver", drivers, (driver) => driver.full_name, "Selecciona un conductor");
    renderSelectionSummary();
}

function resetForm() {
    $("tripForm").reset();
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    $("tripStartAt").value = now.toISOString().slice(0, 16);
    clearMessages();
    renderSelectionSummary();
}

function validateForm() {
    const route = getSelectedRoute();
    const bus = getSelectedBus();
    const driver = getSelectedDriver();
    const startAt = $("tripStartAt").value;

    return {
        companyId: state.companyId,
        routeId: route?.id,
        busId: bus?.id,
        driverId: driver?.id,
        startAt,
        route,
        bus,
        driver
    };
}

async function handleCreateTrip(event) {
    event.preventDefault();

    try {
        clearMessages();
        const payload = validateForm();
        await createTrip(payload);
        await loadTrips();
        resetForm();
        setMessage($("tripOk"), "Viaje creado correctamente.");
    } catch (error) {
        setMessage($("tripErr"), error.message || "No fue posible crear el viaje.");
    }
}

async function handleTripsTableClick(event) {
    const button = event.target.closest("button");
    if (!button) return;

    const action = button.dataset.tripAction;
    const tripId = button.dataset.tripId;
    if (!action || !tripId) return;

    try {
        clearMessages();

        if (action === "follow") {
            const trip = await fetchCompanyTripById(tripId, state.companyId);
            window.location.href = `company_trip_live.html?trip_id=${trip.id}`;
            return;
        }

        if (action === "finish") {
            await updateTripStatus(tripId, state.companyId, {
                status: "FINISHED",
                end_at: new Date().toISOString()
            });
            await loadTrips();
            setMessage($("tripOk"), "Viaje finalizado correctamente.");
            return;
        }

        if (action === "cancel") {
            if (!confirm("¿Seguro que quieres cancelar este viaje?")) return;
            await updateTripStatus(tripId, state.companyId, {
                status: "CANCELED",
                end_at: new Date().toISOString()
            });
            await loadTrips();
            setMessage($("tripOk"), "Viaje cancelado correctamente.");
            return;
        }

        if (action === "delete") {
            if (!confirm("¿Seguro que quieres eliminar este viaje? Esta accion borra tambien la posicion actual asociada.")) return;
            await deleteTrip(tripId, state.companyId);
            await loadTrips();
            setMessage($("tripOk"), "Viaje eliminado correctamente.");
        }
    } catch (error) {
        setMessage($("tripErr"), error.message || "No fue posible actualizar el viaje.");
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

    $("tripForm").addEventListener("submit", handleCreateTrip);
    $("tripsTable").addEventListener("click", handleTripsTableClick);
    $("tripRoute").addEventListener("change", renderSelectionSummary);
    $("tripBus").addEventListener("change", renderSelectionSummary);
    $("tripDriver").addEventListener("change", renderSelectionSummary);
    $("resetTripForm").addEventListener("click", resetForm);
    $("logout").addEventListener("click", async () => {
        await signOut();
        window.location.href = "login.html";
    });

    await loadFormOptions();
    await loadTrips();
    resetForm();
}

init().catch((error) => {
    setMessage($("tripErr"), error.message || "No fue posible cargar el modulo de viajes.");
});
