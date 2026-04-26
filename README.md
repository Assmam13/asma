# 🏛️ MONETA — Application de Gestion des Monnaies Archéologiques

## Description
Plateforme web full-stack dédiée à la gestion, valorisation et 
classification automatique des données monétaires archéologiques 
tunisiennes et françaises.

Projet de Fin d'Études — Licence Informatique de Gestion  
FSEGN, Université de Carthage — 2025/2026

## Fonctionnalités principales
- 🖼️ Galerie de 2000 monnaies avec filtres avancés
- 🗺️ Carte interactive Leaflet.js (141 marqueurs)
- 🤖 Chatbot RAG (ChromaDB + LLaMA 3.2:1b)
- ✨ Mode IA — recherche en langage naturel
- 🧠 Classification CNN MobileNetV2 (7 classes historiques)
- 📊 Dashboard BI (Chart.js + Apache ECharts)
- 🔒 Authentification JWT + HTTPS SSL

## Stack Technologique
| Couche | Technologie |
|--------|------------|
| Frontend | Angular (Standalone Components) |
| Backend | Spring Boot + Java (port 8443, HTTPS) |
| IA Chatbot | Python Flask + ChromaDB + LLaMA 3.2:1b |
| CNN | FastAPI + TensorFlow/Keras (MobileNetV2) |
| Base de données | MariaDB (2000 monnaies) |
| Cartographie | Leaflet.js + CARTO Voyager |

## Lancement du projet

### Prérequis
- Java JDK 17+
- Node.js 20 LTS
- Python 3.11+
- MariaDB
- Ollama

### Ordre de démarrage
```bash
# 1. Base de données
# Démarrer MariaDB (HeidiSQL ou service Windows)

# 2. Backend Spring Boot
# Eclipse → Run As → Spring Boot App (port 8443)

# 3. LLM
ollama run llama3.2:1b

# 4. Microservice IA (Flask)
cd chatbot-backend
pip install -r requirements.txt
python app.py

# 5. Frontend Angular
cd moneta-frontend
npm install
ng serve
```

### Accès
Ouvrir : http://localhost:4200

> Note : Accepter le certificat SSL sur https://localhost:5000/api/health
## Auteurs
- **Asma Ben Aissa**
- **Wissem Boumrifek**

## Encadrants
- 👩‍🏫 Dr Rim Ksibi — FSEGN, Université de Carthage
- 👨‍💼 Wanis Bareeh — Yebni Information et Communication
> (certificat auto-signé en développement)

## Structure du projet
