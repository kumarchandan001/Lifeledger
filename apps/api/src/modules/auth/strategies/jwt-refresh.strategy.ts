import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

export interface JwtRefreshPayload {
  sub: string;
  sessionId: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_REFRESH_SECRET');
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }

    const opts: StrategyOptionsWithRequest = {
      jwtFromRequest: (req: Request) => {
        return req?.cookies?.['lifeledger_refresh_token'] ?? null;
      },
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    };

    super(opts);
  }

  validate(req: Request, payload: JwtRefreshPayload) {
    if (!payload.sub || !payload.sessionId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const refreshToken = req.cookies?.['lifeledger_refresh_token'];

    return {
      userId: payload.sub,
      sessionId: payload.sessionId,
      refreshToken,
    };
  }
}
