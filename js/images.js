// Handyfotos sind 3-5 MB. Ungefiltert gespeichert wäre der Schrank nach
// wenigen Teilen unbrauchbar langsam, also runterskalieren statt Original.
const Images = (function () {
  const MAX_DIMENSION = 900;
  const JPEG_QUALITY = 0.82;

  async function loadSource(file) {
    if (typeof createImageBitmap === 'function') {
      try {
        // Ohne from-image landen iPhone-Hochformatfotos gedreht im Schrank.
        return await createImageBitmap(file, { imageOrientation: 'from-image' });
      } catch (e) {
        // ältere Safari-Versionen kennen die Option nicht
      }
    }
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Bild konnte nicht gelesen werden'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'));
      reader.readAsDataURL(file);
    });
  }

  async function compress(file) {
    const source = await loadSource(file);
    const width = source.width;
    const height = source.height;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    if (source.close) source.close();
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  }

  return { compress };
})();
