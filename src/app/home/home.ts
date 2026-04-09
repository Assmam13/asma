// ============================================================
// home.ts  —  Projet MONETA — avec Mode IA Google style
// ============================================================

import { Component }                                          from '@angular/core';
import { CommonModule }                                       from '@angular/common';
import { FormsModule }                                        from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService }                                        from '../auth.service';
import { ModeIaComponent }                                    from '../mode-ia/mode-ia';

@Component({
  selector:    'app-home',
  standalone:  true,
  imports:     [CommonModule, FormsModule, RouterLink, RouterLinkActive, RouterOutlet, ModeIaComponent],
  templateUrl: './home.html',
  styleUrl:    './home.css'
})
export class HomeComponent {

  isAIMode    = false;
  searchQuery = '';

  constructor(public auth: AuthService, private router: Router) {}

  toggleModeIA(): void {
    this.isAIMode = !this.isAIMode;
  }

  fermerModeIA(): void {
    this.isAIMode = false;
  }

  isWelcomeVisible(): boolean {
    return this.router.url === '/' || this.router.url === '/home';
  }

  seDeconnecter(): void {
    this.auth.logout();
  }

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