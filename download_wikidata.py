import requests
import os
import time

base_folder = "dataset/train"

# Requêtes SPARQL Wikidata pour chaque classe
queries = {
    "Punique": """
        SELECT ?item ?image WHERE {
          ?item wdt:P31 wd:Q41207.
          ?item wdt:P180 ?depicts.
          ?item wdt:P571 ?date.
          ?item wdt:P18 ?image.
          FILTER(?date >= "-0814-01-01"^^xsd:dateTime && ?date <= "-0146-01-01"^^xsd:dateTime)
        } LIMIT 300
    """,
    "Numide": """
        SELECT ?item ?image WHERE {
          ?item wdt:P31 wd:Q41207.
          ?item wdt:P18 ?image.
          ?item wdt:P495 wd:Q7830.
        } LIMIT 300
    """,
    "Byzantine": """
        SELECT ?item ?image WHERE {
          ?item wdt:P31 wd:Q41207.
          ?item wdt:P18 ?image.
          ?item wdt:P279* wd:Q751038.
        } LIMIT 300
    """,
    "Romaine": """
        SELECT ?item ?image WHERE {
          ?item wdt:P31 wd:Q41207.
          ?item wdt:P18 ?image.
          ?item wdt:P279* wd:Q1780682.
        } LIMIT 300
    """,
    "Islamique": """
        SELECT ?item ?image WHERE {
          ?item wdt:P31 wd:Q41207.
          ?item wdt:P18 ?image.
          ?item wdt:P279* wd:Q1332020.
        } LIMIT 300
    """,
}

WIKIDATA_URL = "https://query.wikidata.org/sparql"
HEADERS = {"User-Agent": "MONETA-PFE/1.0"}

for classe, query in queries.items():
    folder = f"{base_folder}/{classe}"
    os.makedirs(folder, exist_ok=True)
    current = len(os.listdir(folder))
    print(f"\n{classe} : {current} images — téléchargement...")

    try:
        resp = requests.get(WIKIDATA_URL,
            params={"query": query, "format": "json"},
            headers=HEADERS, timeout=30)
        
        results = resp.json()["results"]["bindings"]
        print(f"  {len(results)} images trouvées sur Wikidata")

        downloaded = 0
        for i, r in enumerate(results):
            img_url = r["image"]["value"]
            filename = f"{folder}/wiki_{current+i}.jpg"
            
            if os.path.exists(filename):
                continue
            try:
                img = requests.get(img_url, headers=HEADERS, timeout=10)
                with open(filename, "wb") as f:
                    f.write(img.content)
                downloaded += 1
                time.sleep(0.5)
                if downloaded % 20 == 0:
                    print(f"    {downloaded} téléchargées...")
            except:
                continue

        print(f"  → {downloaded} nouvelles images ajoutées")

    except Exception as e:
        print(f"  → Erreur : {e}")

print("\nTerminé !")
