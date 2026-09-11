# 📸 FotoRoulette

¡Bienvenido a FotoRoulette! Un juego multijugador estilo "Party" donde tú y tus colegas tendréis que adivinar de quién es cada foto que aparece en pantalla, sacadas aleatoriamente de vuestras galerías.

Para probar el juego en local (con tus amigos estando en la **misma red Wi-Fi**), sigue las instrucciones a continuación.

## Stack

- **App móvil**: React Native + Expo
- **Servidor**: Node.js (Socket.IO para las salas en tiempo real)
- **Filtro de contenido**: clasificador SVM en Python (OpenCV + scikit-image)
  que analiza cada foto subida y rechaza automáticamente capturas/apuntes
  que no sean fotos reales, antes de que entren en la partida

---

## 🛠️ Requisitos Previos

1. **En tu ordenador:** Tener instalado [Node.js](https://nodejs.org/).
2. **En los móviles de tus amigos:** Instalar la aplicación **"Expo Go"** (gratuita en App Store para iOS y en Google Play para Android).

---

## 🚀 Pasos para Jugar en Local

### Paso 1: Encuentra tu IP Local
Para que los móviles puedan comunicarse con el servidor que vas a levantar en tu ordenador, necesitas saber la IP de tu PC dentro de tu Wi-Fi.
- **En Windows:** Abre tu terminal (CMD o PowerShell) y escribe `ipconfig`. Busca la línea que dice `Dirección IPv4` (suele ser algo como `192.168.1.50` o `192.168.0.x`).
- **En Mac:** Abre la terminal y escribe `ipconfig getifaddr en0`.

### Paso 2: Configurar la IP en la App
1. Abre este proyecto en tu editor de código (VSCode).
2. Ve al archivo `app/src/services/socket.ts`.
3. Busca la línea donde se define `SERVER_URL`.
4. Cambia la palabra `localhost` o la IP de ejemplo por la IP real que acabas de encontrar en el Paso 1. 
   Debería quedar algo así: `export const SERVER_URL = 'http://192.168.1.50:3000';`
5. Guarda el archivo.

### Paso 3: Levantar el Servidor Backend
Abre una terminal en la carpeta principal del proyecto y ejecuta:

```bash
cd server
npm start
```
*Si es la primera vez que lo haces y da error, asegúrate de correr `npm install` dentro de la carpeta `server` antes.*
Verás un mensaje diciendo que el servidor está escuchando en el puerto 3000. ¡Déjalo ejecutándose de fondo!

### Paso 4: Levantar la App Móvil (Expo)
Abre **otra terminal nueva**, navega a la carpeta de la app y arráncala:

```bash
cd app
npm start
```
*Si es la primera vez, corre primero `npm install` dentro de la carpeta `app`.*
Al ejecutar el comando de inicio, te aparecerá un **código QR gigante** en la consola.

### Paso 5: ¡A jugar!
1. Diles a todos tus amigos (estando conectados al mismo Wi-Fi que tú) que abran la cámara de sus móviles y escaneen el código QR gigante de tu pantalla.
2. Al escanearlo, se les abrirá "Expo Go" y empezará a cargar el juego de FotoRoulette en sus teléfonos.
3. El primer amigo creará una "Nueva Sala" y verá un código corto.
4. El resto de colegas entrará a esa sala escribiendo el código.
5. El creador le da a "Empezar"... permitid el acceso rápido a las fotos... ¡y buena suerte!

---

*Nota: Una vez que el juego esté listo para salir al público, el Paso 2 desaparecerá porque subiremos el servidor de Node a la nube (por ejemplo, a Render.com) y todos los jugadores usarán esa misma URL mundial (estén en el Wi-Fi o con 4G).*
