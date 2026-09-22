FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy project files
COPY . .

# Build Next.js application
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
