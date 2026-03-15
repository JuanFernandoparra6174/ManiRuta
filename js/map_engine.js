// js/map_engine.js
import { supabase } from "./supabaseClient.js";

export const map = L.map('map').setView([5.067, -75.517], 13); 

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

export function startGPS() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const { latitude, longitude } = pos.coords;
            map.setView([latitude, longitude], 16);
            L.marker([latitude, longitude]).addTo(map).bindPopup("📍 Estás aquí").openPopup();
        }, null, { enableHighAccuracy: true });
    }
}

// ESTA FUNCIÓN TRAE LOS PUNTOS VERDES AL MAPA
export async function loadStopsOnMap() {
    const { data: stops } = await supabase.from('stops').select('*');
    if (stops) {
        stops.forEach(stop => {
            L.circleMarker([stop.latitude, stop.longitude], {
                color: '#27ae60', // Verde para que combine con tu UI
                radius: 8
            }).addTo(map).bindPopup(`🚏 Paradero: ${stop.name}`);
        });
    }
}