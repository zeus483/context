const BUCKET = "progress-photos";

function getConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return null;
  }
  return { url, key };
}

export async function uploadPhoto(userId: string, fileName: string, buffer: Buffer, contentType: string): Promise<string> {
  const config = getConfig();
  if (!config) {
    throw new Error("Supabase Storage no configurado. Agrega SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.");
  }

  const path = `${userId}/${Date.now()}-${fileName}`;

  const res = await fetch(`${config.url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.key}`,
      "Content-Type": contentType,
      "x-upsert": "true"
    },
    body: new Uint8Array(buffer)
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Error al subir foto: ${body}`);
  }

  return `${config.url}/storage/v1/object/public/${BUCKET}/${path}`;
}

export async function deletePhoto(imageUrl: string): Promise<void> {
  const config = getConfig();
  if (!config) return;

  const prefix = `${config.url}/storage/v1/object/public/${BUCKET}/`;
  if (!imageUrl.startsWith(prefix)) return;

  const path = imageUrl.slice(prefix.length);

  await fetch(`${config.url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${config.key}`
    }
  });
}

export function isStorageConfigured(): boolean {
  return getConfig() !== null;
}
