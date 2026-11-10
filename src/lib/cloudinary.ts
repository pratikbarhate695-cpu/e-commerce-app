import "server-only";
import { createHash } from "crypto";

type UploadResult = {
  secureUrl: string;
  publicId: string;
};

function sign(params: Record<string, string | number>, apiSecret: string) {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(toSign + apiSecret).digest("hex");
}

/**
 * Uploads a single image File (from a multipart form / server action
 * FormData) to Cloudinary using a signed request. Never exposes the API
 * secret to the client — the signature is computed here, server-side.
 */
export async function uploadImage(file: File, folder: string): Promise<UploadResult> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary environment variables are not configured.");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = { timestamp, folder };
  const signature = sign(paramsToSign, apiSecret);

  const body = new FormData();
  body.set("file", file);
  body.set("api_key", apiKey);
  body.set("timestamp", String(timestamp));
  body.set("folder", folder);
  body.set("signature", signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudinary upload failed: ${text}`);
  }

  const data = await res.json();
  return { secureUrl: data.secure_url, publicId: data.public_id };
}

export function uploadProductImage(file: File): Promise<UploadResult> {
  return uploadImage(file, "products");
}

export function uploadReviewImage(file: File): Promise<UploadResult> {
  return uploadImage(file, "reviews");
}

export function uploadBannerImage(file: Blob): Promise<UploadResult> {
  return uploadImage(file as File, "banners");
}

/**
 * Deletes one image from Cloudinary (signed request, server-side only).
 * "not found" counts as success: the goal is that the file is gone.
 */
export async function deleteImage(publicId: string): Promise<void> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary environment variables are not configured.");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const body = new FormData();
  body.set("public_id", publicId);
  body.set("api_key", apiKey);
  body.set("timestamp", String(timestamp));
  body.set("signature", sign({ public_id: publicId, timestamp }, apiSecret));

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
    method: "POST",
    body,
  });
  if (!res.ok) throw new Error(`Cloudinary delete failed (${res.status}).`);
  const data = (await res.json()) as { result?: string };
  if (data.result !== "ok" && data.result !== "not found") {
    throw new Error(`Cloudinary delete failed (${data.result ?? "unknown"}).`);
  }
}
