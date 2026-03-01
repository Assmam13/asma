import { Routes } from '@angular/router';
import { HomeComponent } from './home/home';
import { LoginComponent } from './login/login';
import { RequestAccessComponent } from './request-access/request-access';
import { ForgotPasswordComponent } from './forgot-password/forgot-password';

export const routes: Routes = [
  { 
    path: '', 
    component: HomeComponent, 
    title: 'Moneta - Dashboard' 
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