import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaClient as ApplicationPrismaClient, ApplicationState } from '@prisma/application-client';

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
}
