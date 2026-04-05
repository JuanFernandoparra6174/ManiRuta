import { supabase } from "./supabaseClient.js";

// Inicializar mapa centrado en Manizales
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

// Dibuja los puntos verdes individuales de los paraderos
export async function loadStopsOnMap() {
    const { data: stops } = await supabase.from('stops').select('*');
    if (stops) {
        stops.forEach(stop => {
            L.circleMarker([stop.latitude, stop.longitude], {
                color: '#27ae60', // Verde paradero
                radius: 6
            }).addTo(map).bindPopup(`🚏 Paradero: ${stop.name}`);
        });
    }
}

// Dibuja las líneas de colores conectando los paraderos de cada ruta
export async function loadRealRoutes() {
    // 1. Traemos paraderos ordenados por ruta y orden de recorrido
    const { data: stops, error } = await supabase
        .from('stops')
        .select('*')
        .order('route_id', { ascending: true })
        .order('order_number', { ascending: true }); // Es vital tener esta columna en tu DB

    if (error || !stops) return;

    // 2. Agrupamos los puntos por su ID de ruta
    const routes = {};
    stops.forEach(s => {
        if (!routes[s.route_id]) routes[s.route_id] = [];
        routes[s.route_id].push([s.latitude, s.longitude]);
    });

    // 3. Colores para diferenciar "Sultana", "Centro", etc.
    const colors = ['#e67e22', '#3498db', '#9b59b6', '#e74c3c', '#2ecc71'];
    let i = 0;

    // 4. Dibujamos cada polilínea por separado
    Object.keys(routes).forEach(id => {
        const path = routes[id];
        if (path.length > 1) {
            L.polyline(path, {
                color: colors[i % colors.length], // Asigna un color distinto a cada ruta
                weight: 5,
                opacity: 0.8,
                lineJoin: 'round'
            }).addTo(map);
            i++;
        }
    });
}