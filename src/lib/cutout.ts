/**
 * Browser-only helpers: crop a garment out of a photo and erase its background,
 * producing a transparent PNG ready to store in the wardrobe.
 */

export type Box = { x: number; y: number; width: number; height: number };

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image"));
    img.src = src;
  });
}

/** Crops a normalized box (with a little padding) out of a data URL. */
export async function cropToDataUrl(dataUrl: string, box: Box, pad = 0.03): Promise<string> {
  const img = await loadImage(dataUrl);
  const x = Math.max(0, (box.x - pad) * img.naturalWidth);
  const y = Math.max(0, (box.y - pad) * img.naturalHeight);
  const w = Math.min(img.naturalWidth - x, (box.width + pad * 2) * img.naturalWidth);
  const h = Math.min(img.naturalHeight - y, (box.height + pad * 2) * img.naturalHeight);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

/** Trims fully transparent margins so the garment fills its thumbnail. */
async function trimTransparent(blob: Blob): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return blob;
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = 0;
    let maxY = 0;
    for (let py = 0; py < canvas.height; py++) {
      for (let px = 0; px < canvas.width; px++) {
        if (data[(py * canvas.width + px) * 4 + 3]! > 12) {
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        }
      }
    }
    if (maxX <= minX || maxY <= minY) return blob;
    const out = document.createElement("canvas");
    out.width = maxX - minX + 1;
    out.height = maxY - minY + 1;
    out.getContext("2d")?.drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
    return await new Promise<Blob>((resolve) =>
      out.toBlob((b) => resolve(b ?? blob), "image/png"),
    );
  } catch {
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Removes the background of a crop; falls back to the original crop on failure. */
export async function cutout(dataUrl: string): Promise<Blob> {
  const source = await fetch(dataUrl).then((r) => r.blob());
  try {
    const { removeBackground } = await import("@imgly/background-removal");
    const cut = await removeBackground(source, { output: { format: "image/png" } });
    return await trimTransparent(cut);
  } catch {
    return source;
  }
}
