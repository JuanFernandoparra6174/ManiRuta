import { signOut } from "./auth.js";
import { requireDriverSession } from "./driver_session.js";
import { fetchActiveDriverTrip } from "./driver_trips.js";

function $(id) {
  return document.getElementById(id);
}

async function init() {
  const driver = await requireDriverSession();
  if (!driver) return;

  $("who").textContent = `@${driver.user.username}`;
  $("welcomeTitle").textContent = `Hola, ${driver.full_name}`;
  $("driverInfo").textContent = `Licencia: ${driver.license_no}`;

  const activeTrip = await fetchActiveDriverTrip(driver.id);
  $("activeTrip").innerHTML = activeTrip
    ? `<b>${activeTrip.route?.name || "Ruta"}</b> · ${activeTrip.bus?.plate || "Bus"} · inicia ${new Date(activeTrip.start_at).toLocaleString("es-CO")}`
    : "No tienes viajes en progreso.";

  $("logout").addEventListener("click", async () => {
    await signOut();
    window.location.href = "login.html";
  });

  $("goTrips").addEventListener("click", () => {
    window.location.href = "driver_trips.html";
  });

  $("goHistory").addEventListener("click", () => {
    window.location.href = "driver_history.html";
  });

  $("goLive").addEventListener("click", () => {
    if (activeTrip) {
      window.location.href = `driver_trip_live.html?trip_id=${activeTrip.id}`;
    } else {
      alert("No tienes viajes en progreso.");
    }
  });
}

init();
