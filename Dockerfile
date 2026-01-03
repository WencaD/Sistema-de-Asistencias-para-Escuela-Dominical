FROM node:16-alpine

WORKDIR /app

# Copiar todo el proyecto
COPY . .

# Instalar dependencias del backend
WORKDIR /app/backend
RUN npm ci --only=production

# Volver a la raíz de la app
WORKDIR /app

EXPOSE 3000

CMD ["node", "backend/server.js"]
