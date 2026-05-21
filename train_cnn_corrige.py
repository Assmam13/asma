"""
MONETA — CNN Training Script (VERSION CORRIGÉE)
Classification des monnaies archéologiques par époque
TensorFlow 2.x + Keras + Transfer Learning (MobileNetV2)

CORRECTIONS APPLIQUÉES :
  1. preprocess_input MobileNetV2 (au lieu de rescale=1./255) ← LE PLUS IMPORTANT
  2. Tête simplifiée : 256 → 7 (au lieu de 512 → 256 → 7)
  3. Phase 1 allongée à 25 epochs (au lieu de 10)
  4. Bug y_true corrigé (reset() avant predict)
  5. Seed pour reproductibilité
  6. Data augmentation enrichie (shear, brightness, rotation 30°)
  7. Phase 2 : dégeler 50 couches au lieu de 30 pour plus de capacité d'adaptation
"""

import os
import random
import numpy as np
import matplotlib.pyplot as plt
import tensorflow as tf
from tensorflow.keras import layers, models, regularizers
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input  # ← CRUCIAL
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import (
    ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
)

# ═══════════════════════════════════════════════════════════════
#  SEED POUR REPRODUCTIBILITÉ
# ═══════════════════════════════════════════════════════════════
SEED = 42
random.seed(SEED)
np.random.seed(SEED)
tf.random.set_seed(SEED)
os.environ['PYTHONHASHSEED'] = str(SEED)

print("=" * 60)
print("  MONETA — CNN Classification des Monnaies (v2 CORRIGÉ)")
print("=" * 60)
print(f"  TensorFlow version : {tf.__version__}")
print(f"  GPU disponible     : {len(tf.config.list_physical_devices('GPU')) > 0}")
print(f"  Seed               : {SEED}")
print("=" * 60 + "\n")

# Activer croissance mémoire GPU
gpus = tf.config.list_physical_devices('GPU')
if gpus:
    try:
        for gpu in gpus:
            tf.config.experimental.set_memory_growth(gpu, True)
        print(f"✅ GPU configuré : {gpus[0].name}\n")
    except RuntimeError as e:
        print(f"⚠️ {e}\n")

# ═══════════════════════════════════════════════════════════════
#  CONFIGURATION
# ═══════════════════════════════════════════════════════════════
IMG_SIZE     = 224
BATCH_SIZE   = 32
CLASSES      = ['Punique', 'Romaine', 'Byzantine',
                'Islamique', 'Numide', 'Medievale', 'Moderne']
NUM_CLASSES  = len(CLASSES)

EPOCHS_P1    = 25       # Phase 1 freeze (au lieu de 10)
EPOCHS_P2    = 35       # Phase 2 fine-tuning (au lieu de 20)
LR_P1        = 1e-3     # Learning rate phase 1
LR_P2        = 1e-5     # Learning rate phase 2 (100x plus petit)

UNFREEZE_LAST_N = 50    # Au lieu de 30, plus de capacité d'adaptation

DATASET_DIR  = "dataset"
MODEL_PATH   = "moneta_cnn_model.h5"
BEST_P1_PATH = "moneta_cnn_phase1.h5"
HISTORY_PATH = "training_history.png"
CONFUSION_PATH = "confusion_matrix.png"

# ═══════════════════════════════════════════════════════════════
#  DATA GENERATORS — AVEC preprocess_input MobileNetV2
# ═══════════════════════════════════════════════════════════════
print("📦 Chargement du dataset avec augmentation...")

train_datagen = ImageDataGenerator(
    preprocessing_function=preprocess_input,  # ← FIX #1 : normalisation [-1, +1]
    rotation_range=30,                         # ← rotations plus agressives
    width_shift_range=0.2,
    height_shift_range=0.2,
    shear_range=0.15,                          # ← AJOUT : cisaillement
    zoom_range=0.25,
    horizontal_flip=True,
    brightness_range=[0.7, 1.3],               # ← AJOUT : plus de variation
    fill_mode='nearest'
)

val_datagen = ImageDataGenerator(
    preprocessing_function=preprocess_input    # ← FIX #1 (validation aussi !)
)

train_generator = train_datagen.flow_from_directory(
    f"{DATASET_DIR}/train",
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    classes=CLASSES,
    shuffle=True,
    seed=SEED
)

val_generator = val_datagen.flow_from_directory(
    f"{DATASET_DIR}/validation",
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    classes=CLASSES,
    shuffle=False
)

test_generator = val_datagen.flow_from_directory(
    f"{DATASET_DIR}/test",
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    classes=CLASSES,
    shuffle=False
)

print(f"\n✅ Train      : {train_generator.samples} images")
print(f"✅ Validation : {val_generator.samples} images")
print(f"✅ Test       : {test_generator.samples} images")
print(f"✅ Classes    : {CLASSES}\n")

