from flask import Flask, request, jsonify
from flask_cors import CORS
from rag_engine import RAGEngine
import uuid
import requests
import json
import re

app = Flask(__name__)

# ✅ CORRIGÉ — ajout de https://localhost:4200
CORS(app, origins=["http://localhost:4200", "https://localhost:4200"])

rag = RAGEngine()

OLLAMA_URL   = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3"

# ══════════════════════════════════════════════════════════
#  ENDPOINT EXISTANT — Chatbot RAG
# ══════════════════════════════════════════════════════════
@app.route('/api/chat', methods=['POST'])
def chat():
    data       = request.get_json()
    question   = data.get('question', '').strip()
    prenom     = data.get('prenom', 'Visiteur')
    user_id    = data.get('user_id', 'anonyme')
    session_id = data.get('session_id', str(uuid.uuid4()))

    if not question:
        return jsonify({'answer': 'Veuillez poser une question.'}), 400

    reponse = rag.repondre(
        question   = question,
        prenom     = prenom,
        user_id    = user_id,
        session_id = session_id
    )
    return jsonify({'answer': reponse, 'session_id': session_id})


@app.route('/api/historique/<user_id>', methods=['GET'])
def historique(user_id):
    session_id = request.args.get('session_id', None)
    data = rag.get_historique(user_id, session_id)
    for row in data:
        if row.get('timestamp'):
            row['timestamp'] = str(row['timestamp'])
    return jsonify(data)


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'monnaies': len(rag.monnaies)})


@app.route('/api/reload', methods=['POST'])
def reload():
    rag.recharger_donnees()
    return jsonify({'status': 'reloaded', 'monnaies': len(rag.monnaies)})


# ══════════════════════════════════════════════════════════
#  NOUVEAU ENDPOINT — Mode IA : Natural Language to Filters
#  Reçoit une phrase en langage naturel
#  Retourne les filtres extraits pour Angular
# ══════════════════════════════════════════════════════════
@app.route('/api/extract-filters', methods=['POST'])
def extract_filters():
    data     = request.get_json()
    phrase   = data.get('phrase', '').strip()

    if not phrase:
        return jsonify({'error': 'Phrase vide'}), 400

    print(f"[Mode IA] Extraction de filtres pour : {phrase}")

    # ── Essai avec LLaMA 3 via Ollama ───────────────────────
    filtres = _extraire_avec_llm(phrase)

    # ── Fallback : extraction par règles si Ollama indisponible
    if not filtres:
        filtres = _extraire_par_regles(phrase)

    print(f"[Mode IA] Filtres extraits : {filtres}")
    return jsonify(filtres)


