import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';

import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser, CurrentUserPayload } from './decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  // ─── Register ───
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new account' })
  @ApiResponse({ status: 201, description: 'Account created, verification email sent' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const result = await this.authService.register(
      { email: dto.email, password: dto.password, fullName: dto.fullName, phone: dto.phone },
      req.ip,
      req.headers['user-agent'],
    );

    return { success: true, data: result };
  }

  // ─── Login ───
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } }) // 5 login attempts per minute
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account locked' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(
      dto.email,
      dto.password,
      req.ip,
      req.headers['user-agent'],
    );

    // Set refresh token in httpOnly cookie
    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    };
  }

  // ─── Refresh ───
  @Public()
  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token cookie' })
  @ApiResponse({ status: 200, description: 'New token pair issued' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = req.user as any;

    const result = await this.authService.refreshTokens(
      user.userId,
      user.sessionId,
      user.refreshToken,
      req.ip,
      req.headers['user-agent'],
    );

    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      success: true,
      data: { accessToken: result.accessToken },
    };
  }

  // ─── Logout ───
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate session' })
  async logout(
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (user.sessionId) {
      await this.authService.logout(user.sessionId, user.userId, req.ip, req.headers['user-agent']);
    }

    res.clearCookie('lifeledger_refresh_token', {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth',
    });

    return { success: true, data: { message: 'Logged out successfully' } };
  }

  // ─── Verify Email ───
  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email using token' })
  @ApiResponse({ status: 200, description: 'Email verified' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Body() dto: VerifyEmailDto, @Req() req: Request) {
    const result = await this.authService.verifyEmail(dto.token, req.ip, req.headers['user-agent']);
    return { success: true, data: result };
  }

  // ─── Forgot Password ───
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ status: 200, description: 'Reset email sent if account exists' })
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    const result = await this.authService.forgotPassword(
      dto.email,
      req.ip,
      req.headers['user-agent'],
    );
    return { success: true, data: result };
  }

  // ─── Reset Password ───
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    const result = await this.authService.resetPassword(
      dto.token,
      dto.password,
      req.ip,
      req.headers['user-agent'],
    );
    return { success: true, data: result };
  }

  // ─── Active Sessions ───
  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all active sessions' })
  async getSessions(@CurrentUser() user: CurrentUserPayload) {
    const sessions = await this.authService.getActiveSessions(user.userId, user.sessionId);
    return { success: true, data: sessions };
  }

  // ─── Revoke Session ───
  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a specific session' })
  async revokeSession(
    @Param('id') sessionId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const result = await this.authService.revokeSession(
      sessionId,
      user.userId,
      req.ip,
      req.headers['user-agent'],
    );
    return { success: true, data: result };
  }

  // ─── Google OAuth ───
  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  async googleLogin() {
    // Guard redirects to Google
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const profile = req.user as {
      googleId: string;
      email: string;
      fullName: string;
      avatarUrl?: string;
    };

    const result = await this.authService.handleGoogleLogin(
      profile,
      req.ip,
      req.headers['user-agent'],
    );

    this.setRefreshTokenCookie(res, result.refreshToken);

    // Redirect to frontend with access token
    const frontendUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    res.redirect(`${frontendUrl}/auth/callback?token=${result.accessToken}`);
  }

  // ─── Me (current user) ───
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  async getMe(@CurrentUser() user: CurrentUserPayload) {
    return { success: true, data: user };
  }

  // ─── Cookie Helper ───
  private setRefreshTokenCookie(res: Response, token: string) {
    const isProduction = this.config.get('NODE_ENV') === 'production';

    res.cookie('lifeledger_refresh_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/api/v1/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
