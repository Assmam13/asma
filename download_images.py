import requests
import os
import time
from pathlib import Path

# Dossier de destination
base_folder = "dataset/train"

# Recherche ANS par département/période
searches = {
    "Punique":   "https://numismatics.org/search/results?q=department_facet:%22Carthage%22&lang=en&format=json&limit=200",
    "Numide":    "https://numismatics.org/search/results?q=department_facet:%22Numidia%22&lang=en&format=json&limit=200",
    "Byzantine": "https://numismatics.org/search/results?q=department_facet:%22Byzantine%22&lang=en&format=json&limit=200",
    "Romaine":   "https://numismatics.org/search/results?q=department_facet:%22Roman+Republican%22&lang=en&format=json&limit=200",
}

for classe, url in searches.items():
    folder = f"{base_folder}/{classe}"
    current = len(os.listdir(folder))
    print(f"\n{classe} : {current} images actuellement — téléchargement en cours...")
    
    try:
        response = requests.get(url, timeout=10)
        data = response.json()
        
        downloaded = 0
        for item in data.get("objects", []):
            img_url = item.get("thumbnail")
            if not img_url:
                continue
            
            filename = f"{folder}/ans_{downloaded+current}.jpg"
            if os.path.exists(filename):
                continue
                
            try:
                img = requests.get(img_url, timeout=5)
                with open(filename, 'wb') as f:
                    f.write(img.content)
                downloaded += 1
                time.sleep(0.3)  # pause pour ne pas surcharger l'ANS
            except:
                continue
        
        print(f"  → {downloaded} nouvelles images téléchargées")
    except Exception as e:
        print(f"  → Erreur : {e}")

print("\nTerminé !")