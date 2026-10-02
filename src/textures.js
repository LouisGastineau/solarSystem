import { CanvasTexture, SRGBColorSpace } from 'three';

// Décodage local uniquement : le fichier n'est jamais envoyé à un serveur.
export async function loadPlanetTexture(file, color) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    throw new Error('Choisissez une image PNG, JPEG ou WebP.');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('L’image doit peser au maximum 10 Mo.');
  }
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Impossible de lire cette image. Essayez un autre fichier.');
  }
  try {
    const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Le navigateur ne peut pas préparer cette image.');
    // Les pixels transparents laissent apparaître la couleur de la planète.
    context.fillStyle = color;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  } finally {
    bitmap.close();
  }
}
