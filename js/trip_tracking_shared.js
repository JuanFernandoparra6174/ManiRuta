export const GEOFENCE_RADIUS_METERS = 60;

export function haversineDistanceInMeters(lat1, lng1, lat2, lng2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

export function getNormalizedRouteStops(routeStops) {
  return (routeStops || []).filter((item) => item?.stop);
}

export function computeRemainingStops(currentStopOrder, targetStopOrder) {
  return Math.max((targetStopOrder || 0) - (currentStopOrder || 0), 0);
}

export function findNearestRouteStopToCoords(routeStops, coords) {
  const normalizedStops = getNormalizedRouteStops(routeStops);
  if (!coords || !normalizedStops.length) return null;

  let nearest = null;
  let shortestDistance = Number.POSITIVE_INFINITY;

  for (const item of normalizedStops) {
    const distanceMeters = haversineDistanceInMeters(
      Number(coords.latitude),
      Number(coords.longitude),
      Number(item.stop.lat),
      Number(item.stop.lng)
    );

    if (distanceMeters < shortestDistance) {
      shortestDistance = distanceMeters;
      nearest = {
        routeStop: item,
        stop: item.stop,
        distanceMeters
      };
    }
  }

  return nearest;
}

export function detectCurrentGeofenceStop(position, routeStops, radiusMeters = GEOFENCE_RADIUS_METERS) {
  const normalizedStops = getNormalizedRouteStops(routeStops);
  if (!position || !normalizedStops.length) return null;

  let nearestEvent = null;

  for (const item of normalizedStops) {
    const distanceMeters = haversineDistanceInMeters(
      Number(position.lat),
      Number(position.lng),
      Number(item.stop.lat),
      Number(item.stop.lng)
    );

    if (distanceMeters > radiusMeters) {
      continue;
    }

    const candidate = {
      routeStop: item,
      stop: item.stop,
      stopOrder: item.stop_order,
      distanceMeters
    };

    if (!nearestEvent || candidate.distanceMeters < nearestEvent.distanceMeters) {
      nearestEvent = candidate;
    }
  }

  return nearestEvent;
}
