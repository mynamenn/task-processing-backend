# Stage 1: Build
FROM node:18-alpine as builder
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock) to utilize Docker cache
COPY package*.json ./
# Install all dependencies (including devDependencies necessary for TypeScript compilation and Prisma)
RUN npm install

# Copy the Prisma schema and other necessary files
COPY prisma ./prisma
# Generate Prisma client; this step requires devDependencies
RUN npx prisma generate

# Copy the rest of your application code
COPY . .

# Stage 2: Production
FROM node:18-alpine
WORKDIR /app

# Copy only the production dependencies necessary at runtime
COPY package*.json ./
RUN npm ci --only=production

# Copy generated Prisma client and any other necessary runtime resources
COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src

EXPOSE 4000
CMD ["npm", "start"]