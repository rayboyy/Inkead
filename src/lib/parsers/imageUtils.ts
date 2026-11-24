/**
 * Fast, memory-safe thumbnail generator using native browser createImageBitmap
 * Resizes large book covers to lightweight 360px JPEG thumbnails (~35KB)
 * to prevent multi-megabyte base64 strings from lagging React state and IndexedDB.
 */
export async function createThumbnailDataUrl(
  blob: Blob,
  maxDimension = 360,
  quality = 0.84
): Promise<string> {
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return '';
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    return canvas.toDataURL('image/jpeg', quality);
  } catch (err) {
    console.warn('Thumbnail generation failed, falling back:', err);
    return '';
  }
}
