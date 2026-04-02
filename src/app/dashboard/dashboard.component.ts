// ============================================================
// dashboard.component.ts  —  Projet MONETA
// ============================================================

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule }                 from '@angular/common';
import { HttpClient }                   from '@angular/common/http';
import { Subject }                      from 'rxjs';
import { takeUntil }                    from 'rxjs/operators';
import { AuthService }                  from '../auth.service';
import { BarChartComponent }            from './charts/bar-chart.component';
import { PieChartComponent }            from './charts/pie-chart.component';
import { CounterComponent }             from './charts/counter.component';

export interface DashboardData {
  globales: {
    totalMonnaies:      number;
    totalUtilisateurs:  number;
    totalVisiteurs:     number;
    totalSuperviseurs:  number;
    totalAdmins:        number;
  };
  categories: {
    parPeriode:  Record<string, number>;
    parMateriau: Record<string, number>;
    parRegion:   Record<string, number>;
  };
}

@Component({
  selector:    'app-dashboard',
  standalone:  true,
  imports:     [CommonModule, BarChartComponent, PieChartComponent, CounterComponent],
  templateUrl: './dashboard.component.html',
  styleUrl:    './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {

  data:       DashboardData | null = null;
  chargement  = true;
  erreur      = '';

  private destroy$ = new Subject<void>();
  private apiUrl   = 'http://localhost:8080/api/bi/dashboard';

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

    this.http.get<DashboardData>(this.apiUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.data       = data;
          this.chargement = false;
        },
        error: () => {
          this.erreur     = 'Impossible de charger les statistiques.';
          this.chargement = false;
        }
      });
  }
}