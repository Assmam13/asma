"""
MONETA — CNN 4 Classes OPTIMISE
Corrections : dropout plus fort + augmentation plus forte + lr plus bas
Objectif : 65-75% sur CPU
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
from sklearn.metrics import classification_report

print("=" * 55)
print("  MONETA — CNN 4 Classes OPTIMISE")
print("=" * 55)
print(f"  TensorFlow : {tf.__version__}\n")

IMG_SIZE    = 224
BATCH_SIZE  = 16
DATASET_DIR = "dataset"
MODEL_PATH  = "moneta_cnn_4classes.h5"
CLASSES     = ['Islamique', 'Medievale', 'Moderne', 'Romaine']
NUM_CLASSES = len(CLASSES)

# Augmentation plus forte pour eviter l'overfit
train_datagen = ImageDataGenerator(
    preprocessing_function=preprocess_input,
    rotation_range=40,
    width_shift_range=0.25,
    height_shift_range=0.25,
    shear_range=0.2,
    zoom_range=0.3,
    horizontal_flip=True,
    vertical_flip=True,
    brightness_range=[0.7, 1.3],
    fill_mode='nearest'
)

val_datagen = ImageDataGenerator(preprocessing_function=preprocess_input)

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

print(f"Train : {train_gen.samples} | Val : {val_gen.samples} | Test : {test_gen.samples}\n")

labels = train_gen.classes
cw = compute_class_weight('balanced', classes=np.unique(labels), y=labels)
class_weights = dict(enumerate(cw))
print("Class weights :")
for i, cls in enumerate(CLASSES):
    print(f"  {cls:15s} : {class_weights[i]:.3f}")

print("\nConstruction modele optimise...")

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
x = layers.Dense(256, activation='relu')(x)
x = layers.Dropout(0.5)(x)
x = layers.Dense(128, activation='relu')(x)
x = layers.Dropout(0.4)(x)
outputs = layers.Dense(NUM_CLASSES, activation='softmax')(x)

model = tf.keras.Model(inputs, outputs)
model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=0.0005),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)
print(f"Parametres : {model.count_params():,}\n")

print("=" * 55)
print("  PHASE 1 — Tete uniquement (30 epochs max)")
print("=" * 55)

cb1 = [
    ModelCheckpoint("best_p1.h5", monitor='val_accuracy',
                    save_best_only=True, verbose=1),
    EarlyStopping(monitor='val_accuracy', patience=10,
                  restore_best_weights=True, verbose=1),
    ReduceLROnPlateau(monitor='val_loss', factor=0.5,
                      patience=4, min_lr=1e-6, verbose=1)
]

h1 = model.fit(
    train_gen, epochs=30,
    validation_data=val_gen,
    class_weight=class_weights,
    callbacks=cb1, verbose=1
)
acc_p1 = max(h1.history['val_accuracy']) * 100
print(f"\nPhase 1 — val_accuracy max : {acc_p1:.1f}%")

print("\n" + "=" * 55)
print("  PHASE 2 — Fine-tuning 30 dernieres couches")
print("=" * 55)

base.trainable = True
for layer in base.layers[:-30]:
    layer.trainable = False

model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=5e-5),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

cb2 = [
    ModelCheckpoint(MODEL_PATH, monitor='val_accuracy',
                    save_best_only=True, verbose=1),
    EarlyStopping(monitor='val_accuracy', patience=12,
                  restore_best_weights=True, verbose=1),
    ReduceLROnPlateau(monitor='val_loss', factor=0.3,
                      patience=5, min_lr=1e-8, verbose=1)
]

ep1 = len(h1.history['accuracy'])
h2 = model.fit(
    train_gen,
    epochs=ep1 + 50,
    initial_epoch=ep1,
    validation_data=val_gen,
    class_weight=class_weights,
    callbacks=cb2, verbose=1
)
acc_p2 = max(h2.history['val_accuracy']) * 100
print(f"\nPhase 2 — val_accuracy max : {acc_p2:.1f}%")

print("\n" + "=" * 55)
print("  EVALUATION FINALE")
print("=" * 55)

best = tf.keras.models.load_model(MODEL_PATH)
test_loss, test_acc = best.evaluate(test_gen, verbose=1)

print(f"\n{'='*55}")
print(f"  Phase 1 : {acc_p1:.1f}%")
print(f"  Phase 2 : {acc_p2:.1f}%")
print(f"  TEST    : {test_acc*100:.1f}%")
print(f"{'='*55}")

y_pred = np.argmax(best.predict(test_gen, verbose=0), axis=1)
y_true = test_gen.classes

print("\nRapport par classe :")
print(classification_report(y_true, y_pred,
      target_names=CLASSES, digits=3, zero_division=0))

acc_all = h1.history['accuracy'] + h2.history['accuracy']
val_all = h1.history['val_accuracy'] + h2.history['val_accuracy']

plt.figure(figsize=(10, 5))
plt.plot(acc_all, label='Train', color='#c0392b', linewidth=2)
plt.plot(val_all, label='Validation', color='#c9a84c', linewidth=2)
plt.axvline(x=ep1, color='blue', linestyle='--', label='Phase 2')
plt.title('MONETA CNN 4 Classes Optimise', fontsize=13, fontweight='bold')
plt.xlabel('Epoch')
plt.ylabel('Accuracy')
plt.legend()
plt.grid(alpha=0.3)
plt.tight_layout()
plt.savefig('training_4classes_opt.png', dpi=120)
plt.show()

print(f"\nModele sauvegarde : {MODEL_PATH}")