# ═══════════════════════════════════════════════════════════════
#  GESTION DU DÉSÉQUILIBRE — class_weight balanced
# ═══════════════════════════════════════════════════════════════
print("📊 Calcul des poids de classe (équilibrage) :")
total = train_generator.samples
class_weights = {}
for i, cls in enumerate(CLASSES):
    n = list(train_generator.classes).count(i)
    class_weights[i] = total / (NUM_CLASSES * n) if n > 0 else 1.0
    pct = (n / total * 100) if total > 0 else 0
    print(f"  {cls:15s}: {n:5d} images ({pct:5.1f}%) → poids {class_weights[i]:.3f}")

# ═══════════════════════════════════════════════════════════════
#  CONSTRUCTION DU MODÈLE
# ═══════════════════════════════════════════════════════════════
print("\n🧠 Construction du modèle CNN (MobileNetV2)...")

base_model = MobileNetV2(
    input_shape=(IMG_SIZE, IMG_SIZE, 3),
    include_top=False,
    weights='imagenet'
)
base_model.trainable = False
print(f"✅ MobileNetV2 chargé, {len(base_model.layers)} couches gelées")

# FIX #2 : tête simplifiée — une seule Dense + BatchNorm + Dropout
# Avec 4000 images réparties sur 7 classes, une tête trop lourde overfit
model = models.Sequential([
    base_model,
    layers.GlobalAveragePooling2D(),
    layers.BatchNormalization(),
    layers.Dropout(0.4),
    layers.Dense(
        256,
        activation='relu',
        kernel_regularizer=regularizers.l2(0.001)
    ),
    layers.Dropout(0.3),
    layers.Dense(NUM_CLASSES, activation='softmax')
])

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=LR_P1),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

model.summary()
print(f"\nTotal paramètres : {model.count_params():,}")

# ═══════════════════════════════════════════════════════════════
#  CALLBACKS
# ═══════════════════════════════════════════════════════════════
callbacks_p1 = [
    ModelCheckpoint(
        BEST_P1_PATH,
        monitor='val_accuracy',
        save_best_only=True,
        verbose=1
    ),
    EarlyStopping(
        monitor='val_accuracy',
        patience=10,                 # un peu plus de patience
        restore_best_weights=True,
        verbose=1
    ),
    ReduceLROnPlateau(
        monitor='val_loss',
        factor=0.5,                  # division par 2 au lieu de 3
        patience=5,
        min_lr=1e-7,
        verbose=1
    )
]

callbacks_p2 = [
    ModelCheckpoint(
        MODEL_PATH,
        monitor='val_accuracy',
        save_best_only=True,
        verbose=1
    ),
    EarlyStopping(
        monitor='val_accuracy',
        patience=12,
        restore_best_weights=True,
        verbose=1
    ),
    ReduceLROnPlateau(
        monitor='val_loss',
        factor=0.5,
        patience=6,
        min_lr=1e-8,
        verbose=1
    )
]

# ═══════════════════════════════════════════════════════════════
#  PHASE 1 — ENTRAÎNEMENT DE LA TÊTE
# ═══════════════════════════════════════════════════════════════
print("\n" + "="*60)
print(f"  PHASE 1 — Entraînement de la tête ({EPOCHS_P1} epochs max)")
print("="*60)

history1 = model.fit(
    train_generator,
    epochs=EPOCHS_P1,
    validation_data=val_generator,
    class_weight=class_weights,
    callbacks=callbacks_p1,
    verbose=1
)

# Évaluation intermédiaire
val_loss_p1, val_acc_p1 = model.evaluate(val_generator, verbose=0)
print(f"\n📍 Accuracy validation phase 1 : {val_acc_p1*100:.2f}%")

# ═══════════════════════════════════════════════════════════════
#  PHASE 2 — FINE-TUNING
# ═══════════════════════════════════════════════════════════════
print("\n" + "="*60)
print(f"  PHASE 2 — Fine-tuning ({EPOCHS_P2} epochs max)")
print("="*60)

# FIX : dégeler les 50 dernières couches (au lieu de 30)
base_model.trainable = True
for layer in base_model.layers[:-UNFREEZE_LAST_N]:
    layer.trainable = False

trainable_count = sum(
    tf.keras.backend.count_params(w) for w in model.trainable_weights
)
print(f"✅ {UNFREEZE_LAST_N} dernières couches dégelées")
print(f"✅ Paramètres entraînables : {trainable_count:,}")

# IMPORTANT : re-compiler après changement de trainable
model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=LR_P2),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

