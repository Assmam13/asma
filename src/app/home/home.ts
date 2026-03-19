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

  isAIMode        = false;
  isSearchFocused = false;

  constructor(public auth: AuthService, private router: Router) {}

  toggleAIMode(): void {
    this.isAIMode = !this.isAIMode;
  }

  onSearchFocus(): void { this.isSearchFocused = true;  }
  onSearchBlur():  void { this.isSearchFocused = false; }

  isWelcomeVisible(): boolean {
    return this.router.url === '/' || this.router.url === '/home';
  }

  seDeconnecter(): void {
    this.auth.logout();
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
}