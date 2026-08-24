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

let scrollAnimationFrame = null;
let floatingTooltip = null;

const actionIcons = {
    follow: "https://ruunbwmuizhaetgubzjt.supabase.co/storage/v1/object/public/MOVANZA/Empresa/Iconos_buses/Seguir.png",
    finish: "https://ruunbwmuizhaetgubzjt.supabase.co/storage/v1/object/public/MOVANZA/Empresa/Iconos_buses/Icono_Correcto.png",
    cancel: "https://ruunbwmuizhaetgubzjt.supabase.co/storage/v1/object/public/MOVANZA/Empresa/Iconos_buses/Icono_Incorrecto.png",
    delete: "https://ruunbwmuizhaetgubzjt.supabase.co/storage/v1/object/public/MOVANZA/Empresa/Iconos_buses/borrar.png"
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
    if (!value) return "Sin finalizar";
    const date = new Date(value);
    return date.toLocaleString("es-CO");
}

function statusLabel(status) {
    const labels = {
        IN_PROGRESS: "En curso",
        FINISHED: "Finalizado",
        CANCELED: "Cancelado"
    };

    return labels[status] || "Sin estado";
}

function statusChipClass(status) {
    if (status === "IN_PROGRESS") return "ok";
    if (status === "FINISHED") return "warn";
    return "bad";
}

function tripSearchText(trip) {
    return [
        trip.route?.name,
        trip.route?.origin_stop?.name,
        trip.route?.end_stop?.name,
        trip.bus?.plate,
        trip.driver?.full_name,
        statusLabel(trip.status),
        trip.status,
        formatDateTime(trip.start_at),
        formatDateTime(trip.end_at)
    ].join(" ").toLowerCase();
}

