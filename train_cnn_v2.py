"""
MONETA — CNN Training V2 (Amélioré)
Meilleure accuracy avec rééquilibrage et EfficientNetB0
"""

import os
import numpy as np
import matplotlib.pyplot as plt
import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau

print("=" * 55)
print("  MONETA — CNN V2 — Classification Améliorée")
print("=" * 55)
print(f"  TensorFlow : {tf.__version__}")
print("=" * 55 + "\n")

# ── Config ────────────────────────────────────────────────────
IMG_SIZE    = 224
BATCH_SIZE  = 16       # Réduit pour CPU
EPOCHS      = 30
CLASSES     = ['Punique', 'Romaine', 'Byzantine',
               'Islamique', 'Numide', 'Medievale', 'Moderne']
NUM_CLASSES = len(CLASSES)
DATASET_DIR = "dataset"
MODEL_PATH  = "moneta_cnn_v2.h5"

# ── Augmentation forte pour les petites classes ───────────────
print("📦 Chargement dataset...")

train_datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=30,
    width_shift_range=0.2,
    height_shift_range=0.2,
    shear_range=0.15,
    zoom_range=0.25,
    horizontal_flip=True,
    vertical_flip=False,
    brightness_range=[0.7, 1.3],
    channel_shift_range=20.0,
    fill_mode='nearest'
)

val_datagen = ImageDataGenerator(rescale=1./255)

train_gen = train_datagen.flow_from_directory(
    f"{DATASET_DIR}/train",
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    classes=CLASSES,
    shuffle=True
)

val_gen = val_datagen.flow_from_directory(
    f"{DATASET_DIR}/validation",
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    classes=CLASSES,
    shuffle=False
)

test_gen = val_datagen.flow_from_directory(
    f"{DATASET_DIR}/test",
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    classes=CLASSES,
    shuffle=False
)

print(f"✅ Train: {train_gen.samples} | Val: {val_gen.samples} | Test: {test_gen.samples}")

# ── Poids des classes équilibrés ──────────────────────────────
print("\n⚖️  Calcul des poids de classes...")
total = train_gen.samples
class_weights = {}
for i, cls in enumerate(CLASSES):
    n = np.sum(train_gen.classes == i)
    w = (total / (NUM_CLASSES * n)) if n > 0 else 1.0
    class_weights[i] = w
    print(f"   {cls:15s}: {n:4d} images → poids {w:.3f}")

# ── Modèle EfficientNetB0 ─────────────────────────────────────
print("\n🧠 Construction CNN avec EfficientNetB0...")

base_model = EfficientNetB0(
    input_shape=(IMG_SIZE, IMG_SIZE, 3),
    include_top=False,
    weights='imagenet'
)
base_model.trainable = False

inputs = tf.keras.Input(shape=(IMG_SIZE, IMG_SIZE, 3))
x = base_model(inputs, training=False)
x = layers.GlobalAveragePooling2D()(x)
x = layers.BatchNormalization()(x)
x = layers.Dense(256, activation='relu',
                 kernel_regularizer=tf.keras.regularizers.l2(0.01))(x)
x = layers.Dropout(0.5)(x)
x = layers.Dense(128, activation='relu',
                 kernel_regularizer=tf.keras.regularizers.l2(0.01))(x)
x = layers.Dropout(0.3)(x)
outputs = layers.Dense(NUM_CLASSES, activation='softmax')(x)

model = tf.keras.Model(inputs, outputs)

