"""
MONETA — Nettoyage des images corrompues du dataset
Lance ce script AVANT train_cnn.py
"""

import os
from PIL import Image

DATASET_DIR = "dataset"
SPLITS      = ['train', 'validation', 'test']
CLASSES     = ['Punique', 'Romaine', 'Byzantine',
               'Islamique', 'Numide', 'Medievale', 'Moderne']

print("=" * 50)
print("  MONETA — Nettoyage des images corrompues")
print("=" * 50 + "\n")

total_checked = 0
total_removed = 0

for split in SPLITS:
    for cls in CLASSES:
        folder = os.path.join(DATASET_DIR, split, cls)
        if not os.path.exists(folder):
            continue

        files = [f for f in os.listdir(folder) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]

        removed = 0
        for filename in files:
            path = os.path.join(folder, filename)
            total_checked += 1
            try:
                # Essayer d'ouvrir et convertir l'image
                with Image.open(path) as img:
                    img.verify()  # Vérifie l'intégrité

                # Deuxième vérification — convertir en RGB
                with Image.open(path) as img:
                    img.convert('RGB')

            except Exception:
                # Image corrompue → supprimer
                os.remove(path)
                removed += 1
                total_removed += 1

        if removed > 0:
            print(f"  {split}/{cls}: {removed} images corrompues supprimées")

print(f"\n✅ Vérification terminée !")
print(f"   Images vérifiées : {total_checked}")
print(f"   Images supprimées: {total_removed}")
print(f"   Images valides   : {total_checked - total_removed}")

# Afficher le dataset final
print("\n📁 Dataset après nettoyage :")
for split in SPLITS:
    print(f"\n  {split}/")
    for cls in CLASSES:
        folder = os.path.join(DATASET_DIR, split, cls)
        if os.path.exists(folder):
            n = len([f for f in os.listdir(folder) if f.endswith('.jpg')])
            print(f"    {cls:15s}: {n} images")

print("\n🚀 Lance maintenant : python train_cnn.py")
