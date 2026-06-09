import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') || 'placeholder-client-id',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') || 'placeholder-client-secret',
      callbackURL: config.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:4000/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const { id, emails, displayName, photos } = profile;

    const user = {
      googleId: id,
      email: emails?.[0]?.value ?? '',
      fullName: displayName,
      avatarUrl: photos?.[0]?.value ?? undefined,
    };

    done(null, user);
  }
}