model.compile(
    optimizer=tf.keras.optimizers.AdamW(learning_rate=0.001, weight_decay=0.0001),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

print(f"Paramètres totaux: {model.count_params():,}")

# ── Callbacks ─────────────────────────────────────────────────
callbacks = [
    ModelCheckpoint(MODEL_PATH, monitor='val_accuracy',
                    save_best_only=True, verbose=1),
    EarlyStopping(monitor='val_accuracy', patience=10,
                  restore_best_weights=True, verbose=1),
    ReduceLROnPlateau(monitor='val_loss', factor=0.3,
                      patience=4, min_lr=1e-7, verbose=1)
]

# ── Phase 1 : Tête seulement ──────────────────────────────────
print("\n" + "="*55)
print("  PHASE 1 — Entraînement tête (15 epochs max)")
print("="*55)

h1 = model.fit(
    train_gen,
    epochs=15,
    validation_data=val_gen,
    class_weight=class_weights,
    callbacks=callbacks,
    verbose=1
)

# ── Phase 2 : Fine-tuning ─────────────────────────────────────
print("\n" + "="*55)
print("  PHASE 2 — Fine-tuning couches profondes")
print("="*55)

base_model.trainable = True
# Geler les 100 premières couches
for layer in base_model.layers[:100]:
    layer.trainable = False

model.compile(
    optimizer=tf.keras.optimizers.AdamW(learning_rate=0.00005, weight_decay=0.0001),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

h2 = model.fit(
    train_gen,
    epochs=EPOCHS,
    initial_epoch=len(h1.history['accuracy']),
    validation_data=val_gen,
    class_weight=class_weights,
    callbacks=callbacks,
    verbose=1
)

# ── Évaluation ────────────────────────────────────────────────
print("\n" + "="*55)
print("  ÉVALUATION FINALE")
print("="*55)

loss, acc = model.evaluate(test_gen, verbose=1)
print(f"\n✅ Test Accuracy : {acc*100:.2f}%")
print(f"✅ Test Loss     : {loss:.4f}")

from sklearn.metrics import classification_report
y_pred = np.argmax(model.predict(test_gen), axis=1)
y_true = test_gen.classes[:len(y_pred)]
print("\n📊 Rapport détaillé:")
print(classification_report(y_true, y_pred, target_names=CLASSES))

# ── Courbes ───────────────────────────────────────────────────
acc_all     = h1.history['accuracy']     + h2.history['accuracy']
val_acc_all = h1.history['val_accuracy'] + h2.history['val_accuracy']
loss_all    = h1.history['loss']         + h2.history['loss']
val_loss_all= h1.history['val_loss']     + h2.history['val_loss']
ep1 = len(h1.history['accuracy'])

fig, axes = plt.subplots(1, 2, figsize=(14, 5))
fig.suptitle('MONETA CNN V2 — Courbes d\'entraînement', fontsize=13, fontweight='bold')

axes[0].plot(acc_all,     label='Train',      color='#c0392b', linewidth=2)
axes[0].plot(val_acc_all, label='Validation', color='#c9a84c', linewidth=2)
axes[0].axvline(x=ep1, color='gray', linestyle='--', label='Fine-tuning')
axes[0].set_title('Accuracy'); axes[0].legend(); axes[0].grid(alpha=0.3)
axes[0].set_ylabel('Accuracy'); axes[0].set_xlabel('Epoch')

axes[1].plot(loss_all,     label='Train',      color='#c0392b', linewidth=2)
axes[1].plot(val_loss_all, label='Validation', color='#c9a84c', linewidth=2)
axes[1].axvline(x=ep1, color='gray', linestyle='--', label='Fine-tuning')
axes[1].set_title('Loss'); axes[1].legend(); axes[1].grid(alpha=0.3)
axes[1].set_ylabel('Loss'); axes[1].set_xlabel('Epoch')

plt.tight_layout()
plt.savefig('training_history_v2.png', dpi=120, bbox_inches='tight')
plt.show()

# ── Sauvegarder les infos du modèle ──────────────────────────
import json
model_info = {
    "classes":    CLASSES,
    "img_size":   IMG_SIZE,
    "accuracy":   float(acc),
    "model_path": MODEL_PATH,
    "num_classes": NUM_CLASSES
}
with open("model_info.json", "w") as f:
    json.dump(model_info, f, indent=2)

print("\n" + "="*55)
print("  ✅ ENTRAÎNEMENT V2 TERMINÉ !")
print(f"  Modèle     : {MODEL_PATH}")
print(f"  Info JSON  : model_info.json")
print(f"  Accuracy   : {acc*100:.2f}%")
print("="*55)
print("\n🚀 Prêt pour l'Étape 3 — API FastAPI !")
