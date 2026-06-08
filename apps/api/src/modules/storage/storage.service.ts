import { Injectable } from '@nestjs/common';
import { UploadUrlResponse } from '@lifeledger/shared';

@Injectable()
export abstract class StorageService {
  abstract generateUploadUrl(
    userId: string,
    documentId: string,
    mimeType: string,
  ): Promise<UploadUrlResponse>;

  abstract generateDownloadUrl(key: string): Promise<string>;

  abstract deleteObject(key: string): Promise<void>;
}
