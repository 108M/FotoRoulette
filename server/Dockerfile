FROM node:18-bullseye-slim

# Instalar Python y dependencias de sistema para OpenCV
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instalar dependencias de Python
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Instalar dependencias de Node.js
COPY package*.json ./
RUN npm install

# Copiar el código fuente
COPY . .

EXPOSE 3000

# Comando para ejecutar el backend
CMD ["node", "index.js"]
