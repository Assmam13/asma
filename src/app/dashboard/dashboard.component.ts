// ============================================================
// dashboard.component.ts  —  Projet MONETA  —  RBAC
// ============================================================

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule }                 from '@angular/common';
import { HttpClient }                   from '@angular/common/http';
import { Subject }                      from 'rxjs';
import { takeUntil }                    from 'rxjs/operators';
import { AuthService }                  from '../auth.service';
import { BarChartComponent }            from './charts/bar-chart.component';
import { PieChartComponent }            from './charts/pie-chart.component';
import { LineChartComponent }           from './charts/line-chart.component';
import { HeatmapChartComponent }        from './charts/heatmap-chart.component';
import { CounterComponent }             from './charts/counter.component';

export interface DashboardData {
  globales: {
    totalMonnaies:        number;
    totalUtilisateurs:    number;
    totalVisiteurs:       number;
    totalSuperviseurs:    number;
    totalAdmins:          number;
    visiteursAujourdhui:  number;
    visiteursParSemaine:  number;
    visiteursParMois:     number;
  };
  categories: {
    parPeriode:  Record<string, number>;
    parMateriau: Record<string, number>;
    parRegion:   Record<string, number>;
    parAnnee:    Record<string, number>;
  };
}

@Component({
  selector:    'app-dashboard',
  standalone:  true,
  imports:     [
    CommonModule,
    BarChartComponent,
    PieChartComponent,
    LineChartComponent,
    HeatmapChartComponent,
    CounterComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl:    './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {

  data:       DashboardData | null = null;
  chargement  = true;
  erreur      = '';

  // ✅ RBAC — propriétés de rôle
  get isAdmin():       boolean { return this.auth.isAdmin(); }
  get isSuperviseur(): boolean { return this.auth.isSuperviseur(); }

  private destroy$ = new Subject<void>();

  // ✅ RBAC — endpoint selon le rôle
  private get apiUrl(): string {
    return this.auth.isAdmin()
      ? 'https://localhost:8443/api/bi/dashboard'
      : 'https://localhost:8443/api/bi/stats/scientifiques';
  }

  constructor(private http: HttpClient, public auth: AuthService) {}

  ngOnInit(): void {
    this.chargerDashboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  chargerDashboard(): void {
    this.chargement = true;
    this.erreur     = '';

    if (this.auth.isAdmin()) {
      // ── Admin : charge le dashboard complet ──────────────
      this.http.get<DashboardData>('https://localhost:8443/api/bi/dashboard')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next:  (data) => { this.data = data; this.chargement = false; },
          error: ()     => { this.erreur = 'Impossible de charger les statistiques.'; this.chargement = false; }
        });

    } else {
      // ── Superviseur : charge stats scientifiques + construit un DashboardData partiel ──
      this.http.get<any>('https://localhost:8443/api/bi/stats/scientifiques')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (cats) => {
            // Récupérer aussi le total des monnaies
            this.http.get<any>('https://localhost:8443/api/monnaies')
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (monnaies) => {
                  this.data = {
                    globales: {
                      totalMonnaies:       Array.isArray(monnaies) ? monnaies.length : 0,
                      totalUtilisateurs:   0,
                      totalVisiteurs:      0,
                      totalSuperviseurs:   0,
                      totalAdmins:         0,
                      visiteursAujourdhui: 0,
                      visiteursParSemaine: 0,
                      visiteursParMois:    0,
                    },
                    categories: {
                      parPeriode:  cats.parPeriode  || {},
                      parMateriau: cats.parMateriau || {},
                      parRegion:   cats.parRegion   || {},
                      parAnnee:    cats.parAnnee    || {},
                    }
                  };
                  this.chargement = false;
                },
                error: () => {
                  // Fallback sans total monnaies
                  this.data = {
                    globales: {
                      totalMonnaies: 0, totalUtilisateurs: 0, totalVisiteurs: 0,
                      totalSuperviseurs: 0, totalAdmins: 0,
                      visiteursAujourdhui: 0, visiteursParSemaine: 0, visiteursParMois: 0,
                    },
                    categories: {
                      parPeriode:  cats.parPeriode  || {},
                      parMateriau: cats.parMateriau || {},
                      parRegion:   cats.parRegion   || {},
                      parAnnee:    cats.parAnnee    || {},
                    }
                  };
                  this.chargement = false;
                }
              });
          },
          error: () => {
            this.erreur     = 'Impossible de charger les statistiques.';
            this.chargement = false;
          }
        });
    }
  }
}
