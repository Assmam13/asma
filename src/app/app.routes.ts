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
import { authGuard, superviseurGuard } from './auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    title: 'Moneta - Dashboard',
    canActivate: [authGuard],           // ✅ faut être connecté
    children: [
      {
        path: 'cartes',
        component: CarteComponent,
        title: 'Moneta - Cartes'
      },
      {
        path: 'monnaies',
        component: MonnaiesComponent,
        title: 'Moneta - Monnaies'
      }
    ]
  },
  {
    path: 'login',
    component: LoginComponent,
    title: 'Moneta - Connexion'
  },
  {
    path: 'request',
    component: RequestAccessComponent,
    title: 'Moneta - Inscription'
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent,
    title: 'Moneta - Mot de passe oublié'
  },
  {
    path: '**',
    redirectTo: ''
  }
];