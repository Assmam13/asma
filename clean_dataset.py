"""
MONETA — Script de nettoyage du dataset
Identifie et supprime les fichiers corrompus, non-images, ou mal formatés.

Usage : python clean_dataset.py
"""

import os
from PIL import Image
from pathlib import Path

DATASET_DIR = "dataset"
VALID_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.bmp', '.webp']

# Compteurs
total_files = 0
valid_files = 0
corrupted_files = []
non_image_files = []
hidden_files = []

print("=" * 70)
print("  MONETA — Nettoyage du dataset")
print("=" * 70)
print(f"  Analyse de : {DATASET_DIR}")
print("=" * 70 + "\n")

# Parcourir récursivement le dossier dataset
for root, dirs, files in os.walk(DATASET_DIR):
    for filename in files:
        total_files += 1
        filepath = os.path.join(root, filename)

        # Check 1 : fichiers cachés ou système (Thumbs.db, .DS_Store, etc.)
        if filename.startswith('.') or filename in ['Thumbs.db', 'desktop.ini']:
            hidden_files.append(filepath)
            print(f"🗑️  Fichier système trouvé : {filepath}")
            continue

        # Check 2 : extension valide ?
        ext = Path(filename).suffix.lower()
        if ext not in VALID_EXTENSIONS:
            non_image_files.append(filepath)
            print(f"⚠️  Extension non-image : {filepath}")
            continue

        # Check 3 : Tenter d'ouvrir l'image avec PIL
        try:
            with Image.open(filepath) as img:
                img.verify()  # Vérification structurelle
            # Re-ouvrir pour charger les données (verify() invalide l'image)
            with Image.open(filepath) as img:
                img.load()
                # Convertir en RGB pour s'assurer que c'est utilisable
                if img.mode not in ['RGB', 'RGBA', 'L']:
                    img.convert('RGB')
            valid_files += 1
        except Exception as e:
            corrupted_files.append((filepath, str(e)))
            print(f"❌ Image corrompue : {filepath}")
            print(f"   Erreur : {e}")

# ═══════════════════════════════════════════════════════════════
#  RÉSUMÉ
# ═══════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("  RÉSUMÉ DE L'ANALYSE")
print("=" * 70)
print(f"  Fichiers analysés : {total_files}")
print(f"  Images valides    : {valid_files}")
print(f"  Images corrompues : {len(corrupted_files)}")
print(f"  Fichiers non-image: {len(non_image_files)}")
print(f"  Fichiers système  : {len(hidden_files)}")
print("=" * 70)

# Liste des problèmes
problem_files = corrupted_files + [(f, "non-image") for f in non_image_files] + [(f, "système") for f in hidden_files]

if not problem_files:
    print("\n✅ Aucun problème détecté ! Dataset prêt pour l'entraînement.")
    exit(0)

print(f"\n⚠️  {len(problem_files)} fichier(s) problématique(s) détecté(s)")
print("\nListe complète :")
for filepath, reason in problem_files:
    print(f"  • {filepath}")
    if isinstance(reason, str) and reason not in ['non-image', 'système']:
        print(f"    Raison : {reason}")

# Demander confirmation avant suppression
print("\n" + "=" * 70)
reponse = input("Voulez-vous supprimer ces fichiers ? (oui / non) : ").strip().lower()

if reponse in ['oui', 'o', 'yes', 'y']:
    deleted = 0
    failed = 0
    for filepath, reason in problem_files:
        try:
            os.remove(filepath)
            print(f"✅ Supprimé : {filepath}")
            deleted += 1
        except Exception as e:
            print(f"❌ Échec suppression {filepath} : {e}")
            failed += 1

    print(f"\n✅ {deleted} fichier(s) supprimé(s)")
    if failed > 0:
        print(f"❌ {failed} suppression(s) échouée(s)")
    print(f"\n🚀 Dataset nettoyé ! Tu peux relancer train_cnn_corrige.py")
else:
    print("\n⏸️  Aucun fichier supprimé.")
    print("⚠️  L'entraînement échouera tant que ces fichiers ne sont pas retirés.")
    print("Tu peux les supprimer manuellement dans VS Code.")
