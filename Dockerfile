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

# Copiamos requerimientos y los instalamos
COPY server/requirements.txt ./server/
RUN pip3 install --no-cache-dir -r ./server/requirements.txt

# Copiamos package.json de Node
COPY server/package*.json ./server/
RUN cd server && npm install

# Copiamos el resto de los archivos del servidor
COPY server ./server

# Copiamos si has guardado el modelo en otra ruta (asegurar)
# COPY clasificador/modelo_apuntes.pkl ./server/ (ya lo movimos)

EXPOSE 3000

# Cambiamos al directorio del server para arrancar
WORKDIR /app/server
CMD ["node", "index.js"]
