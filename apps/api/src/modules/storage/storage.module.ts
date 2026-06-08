import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { CloudinaryStorageService } from './cloudinary.service';

@Module({
  providers: [
    {
      provide: StorageService,
      useClass: CloudinaryStorageService,
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
