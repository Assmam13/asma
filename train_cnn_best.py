"""
MONETA — CNN BEST — MobileNetV2 avec preprocessing correct
Correction principale : preprocess_input au lieu de rescale 1/255
"""

import os
import numpy as np
import matplotlib.pyplot as plt
import tensorflow as tf
from tensorflow.keras import layers
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
from sklearn.utils.class_weight import compute_class_weight
from sklearn.metrics import classification_report, confusion_matrix

print("=" * 55)
print("  MONETA — CNN BEST — MobileNetV2 + preprocess_input")
print("=" * 55)
print(f"  TensorFlow : {tf.__version__}")
print("=" * 55 + "\n")

IMG_SIZE    = 224
BATCH_SIZE  = 16
CLASSES     = ['Byzantine', 'Islamique', 'Medievale',
               'Moderne', 'Numide', 'Punique', 'Romaine']
NUM_CLASSES = len(CLASSES)
DATASET_DIR = "dataset"
MODEL_PATH  = "moneta_cnn_best.h5"

# ── CORRECTION PRINCIPALE : preprocess_input ───────────────
# MobileNetV2 attend des valeurs entre -1 et 1, pas entre 0 et 1
# rescale=1./255 donnait des valeurs entre 0 et 1 → MAUVAIS
# preprocess_input convertit correctement → BON

train_datagen = ImageDataGenerator(
    preprocessing_function=preprocess_input,   # CORRECT
    rotation_range=25,
    width_shift_range=0.15,
    height_shift_range=0.15,
    zoom_range=0.2,
    horizontal_flip=True,
    vertical_flip=True,
    brightness_range=[0.8, 1.2],
    fill_mode='nearest'
)

val_datagen = ImageDataGenerator(
    preprocessing_function=preprocess_input    # CORRECT
)

train_gen = train_datagen.flow_from_directory(
    f"{DATASET_DIR}/train",
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    classes=CLASSES,
    shuffle=True,
    seed=42
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

print(f"Train : {train_gen.samples} | Val : {val_gen.samples} | Test : {test_gen.samples}")

# ── Class weights ──────────────────────────────────────────
labels = train_gen.classes
cw = compute_class_weight('balanced', classes=np.unique(labels), y=labels)
class_weights = dict(enumerate(cw))
print("\nClass weights :")
for i, cls in enumerate(CLASSES):
    print(f"  {cls:15s} : {class_weights[i]:.3f}")

# ── Modele MobileNetV2 ─────────────────────────────────────
print("\nConstruction MobileNetV2...")

base = MobileNetV2(
    input_shape=(IMG_SIZE, IMG_SIZE, 3),
    include_top=False,
    weights='imagenet'
)
base.trainable = False

inputs = tf.keras.Input(shape=(IMG_SIZE, IMG_SIZE, 3))
x = base(inputs, training=False)
x = layers.GlobalAveragePooling2D()(x)
x = layers.BatchNormalization()(x)
x = layers.Dense(512, activation='relu')(x)
x = layers.Dropout(0.4)(x)
x = layers.Dense(256, activation='relu')(x)
x = layers.Dropout(0.3)(x)
outputs = layers.Dense(NUM_CLASSES, activation='softmax')(x)

model = tf.keras.Model(inputs, outputs)
model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)
print(f"Parametres : {model.count_params():,}")

# ── PHASE 1 ────────────────────────────────────────────────
print("\n" + "="*55)
print("  PHASE 1 — Tete uniquement (25 epochs max)")
print("="*55)

cb1 = [
    ModelCheckpoint("best_p1.keras", monitor='val_accuracy',
                    save_best_only=True, verbose=1),
    EarlyStopping(monitor='val_accuracy', patience=8,
                  restore_best_weights=True, verbose=1),
    ReduceLROnPlateau(monitor='val_loss', factor=0.5,
                      patience=3, min_lr=1e-6, verbose=1)
]

h1 = model.fit(
    train_gen, epochs=25,
    validation_data=val_gen,
    class_weight=class_weights,
    callbacks=cb1, verbose=1
)
acc_p1 = max(h1.history['val_accuracy']) * 100
print(f"\nPhase 1 — val_accuracy max : {acc_p1:.1f}%")

