FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache sqlite
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache sqlite
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/postcss.config.mjs ./postcss.config.mjs
COPY --from=builder /app/components.json ./components.json
RUN mkdir -p data && npm run db:init
EXPOSE 3000
CMD ["npm", "start"]
