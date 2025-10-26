import { initDrive } from "$lib/server/drive";
import type { RequestHandler } from "@sveltejs/kit";
import { Readable } from "node:stream";
import piexif from "piexifjs";
import { destroySession } from "$lib/server/session";

export const POST: RequestHandler = async ({ request }) => {
  const sessionId = cookies.get("session");
  if (sessionId) destroySession(sessionId);

  const { fileId, lat, lon } = await request.json();

  if (!fileId || lat == null || lon == null) {
    return new Response("Missing parameters", { status: 400 });
  }

  const drive = initDrive();

  try {
    // --- 1. Download the image ---
    const res = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" },
    );
    const buffer = Buffer.from(res.data);
    const base64 = buffer.toString("binary");

    // --- 2. Add EXIF metadata ---
    const exifObj = piexif.load(base64);
    exifObj["GPS"][piexif.GPSIFD.GPSLatitudeRef] = lat >= 0 ? "N" : "S";
    exifObj["GPS"][piexif.GPSIFD.GPSLatitude] =
      piexif.GPSHelper.degToDmsRational(Math.abs(lat));
    exifObj["GPS"][piexif.GPSIFD.GPSLongitudeRef] = lon >= 0 ? "E" : "W";
    exifObj["GPS"][piexif.GPSIFD.GPSLongitude] =
      piexif.GPSHelper.degToDmsRational(Math.abs(lon));

    const exifBytes = piexif.dump(exifObj);
    const newBase64 = piexif.insert(exifBytes, base64);
    const newBuffer = Buffer.from(newBase64, "binary");

    // --- 3. Convert Buffer → Readable stream ---
    const stream = Readable.from(newBuffer);

    // --- 4. Update file in place (keeps same fileId) ---
    const updated = await drive.files.update({
      fileId,
      media: {
        mimeType: "image/jpeg",
        body: stream, // ✅ must be a readable stream
      },
      fields: "id, name, mimeType, webViewLink, modifiedTime",
    });

    // --- 5. Return response ---
    return new Response(JSON.stringify(updated.data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to update photo metadata:", err);
    return new Response("Error updating photo", { status: 500 });
  }
};
