@'
"""
MONETA CNN API v2.1 - 4 classes auto
"""
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import numpy as np
import os
import io

app = FastAPI(title="MONETA CNN API v2.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "https://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "moneta_cnn_model.h5")
CLASSES_7 = ["Byzantine", "Islamique", "Medievale", "Moderne", "Numide", "Punique", "Romaine"]
CLASSES_4 = ["Islamique", "Medievale", "Moderne", "Romaine"]
IMG_SIZE = 224
SEUIL_CONFIANCE = 30.0

DESCRIPTIONS = {
    "Islamique": "Monnaie islamique",
    "Medievale": "Monnaie medievale",
    "Moderne": "Monnaie moderne",
    "Romaine": "Monnaie romaine",
    "Byzantine": "Monnaie byzantine",
    "Numide": "Monnaie numide",
    "Punique": "Monnaie punique",
}

model = None
CLASSES = []
NB_CLASSES = 0

print("=" * 60)
print("  MONETA CNN API v2.1 - Demarrage")
print(f"  Modele : {MODEL_PATH}")
print(f"  Existe : {os.path.exists(MODEL_PATH)}")
if os.path.exists(MODEL_PATH):
    print(f"  Taille : {os.path.getsize(MODEL_PATH) / 1024 / 1024:.1f} MB")
print("=" * 60)

def load_model():
    global model, CLASSES, NB_CLASSES
    if not os.path.exists(MODEL_PATH):
        print("[ERREUR] Modele introuvable")
        return False
    try:
        import tensorflow as tf
        model = tf.keras.models.load_model(MODEL_PATH, compile=False)
        NB_CLASSES = model.output_shape[-1]
        print(f"[OK] Input  : {model.input_shape}")
        print(f"[OK] Output : {model.output_shape}")
        print(f"[OK] Nb classes detectees : {NB_CLASSES}")
        if NB_CLASSES == 4:
            CLASSES = CLASSES_4
            print(f"[INFO] MODE 4 CLASSES : {CLASSES}")
        elif NB_CLASSES == 7:
            CLASSES = CLASSES_7
            print(f"[INFO] MODE 7 CLASSES : {CLASSES}")
        else:
            print(f"[ERREUR] Nb classes inattendu : {NB_CLASSES}")
            return False
        return True
    except Exception as e:
        print(f"[ERREUR] {e}")
        return False

load_model()

def preprocess_image(image_bytes):
    from PIL import Image
    from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB").resize((IMG_SIZE, IMG_SIZE), Image.LANCZOS)
    arr = preprocess_input(np.array(img, dtype=np.float32))
    return np.expand_dims(arr, axis=0)

@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": model is not None, "nb_classes": NB_CLASSES, "classes": CLASSES}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=503, detail="Modele non charge")
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Type invalide")
    try:
        image_bytes = await file.read()
        img_array = preprocess_image(image_bytes)
        predictions = model.predict(img_array, verbose=0)[0]
        classe_idx = int(np.argmax(predictions))
        classe_pred = CLASSES[classe_idx]
        confiance = float(predictions[classe_idx]) * 100
        top_n = min(3, NB_CLASSES)
        top3_idx = np.argsort(predictions)[::-1][:top_n]
        top3 = [{"classe": CLASSES[i], "confiance": round(float(predictions[i]) * 100, 2), "description": DESCRIPTIONS.get(CLASSES[i], "")} for i in top3_idx]
        toutes_classes = [{"classe": CLASSES[i], "confiance": round(float(predictions[i]) * 100, 2)} for i in range(NB_CLASSES)]
        print(f"[PREDICT] {file.filename} (mode {NB_CLASSES} classes)")
        for c in toutes_classes:
            print(f"  {c['classe']:12s} : {c['confiance']:.2f}%")
        if confiance < SEUIL_CONFIANCE:
            return JSONResponse({
                "success": True, "fichier": file.filename,
                "prediction": {"classe": "Non identifie", "confiance": round(confiance, 2), "description": f"Confiance {confiance:.1f}% < {SEUIL_CONFIANCE}%"},
                "top3": top3, "toutes_classes": toutes_classes, "mode": f"{NB_CLASSES} classes"
            })
        return JSONResponse({
            "success": True, "fichier": file.filename,
            "prediction": {"classe": classe_pred, "confiance": round(confiance, 2), "description": DESCRIPTIONS.get(classe_pred, "")},
            "top3": top3, "toutes_classes": toutes_classes, "mode": f"{NB_CLASSES} classes"
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
'@ | Set-Content -Path api_cnn.py -Encoding UTF8