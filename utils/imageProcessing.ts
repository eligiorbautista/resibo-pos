/**
 * Image processing utilities for thermal printer
 * Converts images to 1-bit monochrome bitmaps for ESC/POS printing
 */

/**
 * Load an image from a URL
 */
export async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // Handle CORS if needed
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Convert image to monochrome (1-bit) bitmap
 * @param img Source image
 * @param maxWidth Maximum width in pixels (will scale down if needed)
 * @param threshold Brightness threshold (0-255) for black/white conversion
 * @returns ImageData with monochrome bitmap
 */
export function imageToMonochrome(
  img: HTMLImageElement,
  maxWidth: number = 200,
  threshold: number = 128,
): ImageData {
  // Create canvas
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  // Calculate dimensions maintaining aspect ratio
  let width = img.width;
  let height = img.height;

  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }

  canvas.width = width;
  canvas.height = height;

  // Draw image
  ctx.drawImage(img, 0, 0, width, height);

  // Get image data
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Convert to monochrome (1-bit)
  for (let i = 0; i < data.length; i += 4) {
    // Calculate grayscale (luminance formula)
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

    // Apply threshold
    const mono = gray < threshold ? 0 : 255;

    // Set RGB to monochrome value
    data[i] = mono; // R
    data[i + 1] = mono; // G
    data[i + 2] = mono; // B
    // Alpha stays the same
  }

  return imageData;
}

/**
 * Generate ESC/POS raster bitmap commands from monochrome ImageData
 * @param imageData Monochrome image data (must be 1-bit black/white)
 * @returns Uint8Array containing ESC/POS raster bitmap commands
 */
export function generateRasterBitmap(imageData: ImageData): Uint8Array {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  // Calculate width in bytes (each byte holds 8 pixels)
  const widthBytes = Math.ceil(width / 8);

  // Create bitmap array
  const bitmap: number[] = [];

  for (let y = 0; y < height; y++) {
    for (let xByte = 0; xByte < widthBytes; xByte++) {
      let byte = 0;

      // Pack 8 pixels into one byte
      for (let bit = 0; bit < 8; bit++) {
        const x = xByte * 8 + bit;

        if (x < width) {
          const pixelIndex = (y * width + x) * 4;
          const isBlack = data[pixelIndex] < 128; // Black pixel

          if (isBlack) {
            byte |= 1 << (7 - bit); // Set bit (MSB first)
          }
        }
      }

      bitmap.push(byte);
    }
  }

  // Generate ESC/POS commands: GS v 0 m xL xH yL yH [data]
  const commands: number[] = [];

  // GS v 0 (raster bitmap command)
  commands.push(0x1d, 0x76, 0x30);

  // Mode: 0 = normal, 1 = double width, 2 = double height, 3 = quadruple
  commands.push(0x00); // Normal mode

  // Width in bytes (little-endian)
  commands.push(widthBytes & 0xff); // xL
  commands.push((widthBytes >> 8) & 0xff); // xH

  // Height in dots (little-endian)
  commands.push(height & 0xff); // yL
  commands.push((height >> 8) & 0xff); // yH

  // Bitmap data
  commands.push(...bitmap);

  return new Uint8Array(commands);
}

/**
 * Load logo and convert to ESC/POS bitmap commands
 * @param logoPath Path to logo image
 * @param maxWidth Maximum width in pixels
 * @returns ESC/POS bitmap commands
 */
export async function loadLogoCommands(
  logoPath: string,
  maxWidth: number = 200,
): Promise<Uint8Array> {
  try {
    const img = await loadImage(logoPath);
    const monoImage = imageToMonochrome(img, maxWidth);
    return generateRasterBitmap(monoImage);
  } catch (error) {
    console.error("Failed to load logo:", error);
    throw error;
  }
}
