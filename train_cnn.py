"""
MONETA — CNN Training Script Optimisé
Objectif : 80%+ accuracy sur 7 classes historiques
Architecture : EfficientNetB0 + Transfer Learning + Fine-tuning
"""

import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras.models import Model
from tensorflow.keras.layers import (
    GlobalAveragePooling2D, Dense, Dropout, BatchNormalization
)
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import (
    EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
)
from tensorflow.keras.optimizers import Adam
from sklearn.utils.class_weight import compute_class_weight

# ══════════════════════════════════════════════════════════════
#  CONFIGURATION
# ══════════════════════════════════════════════════════════════

DATASET_DIR  = "dataset"
MODEL_OUTPUT = "moneta_cnn_model.h5"
IMG_SIZE     = 224
BATCH_SIZE   = 16
EPOCHS_P1    = 20
EPOCHS_P2    = 30
CLASSES      = ['Byzantine', 'Islamique', 'Medievale',
                'Moderne', 'Numide', 'Punique', 'Romaine']

print("=" * 55)
print("  MONETA CNN — Entrainement EfficientNetB0")
print("=" * 55)
print(f"  GPU disponible : {len(tf.config.list_physical_devices('GPU')) > 0}")
print(f"  TensorFlow     : {tf.__version__}")
print()

# ══════════════════════════════════════════════════════════════
#  ETAPE 1 — AUGMENTATION DES DONNEES
# ══════════════════════════════════════════════════════════════

train_datagen = ImageDataGenerator(
    rescale=1.0 / 255,
    rotation_range=40,
    width_shift_range=0.3,
    height_shift_range=0.3,
    shear_range=0.3,
    zoom_range=0.4,
    horizontal_flip=True,
    vertical_flip=True,
    brightness_range=[0.6, 1.4],
    fill_mode='nearest'
)

val_datagen = ImageDataGenerator(rescale=1.0 / 255)

train_generator = train_datagen.flow_from_directory(
    os.path.join(DATASET_DIR, 'train'),
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    classes=CLASSES,
    shuffle=True,
    seed=42
)

val_generator = val_datagen.flow_from_directory(
    os.path.join(DATASET_DIR, 'validation'),
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    classes=CLASSES,
    shuffle=False
)

print(f"Train     : {train_generator.samples} images")
print(f"Validation: {val_generator.samples} images")
print(f"Classes   : {train_generator.class_indices}\n")

# ══════════════════════════════════════════════════════════════
#  ETAPE 2 — CLASS WEIGHTS
# ══════════════════════════════════════════════════════════════

labels = train_generator.classes
class_weights_array = compute_class_weight(
    class_weight='balanced',
    classes=np.unique(labels),
    y=labels
)
class_weights = dict(enumerate(class_weights_array))

print("Class weights :")
for idx, cls in enumerate(CLASSES):
    print(f"   {cls:15s} : {class_weights[idx]:.3f}")

# ══════════════════════════════════════════════════════════════
#  ETAPE 3 — CONSTRUCTION DU MODELE EfficientNetB0
# ══════════════════════════════════════════════════════════════

def build_model(num_classes=7, trainable_base=False):
    base = EfficientNetB0(
        weights='imagenet',
        include_top=False,
        input_shape=(IMG_SIZE, IMG_SIZE, 3)
    )
    base.trainable = trainable_base

    x = base.output
    x = GlobalAveragePooling2D()(x)
    x = BatchNormalization()(x)
    x = Dense(512, activation='relu')(x)
    x = Dropout(0.5)(x)
    x = Dense(256, activation='relu')(x)
    x = Dropout(0.3)(x)
    output = Dense(num_classes, activation='softmax')(x)

    return Model(inputs=base.input, outputs=output), base

# ══════════════════════════════════════════════════════════════
#  PHASE 1 — BASE GELEE
# ══════════════════════════════════════════════════════════════

print("\n" + "=" * 55)
print("  PHASE 1 — Entrainement tete (base gelee)")
print("=" * 55)

model, base_model = build_model(num_classes=len(CLASSES), trainable_base=False)

