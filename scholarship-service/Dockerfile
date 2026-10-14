FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate || true

COPY . .
RUN npm run build || true

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV GRPC_PORT=50051

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

EXPOSE 50051

CMD ["node", "dist/main"]

