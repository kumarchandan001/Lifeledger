import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { StorageService } from './storage.service';
import { UploadUrlResponse } from '@lifeledger/shared';

@Injectable()
export class CloudinaryStorageService extends StorageService implements OnModuleInit {
  private readonly logger = new Logger(CloudinaryStorageService.name);

  constructor(private readonly configService: ConfigService) {
    super();
  }

  onModuleInit() {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.warn(
        'Cloudinary environment variables are missing. Direct uploads will fail until set.',
      );
      return;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    this.logger.log('✅ Cloudinary Storage Service initialized');
  }

  async generateUploadUrl(
    userId: string,
    documentId: string,
    mimeType: string,
  ): Promise<UploadUrlResponse> {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const publicId = documentId;
    const folder = `lifeledger/documents/${userId}`;
    const key = `${folder}/${publicId}`;

    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');

    if (!apiSecret || !apiKey || !cloudName) {
      throw new Error('Cloudinary configuration is incomplete');
    }

    const paramsToSign = {
      timestamp,
      public_id: publicId,
      folder,
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    const resourceType = mimeType.startsWith('image/') ? 'image' : 'raw';
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

    return {
      uploadUrl,
      documentId,
      key,
      fields: {
        signature,
        api_key: apiKey,
        timestamp: timestamp.toString(),
        public_id: publicId,
        folder,
      },
    };
  }

  async generateDownloadUrl(key: string): Promise<string> {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    if (!cloudName) {
      throw new Error('Cloudinary configuration is incomplete');
    }

    const lowerKey = key.toLowerCase();
    const isImage =
      lowerKey.endsWith('.jpg') ||
      lowerKey.endsWith('.jpeg') ||
      lowerKey.endsWith('.png') ||
      lowerKey.endsWith('.webp') ||
      lowerKey.endsWith('.heic');

    const resourceType = isImage ? 'image' : 'raw';

    return cloudinary.url(key, {
      secure: true,
      sign_url: true,
      resource_type: resourceType,
    });
  }

  async deleteObject(key: string): Promise<void> {
    const lowerKey = key.toLowerCase();
    const isImage =
      lowerKey.endsWith('.jpg') ||
      lowerKey.endsWith('.jpeg') ||
      lowerKey.endsWith('.png') ||
      lowerKey.endsWith('.webp') ||
      lowerKey.endsWith('.heic');

    const resourceType = isImage ? 'image' : 'raw';

    try {
      const result = await cloudinary.uploader.destroy(key, {
        resource_type: resourceType,
        invalidate: true,
      });
      this.logger.log(`Deleted resource ${key}: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error(`Failed to delete resource ${key} from Cloudinary`, error);
      throw error;
    }
  }
}
