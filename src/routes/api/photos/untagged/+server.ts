// src/routes/api/photos/untagged/+server.ts
import { json, type RequestHandler } from '@sveltejs/kit';
import { initDrive } from '$lib/server/drive';
import { GOOGLE_FOLDER_ID } from '$env/static/private';

export const GET: RequestHandler = async () => {
  const drive = initDrive();
  const listRes: any = await drive.files.list({
    q: `'${GOOGLE_FOLDER_ID}' in parents`,
    fields: 'files(id,name,createdTime,imageMediaMetadata)',
    pageSize: 100
  });

  const untagged = listRes.data.files.filter((f: any) => !f.imageMediaMetadata?.location);

  return json(
    untagged.map((f: any) => ({
      id: f.id,
      name: f.name,
      takenAt: f.imageMediaMetadata?.time || f.createdTime,
      url: `/api/photos/image/${f.id}` // 👈 you already have an endpoint for image streaming
    }))
  );
};
