import { Routes } from '@angular/router';
import { HomeComponent } from './home/home';
import { CarteComponent } from './carte/carte';

export const routes: Routes = [
  { 
    path: '', 
    component: HomeComponent,
    children: [
      { path: 'cartes', component: CarteComponent }
    ]
  },
  { path: 'login', loadComponent: () => import('./login/login').then(m => m.LoginComponent) },
  { path: '**', redirectTo: '' }
];