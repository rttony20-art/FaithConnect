// Phone photos are often 4-12 MB, which is slow and unreliable to upload on mobile data.
// This shrinks a picture to at most `maxSide` pixels on its longest edge and re-saves it
// as a JPEG (usually 100-400 KB). If anything goes wrong it returns the original file.

export async function shrinkImage(file, maxSide = 1280, quality = 0.82) {
  try {
    if (!file || !/^image\//.test(file.type) || /svg|gif/.test(file.type)) return file;
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; // transparent PNGs become white instead of black
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise(res => canvas.toBlob(res, "image/jpeg", quality));
    // keep the original if shrinking somehow made it bigger
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

// Reads a just-picked photo into memory right away (shrunk, as a plain in-memory Blob).
// Phones can take back access to a picked file after a while, so the app must not keep
// the original file handle until "Save". Throws if the photo cannot be read.
export async function snapshotImage(file) {
  const small = await shrinkImage(file);
  const bytes = await small.arrayBuffer();
  if (!bytes.byteLength) throw new Error("empty photo");
  return new Blob([bytes], { type: small.type || "image/jpeg" });
}
