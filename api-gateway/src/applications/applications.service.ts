import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaClient as ApplicationPrismaClient, ApplicationState } from '@prisma/application-client';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);
  private prisma: ApplicationPrismaClient;

  constructor() {
    this.prisma = new ApplicationPrismaClient();
  }

  async getUserApplications(userId: string) {
    const applications = await this.prisma.application.findMany({
      where: { userId },
      include: {
        documents: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute progress % for each application
    return applications.map((app) => {
      const totalDocs = app.documents.length;
      const preparedDocs = app.documents.filter((d) => d.isPrepared).length;
      const progressPercent = totalDocs > 0 ? Math.round((preparedDocs / totalDocs) * 100) : 0;
      return {
        ...app,
        progressPercent,
        totalDocs,
        preparedDocs,
      };
    });
  }

  async trackApplication(
    userId: string,
    data: {
      scholarshipId: string;
      scholarshipTitle: string;
      providerName: string;
      cycleLabel?: string;
      targetDeadline?: string;
      initialDocuments?: Array<{
        documentType: string;
        requirementLevel: string;
        instructions?: string;
      }>;
    },
  ) {
    // Check if already tracked
    const existing = await this.prisma.application.findUnique({
      where: {
        userId_scholarshipId: {
          userId,
          scholarshipId: data.scholarshipId,
        },
      },
      include: { documents: true },
    });

    if (existing) {
      return existing;
    }

    const application = await this.prisma.application.create({
      data: {
        userId,
        scholarshipId: data.scholarshipId,
        scholarshipTitle: data.scholarshipTitle,
        providerName: data.providerName,
        cycleLabel: data.cycleLabel,
        targetDeadline: data.targetDeadline ? new Date(data.targetDeadline) : null,
        status: ApplicationState.PLANNING,
        documents: data.initialDocuments
          ? {
              create: data.initialDocuments.map((doc) => ({
                documentType: doc.documentType,
                requirementLevel: doc.requirementLevel || 'MANDATORY',
                instructions: doc.instructions,
                isPrepared: false,
                attestationDone: false,
                translationDone: false,
              })),
            }
          : undefined,
      },
      include: { documents: true },
    });

    return application;
  }

  async updateApplicationStatus(
    userId: string,
    applicationId: string,
    status: ApplicationState,
    notes?: string,
  ) {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, userId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status,
        notes: notes !== undefined ? notes : application.notes,
      },
      include: { documents: true },
    });
  }

  async updateDocumentStatus(
    userId: string,
    applicationId: string,
    documentId: string,
    updates: {
      isPrepared?: boolean;
      attestationDone?: boolean;
      translationDone?: boolean;
      notes?: string;
    },
  ) {
    // Verify application belongs to user
    const app = await this.prisma.application.findFirst({
      where: { id: applicationId, userId },
    });

    if (!app) {
      throw new NotFoundException('Application not found');
    }

    const doc = await this.prisma.applicationDocument.findFirst({
      where: { id: documentId, applicationId },
    });

    if (!doc) {
      throw new NotFoundException('Document item not found');
    }

    return await this.prisma.applicationDocument.update({
      where: { id: documentId },
      data: {
        isPrepared: updates.isPrepared !== undefined ? updates.isPrepared : doc.isPrepared,
        attestationDone: updates.attestationDone !== undefined ? updates.attestationDone : doc.attestationDone,
        translationDone: updates.translationDone !== undefined ? updates.translationDone : doc.translationDone,
        notes: updates.notes !== undefined ? updates.notes : doc.notes,
      },
    });
  }

  async deleteApplication(userId: string, applicationId: string) {
    const app = await this.prisma.application.findFirst({
      where: { id: applicationId, userId },
    });

    if (!app) {
      throw new NotFoundException('Application not found');
    }

    await this.prisma.application.delete({
      where: { id: applicationId },
    });

    return { message: 'Application removed from tracker' };
  }

  async uploadDocumentFile(
    userId: string,
    applicationId: string,
    documentId: string,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const app = await this.prisma.application.findFirst({
      where: { id: applicationId, userId },
    });

    if (!app) {
      throw new NotFoundException('Application not found');
    }

    const doc = await this.prisma.applicationDocument.findFirst({
      where: { id: documentId, applicationId },
    });

    if (!doc) {
      throw new NotFoundException('Document requirement not found');
    }

    // Size limit: 10MB
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new BadRequestException('File size exceeds the 10MB limit');
    }

    // MIME type check
    const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF, PNG, and JPEG formats are permitted');
    }

    // Create private storage directory
    const uploadDir = path.join(process.cwd(), 'uploads', 'documents', userId, applicationId);
    await fs.promises.mkdir(uploadDir, { recursive: true });

    // Clean filename
    const safeName = `${documentId}_${Date.now()}_${path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '')}`;
    const storageKey = path.join(uploadDir, safeName);

    // Write file to disk
    await fs.promises.writeFile(storageKey, file.buffer);

    // If an older file existed, remove it
    if (doc.storageKey && fs.existsSync(doc.storageKey) && doc.storageKey !== storageKey) {
      try {
        await fs.promises.unlink(doc.storageKey);
      } catch {
        // Ignored
      }
    }

    // Update document record
    const updated = await this.prisma.applicationDocument.update({
      where: { id: documentId },
      data: {
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        storageKey,
        uploadedAt: new Date(),
        isPrepared: true, // Auto-mark prepared on file attachment
      },
    });

    this.logger.log(`User ${userId} uploaded ${file.originalname} for ${doc.documentType}`);
    return updated;
  }

  async getDocumentFile(userId: string, applicationId: string, documentId: string) {
    const app = await this.prisma.application.findFirst({
      where: { id: applicationId, userId },
    });

    if (!app) {
      throw new NotFoundException('Application not found');
    }

    const doc = await this.prisma.applicationDocument.findFirst({
      where: { id: documentId, applicationId },
    });

    if (!doc || !doc.storageKey) {
      throw new NotFoundException('No file attached to this document requirement');
    }

    if (!fs.existsSync(doc.storageKey)) {
      throw new NotFoundException('Stored document file not found on disk');
    }

    return {
      filePath: doc.storageKey,
      fileName: doc.fileName || 'document.pdf',
      mimeType: doc.mimeType || 'application/pdf',
    };
  }

  async deleteDocumentFile(userId: string, applicationId: string, documentId: string) {
    const app = await this.prisma.application.findFirst({
      where: { id: applicationId, userId },
    });

    if (!app) {
      throw new NotFoundException('Application not found');
    }

    const doc = await this.prisma.applicationDocument.findFirst({
      where: { id: documentId, applicationId },
    });

    if (!doc) {
      throw new NotFoundException('Document requirement not found');
    }

    if (doc.storageKey && fs.existsSync(doc.storageKey)) {
      try {
        await fs.promises.unlink(doc.storageKey);
      } catch {
        // Ignored
      }
    }

    return await this.prisma.applicationDocument.update({
      where: { id: documentId },
      data: {
        fileName: null,
        fileSize: null,
        mimeType: null,
        storageKey: null,
        uploadedAt: null,
      },
    });
  }
}


