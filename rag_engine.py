import chromadb
import mysql.connector
import re
import time
import uuid
import requests
from chromadb.utils import embedding_functions

DB_CONFIG = {
    'host':     'localhost',
    'port':     3306,
    'user':     'root',
    'password': 'root',
    'database': 'moneta_db'
}

CHROMA_DIR   = "./chroma_data"
COLLECTION   = "monnaies_tunisiennes"
OLLAMA_URL   = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3.2:1b"               # ✅ modèle léger 1B
SPRING_BOOT_URL = "https://localhost:8443"  # ✅ port HTTPS Spring Boot

EMBEDDING_FN = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

class RAGEngine:

    def __init__(self):
        print("[RAG] Initialisation...")
        t0 = time.time()
        self.client     = chromadb.PersistentClient(path=CHROMA_DIR)
        self.collection = self.client.get_or_create_collection(
            name=COLLECTION,
            embedding_function=EMBEDDING_FN,
            metadata={"hnsw:space": "cosine"}
        )
        self.monnaies = self._lire_mariadb()
        chroma_count  = self.collection.count()
        mariadb_count = len(self.monnaies)
        if chroma_count == 0:
            print(f"[RAG] ChromaDB vide → indexation de {mariadb_count} monnaies...")
            self._indexer_chroma()
        elif chroma_count != mariadb_count:
            print(f"[RAG] Mise à jour : {chroma_count} → {mariadb_count} monnaies")
            self._indexer_chroma()
        else:
            print(f"[RAG] ChromaDB à jour ({chroma_count} monnaies) ✅ — indexation ignorée")
        self._creer_table_conversations()
        t1 = time.time()
        print(f"[RAG] Prêt en {t1-t0:.2f}s ✅")

    # ═══════════════════════════════════════════════════════
    #  BASE DE DONNÉES
    # ═══════════════════════════════════════════════════════
    def _lire_mariadb(self):
        try:
            conn   = mysql.connector.connect(**DB_CONFIG)
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT * FROM monnaies")
            rows   = cursor.fetchall()
            cursor.close(); conn.close()
            print(f"[MariaDB] {len(rows)} monnaies lues ✅")
            return rows
        except Exception as e:
            print(f"[MariaDB] Erreur : {e}")
            return []

    def _creer_table_conversations(self):
        print("[Flask] Table conversations gérée par Spring Boot ✅")

    def _sauvegarder_conversation(self, user_id, question, reponse, session_id):
        try:
            response = requests.post(
                f"{SPRING_BOOT_URL}/api/conversations",
                json={"user_id": user_id, "question": question,
                      "reponse": reponse, "session_id": session_id},
                timeout=5, verify=False  # ✅ certificat auto-signé
            )
            if response.status_code == 200:
                print(f"[Spring Boot] Conversation sauvegardée ✅")
            else:
                print(f"[Spring Boot] Erreur : {response.status_code}")
        except Exception as e:
            print(f"[Spring Boot] Indisponible : {e}")

    def get_historique(self, user_id, session_id=None):
        try:
            url = f"{SPRING_BOOT_URL}/api/conversations/{user_id}"
            if session_id:
                url = f"{SPRING_BOOT_URL}/api/conversations/session/{session_id}"
            response = requests.get(url, timeout=5, verify=False)
            if response.status_code == 200:
                return response.json()
            return []
        except Exception as e:
            print(f"[Spring Boot] Erreur historique : {e}")
            return []

    # ═══════════════════════════════════════════════════════
    #  CHROMADB
    # ═══════════════════════════════════════════════════════
    def recharger_donnees(self):
        self.monnaies = self._lire_mariadb()
        self._indexer_chroma()

    def _indexer_chroma(self):
        try:
            self.client.delete_collection(COLLECTION)
            self.collection = self.client.get_or_create_collection(
                name=COLLECTION, embedding_function=EMBEDDING_FN,
                metadata={"hnsw:space": "cosine"})
        except: pass
        docs, metas, ids = [], [], []
        for m in self.monnaies:
            docs.append(self._construire_document(m))
            metas.append({'id': str(m.get('wikidata_id','')), 'nom': str(m.get('nom','')),
                          'periode': str(m.get('periode','')), 'materiau': str(m.get('materiau','')),
                          'region': str(m.get('region',''))})
            ids.append(str(m.get('wikidata_id', f"coin_{len(ids)}")))
        for i in range(0, len(docs), 10):
            self.collection.add(documents=docs[i:i+10], metadatas=metas[i:i+10], ids=ids[i:i+10])
        print(f"[ChromaDB] {len(docs)} monnaies indexées ✅")

    def _construire_document(self, m):
        parties = []
        for k, label in [('nom','Nom'),('periode','Periode'),('materiau','Materiau'),
                         ('region','Region'),('atelier','Atelier'),('annee','Annee'),
                         ('avers','Face'),('revers','Dos'),('description','Description'),
                         ('collection','Collection')]:
            if m.get(k): parties.append(f"{label}: {m[k]}")
        return "\n".join(parties)

    # ═══════════════════════════════════════════════════════
    #  MOTEUR PRINCIPAL
    # ═══════════════════════════════════════════════════════
    def repondre(self, question, prenom="Visiteur", user_id="anonyme", session_id=None):
        if not session_id:
            session_id = str(uuid.uuid4())
        q      = question.lower().strip()
        q_norm = self._normaliser(q)
        print(f"[RAG] Question reçue : {question}")

        # 1. Salutation directe
        if any(w in q_norm for w in ['bonjour','salut','hello','bonsoir','salam','hi','hey']):
            reponse = self._reponse_salutation(prenom)

        # 2. Stats globales uniquement si aucun filtre mentionné
        elif any(w in q_norm for w in ['nombre total','statistique','stats']) or \
             (any(w in q_norm for w in ['combien','total']) and
              not any(w in q_norm for w in [
                  'islamique','punique','romaine','byzantine','numide',
                  'husseinite','gauloise','medievale','moderne','argent',
                  'or ','bronze','cuivre','nickel','region','ville',
                  'kairouan','carthage','sousse','tunis','france','aghlabide','fatimide'])):
            reponse = self._repondre_statistiques(q_norm, prenom)

        # 3. ChromaDB + LLaMA en premier
        else:
            print(f"[RAG] → ChromaDB + {OLLAMA_MODEL}")
            reponse = self._repondre_avec_llm(question, prenom)
            if not reponse or reponse == self._reponse_non_trouve():
                print(f"[RAG] → Fallback règles NLP")
                reponse = self._detecter_par_regles(q_norm, prenom)
            if not reponse:
                reponse = self._reponse_non_trouve()

        self._sauvegarder_conversation(user_id, question, reponse, session_id)
        return reponse

    # ═══════════════════════════════════════════════════════
    #  CHROMADB + OLLAMA
    # ═══════════════════════════════════════════════════════
    def _repondre_avec_llm(self, question, prenom):
        contexte = self._rechercher_contexte_chroma(question, n=5)
        if not contexte or (not contexte[0] and not contexte[1]):
            return None
        reponse_llm = self._appeler_ollama(question, contexte, prenom)
        if reponse_llm:
            return reponse_llm
        return self._repondre_via_chroma_simple(question, prenom)

    def _rechercher_contexte_chroma(self, question, n=5):
        try:
            count = self.collection.count()
            if count == 0: return [], []
            results = self.collection.query(query_texts=[question], n_results=min(n, count))
            docs  = results.get('documents', [[]])[0]
            metas = results.get('metadatas', [[]])[0]
            print(f"[ChromaDB] {len(docs)} documents trouvés")
            return docs, metas
        except Exception as e:
            print(f"[ChromaDB] Erreur : {e}")
            return [], []

    def _appeler_ollama(self, question, contexte_tuple, prenom):
        docs, metas = contexte_tuple
        if not docs: return None
        contexte_str = "\n\n---\n\n".join(docs)
        prompt = f"""Tu es MONETA IA, expert en numismatique tunisienne et française.
Tu réponds à {prenom} en français.

DONNÉES DE LA COLLECTION :
{contexte_str}

QUESTION : {question}

Réponds en français, max 150 mots, avec emojis (🪙 🏛️ 📅 ⚗️ 📍).
Utilise UNIQUEMENT les données ci-dessus.

RÉPONSE :"""
        try:
            print(f"[Ollama] Appel {OLLAMA_MODEL}...")
            response = requests.post(
                OLLAMA_URL,
                json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False,
                      "options": {"temperature": 0.3, "num_predict": 200}},
                timeout=30  # ✅ 30s suffisent pour llama3.2:1b
            )
            if response.status_code == 200:
                rep = response.json().get('response', '').strip()
                if len(rep) > 20:
                    print(f"[Ollama] ✅ Réponse reçue ({len(rep)} chars)")
                    return rep
            print(f"[Ollama] Réponse vide")
            return None
        except Exception as e:
            print(f"[Ollama] Erreur : {e} → fallback ChromaDB")
            return None

    # ✅ Fallback intelligent — répond toujours avec une vraie réponse
    def _repondre_via_chroma_simple(self, question, prenom):
        try:
            q      = question.lower()
            q_norm = self._normaliser(q)
            periode_detectee = self._detecter_periode(q_norm)

            # Cas "combien" + période → compter dans la BDD directement
            if any(w in q_norm for w in ['combien','nombre','total','count']) and periode_detectee:
                monnaies_periode = [m for m in self.monnaies
                                    if periode_detectee.lower() in str(m.get('periode','')).lower()]
                emojis = {'Punique':'🏛️','Romaine':'⚔️','Byzantine':'✝️','Islamique':'☪️','Numide':'🗺️'}
                emoji  = emojis.get(periode_detectee, '🪙')
                rep = (f"{emoji} La collection MONETA contient "
                       f"<strong>{len(monnaies_periode)} monnaies</strong> "
                       f"de la période <strong>{periode_detectee}</strong>.<br><br>"
                       f"Exemples :<br>")
                for m in monnaies_periode[:5]:
                    a = m.get('annee')
                    s = f"{abs(a)} av. J.-C." if a and a < 0 else (f"{a} ap. J.-C." if a else '')
                    rep += (f"🪙 <strong>{m.get('nom','')}</strong> — "
                            f"⚗️ {m.get('materiau','')} | 📍 {m.get('region','')} | 📅 {s}<br>")
                return rep

            # Cas général → afficher les résultats ChromaDB
            docs, metas = self._rechercher_contexte_chroma(question)
            if metas:
                ids_trouves       = [m.get('id','') for m in metas]
                monnaies_trouvees = [m for m in self.monnaies
                                     if str(m.get('wikidata_id','')) in ids_trouves]
                if not monnaies_trouvees:
                    monnaies_trouvees = self.monnaies[:5]
                if len(monnaies_trouvees) == 1:
                    return self._repondre_detail_monnaie(monnaies_trouvees[0])
                rep = f"🔍 <strong>Monnaies correspondantes :</strong><br><br>"
                for m in monnaies_trouvees:
                    a = m.get('annee')
                    s = f"{abs(a)} av. J.-C." if a and a < 0 else (f"{a} ap. J.-C." if a else '')
                    rep += (f"🪙 <strong>{m.get('nom','')}</strong><br>"
                            f"&nbsp;&nbsp;🏛️ {m.get('periode','')} | ⚗️ {m.get('materiau','')} | "
                            f"📍 {m.get('region','')} | 📅 {s}<br>")
                    if m.get('description'):
                        rep += f"&nbsp;&nbsp;📝 {str(m.get('description',''))[:80]}...<br>"
                    rep += "<br>"
                return rep
        except Exception as e:
            print(f"[ChromaDB] Erreur fallback : {e}")
        return self._reponse_non_trouve()

    def _reponse_non_trouve(self):
        return (f"Je n'ai pas trouvé de réponse précise. 🤔<br><br>"
                f"Essayez :<br>"
                f"• <em>Monnaies puniques en or</em><br>"
                f"• <em>Monnaies de Kairouan</em><br>"
                f"• <em>Combien de monnaies romaines ?</em><br>"
                f"• <em>Décris le dinar islamique</em>")

    # ═══════════════════════════════════════════════════════
    #  RÈGLES NLP — FALLBACK UNIQUEMENT
    # ═══════════════════════════════════════════════════════
    def _detecter_par_regles(self, q_norm, prenom):
        periode  = self._detecter_periode(q_norm)
        materiau = self._detecter_materiau(q_norm)
        if periode and materiau: return self._repondre_periode_materiau(periode, materiau)
        if any(w in q_norm for w in ['region','ville','ou ','provenance','vient de','decouverte','trouve']):
            return self._repondre_regions(q_norm)
        if any(w in q_norm for w in ['materiau','matiere','metal','compose','fabrique']):
            return self._repondre_materiaux()
        if re.search(r'periode|epoque|quelles.*(periode|epoque)', q_norm):
            return self._repondre_periodes()
        if periode: return self._repondre_par_periode(periode, q_norm)
        if materiau: return self._repondre_par_materiau(materiau)
        ville = self._detecter_ville(q_norm)
        if ville: return self._repondre_par_ville(ville)
        monnaie = self._chercher_monnaie_par_nom(q_norm)
        if monnaie: return self._repondre_detail_monnaie(monnaie)
        return None

    # ═══════════════════════════════════════════════════════
    #  UTILITAIRES
    # ═══════════════════════════════════════════════════════
    def _normaliser(self, texte):
        remplacements = {
            'é':'e','è':'e','ê':'e','ë':'e','à':'a','â':'a','ä':'a',
            'î':'i','ï':'i','ô':'o','ö':'o','ù':'u','û':'u','ü':'u',
            'ç':'c','œ':'oe','æ':'ae',"'":" ","'":" ","-":" "
        }
        for a, n in remplacements.items(): texte = texte.replace(a, n)
        texte = re.sub(r'[^\w\s]', ' ', texte)
        return re.sub(r'\s+', ' ', texte).strip()

    def _reponse_salutation(self, prenom):
        return (f"Bonjour <strong>{prenom}</strong> ! 👋 Je suis <strong>MONETA IA</strong>.<br><br>"
                f"Je peux vous renseigner sur :<br>"
                f"🪙 Les 2000 monnaies de notre collection<br>"
                f"🏛️ Les périodes historiques (Punique, Romaine, Islamique...)<br>"
                f"📍 Les régions de découverte<br>"
                f"⚗️ Les matériaux (or, argent, bronze...)<br>"
                f"📊 Les statistiques<br><br>Posez-moi votre question !")

    def _repondre_statistiques(self, q, prenom):
        total = len(self.monnaies)
        if not self.monnaies: return "La base de données est vide."
        periodes = {}; materiaux = {}
        for m in self.monnaies:
            p = m.get('periode','Inconnue'); mat = m.get('materiau','Inconnu')
            periodes[p]    = periodes.get(p, 0) + 1
            materiaux[mat] = materiaux.get(mat, 0) + 1
        rep = (f"📊 <strong>Statistiques MONETA</strong><br><br>"
               f"🪙 <strong>Total : {total} monnaies</strong><br><br>"
               f"<strong>Par période :</strong><br>")
        for p, n in sorted(periodes.items(), key=lambda x: -x[1]):
            rep += f"• {p} : <strong>{n}</strong><br>"
        rep += f"<br><strong>Par matériau :</strong><br>"
        for mat, n in sorted(materiaux.items(), key=lambda x: -x[1]):
            rep += f"• {mat} : <strong>{n}</strong><br>"
        return rep

    def _repondre_periode_materiau(self, periode, materiau):
        monnaies = [m for m in self.monnaies
                    if periode.lower() in str(m.get('periode','')).lower()
                    and materiau.lower() == str(m.get('materiau','')).lower()]
        emojis = {'Punique':'🏛️','Romaine':'⚔️','Byzantine':'✝️','Islamique':'☪️','Numide':'🗺️'}
        emoji  = emojis.get(periode, '🪙')
        if not monnaies:
            return f"Aucune monnaie <strong>{materiau}</strong> — période <strong>{periode}</strong>."
        rep = f"{emoji} <strong>Monnaies {materiau} — {periode}</strong> ({len(monnaies)}) :<br><br>"
        for m in monnaies[:10]:
            a = m.get('annee')
            s = f"{abs(a)} av. J.-C." if a and a < 0 else f"{a} ap. J.-C." if a else ''
            rep += (f"🪙 <strong>{m.get('nom','')}</strong><br>"
                    f"&nbsp;&nbsp;📅 {s} | 📍 {m.get('region','')} | 🏦 {m.get('collection','')}<br><br>")
        if len(monnaies) > 10: rep += f"<em>... et {len(monnaies)-10} autres.</em>"
        return rep

    def _repondre_regions(self, q):
        ville = self._detecter_ville(q)
        if ville: return self._repondre_par_ville(ville)
        regions = {}
        for m in self.monnaies:
            r = m.get('region','')
            if r: regions[r] = regions.get(r, 0) + 1
        rep = f"📍 <strong>Régions ({len(regions)}) :</strong><br><br>"
        for r, n in sorted(regions.items(), key=lambda x: -x[1]):
            rep += f"• <strong>{r}</strong> : {n}<br>"
        return rep

    def _repondre_materiaux(self):
        materiaux = {}
        for m in self.monnaies:
            mat = m.get('materiau','')
            if mat: materiaux.setdefault(mat, []).append(m.get('nom',''))
        rep = f"⚗️ <strong>Matériaux :</strong><br><br>"
        for mat, noms in sorted(materiaux.items()):
            rep += f"🔹 <strong>{mat}</strong> ({len(noms)}) :<br>"
            for nom in noms[:3]: rep += f"&nbsp;&nbsp;• {nom}<br>"
            if len(noms) > 3: rep += f"&nbsp;&nbsp;• ... et {len(noms)-3} autres<br>"
            rep += "<br>"
        return rep

    def _repondre_periodes(self):
        periodes = {}
        for m in self.monnaies:
            p = m.get('periode','')
            if p: periodes.setdefault(p, []).append(m.get('nom',''))
        emojis = {'Punique':'🏛️','Romaine':'⚔️','Byzantine':'✝️','Islamique':'☪️','Numide':'🗺️'}
        rep = f"🏛️ <strong>Périodes historiques :</strong><br><br>"
        for p, noms in periodes.items():
            emoji = next((v for k,v in emojis.items() if k.lower() in p.lower()), '🪙')
            rep += f"{emoji} <strong>{p}</strong> ({len(noms)})<br>"
        return rep

    def _detecter_periode(self, q):
        periodes = {
            'Punique':   ['punique','carthage','tanit','hannibal','phenicien','barcide','hamilcar'],
            'Romaine':   ['romain','romaine','rome','romains','empire romain','hadrien','gordien'],
            'Byzantine': ['byzantin','byzantine','byzance','exarchat','heraclius','constant'],
            'Islamique': ['islamique','aghlabide','fatimide','hafside','islam','dinar','dirham',
                          'kairouan','coufique','califat','ifriqiya'],
            'Numide':    ['numide','numidie','massinissa','micipsa','jugurtha','cirta','berbere'],
        }
        for periode, mots in periodes.items():
            if any(mot in q for mot in mots): return periode
        return None

    def _detecter_materiau(self, q):
        materiaux = {
            'Or':     ['or ','en or','d or','dor','gold'],
            'Argent': ['argent','silver','d argent'],
            'Bronze': ['bronze','en bronze'],
            'Cuivre': ['cuivre','copper'],
        }
        for mat, mots in materiaux.items():
            if any(mot in q for mot in mots): return mat
        return None

    def _detecter_ville(self, q):
        villes = {
            'Sousse': ['sousse','hadrumetum'], 'Carthage': ['carthage'],
            'Kairouan': ['kairouan'], 'Dougga': ['dougga','thugga'],
            'Tunis': ['tunis','medina'], 'El Djem': ['el djem','thysdrus','eljem'],
            'Jendouba': ['jendouba','bulla regia'], 'Al-Mahdiyya': ['mahdiyya','mahdia'],
        }
        for ville, mots in villes.items():
            if any(mot in q for mot in mots): return ville
        return None

    def _repondre_par_periode(self, periode, q):
        monnaies = [m for m in self.monnaies if periode.lower() in str(m.get('periode','')).lower()]
        emojis   = {'Punique':'🏛️','Romaine':'⚔️','Byzantine':'✝️','Islamique':'☪️','Numide':'🗺️'}
        emoji    = emojis.get(periode, '🪙')
        if not monnaies: return f"Aucune monnaie de la période {periode}."
        rep = f"{emoji} <strong>Période {periode}</strong> ({len(monnaies)}) :<br><br>"
        for m in monnaies[:10]:
            a = m.get('annee')
            s = f"{abs(a)} av. J.-C." if a and a < 0 else f"{a} ap. J.-C." if a else ''
            rep += f"🪙 <strong>{m.get('nom','')}</strong><br>&nbsp;&nbsp;📅 {s} | ⚗️ {m.get('materiau','')} | 📍 {m.get('region','')}<br><br>"
        if len(monnaies) > 10: rep += f"<em>... et {len(monnaies)-10} autres.</em>"
        return rep

    def _repondre_par_materiau(self, materiau):
        monnaies = [m for m in self.monnaies if materiau.lower() == str(m.get('materiau','')).lower()]
        if not monnaies: return f"Aucune monnaie en {materiau}."
        rep = f"⚗️ <strong>Monnaies en {materiau}</strong> ({len(monnaies)}) :<br><br>"
        for m in monnaies[:10]:
            rep += f"🪙 <strong>{m.get('nom','')}</strong><br>&nbsp;&nbsp;🏛️ {m.get('periode','')} | 📍 {m.get('region','')} | 🏦 {m.get('collection','')}<br><br>"
        if len(monnaies) > 10: rep += f"<em>... et {len(monnaies)-10} autres.</em>"
        return rep

    def _repondre_par_ville(self, ville):
        monnaies = [m for m in self.monnaies
                    if ville.lower() in str(m.get('region','')).lower()
                    or ville.lower() in str(m.get('atelier','')).lower()]
        if not monnaies: return f"Aucune monnaie pour <strong>{ville}</strong>."
        rep = f"📍 <strong>Monnaies de {ville}</strong> ({len(monnaies)}) :<br><br>"
        for m in monnaies[:10]:
            a = m.get('annee')
            s = f"{abs(a)} av. J.-C." if a and a < 0 else f"{a} ap. J.-C." if a else ''
            rep += (f"🪙 <strong>{m.get('nom','')}</strong><br>"
                    f"&nbsp;&nbsp;🏛️ {m.get('periode','')} | ⚗️ {m.get('materiau','')} | 📅 {s}<br>")
            if m.get('description'):
                rep += f"&nbsp;&nbsp;📝 {str(m.get('description',''))[:100]}...<br>"
            rep += "<br>"
        return rep

    def _chercher_monnaie_par_nom(self, q):
        for m in self.monnaies:
            nom = self._normaliser(str(m.get('nom','')).lower())
            if any(mot in nom for mot in q.split() if len(mot) > 4): return m
        return None

    def _repondre_detail_monnaie(self, m):
        a = m.get('annee')
        s = f"{abs(a)} av. J.-C." if a and a < 0 else f"{a} ap. J.-C." if a else 'Date inconnue'
        rep = (f"🪙 <strong>{m.get('nom','')}</strong><br><br>"
               f"📅 <strong>Période :</strong> {m.get('periode','')}<br>"
               f"📅 <strong>Année :</strong> {s}<br>"
               f"⚗️ <strong>Matériau :</strong> {m.get('materiau','')}<br>"
               f"📍 <strong>Région :</strong> {m.get('region','')}<br>"
               f"⚒️ <strong>Atelier :</strong> {m.get('atelier','')}<br>")
        if m.get('poids'):       rep += f"⚖️ <strong>Poids :</strong> {m.get('poids')} g<br>"
        if m.get('diametre'):    rep += f"📏 <strong>Diamètre :</strong> {m.get('diametre')} mm<br>"
        if m.get('avers'):       rep += f"⬆️ <strong>Avers :</strong> {m.get('avers')}<br>"
        if m.get('revers'):      rep += f"⬇️ <strong>Revers :</strong> {m.get('revers')}<br>"
        if m.get('description'): rep += f"<br>📝 <strong>Description :</strong> {m.get('description')}<br>"
        if m.get('collection'):  rep += f"🏦 <strong>Collection :</strong> {m.get('collection')}<br>"
        return rep

    def _format_annee(self, annee):
        if not annee: return 'Date inconnue'
        return f"{abs(annee)} av. J.-C." if annee < 0 else f"{annee} ap. J.-C."