// canvasUtils.ts
type PixelCrop = { x: number; y: number; width: number; height: number };
type Flip = { horizontal: boolean; vertical: boolean };

export const getCroppedImg = (
  imageSrc: string,
  pixelCrop: PixelCrop,
  rotation = 0,
  flip: Flip = { horizontal: false, vertical: false },
): Promise<string> => {
  const image = new Image();

  return new Promise((resolve, reject) => {
    image.onload = () => {
      const radians = (rotation * Math.PI) / 180;
      const sin = Math.abs(Math.sin(radians));
      const cos = Math.abs(Math.cos(radians));
      const width = image.width;
      const height = image.height;

      // Full bounding box after rotation.
      const boxWidth = Math.ceil(width * cos + height * sin);
      const boxHeight = Math.ceil(width * sin + height * cos);

      // Draw rotated image to a temp canvas (full bounds).
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = boxWidth;
      tempCanvas.height = boxHeight;
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) {
        return reject(new Error("No 2d context"));
      }

      tempCtx.translate(boxWidth / 2, boxHeight / 2);
      tempCtx.rotate(radians);
      tempCtx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
      tempCtx.translate(-width / 2, -height / 2);
      tempCtx.drawImage(image, 0, 0);

      // Now crop the rotated image using pixelCrop coordinates.
      const outputCanvas = document.createElement("canvas");
      outputCanvas.width = Math.max(1, Math.floor(pixelCrop.width));
      outputCanvas.height = Math.max(1, Math.floor(pixelCrop.height));
      const outputCtx = outputCanvas.getContext("2d");
      if (!outputCtx) {
        return reject(new Error("No 2d context"));
      }

      outputCtx.drawImage(
        tempCanvas,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height,
      );

      resolve(outputCanvas.toDataURL("image/jpeg"));
    };

    image.onerror = reject;
    image.src = imageSrc;
  });
};
