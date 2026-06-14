import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { AdminUsersController } from './admin-users.controller';
import { GdprController } from './gdpr.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [AdminUsersController, GdprController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
