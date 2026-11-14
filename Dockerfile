FROM node:22-bookworm-slim

# Instalar Python 3 y dependencias científicas para el motor ML (.pkl) y OpenSSL para Prisma
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    openssl \
    && pip3 install --break-system-packages joblib pandas scikit-learn numpy \
    && ln -sf /usr/bin/python3 /usr/bin/python \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install
RUN npx prisma generate

COPY . .

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push && node --experimental-strip-types prisma/seed.ts && node --experimental-strip-types src/index.ts"]