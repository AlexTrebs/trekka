import type { RequestHandler } from '@sveltejs/kit';

const cache = new Map<string, { city: string | null; country: string | null }>();

export const GET: RequestHandler = async ({ url }) => {
  const lat = url.searchParams.get('lat');
  const lon = url.searchParams.get('lon');

  if (!lat || !lon) {
    return new Response(
      JSON.stringify({ error: 'Missing lat or lon' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Return from cache if we already fetched this location
  const key = `${Number(lat).toFixed(4)},${Number(lon).toFixed(4)}`;

  if (cache.has(key)) {
    return new Response(JSON.stringify(cache.get(key)), {
      headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
    });
  }

  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
    {
      headers: {
        'User-Agent': 'Trekka',
        'Accept-Language': 'en',
        'Referer': 'https://Trekka.co.uk'
      }
    }
  );


  if (!res.ok) {
    return new Response(
      JSON.stringify({ error: 'Unable to geocode' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const data = await res.json();

  const address = data.address ?? {};

  const result = {
    city: address.city || address.town || address.village || null,
    country: address.country || null
  };

  cache.set(key, result);

  return new Response(
    JSON.stringify(result),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
