export interface SunPosition {
  sunRotation: number;
  lightRotation: number;
}

/**
 * Calculates the sun's position based on current UTC time and day of year.
 *
 * Calculates solar declination (Earth's tilt relative to the sun) and hour angle
 * (sun's position based on time of day) to create realistic lighting on the 3D globe.
 *
 * @returns Sun rotation and light rotation values for map lighting
 */
export function calculateSunPosition(): SunPosition {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 0));
  const dayOfYear = Math.floor(
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Solar declination: Earth's axial tilt (23.44°) varies sinusoidally throughout the year
  const declination =
    23.44 * Math.sin(((2 * Math.PI) / 365) * (dayOfYear - 80));

  // Hour angle: converts UTC time to degrees (360° = 24 hours)
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const hourAngle = (utcHours / 24) * 360;

  return {
    sunRotation: 90 - declination,
    lightRotation: hourAngle,
  };
}
