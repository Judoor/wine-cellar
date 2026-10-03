/** Browser only: rotates then crops an image, and downscales the result for upload. */
export type PixelArea = { x: number; y: number; width: number; height: number };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Bounding box of a w×h rectangle rotated by `deg`. */
function rotatedSize(w: number, h: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return {
    width: Math.abs(Math.cos(rad) * w) + Math.abs(Math.sin(rad) * h),
    height: Math.abs(Math.sin(rad) * w) + Math.abs(Math.cos(rad) * h),
  };
}

/**
 * `area` is expressed in the rotated image's pixel space (as returned by react-easy-crop's
 * `croppedAreaPixels`).
 */
export async function cropImage(src: string, area: PixelArea, rotation: number, maxSide = 1600): Promise<Blob> {
  const img = await loadImage(src);
  const box = rotatedSize(img.naturalWidth, img.naturalHeight, rotation);

  // 1. Draw the whole image rotated around its center.
  const rotated = document.createElement("canvas");
  rotated.width = Math.round(box.width);
  rotated.height = Math.round(box.height);
  const rctx = rotated.getContext("2d")!;
  rctx.translate(rotated.width / 2, rotated.height / 2);
  rctx.rotate((rotation * Math.PI) / 180);
  rctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

  // 2. Copy the crop area, scaled down so the longest side is at most `maxSide`.
  const scale = Math.min(1, maxSide / Math.max(area.width, area.height));
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(area.width * scale));
  out.height = Math.max(1, Math.round(area.height * scale));
  const octx = out.getContext("2d")!;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(rotated, area.x, area.y, area.width, area.height, 0, 0, out.width, out.height);

  return new Promise((resolve, reject) =>
    out.toBlob((b) => (b ? resolve(b) : reject(new Error("crop failed"))), "image/jpeg", 0.85),
  );
}
