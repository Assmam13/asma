"""
MONETA — CNN Training Script FIXED
Probleme resolu : L2 trop fort + EfficientNet incompatible avec TF 2.21
Solution : MobileNetV2 + sans L2 + augmentation moderee
"""

import os
import numpy as np
import matplotlib.pyplot as plt
import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
from sklearn.utils.class_weight import compute_class_weight

print("=" * 55)
print("  MONETA — CNN FIXED — MobileNetV2")
print("=" * 55)
print(f"  TensorFlow : {tf.__version__}")
print("=" * 55 + "\n")

# ── Config ─────────────────────────────────────────────────
IMG_SIZE    = 224
BATCH_SIZE  = 16
CLASSES     = ['Byzantine', 'Islamique', 'Medievale',
               'Moderne', 'Numide', 'Punique', 'Romaine']
NUM_CLASSES = len(CLASSES)
DATASET_DIR = "dataset"
MODEL_PATH  = "moneta_cnn_fixed.h5"

# ── Augmentation SANS L2 ni channel_shift ──────────────────
train_datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=25,
    width_shift_range=0.15,
    height_shift_range=0.15,
    zoom_range=0.2,
    horizontal_flip=True,
    vertical_flip=True,
    brightness_range=[0.8, 1.2],
    fill_mode='nearest'
)

val_datagen = ImageDataGenerator(rescale=1./255)

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

print(f"Train: {train_gen.samples} | Val: {val_gen.samples} | Test: {test_gen.samples}")

# ── Class weights avec sklearn (plus precis) ───────────────
labels = train_gen.classes
cw_array = compute_class_weight(
    class_weight='balanced',
    classes=np.unique(labels),
    y=labels
)
class_weights = dict(enumerate(cw_array))

print("\nClass weights:")
for i, cls in enumerate(CLASSES):
    print(f"  {cls:15s} : {class_weights[i]:.3f}")

# ── Modele MobileNetV2 SANS regularisation L2 ──────────────
print("\nConstruction MobileNetV2...")

base_model = MobileNetV2(
    input_shape=(IMG_SIZE, IMG_SIZE, 3),
    include_top=False,
    weights='imagenet'
)
base_model.trainable = False

inputs = tf.keras.Input(shape=(IMG_SIZE, IMG_SIZE, 3))
x = base_model(inputs, training=False)
x = layers.GlobalAveragePooling2D()(x)
x = layers.BatchNormalization()(x)
x = layers.Dense(512, activation='relu')(x)   # PAS de L2
x = layers.Dropout(0.4)(x)
x = layers.Dense(256, activation='relu')(x)   # PAS de L2
x = layers.Dropout(0.3)(x)
outputs = layers.Dense(NUM_CLASSES, activation='softmax')(x)

model = tf.keras.Model(inputs, outputs)

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

print(f"Parametres : {model.count_params():,}")

# ── Callbacks ──────────────────────────────────────────────
callbacks_p1 = [
    ModelCheckpoint(MODEL_PATH, monitor='val_accuracy',
                    save_best_only=True, verbose=1),
    EarlyStopping(monitor='val_accuracy', patience=7,
                  restore_best_weights=True, verbose=1),
    ReduceLROnPlateau(monitor='val_loss', factor=0.5,
                      patience=3, min_lr=1e-6, verbose=1)
]

# ── PHASE 1 : tete uniquement ──────────────────────────────
print("\n" + "="*55)
print("  PHASE 1 — Tete uniquement (20 epochs max)")
print("="*55)

h1 = model.fit(
    train_gen,
    epochs=20,
    validation_data=val_gen,
    class_weight=class_weights,
    callbacks=callbacks_p1,
    verbose=1
)

acc_p1 = max(h1.history['val_accuracy']) * 100
print(f"\nPhase 1 terminee — val_accuracy max : {acc_p1:.1f}%")

# ── PHASE 2 : fine-tuning 30 dernieres couches ─────────────
print("\n" + "="*55)
print("  PHASE 2 — Fine-tuning (30 dernieres couches)")
print("="*55)

