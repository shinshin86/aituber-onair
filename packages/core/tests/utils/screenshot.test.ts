/**
 * Tests for screenshot utility functions
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { captureScreenshot, dataUrlToBlob } from '../../src/utils/screenshot';

// Mock global document object
const mockDocument = {
  createElement: vi.fn(),
};
vi.stubGlobal('document', mockDocument);

describe('Screenshot utilities', () => {
  // Tests for captureScreenshot function
  describe('captureScreenshot', () => {
    // Mock setup
    let mockVideoElement: HTMLVideoElement;
    let mockCanvas: HTMLCanvasElement;
    let mockContext: CanvasRenderingContext2D;

    beforeEach(() => {
      // Mock HTMLVideoElement
      mockVideoElement = {
        videoWidth: 640,
        videoHeight: 480,
      } as HTMLVideoElement;

      // Mock Canvas element and context
      mockContext = {
        drawImage: vi.fn(),
      } as unknown as CanvasRenderingContext2D;

      mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue(mockContext),
        toDataURL: vi
          .fn()
          .mockReturnValue('data:image/jpeg;base64,mockedBase64Data'),
      } as unknown as HTMLCanvasElement;

      // Mock document.createElement
      mockDocument.createElement.mockImplementation((tagName: string) => {
        if (tagName === 'canvas') {
          return mockCanvas;
        }
        throw new Error(`Unexpected createElement call with: ${tagName}`);
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should capture screenshot successfully', () => {
      const result = captureScreenshot(mockVideoElement);

      // Verify canvas element is properly set up
      expect(mockCanvas.width).toBe(640);
      expect(mockCanvas.height).toBe(480);

      // Verify drawImage function is called
      expect(mockContext.drawImage).toHaveBeenCalledWith(
        mockVideoElement,
        0,
        0,
        640,
        480,
      );

      // Verify toDataURL is called with correct parameters
      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.9);

      // Verify the return value is as expected
      expect(result).toBe('data:image/jpeg;base64,mockedBase64Data');
    });

    it('should handle options parameters correctly', () => {
      captureScreenshot(mockVideoElement, {
        format: 'image/png',
        quality: 0.5,
      });

      // Verify toDataURL is called with correct parameters
      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png', 0.5);
    });

    it('should return null when videoElement is not provided', () => {
      const result = captureScreenshot(null as unknown as HTMLVideoElement);
      expect(result).toBeNull();
    });

    it('should return null when canvas context acquisition fails', () => {
      // Mock getContext to return null
      mockCanvas.getContext = vi.fn().mockReturnValue(null);

      const result = captureScreenshot(mockVideoElement);
      expect(result).toBeNull();
    });

    it('should handle video element with zero dimensions', () => {
      const zeroVideoElement = {
        videoWidth: 0,
        videoHeight: 0,
      } as HTMLVideoElement;

      const result = captureScreenshot(zeroVideoElement);

      expect(mockCanvas.width).toBe(0);
      expect(mockCanvas.height).toBe(0);
      expect(result).toBe('data:image/jpeg;base64,mockedBase64Data');
    });

    it('should handle video element with very large dimensions', () => {
      const largeVideoElement = {
        videoWidth: 4096,
        videoHeight: 2160,
      } as HTMLVideoElement;

      const result = captureScreenshot(largeVideoElement);

      expect(mockCanvas.width).toBe(4096);
      expect(mockCanvas.height).toBe(2160);
      expect(mockContext.drawImage).toHaveBeenCalledWith(
        largeVideoElement,
        0,
        0,
        4096,
        2160,
      );
      expect(result).toBe('data:image/jpeg;base64,mockedBase64Data');
    });

    it('should handle video element with undefined dimensions', () => {
      const undefinedVideoElement = {
        videoWidth: undefined,
        videoHeight: undefined,
      } as any;

      const result = captureScreenshot(undefinedVideoElement);

      expect(mockCanvas.width).toBeUndefined();
      expect(mockCanvas.height).toBeUndefined();
      expect(result).toBe('data:image/jpeg;base64,mockedBase64Data');
    });

    it('should handle drawImage throwing error', () => {
      mockContext.drawImage = vi.fn().mockImplementation(() => {
        throw new Error('Canvas drawing failed');
      });

      const result = captureScreenshot(mockVideoElement);
      expect(result).toBeNull();
    });

    it('should handle toDataURL throwing error', () => {
      mockCanvas.toDataURL = vi.fn().mockImplementation(() => {
        throw new Error('Canvas toDataURL failed');
      });

      const result = captureScreenshot(mockVideoElement);
      expect(result).toBeNull();
    });

    it('should handle document.createElement throwing error', () => {
      mockDocument.createElement.mockImplementation(() => {
        throw new Error('createElement failed');
      });

      const result = captureScreenshot(mockVideoElement);
      expect(result).toBeNull();
    });

    it('should handle options with quality 0 (falls back to default 0.9)', () => {
      // Note: quality: 0 is falsy, so it falls back to the default 0.9
      captureScreenshot(mockVideoElement, {
        format: 'image/jpeg',
        quality: 0,
      });

      // Due to the implementation using `options.quality || 0.9`,
      // quality: 0 falls back to 0.9
      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.9);
    });

    it('should handle options with quality 1', () => {
      captureScreenshot(mockVideoElement, {
        format: 'image/png',
        quality: 1,
      });

      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png', 1);
    });

    it('should handle options with invalid quality (should still work)', () => {
      captureScreenshot(mockVideoElement, {
        format: 'image/jpeg',
        quality: 2, // Invalid quality > 1
      });

      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 2);
    });

    it('should handle options with negative quality', () => {
      captureScreenshot(mockVideoElement, {
        format: 'image/jpeg',
        quality: -0.5,
      });

      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', -0.5);
    });

    it('should handle empty options object', () => {
      captureScreenshot(mockVideoElement, {});

      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.9);
    });

    it('should handle null options', () => {
      const result = captureScreenshot(mockVideoElement, null as any);
      expect(result).toBeNull();
    });

    it('should handle undefined video element', () => {
      const result = captureScreenshot(undefined as any);
      expect(result).toBeNull();
    });

    it('should handle video element that is not HTMLVideoElement', () => {
      const fakeElement = { videoWidth: 640, videoHeight: 480 } as any;

      const result = captureScreenshot(fakeElement);

      // Should still work as long as it has the required properties
      expect(result).toBe('data:image/jpeg;base64,mockedBase64Data');
    });
  });

  // Tests for dataUrlToBlob function
  describe('dataUrlToBlob', () => {
    // Mock fetch and response
    let mockResponse: { blob: ReturnType<typeof vi.fn> };
    let mockBlob: Blob;

    beforeEach(() => {
      // Create mock blob
      mockBlob = new Blob(['test'], { type: 'image/jpeg' });

      // Create mock response with blob method
      mockResponse = {
        blob: vi.fn().mockResolvedValue(mockBlob),
      };

      // Mock global fetch function
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should convert data URL to Blob successfully', async () => {
      const dataUrl = 'data:image/jpeg;base64,base64data';
      const result = await dataUrlToBlob(dataUrl);

      expect(fetch).toHaveBeenCalledWith(dataUrl);
      expect(mockResponse.blob).toHaveBeenCalled();
      expect(result).toBe(mockBlob);
    });

    it('should throw error when fetch fails', async () => {
      // Override global fetch mock for this test only
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('Fetch failed')),
      );

      const dataUrl = 'data:image/jpeg;base64,base64data';

      await expect(dataUrlToBlob(dataUrl)).rejects.toThrow('Fetch failed');
    });

    it('should handle empty data URL', async () => {
      const dataUrl = '';
      const result = await dataUrlToBlob(dataUrl);

      expect(fetch).toHaveBeenCalledWith('');
      expect(result).toBe(mockBlob);
    });

    it('should handle invalid data URL format', async () => {
      const dataUrl = 'not-a-data-url';
      const result = await dataUrlToBlob(dataUrl);

      expect(fetch).toHaveBeenCalledWith('not-a-data-url');
      expect(result).toBe(mockBlob);
    });

    it('should handle data URL with different MIME types', async () => {
      const dataUrl = 'data:image/png;base64,pngdata';
      const result = await dataUrlToBlob(dataUrl);

      expect(fetch).toHaveBeenCalledWith(dataUrl);
      expect(result).toBe(mockBlob);
    });

    it('should handle very long data URL', async () => {
      const longBase64 = 'a'.repeat(10000);
      const dataUrl = `data:image/jpeg;base64,${longBase64}`;
      const result = await dataUrlToBlob(dataUrl);

      expect(fetch).toHaveBeenCalledWith(dataUrl);
      expect(result).toBe(mockBlob);
    });

    it('should handle response.blob() throwing error', async () => {
      mockResponse.blob = vi
        .fn()
        .mockRejectedValue(new Error('Blob conversion failed'));

      const dataUrl = 'data:image/jpeg;base64,base64data';

      await expect(dataUrlToBlob(dataUrl)).rejects.toThrow(
        'Blob conversion failed',
      );
    });

    it('should handle fetch returning null response', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(null));

      const dataUrl = 'data:image/jpeg;base64,base64data';

      await expect(dataUrlToBlob(dataUrl)).rejects.toThrow();
    });

    it('should handle fetch returning response without blob method', async () => {
      const invalidResponse = {};
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(invalidResponse));

      const dataUrl = 'data:image/jpeg;base64,base64data';

      await expect(dataUrlToBlob(dataUrl)).rejects.toThrow();
    });
  });
});
