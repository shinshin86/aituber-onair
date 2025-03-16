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
  });
});
