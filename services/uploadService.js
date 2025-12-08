import { apiClient } from './api';
import * as FileSystem from 'expo-file-system/legacy';

export const uploadService = {
  uploadEventImage: async (imageUri, fileName = null) => {
    try {
      const base64Data = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64',
      });

      const extension = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const contentTypeMap = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
      };
      const contentType = contentTypeMap[extension] || 'image/jpeg';

      const finalFileName = fileName || `event_${Date.now()}.${extension}`;

      const response = await apiClient.post(
        '/upload/event-image',
        {
          image_base64: base64Data,
          content_type: contentType,
          file_name: finalFileName,
        },
        {
          timeout: 120000,
        }
      );

      return {
        success: true,
        data: {
          url: response.data.url,
        },
      };
    } catch (error) {
      if (error.response?.data?.error) {
        return {
          success: false,
          error: error.response.data.error,
        };
      }

      return {
        success: false,
        error: 'Failed to upload image. Please try again.',
      };
    }
  },

  validateImage: (imageAsset) => {
    const maxSize = 10 * 1024 * 1024;
    if (imageAsset.fileSize && imageAsset.fileSize > maxSize) {
      return {
        valid: false,
        error: 'Image is too large. Maximum size is 10MB.',
      };
    }

    const minSize = 1024;
    if (imageAsset.fileSize && imageAsset.fileSize < minSize) {
      return {
        valid: false,
        error: 'Image file is too small or corrupted.',
      };
    }

    const uri = imageAsset.uri || '';
    const extension = uri.split('.').pop()?.toLowerCase();
    const allowedTypes = ['jpg', 'jpeg', 'png', 'webp'];

    if (extension && !allowedTypes.includes(extension)) {
      return {
        valid: false,
        error: 'Invalid image type. Only JPEG, PNG, and WebP are allowed.',
      };
    }

    return { valid: true };
  },
};
