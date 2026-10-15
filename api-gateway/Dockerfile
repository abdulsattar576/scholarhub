FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate --schema=prisma/identity.prisma && \
    npx prisma generate --schema=prisma/scholarship.prisma && \
    npx prisma generate --schema=prisma/applications.prisma
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
COPY prisma ./prisma
RUN npm install --omit=dev
RUN npx prisma generate --schema=prisma/identity.prisma && \
    npx prisma generate --schema=prisma/scholarship.prisma && \
    npx prisma generate --schema=prisma/applications.prisma

COPY --from=builder /app/dist ./dist

# Create storage directory for uploaded student documents
RUN mkdir -p /app/storage/documents

EXPOSE 3001

CMD ["node", "dist/main"]