history2 = model.fit(
    train_generator,
    epochs=EPOCHS_P1 + EPOCHS_P2,
    initial_epoch=len(history1.history['accuracy']),  # continue où phase 1 s'est arrêtée
    validation_data=val_generator,
    class_weight=class_weights,
    callbacks=callbacks_p2,
    verbose=1
)

# ═══════════════════════════════════════════════════════════════
#  ÉVALUATION FINALE SUR LE TEST SET
# ═══════════════════════════════════════════════════════════════
print("\n" + "="*60)
print("  ÉVALUATION FINALE SUR LE TEST SET")
print("="*60)

test_loss, test_acc = model.evaluate(test_generator, verbose=1)
print(f"\n✅ Test Accuracy : {test_acc*100:.2f}%")
print(f"✅ Test Loss     : {test_loss:.4f}")

# ═══════════════════════════════════════════════════════════════
#  RAPPORT PAR CLASSE — FIX #3 : reset() avant predict
# ═══════════════════════════════════════════════════════════════
from sklearn.metrics import classification_report, confusion_matrix
import seaborn as sns

print("\n📊 Rapport de classification par classe :\n")

# CRITIQUE : reset() pour s'assurer que predict commence au début
test_generator.reset()
predictions = model.predict(test_generator, verbose=1)
y_pred = np.argmax(predictions, axis=1)
y_true = test_generator.classes  # PAS de slicing — shuffle=False garantit l'ordre

print(classification_report(y_true, y_pred, target_names=CLASSES))

# Matrice de confusion
cm = confusion_matrix(y_true, y_pred)
plt.figure(figsize=(10, 8))
sns.heatmap(
    cm, annot=True, fmt='d', cmap='Oranges',
    xticklabels=CLASSES, yticklabels=CLASSES
)
plt.title('Matrice de confusion — MONETA CNN', fontsize=14, fontweight='bold')
plt.ylabel('Vraie classe')
plt.xlabel('Classe prédite')
plt.xticks(rotation=45, ha='right')
plt.yticks(rotation=0)
plt.tight_layout()
plt.savefig(CONFUSION_PATH, dpi=150, bbox_inches='tight')
print(f"✅ Matrice de confusion sauvegardée : {CONFUSION_PATH}")

# ═══════════════════════════════════════════════════════════════
#  COURBES D'ENTRAÎNEMENT
# ═══════════════════════════════════════════════════════════════
print("\n📈 Génération des courbes d'entraînement...")

acc      = history1.history['accuracy']     + history2.history['accuracy']
val_acc  = history1.history['val_accuracy'] + history2.history['val_accuracy']
loss     = history1.history['loss']         + history2.history['loss']
val_loss = history1.history['val_loss']     + history2.history['val_loss']

phase1_end = len(history1.history['accuracy'])

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
fig.suptitle('MONETA CNN — Courbes d\'entraînement', fontsize=14, fontweight='bold')

ax1.plot(acc,     label='Train Accuracy',      color='#c0392b', linewidth=2)
ax1.plot(val_acc, label='Validation Accuracy', color='#e67e22', linewidth=2)
ax1.axvline(x=phase1_end-1, color='gray', linestyle='--', label='Début fine-tuning')
ax1.set_title('Accuracy')
ax1.set_xlabel('Epoch')
ax1.set_ylabel('Accuracy')
ax1.legend()
ax1.grid(True, alpha=0.3)

ax2.plot(loss,     label='Train Loss',      color='#c0392b', linewidth=2)
ax2.plot(val_loss, label='Validation Loss', color='#e67e22', linewidth=2)
ax2.axvline(x=phase1_end-1, color='gray', linestyle='--', label='Début fine-tuning')
ax2.set_title('Loss')
ax2.set_xlabel('Epoch')
ax2.set_ylabel('Loss')
ax2.legend()
ax2.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig(HISTORY_PATH, dpi=120, bbox_inches='tight')
print(f"✅ Courbes sauvegardées : {HISTORY_PATH}")

# Sauvegarder le mapping des classes
import json
class_indices = train_generator.class_indices
with open('class_indices.json', 'w') as f:
    json.dump(class_indices, f, indent=2)
print(f"✅ Mapping classes sauvegardé : class_indices.json")

# ═══════════════════════════════════════════════════════════════
#  RÉSUMÉ FINAL
# ═══════════════════════════════════════════════════════════════
print("\n" + "="*60)
print("  ✅ ENTRAÎNEMENT TERMINÉ !")
print("="*60)
print(f"  Modèle final     : {MODEL_PATH}")
print(f"  Accuracy phase 1 : {val_acc_p1*100:.2f}%")
print(f"  Accuracy test    : {test_acc*100:.2f}%")
print(f"  Courbes          : {HISTORY_PATH}")
print(f"  Confusion        : {CONFUSION_PATH}")
print("="*60)
print("\n🚀 Prêt pour l'Étape 3 — API FastAPI !")
