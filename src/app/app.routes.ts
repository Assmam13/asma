// ============================================================
// app.routes.ts  —  Projet MONETA
// ============================================================

import { Routes }                  from '@angular/router';
import { HomeComponent }           from './home/home';
import { LoginComponent }          from './login/login';
import { RequestAccessComponent }  from './request-access/request-access';
import { ForgotPasswordComponent } from './forgot-password/forgot-password';
import { MonnaiesComponent }       from './monnaies/monnaies';
import { CarteComponent }          from './carte/carte';
import { DashboardComponent }      from './dashboard/dashboard.component';
import { ClassificationComponent } from './classification/classification';
import { ModeIaComponent }         from './mode-ia/mode-ia';
import { authGuard, adminGuard, superviseurGuard } from './auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    title: 'Moneta - Accueil',
    canActivate: [authGuard],
    children: [
      { path: 'cartes',         component: CarteComponent },
      { path: 'monnaies',       component: MonnaiesComponent },
      { path: 'classification', component: ClassificationComponent, title: 'Moneta - Classification CNN' },
      {
        path:        'dashboard',
        component:   DashboardComponent,
        title:       'Moneta - Dashboard BI',
        // ✅ RBAC : Admin ET Superviseur peuvent accéder
        canActivate: [superviseurGuard]
      }
    ]
  },
  { path: 'login',           component: LoginComponent,          title: 'Moneta - Connexion'           },
  { path: 'request',         component: RequestAccessComponent,  title: 'Moneta - Inscription'         },
  { path: 'forgot-password', component: ForgotPasswordComponent, title: 'Moneta - Mot de passe oublié' },
  { path: '**', redirectTo: '' }
];
