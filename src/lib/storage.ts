import { supabase } from "@/integrations/supabase/client";

// Resize an image File via canvas. Returns a Blob (jpeg/webp) under maxWidth.
export async function resizeImage(file: File, maxWidth = 1280, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed to encode image"))), "image/jpeg", quality),
  );
}

export async function uploadImage(opts: {
  bucket: "product-images" | "blog-images" | "category-images";
  file: File;
  maxWidth?: number;
}): Promise<string> {
  const blob = await resizeImage(opts.file, opts.maxWidth ?? 1280);
  const ext = "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(opts.bucket).upload(path, blob, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(opts.bucket).getPublicUrl(path);
  return data.publicUrl;
}