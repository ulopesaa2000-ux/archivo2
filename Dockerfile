# Fase 1: Dependencias
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat ca-certificates && update-ca-certificates
WORKDIR /app
COPY package*.json ./
RUN npm install

# Fase 2: Construcción (Build)
FROM node:20-alpine AS builder
RUN apk add --no-cache ca-certificates && update-ca-certificates
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Argumentos de construcción para variables de entorno públicas
# (Necesarios para que Next.js los incluya en el JS del cliente durante el build)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN npm run build

# Fase 3: Ejecución (Runner)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
RUN apk add --no-cache ca-certificates && update-ca-certificates

# Creamos un usuario de sistema para mayor seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