# ── PHASE 2 : fine-tuning 50 couches ──────────────────────
print("\n" + "="*55)
print("  PHASE 2 — Fine-tuning 50 dernieres couches")
print("="*55)

base.trainable = True
for layer in base.layers[:-50]:
    layer.trainable = False

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-4),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

cb2 = [
    ModelCheckpoint(MODEL_PATH, monitor='val_accuracy',
                    save_best_only=True, verbose=1),
    EarlyStopping(monitor='val_accuracy', patience=10,
                  restore_best_weights=True, verbose=1),
    ReduceLROnPlateau(monitor='val_loss', factor=0.3,
                      patience=4, min_lr=1e-8, verbose=1)
]

ep1 = len(h1.history['accuracy'])
h2 = model.fit(
    train_gen,
    epochs=ep1 + 40,
    initial_epoch=ep1,
    validation_data=val_gen,
    class_weight=class_weights,
    callbacks=cb2, verbose=1
)
acc_p2 = max(h2.history['val_accuracy']) * 100
print(f"\nPhase 2 — val_accuracy max : {acc_p2:.1f}%")

# ── PHASE 3 : fine-tuning complet lr faible ───────────────
print("\n" + "="*55)
print("  PHASE 3 — Fine-tuning complet (lr = 1e-5)")
print("="*55)

base.trainable = True
model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

cb3 = [
    ModelCheckpoint(MODEL_PATH, monitor='val_accuracy',
                    save_best_only=True, verbose=1),
    EarlyStopping(monitor='val_accuracy', patience=8,
                  restore_best_weights=True, verbose=1),
]

ep2 = ep1 + len(h2.history['accuracy'])
h3 = model.fit(
    train_gen,
    epochs=ep2 + 20,
    initial_epoch=ep2,
    validation_data=val_gen,
    class_weight=class_weights,
    callbacks=cb3, verbose=1
)
acc_p3 = max(h3.history['val_accuracy']) * 100
print(f"\nPhase 3 — val_accuracy max : {acc_p3:.1f}%")

# ── EVALUATION FINALE ──────────────────────────────────────
print("\n" + "="*55)
print("  EVALUATION FINALE")
print("="*55)

best = tf.keras.models.load_model(MODEL_PATH)
test_loss, test_acc = best.evaluate(test_gen, verbose=1)

print(f"\n{'='*55}")
print(f"  Phase 1 : {acc_p1:.1f}%")
print(f"  Phase 2 : {acc_p2:.1f}%")
print(f"  Phase 3 : {acc_p3:.1f}%")
print(f"  TEST    : {test_acc*100:.1f}%")
print(f"{'='*55}")

y_pred = np.argmax(best.predict(test_gen, verbose=0), axis=1)
y_true = test_gen.classes
print("\nRapport par classe :")
print(classification_report(y_true, y_pred,
      target_names=CLASSES, digits=3, zero_division=0))

cm = confusion_matrix(y_true, y_pred)
print("\nMatrice de confusion :")
print("         ", "  ".join(f"{c[:4]:>6}" for c in CLASSES))
for i, row in enumerate(cm):
    print(f"  {CLASSES[i][:8]:>8} ", "  ".join(f"{v:>6}" for v in row))

# ── COURBES ────────────────────────────────────────────────
acc_all = h1.history['accuracy'] + h2.history['accuracy'] + h3.history['accuracy']
val_all = h1.history['val_accuracy'] + h2.history['val_accuracy'] + h3.history['val_accuracy']

plt.figure(figsize=(10, 5))
plt.plot(acc_all, label='Train', color='#c0392b', linewidth=2)
plt.plot(val_all, label='Validation', color='#c9a84c', linewidth=2)
plt.axvline(x=ep1, color='blue', linestyle='--', label='Phase 2')
plt.axvline(x=ep2, color='green', linestyle='--', label='Phase 3')
plt.title('MONETA CNN Best — Accuracy', fontsize=13, fontweight='bold')
plt.xlabel('Epoch'); plt.ylabel('Accuracy')
plt.legend(); plt.grid(alpha=0.3)
plt.tight_layout()
plt.savefig('training_best.png', dpi=120)
plt.show()

print(f"\nModele sauvegarde : {MODEL_PATH}")
