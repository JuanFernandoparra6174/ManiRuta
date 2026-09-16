export function isRouteLineString(activeGeometry) {
    const geometry = activeGeometry?.geometry || activeGeometry;
    return geometry?.type === "LineString" && Array.isArray(geometry.coordinates) && geometry.coordinates.length >= 2;
}

export function routeGeometryLatLngs(activeGeometry) {
    if (!isRouteLineString(activeGeometry)) return null;
    const geometry = activeGeometry.geometry || activeGeometry;
    const latLngs = geometry.coordinates
        .filter((coordinate) => Array.isArray(coordinate) && Number.isFinite(Number(coordinate[0])) && Number.isFinite(Number(coordinate[1])))
        .map(([lng, lat]) => [Number(lat), Number(lng)]);
    return latLngs.length >= 2 ? latLngs : null;
}

export function routeLatLngsWithFallback(activeGeometry, routeStops) {
    return routeGeometryLatLngs(activeGeometry)
        || (routeStops || []).filter((item) => item.stop).map((item) => [Number(item.stop.lat), Number(item.stop.lng)]);
}
