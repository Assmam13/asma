"""
MONETA — Telechargement d images supplementaires
Pour Byzantine, Numide, Punique, Romaine depuis Wikidata
"""

import requests
import os
import time
from pathlib import Path

DATASET_DIR = "dataset/train"
HEADERS = {
    "User-Agent": "MONETA-PFE/1.0 (contact: moneta@pfe.tn)"
}
WIKIDATA_URL = "https://query.wikidata.org/sparql"

# Requetes SPARQL par classe
QUERIES = {
    "Byzantine": """
        SELECT DISTINCT ?item ?image WHERE {
          ?item wdt:P31 wd:Q41207 .
          ?item wdt:P18 ?image .
          ?item wdt:P279* wd:Q751038 .
        } LIMIT 400
    """,
    "Numide": """
        SELECT DISTINCT ?item ?image WHERE {
          ?item wdt:P31 wd:Q41207 .
          ?item wdt:P18 ?image .
          { ?item wdt:P495 wd:Q7830 . }
          UNION
          { ?item wdt:P279* wd:Q191085 . }
        } LIMIT 400
    """,
    "Punique": """
        SELECT DISTINCT ?item ?image WHERE {
          ?item wdt:P31 wd:Q41207 .
          ?item wdt:P18 ?image .
          { ?item wdt:P279* wd:Q1477065 . }
          UNION
          { ?item wdt:P495 wd:Q6427 . }
        } LIMIT 400
    """,
    "Romaine": """
        SELECT DISTINCT ?item ?image WHERE {
          ?item wdt:P31 wd:Q41207 .
          ?item wdt:P18 ?image .
          ?item wdt:P279* wd:Q1780682 .
        } LIMIT 500
    """
}

def download_image(url, path):
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code == 200 and len(r.content) > 2000:
            with open(path, 'wb') as f:
                f.write(r.content)
            return True
    except:
        pass
    return False

print("=" * 55)
print("  MONETA — Telechargement images Wikidata")
print("=" * 55 + "\n")

for classe, query in QUERIES.items():
    folder = os.path.join(DATASET_DIR, classe)
    os.makedirs(folder, exist_ok=True)

    existing = len([f for f in os.listdir(folder)
                    if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
    print(f"\n{classe} : {existing} images existantes")

    try:
        resp = requests.get(
            WIKIDATA_URL,
            params={"query": query, "format": "json"},
            headers=HEADERS,
            timeout=30
        )
        results = resp.json()["results"]["bindings"]
        print(f"  {len(results)} images trouvees sur Wikidata")
    except Exception as e:
        print(f"  Erreur Wikidata : {e}")
        continue

    downloaded = 0
    skipped = 0

    for i, r in enumerate(results):
        img_url = r["image"]["value"]
        item_id = r["item"]["value"].split("/")[-1]
        filename = f"wiki_extra_{item_id}.jpg"
        path = os.path.join(folder, filename)

        if os.path.exists(path):
            skipped += 1
            continue

        if download_image(img_url, path):
            downloaded += 1
        
        time.sleep(0.3)

        if (i + 1) % 20 == 0:
            print(f"  {i+1}/{len(results)} — {downloaded} telechargees", end='\r')

    total = len([f for f in os.listdir(folder)
                 if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
    print(f"  {downloaded} nouvelles images — Total : {total}")

print("\n\nDataset final :")
for cls in ["Byzantine", "Islamique", "Medievale", "Moderne", "Numide", "Punique", "Romaine"]:
    folder = os.path.join(DATASET_DIR, cls)
    if os.path.exists(folder):
        n = len([f for f in os.listdir(folder)
                 if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
        bar = '|' * (n // 40)
        print(f"  {cls:15s} : {n:4d}  {bar}")

print("\nLance maintenant : python train_cnn_fixed.py")