# MONETA IA — Backend RAG

## Installation

### Etape 1 — Python 3.10+
Telecharge : https://www.python.org/downloads/

### Etape 2 — Installe les dependances
```
pip install -r requirements.txt
```

### Etape 3 — Installe Ollama
Telecharge : https://ollama.com/download

### Etape 4 — Telecharge le modele Mistral
```
ollama pull mistral
```

### Etape 5 — Lance Ollama
```
ollama serve
```

### Etape 6 — Lance le backend MONETA IA
```
python app.py
```

## Test
Ouvre dans le navigateur :
```
http://localhost:5000/api/health
```
Tu dois voir : {"status": "ok"}

## Architecture
```
app.py          <- Serveur Flask (API REST)
rag_engine.py   <- Moteur RAG (ChromaDB + Ollama)
chroma_data/    <- Base vectorielle (cree automatiquement)
requirements.txt
```

## Ordre de demarrage
1. MariaDB (deja lance)
2. Spring Boot Eclipse (port 9091)
3. Ollama : ollama serve
4. Python : python app.py (port 5000)
5. Angular : ng serve (port 4200)
