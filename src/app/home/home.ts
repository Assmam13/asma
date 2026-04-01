// ============================================================
// home.ts  —  Projet MONETA
// ============================================================

import { Component }                                        from '@angular/core';
import { CommonModule }                                     from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService }                                      from '../auth.service';

@Component({
  selector:    'app-home',
  standalone:  true,
  imports:     [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './home.html',
  styleUrl:    './home.css'
})
export class HomeComponent {

  isAIMode        = false;// mode recherche IA activé ou non
  isSearchFocused = false; // barre de recherche active ou non

  constructor(public auth: AuthService, private router: Router) {}

  toggleAIMode(): void {
    this.isAIMode = !this.isAIMode;  // active/désactive la recherche IA
  }

  onSearchFocus(): void { this.isSearchFocused = true;  }
  onSearchBlur():  void { this.isSearchFocused = false; }

  isWelcomeVisible(): boolean {
    return this.router.url === '/' || this.router.url === '/home';
  }// Affiche le message de bienvenue seulement sur la page d'accueil — disparaît quand tu navigues vers Monnaies ou Carte

  seDeconnecter(): void {
    this.auth.logout(); // appelle auth.service → supprime localStorage → /login
  }

  // Returns a color class based on role
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
  //Affiche le bon badge coloré selon le rôle de l'utilisateur connecté
}