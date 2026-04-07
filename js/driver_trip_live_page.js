import { signOut } from "./auth.js";
import { requireDriverSession } from "./driver_session.js";
import { fetchDriverTripById } from "./driver_trips.js";
import { fetchCurrentVehiclePosition, startTripTracking, stopTripTracking } from "./vehicle_positions.js";

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setMessage(target, message = "") {
  target.textContent = message;
  target.style.display = message ? "block" : "none";
}

async function init() {
  const driver = await requireDriverSession();
  if (!driver) return;

  const params = new URLSearchParams(window.location.search);
  const tripId = params.get("trip_id");
  if (!tripId) {
    setMessage($("err"), "No se recibio el viaje a seguir.");
    return;
  }

  $("who").textContent = `@${driver.user.username}`;

  const trip = await fetchDriverTripById(tripId, driver.id);
  $("tripTitle").textContent = trip.route?.name || "Viaje en curso";
  $("tripMeta").innerHTML = `
    <span class="badge">Bus: ${escapeHtml(trip.bus?.plate || "Bus")}</span>
    <span class="badge">Inicio: ${new Date(trip.start_at).toLocaleString("es-CO")}</span>
    <span class="badge">Estado: ${escapeHtml(trip.status)}</span>
  `;

  const map = L.map("driverMap").setView([5.067, -75.517], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  const routeLatLngs = trip.route_stops
    .filter((item) => item.stop)
    .map((item) => [item.stop.lat, item.stop.lng]);

  if (routeLatLngs.length >= 2) {
    L.polyline(routeLatLngs, {
      color: "#ea580c",
      weight: 5,
      opacity: 0.85
    }).addTo(map);
    map.fitBounds(routeLatLngs, { padding: [24, 24] });
  }

  let currentMarker = null;
  const currentPosition = await fetchCurrentVehiclePosition(trip.id);
  if (currentPosition) {
    currentMarker = L.marker([currentPosition.lat, currentPosition.lng]).addTo(map);
    currentMarker.bindPopup("Posicion actual del vehiculo").openPopup();
  }

  $("startTracking").addEventListener("click", () => {
    try {
      startTripTracking({
        tripId: trip.id,
        busId: trip.bus_id,
        onUpdate: (saved) => {
          setMessage($("ok"), "Ubicacion actualizada.");
          setMessage($("err"), "");
          if (currentMarker) {
            map.removeLayer(currentMarker);
          }
          currentMarker = L.marker([saved.lat, saved.lng]).addTo(map);
          currentMarker.bindPopup("Posicion actual del vehiculo").openPopup();
          map.setView([saved.lat, saved.lng], 16);
        },
        onError: (error) => {
          setMessage($("err"), error?.message || "No fue posible enviar ubicacion.");
        }
      });
      setMessage($("ok"), "Tracking iniciado.");
      setMessage($("err"), "");
    } catch (error) {
      setMessage($("err"), error?.message || "No fue posible iniciar tracking.");
    }
  });

  $("stopTracking").addEventListener("click", () => {
    stopTripTracking();
    setMessage($("ok"), "Tracking detenido.");
    setMessage($("err"), "");
  });

  $("logout").addEventListener("click", async () => {
    stopTripTracking();
    await signOut();
    window.location.href = "login.html";
  });

  window.addEventListener("beforeunload", () => {
    stopTripTracking();
  });
}

init().catch((error) => {
  setMessage(document.getElementById("err"), error?.message || "No fue posible cargar el viaje.");
});
