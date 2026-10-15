import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

const COOKIE_NAME = 'session_token';
const COOKIE_MAX_AGE = 14 * 24 * 60 * 60 * 1000; // 14 days

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setSessionCookie(res: Response, token: string) {
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });
  }

  private clearSessionCookie(res: Response) {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }

  @Post('register')
  async register(
    @Body() body: { email: string; password: string; name?: string; nationality?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.authService.register(body);
    this.setSessionCookie(res, token);
    return {
      message: 'Account registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        profile: user.profile,
      },
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.authService.login(body);
    this.setSessionCookie(res, token);
    return {
      message: 'Logged in successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        profile: user.profile,
      },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[COOKIE_NAME];
    if (token) {
      await this.authService.revokeSession(token);
    }
    this.clearSessionCookie(res);
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@Req() req: any) {
    return { user: req.user };
  }

  @Patch('profile')
  @UseGuards(AuthGuard)
  async updateProfile(@Req() req: any, @Body() body: any) {
    const updatedProfile = await this.authService.updateProfile(req.user.id, body);
    return {
      message: 'Profile updated successfully',
      profile: updatedProfile,
    };
  }

  @Get('google')
  googleAuth(@Res() res: Response) {
    const authUrl = this.authService.getGoogleAuthUrl();
    res.redirect(authUrl);
  }

  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Res() res: Response,
  ) {
    const clientUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';
    try {
      const { sessionToken } = await this.authService.handleGoogleCallback(code);
      this.setSessionCookie(res, sessionToken);
      res.redirect(`${clientUrl}?auth=success`);
    } catch (err: any) {
      res.redirect(`${clientUrl}?auth=error&message=${encodeURIComponent(err.message || 'Google OAuth failed')}`);
    }
  }
}

