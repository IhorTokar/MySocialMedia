// my-app/src/components/Modals/AvatarCropModal/cropImage.js
/**
 * Створює зображення з кадруванням.
 * @param {string} imageSrc - URL або Data URL оригінального зображення.
 * @param {object} pixelCrop - Об'єкт з x, y, width, height в пікселях.
 * @returns {Promise<Blob>} - Проміс, що повертає Blob кадрованого зображення.
 */
export default async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  // Встановлюємо розмір канвасу відповідно до розміру кадрування
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Малюємо кадровану частину зображення на канвас
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // Повертаємо як Blob (можна вказати тип, наприклад, 'image/jpeg' або 'image/png')
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        console.error('Canvas is empty');
        reject(new Error('Canvas is empty'));
        return;
      }
      // blob.name = 'cropped_image.png'; // Можна спробувати додати ім'я, але це не стандартно
      resolve(blob);
    }, 'image/png', 0.9); // Якість 0.9 для PNG
  });
}

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // потрібно для кадрування зображень з інших доменів (якщо актуально)
    image.src = url;
  });