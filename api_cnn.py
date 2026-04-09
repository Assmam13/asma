"""
MONETA — API FastAPI CNN
Classification automatique des monnaies archéologiques
Port: 8000
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import numpy as np
import tensorflow as tf
from PIL import Image
import io
import json
import os

# ── Initialisation ────────────────────────────────────────────
app = FastAPI(
    title="MONETA CNN API",
    description="Classification automatique des monnaies archéologiques par époque",
    version="1.0.0"
)

# ── CORS pour Angular ─────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Chargement du modèle ──────────────────────────────────────
MODEL_PATH = "moneta_cnn_model.h5"
IMG_SIZE   = 224
CLASSES    = ['Punique', 'Romaine', 'Byzantine',
              'Islamique', 'Numide', 'Medievale', 'Moderne']

# Descriptions par époque
DESCRIPTIONS = {
    'Punique':   'Monnaie de la civilisation carthaginoise (VIIe - IIe s. av. J.-C.)',
    'Romaine':   'Monnaie de l\'Empire Romain en Afrique du Nord (IIe s. av. - Ve s. ap. J.-C.)',
    'Byzantine': 'Monnaie de l\'Empire Byzantin, Exarchat d\'Afrique (VIe - VIIe s.)',
    'Islamique': 'Monnaie des dynasties islamiques : Aghlabides, Fatimides, Hafsides',
    'Numide':    'Monnaie du Royaume de Numidie (IIIe - Ier s. av. J.-C.)',
    'Medievale': 'Monnaie médiévale européenne (Ve - XVe s.)',
    'Moderne':   'Monnaie des époques moderne et contemporaine (XVIe s. - aujourd\'hui)',
}

print("=" * 50)
print("  MONETA CNN API — Démarrage")
print("=" * 50)

model = None

def load_model():
    global model
    if not os.path.exists(MODEL_PATH):
        print(f"⚠️  Modèle non trouvé: {MODEL_PATH}")
        return False
    try:
        print(f"🧠 Chargement du modèle: {MODEL_PATH}")
        model = tf.keras.models.load_model(MODEL_PATH)
        print(f"✅ Modèle chargé ! Input shape: {model.input_shape}")
        return True
    except Exception as e:
        print(f"❌ Erreur chargement modèle: {e}")
        return False

# Charger au démarrage
load_model()

# ── Prétraitement image ───────────────────────────────────────
def preprocess_image(image_bytes: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(image_bytes))
    img = img.convert('RGB')
    img = img.resize((IMG_SIZE, IMG_SIZE), Image.LANCZOS)
    arr = np.array(img, dtype=np.float32) / 255.0
    arr = np.expand_dims(arr, axis=0)
    return arr

# ── Routes ────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "message": "MONETA CNN API",
        "status": "running",
        "model_loaded": model is not None,
        "classes": CLASSES,
        "endpoints": {
            "predict": "POST /predict",
            "health":  "GET /health",
            "classes": "GET /classes"
        }
    }

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "model_path": MODEL_PATH,
        "classes": CLASSES,
        "img_size": IMG_SIZE
    }

@app.get("/classes")
def get_classes():
    return {
        "classes": [
            {
                "id": i,
                "nom": cls,
                "description": DESCRIPTIONS.get(cls, "")
            }
            for i, cls in enumerate(CLASSES)
        ]
    }

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """
    Classifie une image de monnaie par époque historique.
    Retourne la classe prédite et le pourcentage de confiance.
    """

    # Vérifier le modèle
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Modèle CNN non chargé. Vérifiez que moneta_cnn_model.h5 existe."
        )

    # Vérifier le type de fichier
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail=f"Type de fichier invalide: {file.content_type}. Envoyez une image."
        )

    try:
        # Lire et prétraiter l'image
        image_bytes = await file.read()
        img_array   = preprocess_image(image_bytes)

        # Prédiction
        predictions = model.predict(img_array, verbose=0)[0]

        # Résultats
        classe_idx    = int(np.argmax(predictions))
        classe_pred   = CLASSES[classe_idx]
        confiance     = float(predictions[classe_idx]) * 100

        # Top 3 classes
        top3_idx = np.argsort(predictions)[::-1][:3]
        top3 = [
            {
                "classe":     CLASSES[i],
                "confiance":  round(float(predictions[i]) * 100, 2),
                "description": DESCRIPTIONS.get(CLASSES[i], "")
            }
            for i in top3_idx
        ]

        # Toutes les classes avec leur confiance
        toutes_classes = [
            {
                "classe":    CLASSES[i],
                "confiance": round(float(predictions[i]) * 100, 2)
            }
            for i in range(len(CLASSES))
        ]

        print(f"📸 Prédiction: {classe_pred} ({confiance:.1f}%) — {file.filename}")

        return JSONResponse({
            "success":      True,
            "fichier":      file.filename,
            "prediction":   {
                "classe":      classe_pred,
                "confiance":   round(confiance, 2),
                "description": DESCRIPTIONS.get(classe_pred, "")
            },
            "top3":         top3,
            "toutes_classes": toutes_classes
        })

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la prédiction: {str(e)}"
        )

# ── Lancement ─────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    print("\n🚀 Démarrage de l'API sur http://localhost:8000")
    print("📖 Documentation: http://localhost:8000/docs\n")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
