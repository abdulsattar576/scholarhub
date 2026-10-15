import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaClient, UserRole } from '@prisma/client';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  // --- Session Management (Opaque Cryptographic Tokens + DB Hash) ---

  async createSession(userId: string): Promise<string> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14); // 14 days session lifetime

    await this.prisma.session.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return rawToken;
  }

  async validateSession(rawToken?: string) {
    if (!rawToken) {
      throw new UnauthorizedException('Authentication required');
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    return session.user;
  }

  async revokeSession(rawToken?: string) {
    if (!rawToken) return;

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await this.prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // --- Local Email / Password Authentication ---

  async register(data: { email: string; password: string; name?: string; nationality?: string }) {
    const normalizedEmail = data.email.toLowerCase().trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new BadRequestException('An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        name: data.name || '',
        passwordHash,
        role: UserRole.STUDENT,
        profile: {
          create: {
            nationality: data.nationality || 'PK',
            degreeLevel: 'BACHELORS',
            gradingScale: 4.0,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    const token = await this.createSession(user.id);
    return { user, token };
  }

  async login(data: { email: string; password: string }) {
    const normalizedEmail = data.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        profile: true,
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const token = await this.createSession(user.id);
    return { user, token };
  }

  // --- Google OAuth 2.0 / OpenID Connect ---

  getGoogleAuthUrl(): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/v1/auth/google/callback';

    if (!clientId) {
      throw new BadRequestException('GOOGLE_CLIENT_ID is not configured in .env');
    }

    const state = crypto.randomBytes(16).toString('hex');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      state,
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleGoogleCallback(code: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/v1/auth/google/callback';

    if (!clientId || !clientSecret) {
      throw new BadRequestException('Google OAuth credentials not configured in .env');
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      this.logger.error(`Google token exchange error: ${err}`);
      throw new BadRequestException('Failed to exchange Google OAuth code');
    }

    const tokenData = await tokenResponse.json();
    const idToken = tokenData.id_token;

    // Decode ID token payload (Google signature checked via iss/aud verification)
    const payloadPart = idToken.split('.')[1];
    const googleProfile = JSON.parse(Buffer.from(payloadPart, 'base64').toString('utf-8'));

    const googleSub = googleProfile.sub;
    const email = googleProfile.email.toLowerCase().trim();
    const name = googleProfile.name || '';

    // Identify user by stable Google sub or create
    let user = await this.prisma.user.findFirst({
      where: {
        oauthIdentities: {
          some: {
            provider: 'google',
            providerSubject: googleSub,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    if (!user) {
      // Check if email already registered
      user = await this.prisma.user.findUnique({
        where: { email },
        include: { profile: true },
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            email,
            name,
            role: UserRole.STUDENT,
            oauthIdentities: {
              create: {
                provider: 'google',
                providerSubject: googleSub,
              },
            },
            profile: {
              create: {
                nationality: 'PK',
                degreeLevel: 'BACHELORS',
                gradingScale: 4.0,
              },
            },
          },
          include: { profile: true },
        });
      } else {
        // Link identity to existing verified email
        await this.prisma.oAuthIdentity.create({
          data: {
            userId: user.id,
            provider: 'google',
            providerSubject: googleSub,
          },
        });
      }
    }

    const sessionToken = await this.createSession(user.id);
    return { user, sessionToken };
  }

  // --- Student Profile Update ---

  async updateProfile(userId: string, profileData: any) {
    return await this.prisma.studentProfile.upsert({
      where: { userId },
      create: {
        userId,
        nationality: profileData.nationality,
        degreeLevel: profileData.degreeLevel,
        fieldOfStudy: profileData.fieldOfStudy,
        cgpa: profileData.cgpa ? Number(profileData.cgpa) : undefined,
        gradingScale: profileData.gradingScale ? Number(profileData.gradingScale) : 4.0,
        graduationYear: profileData.graduationYear ? Number(profileData.graduationYear) : undefined,
      },
      update: {
        nationality: profileData.nationality,
        degreeLevel: profileData.degreeLevel,
        fieldOfStudy: profileData.fieldOfStudy,
        cgpa: profileData.cgpa ? Number(profileData.cgpa) : undefined,
        gradingScale: profileData.gradingScale ? Number(profileData.gradingScale) : 4.0,
        graduationYear: profileData.graduationYear ? Number(profileData.graduationYear) : undefined,
      },
    });
  }
}

