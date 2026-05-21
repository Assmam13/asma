"""
MONETA — Augmentation du dataset de VALIDATION
Objectif : 100 images minimum par classe dans validation/
"""

import os
import random
from PIL import Image, ImageEnhance, ImageFilter

DATASET_DIR = "dataset"
CLASSES     = ['Byzantine', 'Islamique', 'Medievale',
               'Moderne', 'Numide', 'Punique', 'Romaine']
TARGET      = 100
random.seed(99)

def augment_image(img):
    ops = random.sample(['rotate','flip_h','brightness','contrast','blur'], 2)
    for op in ops:
        if op == 'rotate':
            img = img.rotate(random.uniform(-25, 25), fillcolor=(128,128,128))
        elif op == 'flip_h':
            img = img.transpose(Image.FLIP_LEFT_RIGHT)
        elif op == 'brightness':
            img = ImageEnhance.Brightness(img).enhance(random.uniform(0.7, 1.3))
        elif op == 'contrast':
            img = ImageEnhance.Contrast(img).enhance(random.uniform(0.7, 1.3))
        elif op == 'blur':
            img = img.filter(ImageFilter.GaussianBlur(random.uniform(0, 1)))
    return img

print("=" * 50)
print(f"  Augmentation VALIDATION — objectif {TARGET}/classe")
print("=" * 50 + "\n")

for cls in CLASSES:
    folder = os.path.join(DATASET_DIR, 'validation', cls)
    if not os.path.exists(folder):
        print(f"  SKIP {cls}")
        continue

    existing = [f for f in os.listdir(folder)
                if f.lower().endswith(('.jpg','.jpeg','.png'))
                and not f.startswith('aug_')]
    current  = len(existing)
    needed   = max(0, TARGET - current)

    print(f"  {cls:15s} : {current} → besoin {needed}")
    if needed == 0:
        print(f"               OK")
        continue

    created = 0
    idx = 0
    while created < needed:
        src = existing[idx % len(existing)]
        idx += 1
        try:
            img = Image.open(os.path.join(folder, src)).convert('RGB')
            img = img.resize((224, 224), Image.LANCZOS)
            aug = augment_image(img)
            out = os.path.join(folder, f"aug_{created:03d}_{src}")
            aug.save(out, 'JPEG', quality=90)
            created += 1
        except:
            continue
    print(f"               {created} creees !")

print("\nDataset validation final :")
for cls in CLASSES:
    folder = os.path.join(DATASET_DIR, 'validation', cls)
    n = len([f for f in os.listdir(folder)
             if f.lower().endswith(('.jpg','.jpeg','.png'))])
    print(f"  {cls:15s} : {n}")
print("\nLance maintenant : python train_cnn_best.py")