import { signOut } from "./auth.js";
import { requireDriverSession } from "./driver_session.js";
import { fetchDriverTrips } from "./driver_trips.js";

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

async function init() {
  const driver = await requireDriverSession();
  if (!driver) return;

  $("who").textContent = `@${driver.user.username}`;
  const trips = await fetchDriverTrips(driver.id);
  const history = trips.filter((trip) => trip.status !== "IN_PROGRESS");

  $("rows").innerHTML = history.length
    ? history.map((trip) => `
        <tr>
          <td><b>${escapeHtml(trip.route?.name || "Ruta")}</b></td>
          <td>${escapeHtml(trip.bus?.plate || "Bus")}</td>
          <td>${new Date(trip.start_at).toLocaleString("es-CO")}</td>
          <td>${trip.end_at ? new Date(trip.end_at).toLocaleString("es-CO") : "—"}</td>
          <td><span class="chip ${trip.status === "FINISHED" ? "ok" : "bad"}">${escapeHtml(trip.status)}</span></td>
        </tr>
      `).join("")
    : `<tr><td colspan="5" class="route-empty">No tienes historial de viajes.</td></tr>`;

  $("logout").addEventListener("click", async () => {
    await signOut();
    window.location.href = "login.html";
  });
}

init();