base_model.trainable = True
for layer in base_model.layers[:-30]:
    layer.trainable = False

trainable = sum(1 for l in model.layers if l.trainable)
print(f"  Couches entrainables : {trainable}")

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

callbacks_p2 = [
    ModelCheckpoint(MODEL_PATH, monitor='val_accuracy',
                    save_best_only=True, verbose=1),
    EarlyStopping(monitor='val_accuracy', patience=8,
                  restore_best_weights=True, verbose=1),
    ReduceLROnPlateau(monitor='val_loss', factor=0.3,
                      patience=4, min_lr=1e-8, verbose=1)
]

h2 = model.fit(
    train_gen,
    epochs=30,
    initial_epoch=len(h1.history['accuracy']),
    validation_data=val_gen,
    class_weight=class_weights,
    callbacks=callbacks_p2,
    verbose=1
)

acc_p2 = max(h2.history['val_accuracy']) * 100
print(f"\nPhase 2 terminee — val_accuracy max : {acc_p2:.1f}%")

# ── EVALUATION FINALE ──────────────────────────────────────
print("\n" + "="*55)
print("  EVALUATION FINALE")
print("="*55)

best_model = tf.keras.models.load_model(MODEL_PATH)
test_loss, test_acc = best_model.evaluate(test_gen, verbose=1)

print(f"\nPhase 1 val_accuracy : {acc_p1:.1f}%")
print(f"Phase 2 val_accuracy : {acc_p2:.1f}%")
print(f"Test accuracy        : {test_acc*100:.1f}%")
print(f"Test loss            : {test_loss:.4f}")

# ── RAPPORT PAR CLASSE ─────────────────────────────────────
from sklearn.metrics import classification_report, confusion_matrix

y_pred = np.argmax(best_model.predict(test_gen, verbose=0), axis=1)
y_true = test_gen.classes

print("\nRapport par classe :")
print(classification_report(y_true, y_pred, target_names=CLASSES, digits=3))

print("\nMatrice de confusion :")
cm = confusion_matrix(y_true, y_pred)
print("         ", "  ".join(f"{c[:4]:>6}" for c in CLASSES))
for i, row in enumerate(cm):
    print(f"  {CLASSES[i][:8]:>8} ", "  ".join(f"{v:>6}" for v in row))

# ── COURBES ────────────────────────────────────────────────
acc_all     = h1.history['accuracy']     + h2.history['accuracy']
val_acc_all = h1.history['val_accuracy'] + h2.history['val_accuracy']
loss_all    = h1.history['loss']         + h2.history['loss']
val_loss_all= h1.history['val_loss']     + h2.history['val_loss']
ep1 = len(h1.history['accuracy'])

fig, axes = plt.subplots(1, 2, figsize=(14, 5))
fig.suptitle('MONETA CNN Fixed — Courbes', fontsize=13, fontweight='bold')

axes[0].plot(acc_all,     label='Train',      color='#c0392b', linewidth=2)
axes[0].plot(val_acc_all, label='Validation', color='#c9a84c', linewidth=2)
axes[0].axvline(x=ep1, color='gray', linestyle='--', label='Fine-tuning')
axes[0].set_title('Accuracy'); axes[0].legend(); axes[0].grid(alpha=0.3)

axes[1].plot(loss_all,     label='Train',      color='#c0392b', linewidth=2)
axes[1].plot(val_loss_all, label='Validation', color='#c9a84c', linewidth=2)
axes[1].axvline(x=ep1, color='gray', linestyle='--', label='Fine-tuning')
axes[1].set_title('Loss'); axes[1].legend(); axes[1].grid(alpha=0.3)

plt.tight_layout()
plt.savefig('training_history_fixed.png', dpi=120, bbox_inches='tight')
plt.show()

print(f"\nModele sauvegarde : {MODEL_PATH}")
print(f"Lance l'API : python api_cnn.py")