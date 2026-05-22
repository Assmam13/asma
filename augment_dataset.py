"""
MONETA — Augmentation artificielle du dataset
Objectif : amener chaque classe a 600 images minimum
Lance ce script AVANT train_cnn.py
"""

import os
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
import random

DATASET_DIR = "dataset"
CLASSES     = ['Byzantine', 'Islamique', 'Medievale',
               'Moderne', 'Numide', 'Punique', 'Romaine']
TARGET      = 600   # images minimum par classe dans train/

random.seed(42)
np.random.seed(42)

def augment_image(img):
    """Applique une transformation aleatoire a une image PIL"""
    ops = random.randint(2, 4)
    chosen = random.sample([
        'rotate', 'flip_h', 'flip_v', 'brightness',
        'contrast', 'blur', 'crop', 'color'
    ], ops)

    for op in chosen:
        if op == 'rotate':
            angle = random.uniform(-40, 40)
            img = img.rotate(angle, fillcolor=(128, 128, 128))

        elif op == 'flip_h':
            img = img.transpose(Image.FLIP_LEFT_RIGHT)

        elif op == 'flip_v':
            img = img.transpose(Image.FLIP_TOP_BOTTOM)

        elif op == 'brightness':
            factor = random.uniform(0.6, 1.4)
            img = ImageEnhance.Brightness(img).enhance(factor)

        elif op == 'contrast':
            factor = random.uniform(0.7, 1.3)
            img = ImageEnhance.Contrast(img).enhance(factor)

        elif op == 'blur':
            img = img.filter(ImageFilter.GaussianBlur(radius=random.uniform(0, 1.5)))

        elif op == 'crop':
            w, h = img.size
            margin = int(min(w, h) * 0.1)
            left   = random.randint(0, margin)
            top    = random.randint(0, margin)
            right  = w - random.randint(0, margin)
            bottom = h - random.randint(0, margin)
            img = img.crop((left, top, right, bottom))
            img = img.resize((224, 224), Image.LANCZOS)

        elif op == 'color':
            factor = random.uniform(0.7, 1.3)
            img = ImageEnhance.Color(img).enhance(factor)

    return img

print("=" * 55)
print("  MONETA — Augmentation artificielle du dataset")
print(f"  Objectif : {TARGET} images par classe")
print("=" * 55 + "\n")

total_created = 0

for cls in CLASSES:
    folder = os.path.join(DATASET_DIR, 'train', cls)
    if not os.path.exists(folder):
        print(f"  SKIP {cls} — dossier introuvable")
        continue

    # Images existantes
    existing = [f for f in os.listdir(folder)
                if f.lower().endswith(('.jpg', '.jpeg', '.png'))
                and not f.startswith('aug_')]
    current  = len(existing)
    needed   = max(0, TARGET - current)

    print(f"  {cls:15s} : {current} images → besoin de {needed} augmentees")

    if needed == 0:
        print(f"               Deja OK !")
        continue

    created = 0
    idx     = 0

    while created < needed:
        src_file = existing[idx % len(existing)]
        src_path = os.path.join(folder, src_file)
        idx += 1

        try:
            img = Image.open(src_path).convert('RGB')
            img = img.resize((224, 224), Image.LANCZOS)
            aug = augment_image(img)

            out_name = f"aug_{created:04d}_{src_file}"
            out_path = os.path.join(folder, out_name)
            aug.save(out_path, 'JPEG', quality=90)
            created += 1
            total_created += 1

        except Exception as e:
            print(f"    Erreur sur {src_file}: {e}")
            continue

        if created % 50 == 0:
            print(f"               {created}/{needed} creees...", end='\r')

    print(f"               {created} images creees !     ")

print(f"\n{'='*55}")
print(f"  Total images creees : {total_created}")
print(f"{'='*55}")

# Verification finale
print("\nDataset apres augmentation :")
for cls in CLASSES:
    folder = os.path.join(DATASET_DIR, 'train', cls)
    if os.path.exists(folder):
        n = len([f for f in os.listdir(folder)
                 if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
        bar = '|' * (n // 30)
        print(f"  {cls:15s} : {n:4d} images  {bar}")

print("\nLance maintenant : python train_cnn.py")