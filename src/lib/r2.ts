import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

const s3 = new S3Client({
  region:   "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

// ─── OPTIMIZAR IMAGEN ────────────────────────────────────
// Convierte cualquier formato a WebP, redimensiona y comprime
// Resultado: ~30-80KB

export async function optimizarImagen(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(800, 800, {
      fit:        "inside",      // mantiene proporción, no recorta
      withoutEnlargement: true,  // no agranda imágenes pequeñas
    })
    .webp({ quality: 75 })
    .toBuffer();
}

// ─── SUBIR IMAGEN DE MENÚ ────────────────────────────────
// Ruta: establecimientos/[restaurantId]/menu/[itemId].webp

export async function subirImagenMenu(
  restaurantId: string,
  itemId:       string,
  buffer:       Buffer
): Promise<string> {
  const optimizada = await optimizarImagen(buffer);
  const key        = `establecimientos/${restaurantId}/menu/${itemId}.webp`;

  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        optimizada,
    ContentType: "image/webp",
    CacheControl: "public, max-age=31536000", // 1 año — WebP no cambia, se reemplaza con nuevo key
  }));

  return `${PUBLIC_URL}/${key}`;
}

// ─── SUBIR LOGO DEL RESTAURANTE ──────────────────────────
// Ruta: establecimientos/[restaurantId]/logo.webp

export async function subirLogo(
  restaurantId: string,
  buffer:       Buffer
): Promise<string> {
  const optimizada = await optimizarImagen(buffer);
  const key        = `establecimientos/${restaurantId}/logo.webp`;

  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        optimizada,
    ContentType: "image/webp",
    CacheControl: "public, max-age=31536000",
  }));

  return `${PUBLIC_URL}/${key}`;
}

// ─── ELIMINAR IMAGEN ─────────────────────────────────────

export async function eliminarImagen(url: string): Promise<void> {
  // Extraer el key de la URL pública
  const key = url.replace(`${PUBLIC_URL}/`, "");
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch {
    // Si no existe, ignorar
  }
}

// ─── VALIDAR ARCHIVO ─────────────────────────────────────

export function validarImagen(file: File): { ok: boolean; error?: string } {
  const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/avif"];
  const MAX_SIZE_MB      = 10; // antes de optimizar — sharp puede manejar hasta 10MB

  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    return { ok: false, error: "Formato no soportado. Usa JPG, PNG o WebP." };
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return { ok: false, error: `La imagen no puede superar ${MAX_SIZE_MB}MB.` };
  }
  return { ok: true };
}