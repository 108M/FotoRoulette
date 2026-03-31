La mejor estrategia no es un solo filtro, sino una combinación de varias señales para decidir qué fotos “merecen” entrar en el sorteo. Yo haría esto:

Primero, clasificar cada foto antes de ponerla en el pool del juego. Puedes detectar automáticamente fotos que probablemente sean “poco jugables”, como apuntes, capturas de pantalla, memes con mucho texto, documentos, recibos o páginas escaneadas. Para eso sirven bastante bien modelos de visión + OCR.

Luego, usar reglas simples encima de la IA. Por ejemplo: excluir imágenes que tengan mucho texto detectado, mucho fondo blanco, formato tipo captura, resolución muy vertical de documento, o muy poca presencia de caras/personas. También puedes penalizar fotos que parezcan papel, pizarra o pantalla.

Lo más efectivo suele ser asignar una puntuación de “fotos jugables” y no decidir en blanco o negro. Algo así:

puntos si hay caras, personas, mascotas, grupos, escenas exteriores, fiestas, viajes.
puntos si hay mucho texto, detectas una hoja, una pantalla, una diapositiva, una captura, un PDF fotografiado, o si la imagen parece un apunte.
puntos extra si la foto es borrosa, demasiado oscura o casi vacía.

Si quieres algo más robusto, puedes detectar categorías con un modelo ligero on-device o en backend. Por ejemplo, separar en clases como:
“personas”, “selfies”, “paisajes”, “objetos”, “capturas”, “documentos”, “apuntes”, “pantallas”.
Las categorías “capturas / documentos / apuntes” quedarían fuera por defecto.

Otra idea muy buena para un juego social: además del filtro automático, deja un mini “preprocesado” de la galería donde el usuario pueda marcar carpetas o excluir álbumes enteros. Eso reduce muchísimo errores. Por ejemplo, excluir por defecto:

WhatsApp / Screenshots
Downloads
Escaneos
Google Drive exportaciones
álbumes de trabajo/uni

Y para mejorar todavía más la experiencia, podrías combinarlo con reglas de juego:

solo usar fotos con cierta probabilidad mínima de ser “divertidas”
evitar fotos repetidas o muy parecidas
priorizar fotos con gente del grupo
dar opción de “modo estricto” y “modo relajado”

Si lo piensas en producto, la fórmula ganadora sería: detección automática + puntuación + exclusión manual de álbumes. Eso te da una app que funciona sola, pero sin volverse demasiado agresiva.

Si te sirve, te puedo proponer un sistema concreto de scoring para implementar esto, incluso con una arquitectura simple para móvil.