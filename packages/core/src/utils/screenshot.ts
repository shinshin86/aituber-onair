/**
 * Screenshot related utilities
 */

/**
 * Capture screenshot from video element
 * @param videoElement Video element to capture
 * @param options Capture options
 * @returns DataURL of image (JPEG), null if failed
 */
export function captureScreenshot(
  videoElement: HTMLVideoElement,
  options: { format?: 'image/jpeg' | 'image/png'; quality?: number } = {},
): string | null {
  try {
    if (!videoElement) {
      console.warn('Video element not provided');
      return null;
    }

    const format = options.format || 'image/jpeg';
    const quality = options.quality || 0.9;

    // Create <canvas> and draw <video>
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('Failed to get canvas context');
      return null;
    }

    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL(format, quality);
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    return null;
  }
}

/**
 * Convert DataURL to Blob
 * @param dataUrl DataURL of image
 * @returns Blob object
 */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return await response.blob();
}
