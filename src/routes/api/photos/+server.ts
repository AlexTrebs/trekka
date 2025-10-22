import { json, type RequestHandler } from "@sveltejs/kit";
import type { FeatureCollection, Point } from "geojson";
import { drive } from "$lib/server/drive";
import { GOOGLE_FOLDER_ID } from "$env/static/private";

/**
 * Format a timestamp string into a human-readable "Weekday, D Month YYYY, HH:MM" representation.
 *
 * @param timestamp - Either an ISO 8601 UTC timestamp ending with `Z` (parsed as UTC) or a custom `"YYYY:MM:DD HH:MM:SS"` string (parsed in local time).
 * @returns The formatted date/time string, e.g. `Sunday, 5 October 2025, 14:07`.
 */
function formatTimestamp(timestamp: string): string {
  let date: Date;

  if (timestamp.includes("T") && timestamp.endsWith("Z")) {
    // ISO 8601 UTC
    date = new Date(timestamp);
  } else {
    // Custom format YYYY:MM:DD HH:MM:SS
    const [datePart, timePart] = timestamp.split(" ");
    const [year, month, day] = datePart.split(":").map(Number);
    const [hour, minute] = timePart.split(":").map(Number);
    date = new Date(year, month - 1, day, hour, minute);
  }

  // Weekday and month names
  const weekdays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const weekday = weekdays[date.getDay()];
  const monthName = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  const hour = date.getHours().toString().padStart(2, "0");
  const minute = date.getMinutes().toString().padStart(2, "0");

  return `${weekday}, ${day} ${monthName} ${year}, ${hour}:${minute}`;
}

export const GET: RequestHandler = async () => {
  const listRes: any = await drive.files.list({
    q: `'${GOOGLE_FOLDER_ID}' in parents`,
    fields: "files(id,name,createdTime,imageMediaMetadata)",
    pageSize: 100,
  });

  // Sort first by takenAt date (descending, newest first)
  const sortedFiles = listRes.data.files
    .filter((f: any) => f.imageMediaMetadata?.location)
    .sort((a: any, b: any) => {
      const aTime = a.imageMediaMetadata?.time ?? a.createdTime;
      const bTime = b.imageMediaMetadata?.time ?? b.createdTime;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

  const photos: FeatureCollection<Point, {}> = {
    type: "FeatureCollection",
    features: sortedFiles.map((f: any) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [
          f.imageMediaMetadata.location.longitude,
          f.imageMediaMetadata.location.latitude,
        ],
      },
      properties: {
        id: f.id,
        url: `/api/photos/image/${f.id}`,
        name: f.name,
        takenAt: formatTimestamp(f.imageMediaMetadata?.time || f.createdTime),
        location: [
          f.imageMediaMetadata.location.longitude,
          f.imageMediaMetadata.location.latitude,
        ],
      },
    })),
  };

  return json(photos);
};