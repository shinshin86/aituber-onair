/**
 * Gemini-2.5-Flash-Image utility functions
 * Uses the Gemini Image Generation API to create avatar images based on assistant responses
 */

const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image-preview';
const GEMINI_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`;

export interface GeminiImageGenerationOptions {
  apiKey: string;
  prompt: string;
  baseImageUrl?: string;
}

export interface GeminiImageResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
    };
  }>;
}

/**
 * Convert Base64 string to Blob URL for display
 */
export function base64ToObjectUrl(
  base64: string,
  mimeType: string = 'image/png',
): string {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

/**
 * Convert image URL to base64
 */
async function imageUrlToBase64(
  url: string,
): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(url);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve({ data: base64, mimeType: blob.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Generate an avatar image using Gemini-2.5-Flash-Image API
 */
export async function generateAvatarImage(
  options: GeminiImageGenerationOptions,
): Promise<string> {
  const { apiKey, prompt, baseImageUrl } = options;

  if (!apiKey.trim()) {
    throw new Error('Gemini API Key is required for image generation');
  }

  // Create request parts array
  const requestParts: any[] = [];

  // Add base image if provided
  if (baseImageUrl && !baseImageUrl.includes('default-avatar.svg')) {
    try {
      const baseImageData = await imageUrlToBase64(baseImageUrl);
      requestParts.push({
        inlineData: {
          mimeType: baseImageData.mimeType,
          data: baseImageData.data,
        },
      });
    } catch (error) {
      console.warn(
        'Failed to convert base image, generating new avatar:',
        error,
      );
    }
  }

  // Create a descriptive prompt for avatar modification or generation
  const imagePrompt =
    baseImageUrl && !baseImageUrl.includes('default-avatar.svg')
      ? `Please modify the provided avatar image based on this conversation context: "${prompt}". Keep the overall character design but adjust:
- Facial expression to match the mood/emotion of the conversation
- Small visual elements that reflect the conversation theme
- Maintain the anime/manga art style
- Keep it suitable as a profile picture
- Preserve the character's main features and identity
Style: Keep the existing art style but enhance emotional expression based on context`
      : `Create a beautiful anime-style avatar image based on this conversation context: "${prompt}". The avatar should be:
- High quality, professional anime/manga art style
- Suitable as a profile picture or avatar
- Clean, expressive, and engaging
- Square format (1:1 aspect ratio)
- Colorful and visually appealing
- No text or watermarks
Style: modern anime illustration, detailed character art, vibrant colors, professional digital art`;

  // Add text prompt
  requestParts.push({
    text: imagePrompt,
  });

  try {
    const response = await fetch(GEMINI_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey.trim(),
      },
      body: JSON.stringify({
        contents: [
          {
            parts: requestParts,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
    }

    const data: GeminiImageResponse = await response.json();

    // Extract the generated image
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const imageData = parts.find((part) => part.inlineData)?.inlineData;

    if (!imageData) {
      throw new Error('No image was returned from Gemini API');
    }

    const mimeType = imageData.mimeType || 'image/png';
    const base64Data = imageData.data;

    // Convert Base64 to Object URL
    const objectUrl = base64ToObjectUrl(base64Data, mimeType);

    return objectUrl;
  } catch (error) {
    console.error('Error generating avatar image:', error);
    throw error;
  }
}

/**
 * Create a context-aware prompt for avatar generation
 */
export function createAvatarPrompt(assistantResponse: string): string {
  // Extract key themes and emotions from the assistant's response
  const response = assistantResponse.toLowerCase();

  let styleHints = '';

  // Add style hints based on response content
  if (
    response.includes('happy') ||
    response.includes('joy') ||
    response.includes('excited')
  ) {
    styleHints += 'cheerful, bright expression, ';
  }
  if (
    response.includes('calm') ||
    response.includes('peaceful') ||
    response.includes('relax')
  ) {
    styleHints += 'serene, gentle expression, ';
  }
  if (
    response.includes('smart') ||
    response.includes('clever') ||
    response.includes('think')
  ) {
    styleHints += 'intelligent, thoughtful expression, ';
  }
  if (
    response.includes('cute') ||
    response.includes('kawaii') ||
    response.includes('adorable')
  ) {
    styleHints += 'cute, charming features, ';
  }

  // Limit the response length for the prompt to avoid token limits
  const shortResponse =
    assistantResponse.length > 200
      ? assistantResponse.substring(0, 200) + '...'
      : assistantResponse;

  return `${styleHints}inspired by: "${shortResponse}"`;
}

/**
 * Clean up object URLs to prevent memory leaks
 */
export function revokeObjectUrl(url: string): void {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}
