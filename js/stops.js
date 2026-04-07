import { supabase } from "./supabaseClient.js";

export async function fetchStops() {
    const { data, error } = await supabase
        .from('stops')
        .select('*')
        .order('name');
    if (error) throw error;
    return data || [];
}

export function normalizeStopName(name) {
    return String(name || "")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
}

function toNumber(value) {
    return Number.parseFloat(value);
}

function buildBounds(value, tolerance = 0.0001) {
    const numericValue = toNumber(value);
    return {
        min: numericValue - tolerance,
        max: numericValue + tolerance
    };
}

export function isSamePoint(lat1, lng1, lat2, lng2, tolerance = 0.0001) {
    return (
        Math.abs(toNumber(lat1) - toNumber(lat2)) <= tolerance &&
        Math.abs(toNumber(lng1) - toNumber(lng2)) <= tolerance
    );
}

export async function findDuplicateStop({ name, lat, lng }) {
    const normalizedName = normalizeStopName(name);
    const latBounds = buildBounds(lat);
    const lngBounds = buildBounds(lng);

    // La consulta se acota por coordenadas cercanas para evitar traer toda la tabla
    const { data, error } = await supabase
        .from('stops')
        .select('id, name, lat, lng, address, status')
        .gte('lat', latBounds.min)
        .lte('lat', latBounds.max)
        .gte('lng', lngBounds.min)
        .lte('lng', lngBounds.max);

    if (error) throw error;

    const nearbyStops = data || [];
    const sameCoordinates = nearbyStops.find((stop) =>
        isSamePoint(stop.lat, stop.lng, lat, lng)
    );

    if (sameCoordinates) {
        return {
            stop: sameCoordinates,
            reason: 'same_coordinates'
        };
    }

    // Si no hubo coincidencia por coordenadas, revisamos nombre exacto normalizado
    const { data: sameNameData, error: sameNameError } = await supabase
        .from('stops')
        .select('id, name, lat, lng, address, status')
        .ilike('name', normalizedName);

    if (sameNameError) throw sameNameError;

    const sameName = (sameNameData || []).find((stop) =>
        normalizeStopName(stop.name) === normalizedName
    );

    if (sameName) {
        return {
            stop: sameName,
            reason: 'same_name'
        };
    }

    return null;
}

export async function createStop({ name, lat, lng, address, status = 'ACTIVE' }) {
    const duplicate = await findDuplicateStop({ name, lat, lng });
    if (duplicate) {
        const reason = duplicate.reason === 'same_coordinates'
            ? 'Ya existe un paradero registrado en esa ubicación.'
            : 'Ya existe un paradero con ese nombre.';
        throw new Error(reason);
    }

    const { error } = await supabase.from('stops').insert([{ 
        id: crypto.randomUUID(),
        name: String(name || "").trim(),
        lat: toNumber(lat),
        lng: toNumber(lng),
        address: address ? String(address).trim() : null,
        status
    }]);
    if (error) throw error;
}

export async function deleteStop(id) {
    const { error } = await supabase.from('stops').delete().eq('id', id);
    if (error) throw error;
}
