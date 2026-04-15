// ============================================================
// home.ts  —  Projet MONETA
// Barre de recherche globale : filtre classique + Mode IA
// ============================================================

import { Component }                                          from '@angular/core';
import { CommonModule }                                       from '@angular/common';
import { FormsModule }                                        from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { HttpClient }                                         from '@angular/common/http';
import { AuthService }                                        from '../auth.service';
import { ModeIaComponent }                                    from '../mode-ia/mode-ia';

interface FiltresExtraits {
  periode:   string;
  materiau:  string;
  region:    string;
  recherche: string;
  source:    string;
}

@Component({
  selector:    'app-home',
  standalone:  true,
  imports:     [CommonModule, FormsModule, RouterLink, RouterLinkActive, RouterOutlet, ModeIaComponent],
  templateUrl: './home.html',
  styleUrl:    './home.css'
})
export class HomeComponent {

  // ── Mode IA ───────────────────────────────────────────────
  isAIMode      = false;
  isExtracting  = false;
  iaError       = '';
  filtreIA: FiltresExtraits | null = null;

  // ── Filtres classiques (barre du haut) ───────────────────
  searchQuery  = '';   // recherche libre
  filtrePeriode  = '';
  filtreMateriau = '';
  filtreRegion   = '';

  private flaskUrl = 'https://localhost:5000/api/extract-filters';

  constructor(
    public  auth:   AuthService,
    private router: Router,
    private http:   HttpClient
  ) {}

  // ── Toggle Mode IA ────────────────────────────────────────
  toggleModeIA(): void {
    this.isAIMode    = !this.isAIMode;
    this.searchQuery = '';
    this.filtreIA    = null;
    this.iaError     = '';
  }

  fermerModeIA(): void {
    this.isAIMode = false;
    this.filtreIA = null;
    this.iaError  = '';
  }

  // ── Appliquer filtre CLASSIQUE ────────────────────────────
  appliquerFiltreClassique(): void {
    const params: any = {};

    if (this.searchQuery.trim())   params['recherche'] = this.searchQuery.trim();
    if (this.filtrePeriode)        params['periode']   = this.filtrePeriode;
    if (this.filtreMateriau)       params['materiau']  = this.filtreMateriau;
    if (this.filtreRegion.trim())  params['region']    = this.filtreRegion.trim();

    // Naviguer vers /monnaies avec les filtres
    this.router.navigate(['/monnaies'], { queryParams: params });
  }

  // ── Réinitialiser filtres classiques ──────────────────────
  reinitialiserClassique(): void {
    this.searchQuery   = '';
    this.filtrePeriode  = '';
    this.filtreMateriau = '';
    this.filtreRegion   = '';
    this.router.navigate(['/monnaies']);
  }

  // ── Appliquer Mode IA ─────────────────────────────────────
  appliquerModeIA(): void {
    const phrase = this.searchQuery.trim();
    if (!phrase) return;

    this.isExtracting = true;
    this.iaError      = '';
    this.filtreIA     = null;

    this.http.post<FiltresExtraits>(this.flaskUrl, { phrase }).subscribe({
      next: (filtres) => {
        this.isExtracting = false;
        this.filtreIA     = filtres;

        // Naviguer vers /monnaies avec filtres IA
        this.router.navigate(['/monnaies'], {
          queryParams: {
            periode:   filtres.periode   || null,
            materiau:  filtres.materiau  || null,
            region:    filtres.region    || null,
            recherche: filtres.recherche || null,
            modeIA:    'true'
          }
        });

        setTimeout(() => {
          this.isAIMode    = false;
          this.filtreIA    = null;
          this.searchQuery = '';
        }, 500);
      },
      error: () => {
        this.isExtracting = false;
        this.iaError      = 'Service IA indisponible. Vérifiez que Flask tourne sur le port 5000.';
      }
    });
  }

  reinitialiserIA(): void {
    this.searchQuery = '';
    this.filtreIA    = null;
    this.iaError     = '';
  }

  // ── Utilitaires ───────────────────────────────────────────
  isWelcomeVisible(): boolean {
    return this.router.url === '/' || this.router.url === '/home';
  }

  seDeconnecter(): void { this.auth.logout(); }

  getRoleClass(): string {
    switch (this.auth.getRole()) {
      case 'ADMIN':       return 'role-admin';
      case 'SUPERVISEUR': return 'role-superviseur';
      default:            return 'role-visiteur';
    }
  }

  getRoleLabel(): string {
    switch (this.auth.getRole()) {
      case 'ADMIN':       return '👑 Admin';
      case 'SUPERVISEUR': return '🔧 Superviseur';
      default:            return '👁️ Visiteur';
    }
  }
}
