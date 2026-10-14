// Jyothy Institute of Technology (JIT) Campus Coordinates
// 12°50'32.4"N 77°30'45.0"E
export const CAMPUS_LOCATION = {
  latitude: 12.842333,
  longitude: 77.5125,
  name: 'Jyothy Institute of Technology (JIT)',
  address: 'Kanakapura Main Road, Tataguni, Bengaluru, Karnataka 560082',
  normalRadiusMeters: 500, // 500 meters for Day In & Day Out
  lunchRadiusMeters: 2000, // 2 km for lunch break
};

/**
 * Calculates distance in meters between two lat/long points using Haversine formula.
 */
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export interface GeofenceCheckResult {
  inRange: boolean;
  distanceMeters?: number;
  allowedRadiusMeters: number;
  message: string;
}

/**
 * Checks if coordinates are within the campus boundary.
 */
export function verifyGeofence(
  lat: number,
  lon: number,
  isLunchBreak: boolean = false
): GeofenceCheckResult {
  const allowedRadius = isLunchBreak ? CAMPUS_LOCATION.lunchRadiusMeters : CAMPUS_LOCATION.normalRadiusMeters;
  const distance = calculateDistanceMeters(lat, lon, CAMPUS_LOCATION.latitude, CAMPUS_LOCATION.longitude);

  return {
    inRange: distance <= allowedRadius,
    distanceMeters: distance,
    allowedRadiusMeters: allowedRadius,
    message:
      distance <= allowedRadius
        ? `Within valid boundary (${distance}m from campus center)`
        : `Outside allowed boundary (${distance}m away; maximum is ${allowedRadius}m)`,
  };
}