function actionIcon(name) {
    const src = actionIcons[name];
    if (!src) return "";
    return `<img src="${src}" alt="" aria-hidden="true"/>`;
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
                <small class="help">${escapeHtml(route ? `${route.origin_stop?.name || "Sin origen"} - ${route.end_stop?.name || "Sin destino"}` : "Selecciona una ruta activa")}</small>
            </div>
            <div class="trip-summary-item">
                <span class="chip ok">Bus</span>
                <strong>${escapeHtml(bus?.plate || "Sin seleccionar")}</strong>
                <small class="help">${escapeHtml(bus ? "Disponible para asignacion" : "Selecciona un bus activo")}</small>
            </div>
            <div class="trip-summary-item">
                <span class="chip ok">Conductor</span>
                <strong>${escapeHtml(driver?.full_name || "Sin seleccionar")}</strong>
                <small class="help">${escapeHtml(driver ? `Licencia: ${driver.license_no}` : "Selecciona un conductor activo")}</small>
            </div>
        </div>
    `;
}

function updateListScrollAnimation() {
    scrollAnimationFrame = null;
    const list = $("tripsTable");
    const items = Array.from(list.querySelectorAll(".js-scroll-list-item"));
    if (!items.length) return;

    const viewportTop = list.scrollTop;
    const viewportHeight = list.clientHeight || 1;
    const viewportBottom = viewportTop + viewportHeight;
    const focusLine = viewportTop - 1;
    const viewportCenter = viewportTop + viewportHeight * .5;
    const maxDistance = viewportHeight * .62;

    let focusIndex = items.findIndex((item) => item.offsetTop >= focusLine);
    if (focusIndex < 0) focusIndex = items.length - 1;

    items.forEach((item, index) => {
        const itemTop = item.offsetTop;
        const itemHeight = item.offsetHeight || 1;
        const itemBottom = itemTop + itemHeight;
        const visibleTop = Math.max(itemTop, viewportTop);
        const visibleBottom = Math.min(itemBottom, viewportBottom);
        const visibleRatio = Math.max(0, Math.min(1, (visibleBottom - visibleTop) / itemHeight));
        const itemCenter = item.offsetTop + item.offsetHeight * .5;
        const distance = Math.abs(viewportCenter - itemCenter);
        const centerProgress = Math.max(0, Math.min(1, 1 - distance / maxDistance));
        const isLeavingAbove = itemTop < viewportTop;
        const progress = isLeavingAbove ? visibleRatio : Math.max(centerProgress, visibleRatio);
        const opacity = .18 + progress * .82;
        const scale = .76 + progress * .24;
        const y = (1 - progress) * 18;

        item.classList.toggle("item-hide", visibleRatio < .04 || (index < focusIndex && visibleRatio < .28));
        item.classList.toggle("item-focus", index === focusIndex);
        item.classList.toggle("item-next", index === focusIndex + 1);
        item.style.setProperty("--trip-scroll-opacity", opacity.toFixed(3));
        item.style.setProperty("--trip-scroll-scale", scale.toFixed(3));
        item.style.setProperty("--trip-scroll-y", `${y.toFixed(1)}px`);
    });
}

function queueListScrollAnimation() {
    if (scrollAnimationFrame) return;
    scrollAnimationFrame = requestAnimationFrame(updateListScrollAnimation);
}

function positionTooltip(target) {
    const text = target.dataset.tooltip;
    if (!text || !floatingTooltip) return;

    floatingTooltip.textContent = text;
    floatingTooltip.classList.add("is-visible");

    const rect = target.getBoundingClientRect();
    const tooltipRect = floatingTooltip.getBoundingClientRect();
    const left = Math.min(
        window.innerWidth - tooltipRect.width - 12,
        Math.max(12, rect.left + rect.width / 2 - tooltipRect.width / 2)
    );
    const top = Math.max(12, rect.top - tooltipRect.height - 10);

    floatingTooltip.style.left = `${left}px`;
    floatingTooltip.style.top = `${top}px`;
}

function hideTooltip() {
    if (floatingTooltip) floatingTooltip.classList.remove("is-visible");
}

function tripAllowsLiveActions(trip) {
    return trip?.status === "IN_PROGRESS";
}

function confirmAction(message) {
    const modal = $("tripConfirmModal");
    const text = $("tripConfirmText");
    const accept = $("tripConfirmAccept");
    const cancel = $("tripConfirmCancel");

    if (!modal || !text || !accept || !cancel) {
        return Promise.resolve(confirm(message));
    }

    text.textContent = message;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    accept.focus();

    return new Promise((resolve) => {
        function close(value) {
            modal.classList.remove("is-open");
            modal.setAttribute("aria-hidden", "true");
            accept.removeEventListener("click", onAccept);
            cancel.removeEventListener("click", onCancel);
            modal.removeEventListener("click", onBackdrop);
            document.removeEventListener("keydown", onKeydown);
            resolve(value);
        }

        function onAccept() {
            close(true);
        }

        function onCancel() {
            close(false);
        }

        function onBackdrop(event) {
            if (event.target === modal) close(false);
        }

        function onKeydown(event) {
            if (event.key === "Escape") close(false);
        }

        accept.addEventListener("click", onAccept);
        cancel.addEventListener("click", onCancel);
        modal.addEventListener("click", onBackdrop);
        document.addEventListener("keydown", onKeydown);
    });
}

function renderTripsTable() {
    const list = $("tripsTable");
    const empty = $("tripsEmpty");
    const query = ($("tripSearch")?.value || "").trim().toLowerCase();
    const status = $("tripStatusFilter")?.value || "";
    const trips = state.trips.filter((trip) => {
        const matchesQuery = !query || tripSearchText(trip).includes(query);
        const matchesStatus = !status || trip.status === status;
        return matchesQuery && matchesStatus;
    });

    if (!state.trips.length || !trips.length) {
        list.innerHTML = "";
        if (empty) {
            empty.style.display = "block";
            empty.querySelector(".t").textContent = state.trips.length
                ? "No hay viajes para mostrar"
                : "No hay viajes registrados";
            empty.querySelector(".p").textContent = state.trips.length
                ? "Ajusta la busqueda o el filtro de estado."
                : "Crea la primera asignacion de ruta, bus y conductor.";
        }
        return;
    }

    if (empty) empty.style.display = "none";

    list.innerHTML = trips.map((trip) => {
        const liveActionState = tripAllowsLiveActions(trip) ? "" : " is-unavailable";
        const liveAriaState = tripAllowsLiveActions(trip) ? "false" : "true";

        return `
        <article class="trip-list-item js-scroll-list-item">
            <div class="trip-list-main">
                <div class="trip-list-icon" aria-hidden="true">${actionIcon("follow")}</div>
                <div class="trip-list-copy">
                    <b>${escapeHtml(trip.route?.name || "Ruta eliminada")}</b>
                    <span>${escapeHtml(trip.route?.origin_stop?.name || "Sin origen")} - ${escapeHtml(trip.route?.end_stop?.name || "Sin destino")}</span>
                </div>
            </div>

            <div class="trip-list-meta">
                <div class="trip-meta-cell">
                    <span class="chip">Bus ${escapeHtml(trip.bus?.plate || "no disponible")}</span>
                    <small>${escapeHtml(trip.driver?.full_name || "Conductor no disponible")}</small>
                </div>
                <div class="trip-meta-cell">
                    <small>Inicio</small>
                    <strong>${formatDateTime(trip.start_at)}</strong>
                </div>
                <div class="trip-meta-cell">
                    <small>Fin</small>
                    <strong>${formatDateTime(trip.end_at)}</strong>
                </div>
            </div>

            <div class="trip-state-cell">
                <span class="chip ${statusChipClass(trip.status)}">${escapeHtml(statusLabel(trip.status))}</span>
            </div>

            <div class="row-actions">
                <button class="pill-btn icon primary-action${liveActionState}" data-trip-action="follow" data-trip-id="${trip.id}" data-tooltip="Seguir viaje" aria-label="Seguir viaje" aria-disabled="${liveAriaState}">${actionIcon("follow")}</button>
                <button class="pill-btn icon on${liveActionState}" data-trip-action="finish" data-trip-id="${trip.id}" data-tooltip="Finalizar viaje" aria-label="Finalizar viaje" aria-disabled="${liveAriaState}">${actionIcon("finish")}</button>
                <button class="pill-btn icon warn${liveActionState}" data-trip-action="cancel" data-trip-id="${trip.id}" data-tooltip="Cancelar viaje" aria-label="Cancelar viaje" aria-disabled="${liveAriaState}">${actionIcon("cancel")}</button>
                <button class="pill-btn icon off" data-trip-action="delete" data-trip-id="${trip.id}" data-tooltip="Eliminar viaje" aria-label="Eliminar viaje">${actionIcon("delete")}</button>
            </div>
        </article>
    `;
    }).join("");

    queueListScrollAnimation();
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
        const currentTrip = state.trips.find((trip) => trip.id === tripId);

        if (action === "follow") {
            if (!tripAllowsLiveActions(currentTrip)) {
                setMessage($("tripErr"), "Solo puedes seguir viajes en curso.");
                return;
            }
            const trip = await fetchCompanyTripById(tripId, state.companyId);
            window.location.href = `company_trip_live.html?trip_id=${trip.id}`;
            return;
        }

        if (action === "finish") {
            if (!tripAllowsLiveActions(currentTrip)) {
                setMessage($("tripErr"), "Solo puedes finalizar viajes en curso.");
                return;
            }
            await updateTripStatus(tripId, state.companyId, {
                status: "FINISHED",
                end_at: new Date().toISOString()
            });
            await loadTrips();
            setMessage($("tripOk"), "Viaje finalizado correctamente.");
            return;
        }

        if (action === "cancel") {
            if (!tripAllowsLiveActions(currentTrip)) {
                setMessage($("tripErr"), "Solo puedes cancelar viajes en curso.");
                return;
            }
            if (!await confirmAction("Seguro que quieres cancelar este viaje?")) return;
            await updateTripStatus(tripId, state.companyId, {
                status: "CANCELED",
                end_at: new Date().toISOString()
            });
            await loadTrips();
            setMessage($("tripOk"), "Viaje cancelado correctamente.");
            return;
        }

        if (action === "delete") {
            if (!await confirmAction("Seguro que quieres eliminar este viaje? Esta accion borra tambien la posicion actual asociada.")) return;
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
    $("companyChip").textContent = state.companyId ? "Empresa" : "Sin empresa";

    $("tripForm").addEventListener("submit", handleCreateTrip);
    $("tripsTable").addEventListener("click", handleTripsTableClick);
    $("tripsTable").addEventListener("scroll", queueListScrollAnimation, { passive: true });
    $("tripsTable").addEventListener("pointerover", (event) => {
        const button = event.target.closest("[data-tooltip]");
        if (button) positionTooltip(button);
    });
    $("tripsTable").addEventListener("pointerout", (event) => {
        if (event.target.closest("[data-tooltip]")) hideTooltip();
    });
    $("tripSearch").addEventListener("input", renderTripsTable);
    $("tripStatusFilter").addEventListener("change", renderTripsTable);
    $("tripRoute").addEventListener("change", renderSelectionSummary);
    $("tripBus").addEventListener("change", renderSelectionSummary);
    $("tripDriver").addEventListener("change", renderSelectionSummary);
    $("resetTripForm").addEventListener("click", resetForm);
    $("logout").addEventListener("click", async () => {
        await signOut();
        window.location.href = "login.html";
    });
    window.addEventListener("resize", queueListScrollAnimation);
    window.addEventListener("scroll", hideTooltip, { passive: true });

    floatingTooltip = document.createElement("div");
    floatingTooltip.className = "company-action-tooltip";
    document.body.append(floatingTooltip);

    await loadFormOptions();
    await loadTrips();
    resetForm();
}

init().catch((error) => {
    setMessage($("tripErr"), error.message || "No fue posible cargar el modulo de viajes.");
});
