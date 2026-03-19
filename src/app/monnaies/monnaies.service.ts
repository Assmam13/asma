// ============================================================
// monnaies.service.ts  —  Angular 21  —  Projet MONETA
// ============================================================

import { Injectable }             from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable }             from 'rxjs';

// ── Modèle Monnaie ────────────────────────────────────────
export interface Monnaie {
  wikidataId:  string;
  nom:         string;
  description: string;
  image:       string | null;
  imageRevers: string | null;
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

  // ✅ Un seul port — modifiez ici si besoin
  private apiUrl = 'http://localhost:8083/api/monnaies';

  constructor(private http: HttpClient) {}

  // ── GET toutes les monnaies ───────────────────────────────
  getMonnaies(params?: {
    periode?:  string;
    materiau?: string;
    region?:   string;
    anneeMin?: number;
    anneeMax?: number;
    page?:     number;
    parPage?:  number;
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

  // ── CREATE (Ajouter) ─────────────────────────────────────
  createMonnaie(monnaie: Monnaie): Observable<Monnaie> {
    return this.http.post<Monnaie>(this.apiUrl, monnaie);
  }

  // ── UPDATE (Modifier) ────────────────────────────────────
  updateMonnaie(wikidataId: string, monnaie: Monnaie): Observable<Monnaie> {
    return this.http.put<Monnaie>(`${this.apiUrl}/${wikidataId}`, monnaie);
  }

  // ── DELETE (Supprimer) ───────────────────────────────────
  deleteMonnaie(wikidataId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${wikidataId}`);
  }

  // ── Recherche dans le backend ─────────────────────────────
  rechercherMonnaies(query: string): Observable<Monnaie[]> {
    return this.http.get<Monnaie[]>(`${this.apiUrl}/search`, {
      params: new HttpParams().set('q', query)
    });
  }
}