def _extraire_avec_llm(phrase: str) -> dict | None:
    """Utilise LLaMA 3 pour extraire les filtres depuis une phrase naturelle"""

    prompt = f"""Tu es un assistant qui extrait des critères de recherche de monnaies archéologiques.

L'utilisateur a tapé : "{phrase}"

Extrait les informations suivantes et réponds UNIQUEMENT avec un objet JSON valide, rien d'autre.
Si une information n'est pas mentionnée, mets une chaîne vide "".

Les valeurs possibles sont :
- periode : "Punique", "Romaine", "Byzantine", "Islamique", "Numide", "Medievale", "Moderne", "Husseinite", "Protectorat Francais", "Republique Tunisienne", "Gauloise", "Premier Empire", "Second Empire", "IIIe / IVe Republique", "Ve Republique", "Euro - France" ou ""
- materiau : "Or", "Argent", "Bronze", "Cuivre", "Nickel", "Billon", "Aluminium" ou ""
- region : le lieu mentionné (ex: "Carthage", "Tunis", "Kairouan", "France", "Paris") ou ""
- recherche : mots-clés supplémentaires importants ou ""

Réponds UNIQUEMENT avec le JSON, sans explication, sans markdown, sans texte avant ou après.

Exemple de réponse attendue :
{{"periode": "Punique", "materiau": "Or", "region": "Carthage", "recherche": ""}}

JSON :"""

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model":  OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.1,
                    "num_predict": 100
                }
            },
            timeout=20
        )

        if response.status_code == 200:
            rep = response.json().get('response', '').strip()
            print(f"[Ollama] Réponse brute : {rep}")

            # Extraire le JSON de la réponse
            json_match = re.search(r'\{.*?\}', rep, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                filtres  = json.loads(json_str)

                return {
                    'periode':   filtres.get('periode',  '').strip(),
                    'materiau':  filtres.get('materiau', '').strip(),
                    'region':    filtres.get('region',   '').strip(),
                    'recherche': filtres.get('recherche','').strip(),
                    'source':    'llm'
                }

    except Exception as e:
        print(f"[Ollama] Indisponible : {e} → fallback règles")

    return None


def _extraire_par_regles(phrase: str) -> dict:
    """Fallback : extraction par règles si LLaMA3 indisponible"""
    p = phrase.lower()

    # ── Périodes ──────────────────────────────────────────
    periode = ''
    if any(w in p for w in ['punique', 'carthage', 'tanit', 'carthaginois']):
        periode = 'Punique'
    elif any(w in p for w in ['numide', 'numidie', 'massinissa', 'jugurtha']):
        periode = 'Numide'
    elif any(w in p for w in ['romaine', 'romain', 'rome', 'empire romain']):
        periode = 'Romaine'
    elif any(w in p for w in ['byzantine', 'byzantin', 'byzance']):
        periode = 'Byzantine'
    elif any(w in p for w in ['islamique', 'aghlabide', 'fatimide', 'hafside', 'husseinite', 'dinar', 'dirham']):
        periode = 'Islamique'
    elif any(w in p for w in ['medieval', 'medievale', 'moyen age']):
        periode = 'Medievale'
    elif any(w in p for w in ['napoleon', 'empire', 'revolutionnaire']):
        periode = 'Premier Empire'
    elif any(w in p for w in ['moderne', 'contemporain', 'euro', 'franc']):
        periode = 'Moderne'

    # ── Matériaux ─────────────────────────────────────────
    materiau = ''
    if any(w in p for w in ['or ', "d'or", 'doré', 'gold', 'aureus']):
        materiau = 'Or'
    elif any(w in p for w in ['argent', 'argenté', 'silver', 'denier']):
        materiau = 'Argent'
    elif any(w in p for w in ['bronze', 'bronzé']):
        materiau = 'Bronze'
    elif any(w in p for w in ['cuivre']):
        materiau = 'Cuivre'
    elif any(w in p for w in ['nickel']):
        materiau = 'Nickel'

    # ── Régions ───────────────────────────────────────────
    region = ''
    regions_map = {
        'carthage': 'Carthage',
        'tunis': 'Tunis',
        'kairouan': 'Kairouan',
        'sousse': 'Hadrumetum (Sousse)',
        'dougga': 'Thugga (Dougga)',
        'el djem': 'El Djem (Thysdrus)',
        'jendouba': 'Bulla Regia (Jendouba)',
        'france': 'France',
        'paris': 'Paris',
        'lyon': 'Lyon (Lugdunum)',
        'marseille': 'Massalia (Marseille)',
        'gaule': 'Gaule',
        'numidie': 'Numidie',
        'byzacene': 'Byzacene',
        'ifriqiya': 'Ifriqiya',
        'mahdiya': 'Al-Mahdiyya',
    }
    for key, val in regions_map.items():
        if key in p:
            region = val
            break

    # ── Mots-clés restants ────────────────────────────────
    stopwords = ['je', 'cherche', 'veux', 'voir', 'des', 'les', 'une', 'un',
                 'de', 'du', 'la', 'le', 'en', 'qui', 'que', 'pièce', 'piece',
                 'monnaie', 'trouvée', 'trouvee', 'faite', 'époque', 'epoque']
    mots = [w for w in p.split() if w not in stopwords and len(w) > 3]
    recherche = '' if (periode or materiau or region) else ' '.join(mots[:2])

    return {
        'periode':   periode,
        'materiau':  materiau,
        'region':    region,
        'recherche': recherche,
        'source':    'rules'
    }


# ✅ HTTPS si certificats présents
if __name__ == '__main__':
    import os
    if os.path.exists('cert.pem') and os.path.exists('key.pem'):
        print("🔒 Flask HTTPS sur https://localhost:5000")
        app.run(debug=False, host='0.0.0.0', port=5000, ssl_context=('cert.pem', 'key.pem'))
    else:
        print("⚠️  Flask HTTP sur http://localhost:5000")
        app.run(debug=True, port=5000)