model.compile(
    optimizer=Adam(learning_rate=1e-3),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

callbacks_p1 = [
    EarlyStopping(
        monitor='val_accuracy',
        patience=6,
        restore_best_weights=True,
        verbose=1
    ),
    ReduceLROnPlateau(
        monitor='val_loss',
        factor=0.3,
        patience=3,
        min_lr=1e-7,
        verbose=1
    ),
    ModelCheckpoint(
        'best_phase1.h5',
        monitor='val_accuracy',
        save_best_only=True,
        verbose=0
    )
]

history_p1 = model.fit(
    train_generator,
    epochs=EPOCHS_P1,
    validation_data=val_generator,
    class_weight=class_weights,
    callbacks=callbacks_p1,
    verbose=1
)

acc_p1 = max(history_p1.history['val_accuracy']) * 100
print(f"\nPhase 1 terminee — Meilleure val_accuracy : {acc_p1:.1f}%\n")

# ══════════════════════════════════════════════════════════════
#  PHASE 2 — FINE-TUNING (30 dernieres couches)
# ══════════════════════════════════════════════════════════════

print("=" * 55)
print("  PHASE 2 — Fine-tuning (30 dernieres couches)")
print("=" * 55)

base_model.trainable = True
for layer in base_model.layers[:-30]:
    layer.trainable = False

model.compile(
    optimizer=Adam(learning_rate=1e-5),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

callbacks_p2 = [
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
        min_lr=1e-8,
        verbose=1
    ),
    ModelCheckpoint(
        MODEL_OUTPUT,
        monitor='val_accuracy',
        save_best_only=True,
        verbose=1
    )
]

history_p2 = model.fit(
    train_generator,
    epochs=EPOCHS_P2,
    validation_data=val_generator,
    class_weight=class_weights,
    callbacks=callbacks_p2,
    verbose=1
)

acc_p2 = max(history_p2.history['val_accuracy']) * 100
print(f"\nPhase 2 terminee — Meilleure val_accuracy : {acc_p2:.1f}%\n")

# ══════════════════════════════════════════════════════════════
#  ETAPE 4 — EVALUATION FINALE SUR LE TEST SET
# ══════════════════════════════════════════════════════════════

print("=" * 55)
print("  EVALUATION FINALE sur le Test Set")
print("=" * 55)

best_model = tf.keras.models.load_model(MODEL_OUTPUT)

test_datagen = ImageDataGenerator(rescale=1.0 / 255)
test_generator = test_datagen.flow_from_directory(
    os.path.join(DATASET_DIR, 'test'),
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    classes=CLASSES,
    shuffle=False
)

test_loss, test_accuracy = best_model.evaluate(test_generator, verbose=1)

print(f"\n{'=' * 55}")
print(f"  RESULTATS FINAUX")
print(f"{'=' * 55}")
print(f"  Phase 1 val_accuracy : {acc_p1:.1f}%")
print(f"  Phase 2 val_accuracy : {acc_p2:.1f}%")
print(f"  Test accuracy        : {test_accuracy * 100:.1f}%")
print(f"  Test loss            : {test_loss:.4f}")
print(f"{'=' * 55}")
print(f"\nModele sauvegarde : {MODEL_OUTPUT}")

# ══════════════════════════════════════════════════════════════
#  ETAPE 5 — RAPPORT PAR CLASSE
# ══════════════════════════════════════════════════════════════

print("\nRapport de classification par classe :\n")

from sklearn.metrics import classification_report, confusion_matrix

predictions = best_model.predict(test_generator, verbose=0)
y_pred = np.argmax(predictions, axis=1)
y_true = test_generator.classes

print(classification_report(
    y_true, y_pred,
    target_names=CLASSES,
    digits=3
))

print("\nMatrice de confusion :")
cm = confusion_matrix(y_true, y_pred)
print("         ", "  ".join(f"{c[:4]:>6}" for c in CLASSES))
for i, row in enumerate(cm):
    print(f"  {CLASSES[i][:8]:>8} ", "  ".join(f"{v:>6}" for v in row))

print(f"\nLance l'API : python api_cnn.py")