// ============================================================
// monnaies.service.ts  —  Angular 21  —  Projet MONETA
// ============================================================

import { Injectable }             from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable }             from 'rxjs';
// ✅ PAS d'import environment — URL directe ci-dessous


// ── Modèle Monnaie ────────────────────────────────────────
export interface Monnaie {
  wikidataId:  string;
  nom:         string;
  description: string;
  image:       string | null;
  imageRevers: string | null;   // ✅ image du dos
  periode:     string;
  materiau:    string;
  region:      string;
  atelier:     string;
  annee:       number | null;
  diametre:    number | null;
  poids:       number | null;
  avers:       string;
  revers:      string;
  collection:  string;
}

// ── Réponse paginée du backend ────────────────────────────
export interface MonnaiesResponse {
  monnaies: Monnaie[];
  total:    number;
  page:     number;
  parPage:  number;
}

@Injectable({ providedIn: 'root' })
export class MonnaiesService {

  // ✅ URL directe — change le port si besoin (8080 = défaut Spring Boot)
  private apiUrl = 'http://localhost:8084/api/monnaies';

  constructor(private http: HttpClient) {}

  // ── GET toutes les monnaies ───────────────────────────────
  getMonnaies(params?: {
    periode?:   string;
    materiau?:  string;
    region?:    string;
    anneeMin?:  number;
    anneeMax?:  number;
    page?:      number;
    parPage?:   number;
  }): Observable<Monnaie[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          httpParams = httpParams.set(key, val.toString());
        }
      });
    }
    return this.http.get<Monnaie[]>(this.apiUrl, { params: httpParams });
  }

  // ── GET monnaie par ID Wikidata ───────────────────────────
  getMonnaieById(wikidataId: string): Observable<Monnaie> {
    return this.http.get<Monnaie>(`${this.apiUrl}/${wikidataId}`);
  }

  // ── UPDATE (Modifier) ────────────────────────────────────
updateMonnaie(wikidataId: string, monnaie: Monnaie): Observable<Monnaie> {
  // L'URL DOIT utiliser le port 8083 pour parler à Eclipse
  return this.http.put<Monnaie>(`http://localhost:8083/api/monnaies/${wikidataId}`, monnaie);
}

 // ── DELETE (Supprimer) ────────────────────────────────────
deleteMonnaie(wikidataId: string): Observable<void> {
  // Changement de 8084 à 8083
  return this.http.delete<void>(`http://localhost:8083/api/monnaies/${wikidataId}`);
}

  // ── Recherche dans le backend ─────────────────────────────
  rechercherMonnaies(query: string): Observable<Monnaie[]> {
    return this.http.get<Monnaie[]>(`${this.apiUrl}/search`, {
      params: new HttpParams().set('q', query)
    });
  }
}