import mysql.connector
import requests
import os
import random
from pathlib import Path

# ── Configuration MariaDB ────────────────────────────────────
DB_CONFIG = {
    "host":     "127.0.0.1",   # ← change localhost par 127.0.0.1
    "user":     "root",
    "password": "root",
    "database": "moneta_db",
    "port":     3306
}

# ── Mapping période → classe CNN ─────────────────────────────
def get_classe(periode):
    if not periode:
        return None
    p = periode.lower()
    if 'punique' in p:
        return 'Punique'
    if 'numide' in p or 'numidie' in p:
        return 'Numide'
    if 'romaine' in p or 'romain' in p or 'gaule' in p:
        return 'Romaine'
    if 'byzantine' in p or 'byzant' in p:
        return 'Byzantine'
    if 'islamique' in p or 'aghlabide' in p or 'fatimide' in p or 'hafside' in p or 'husseinite' in p:
        return 'Islamique'
    if 'medieval' in p or 'carolingien' in p or 'merovingien' in p or 'royale' in p or 'empire' in p or 'restauration' in p or 'capetien' in p:
        return 'Medievale'
    return 'Moderne'

# ── Classes et splits ────────────────────────────────────────
CLASSES = ['Punique', 'Romaine', 'Byzantine', 'Islamique', 'Numide', 'Medievale', 'Moderne']
SPLITS  = ['train', 'validation', 'test']

# ── Créer la structure de dossiers ───────────────────────────
print("📁 Création de la structure dataset/...")
for split in SPLITS:
    for cls in CLASSES:
        Path(f"dataset/{split}/{cls}").mkdir(parents=True, exist_ok=True)
print("✅ Structure créée !\n")

# ── Connexion MariaDB ────────────────────────────────────────
print("🔌 Connexion à MariaDB...")
try:
    db = mysql.connector.connect(**DB_CONFIG)
    cursor = db.cursor()
    print("✅ Connecté à MariaDB !\n")
except Exception as e:
    print(f"❌ Erreur connexion MariaDB: {e}")
    print("Vérifiez votre mot de passe dans DB_CONFIG")
    exit(1)

# ── Récupérer les monnaies avec images ───────────────────────
cursor.execute("""
    SELECT wikidata_id, nom, periode, image, image_revers 
    FROM monnaies 
    WHERE image IS NOT NULL AND image != ''
    ORDER BY wikidata_id
""")
monnaies = cursor.fetchall()
print(f"📦 {len(monnaies)} monnaies avec images trouvées dans MariaDB\n")

# ── Organiser par classe ──────────────────────────────────────
stats = {cls: [] for cls in CLASSES}
ignores = 0

for wikidata_id, nom, periode, image_url, image_revers in monnaies:
    classe = get_classe(periode)
    if not classe:
        ignores += 1
        continue
    if image_url and image_url.startswith('http'):
        stats[classe].append((wikidata_id, image_url, 'obv'))
    if image_revers and image_revers.startswith('http') and image_revers != image_url:
        stats[classe].append((wikidata_id, image_revers, 'rev'))

print("📊 Distribution des images par classe:")
total_images = 0
for cls in CLASSES:
    n = len(stats[cls])
    total_images += n
    bar = '█' * (n // 5)
    print(f"  {cls:15s}: {n:4d} images  {bar}")
print(f"\n  TOTAL        : {total_images} images")
print(f"  Ignorées     : {ignores} (sans classe détectée)\n")

# ── Fonction téléchargement ───────────────────────────────────
def download_image(url, path):
    try:
        headers = {'User-Agent': 'Mozilla/5.0 MONETA-Dataset-Builder/1.0'}
        r = requests.get(url, timeout=15, headers=headers)
        if r.status_code == 200 and len(r.content) > 1000:
            with open(path, 'wb') as f:
                f.write(r.content)
            return True
    except Exception:
        pass
    return False

# ── Télécharger et répartir ───────────────────────────────────
random.seed(42)
total_ok = 0
total_fail = 0

for classe in CLASSES:
    images = stats[classe]
    if not images:
        print(f"⚠️  {classe}: aucune image, ignorée")
        continue

    random.shuffle(images)
    n = len(images)
    train_end = int(n * 0.70)
    val_end   = int(n * 0.90)

    splits_data = {
        'train':      images[:train_end],
        'validation': images[train_end:val_end],
        'test':       images[val_end:]
    }

    print(f"\n🔄 {classe} ({n} images) → train:{train_end} | val:{val_end-train_end} | test:{n-val_end}")

    for split, imgs in splits_data.items():
        ok = 0
        fail = 0
        for i, (wid, url, side) in enumerate(imgs):
            filename = f"{wid}_{side}.jpg"
            path = f"dataset/{split}/{classe}/{filename}"

            if os.path.exists(path):
                ok += 1
                continue

            if download_image(url, path):
                ok += 1
            else:
                fail += 1

            # Progress toutes les 10 images
            if (i + 1) % 10 == 0:
                print(f"    {split}: {i+1}/{len(imgs)} ✅{ok} ❌{fail}", end='\r')

        total_ok   += ok
        total_fail += fail
        print(f"    {split}: {len(imgs)}/{len(imgs)} ✅{ok} ❌{fail}     ")

# ── Résumé final ─────────────────────────────────────────────
print("\n" + "="*50)
print("✅ DATASET TÉLÉCHARGÉ !")
print(f"   Images OK    : {total_ok}")
print(f"   Images FAIL  : {total_fail}")
print(f"   Taux succès  : {100*total_ok/(total_ok+total_fail):.1f}%")
print("="*50)

# ── Compter ce qu'on a vraiment ───────────────────────────────
print("\n📁 Contenu final du dataset:")
for split in SPLITS:
    print(f"\n  {split}/")
    for cls in CLASSES:
        path = f"dataset/{split}/{cls}"
        n = len([f for f in os.listdir(path) if f.endswith('.jpg')]) if os.path.exists(path) else 0
        print(f"    {cls:15s}: {n} images")

cursor.close()
db.close()
print("\n🚀 Prêt pour l'entraînement CNN !")
