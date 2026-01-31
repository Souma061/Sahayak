// canvasUtils.ts
export const getCroppedImg = (
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0,
  flip = { horizontal: false, vertical: false }
): Promise<string> => {
  const image = new Image();
  image.src = imageSrc;

  return new Promise((resolve, reject) => {
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('No 2d context'));
      }

      // Calculate safe area for rotated image
      const radians = (rotation * Math.PI) / 180;
      const sin = Math.abs(Math.sin(radians));
      const cos = Math.abs(Math.cos(radians));
      const width = image.width;
      const height = image.height;
      const boxWidth = width * cos + height * sin;
      const boxHeight = width * sin + height * cos;

      canvas.width = boxWidth;
      canvas.height = boxHeight;

      // Rotate image
      ctx.translate(boxWidth / 2, boxHeight / 2);
      ctx.rotate(radians);
      ctx.translate(-width / 2, -height / 2);

      ctx.drawImage(image, 0, 0);

      // Extract the cropped area
      const data = ctx.getImageData(
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height
      );

      // Set canvas to the final crop size
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      // Paste the cropped data into the clean canvas
      ctx.putImageData(data, 0, 0);

      resolve(canvas.toDataURL('image/jpeg'));
    };
    image.onerror = reject;
  });
};
