"""
MONETA — CNN Training Script
Classification des monnaies archéologiques par époque
TensorFlow 2.x + Keras + Transfer Learning (MobileNetV2)
"""

import os
import numpy as np
import matplotlib.pyplot as plt
import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import (
    ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
)

print("=" * 55)
print("  MONETA — CNN Classification des Monnaies")
print("=" * 55)
print(f"  TensorFlow version : {tf.__version__}")
print(f"  GPU disponible     : {len(tf.config.list_physical_devices('GPU')) > 0}")
print("=" * 55 + "\n")

# ── Configuration ────────────────────────────────────────────
IMG_SIZE    = 224        # MobileNetV2 attend 224x224
BATCH_SIZE  = 32
EPOCHS      = 30
CLASSES     = ['Punique', 'Romaine', 'Byzantine',
               'Islamique', 'Numide', 'Medievale', 'Moderne']
NUM_CLASSES = len(CLASSES)

DATASET_DIR = "dataset"
MODEL_PATH  = "moneta_cnn_model.h5"
HISTORY_PATH= "training_history.png"

# ── Data Augmentation ────────────────────────────────────────
print("📦 Chargement du dataset avec augmentation...")

train_datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=20,
    width_shift_range=0.15,
    height_shift_range=0.15,
    zoom_range=0.2,
    horizontal_flip=True,
    brightness_range=[0.8, 1.2],
    fill_mode='nearest'
)

val_datagen = ImageDataGenerator(rescale=1./255)

train_generator = train_datagen.flow_from_directory(
    f"{DATASET_DIR}/train",
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    classes=CLASSES,
    shuffle=True
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

# ── Gestion du déséquilibre des classes ──────────────────────
total = train_generator.samples
class_weights = {}
for i, cls in enumerate(CLASSES):
    n = list(train_generator.classes).count(i)
    class_weights[i] = total / (NUM_CLASSES * n) if n > 0 else 1.0
    print(f"  Poids {cls:15s}: {class_weights[i]:.3f} ({n} images)")

# ── Modèle CNN avec Transfer Learning ────────────────────────
print("\n🧠 Construction du modèle CNN (MobileNetV2)...")

base_model = MobileNetV2(
    input_shape=(IMG_SIZE, IMG_SIZE, 3),
    include_top=False,
    weights='imagenet'
)

# Phase 1 : Geler les couches de base
base_model.trainable = False

model = models.Sequential([
    base_model,
    layers.GlobalAveragePooling2D(),
    layers.BatchNormalization(),
    layers.Dense(512, activation='relu'),
    layers.Dropout(0.5),
    layers.Dense(256, activation='relu'),
    layers.Dropout(0.3),
    layers.Dense(NUM_CLASSES, activation='softmax')
])

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

model.summary()
print(f"\nTotal paramètres : {model.count_params():,}")

# ── Callbacks ────────────────────────────────────────────────
callbacks = [
    ModelCheckpoint(
        MODEL_PATH,
        monitor='val_accuracy',
        save_best_only=True,
        verbose=1
    ),
    EarlyStopping(
        monitor='val_accuracy',
        patience=8,
        restore_best_weights=True,
        verbose=1
    ),
    ReduceLROnPlateau(
        monitor='val_loss',
        factor=0.3,
        patience=4,
        min_lr=1e-7,
        verbose=1
    )
]

# ── Phase 1 : Entraînement tête uniquement ───────────────────
print("\n" + "="*55)
print("  PHASE 1 — Entraînement de la tête (10 epochs)")
print("="*55)

history1 = model.fit(
    train_generator,
    epochs=10,
    validation_data=val_generator,
    class_weight=class_weights,
    callbacks=callbacks,
    verbose=1
)

# ── Phase 2 : Fine-tuning ────────────────────────────────────
print("\n" + "="*55)
print("  PHASE 2 — Fine-tuning (20 epochs)")
print("="*55)

# Dégeler les 30 dernières couches de MobileNetV2
base_model.trainable = True
for layer in base_model.layers[:-30]:
    layer.trainable = False

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=0.0001),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

history2 = model.fit(
    train_generator,
    epochs=EPOCHS,
    initial_epoch=10,
    validation_data=val_generator,
    class_weight=class_weights,
    callbacks=callbacks,
    verbose=1
)

# ── Évaluation sur le test set ───────────────────────────────
print("\n" + "="*55)
print("  ÉVALUATION FINALE SUR LE TEST SET")
print("="*55)

test_loss, test_acc = model.evaluate(test_generator, verbose=1)
print(f"\n✅ Test Accuracy : {test_acc*100:.2f}%")
print(f"✅ Test Loss     : {test_loss:.4f}")

# ── Rapport par classe ───────────────────────────────────────
from sklearn.metrics import classification_report, confusion_matrix

print("\n📊 Rapport de classification par classe:")
y_pred = np.argmax(model.predict(test_generator), axis=1)
y_true = test_generator.classes[:len(y_pred)]

print(classification_report(y_true, y_pred, target_names=CLASSES))

# ── Courbes d'entraînement ───────────────────────────────────
print("\n📈 Génération des courbes d'entraînement...")

acc  = history1.history['accuracy']  + history2.history['accuracy']
val_acc  = history1.history['val_accuracy'] + history2.history['val_accuracy']
loss = history1.history['loss']      + history2.history['loss']
val_loss = history1.history['val_loss']    + history2.history['val_loss']

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
fig.suptitle('MONETA CNN — Courbes d\'entraînement', fontsize=14, fontweight='bold')

ax1.plot(acc,     label='Train Accuracy',      color='#c0392b')
ax1.plot(val_acc, label='Validation Accuracy', color='#c9a84c')
ax1.axvline(x=10, color='gray', linestyle='--', label='Fine-tuning start')
ax1.set_title('Accuracy')
ax1.set_xlabel('Epoch')
ax1.set_ylabel('Accuracy')
ax1.legend()
ax1.grid(True, alpha=0.3)

ax2.plot(loss,     label='Train Loss',      color='#c0392b')
ax2.plot(val_loss, label='Validation Loss', color='#c9a84c')
ax2.axvline(x=10, color='gray', linestyle='--', label='Fine-tuning start')
ax2.set_title('Loss')
ax2.set_xlabel('Epoch')
ax2.set_ylabel('Loss')
ax2.legend()
ax2.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig(HISTORY_PATH, dpi=120, bbox_inches='tight')
plt.show()
print(f"✅ Courbes sauvegardées : {HISTORY_PATH}")

# ── Résumé final ─────────────────────────────────────────────
print("\n" + "="*55)
print("  ✅ ENTRAÎNEMENT TERMINÉ !")
print(f"  Modèle sauvegardé : {MODEL_PATH}")
print(f"  Accuracy test     : {test_acc*100:.2f}%")
print("="*55)
print("\n🚀 Prêt pour l'Étape 3 — API FastAPI !")
