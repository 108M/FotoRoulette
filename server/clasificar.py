import sys
import os
import cv2
import pickle
import numpy as np
import json
from skimage.feature import hog

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_FILE = os.path.join(SCRIPT_DIR, "modelo_apuntes.pkl")

# Suprimir avisos molestos de terminal 
import warnings
warnings.filterwarnings("ignore")

def extraer_caracteristicas(imagen_color):
    """Extrae el Vector Táctico V3.1 Educada."""
    imagen_color = cv2.resize(imagen_color, (256, 256))
    gris = cv2.cvtColor(imagen_color, cv2.COLOR_BGR2GRAY)
    
    # 1. Ratio Blanco
    _, blanco_puro = cv2.threshold(gris, 210, 255, cv2.THRESH_BINARY)
    ratio_blanco = np.sum(blanco_puro == 255) / (gris.shape[0] * gris.shape[1])
    
    # 2. Vida del Color (Desviación Típica de Saturación)
    hsv = cv2.cvtColor(imagen_color, cv2.COLOR_BGR2HSV)
    _, s, _ = cv2.split(hsv)
    color_life = np.std(s)
    
    # 3. Caos Visual (Entropía base en bordes)
    bordes = cv2.Canny(gris, 100, 200)
    caos_visual = np.sum(bordes > 0) / (gris.shape[0] * gris.shape[1])
    
    # 4. Complejidad del Header (Top 30 pixels)
    header = gris[0:30, :]
    header_complexity = cv2.Laplacian(header, cv2.CV_64F).var()
    
    # 5. Geometría (Rectitud de líneas)
    lineas = cv2.HoughLinesP(bordes, 1, np.pi/180, 80, minLineLength=40, maxLineGap=10)
    geometric_score = len(lineas) if lineas is not None else 0 
    
    # 6. Nitidez (Laplaciano General)
    laplaciano = cv2.Laplacian(gris, cv2.CV_64F).var()
    
    # 7. Histogram of Oriented Gradients (HOG)
    img_hog = cv2.resize(gris, (64, 64))
    fds = hog(img_hog, orientations=8, pixels_per_cell=(16, 16), cells_per_block=(1, 1))
    
    return np.hstack(([ratio_blanco, color_life, caos_visual, header_complexity, geometric_score, laplaciano], fds))

def analizar_imagenes(rutas):
    """Carga el modelo y analiza una lista de rutas, devuelve diccionarios de aceptadas y borradas."""
    if not os.path.exists(MODEL_FILE):
        return {"error": f"Falta modelo_apuntes.pkl en {SCRIPT_DIR}"}
        
    try:
        with open(MODEL_FILE, 'rb') as f:
            data = pickle.load(f)
            modelo = data["modelo"]
            scaler = data["scaler"]
    except Exception as e:
        return {"error": str(e)}

    resultados = {
        "accepted": [],
        "rejected": []
    }

    for ruta in rutas:
        if not os.path.exists(ruta):
            continue
            
        img = cv2.imread(ruta)
        if img is None:
            # Si no se puede leer, la aceptamos para que no rompa el juego (o la borramos, mejor aceptarla por fallo técnico)
            resultados["accepted"].append(ruta)
            continue
            
        # Extracción y Filtro de Seguridad V3.1
        features_raw = extraer_caracteristicas(img)
        features = features_raw.reshape(1, -1)
        
        ratio_blanco = features_raw[0]
        color_life = features_raw[1]
        caos_visual = features_raw[2]
        
        es_seguro_normal = False
        if color_life > 15.0: # Foto viva (cara, ambiente)
            es_seguro_normal = True
        if ratio_blanco < 0.05 and color_life > 5.0: # Oscuro pero con color
            es_seguro_normal = True

        if not es_seguro_normal:
            features_scaled = scaler.transform(features)
            pred = modelo.predict(features_scaled)[0]
        else:
            pred = 0 # NORMAL
            
        if pred == 1:
            resultados["rejected"].append(ruta)
        else:
            resultados["accepted"].append(ruta)

    return resultados

if __name__ == "__main__":
    # Lee todos los argumentos como rutas de archivos a partir del argumento 1
    archivos_a_analizar = sys.argv[1:]
    
    if not archivos_a_analizar:
        print(json.dumps({"error": "No se proporcionaron imágenes"}))
        sys.exit(1)
        
    resultado_json = analizar_imagenes(archivos_a_analizar)
    print(json.dumps(resultado_json))
