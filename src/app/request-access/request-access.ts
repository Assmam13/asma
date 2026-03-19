// ============================================================
// request-access.ts  —  Projet MONETA
// ============================================================

import { Component }    from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule }  from '@angular/forms';
import { RouterLink }   from '@angular/router';
import { Router }       from '@angular/router';
import { AuthService }  from '../auth.service';

@Component({
  selector:    'app-request-access',
  standalone:  true,
  imports:     [CommonModule, FormsModule, RouterLink],
  templateUrl: './request-access.html',
  styleUrl:    './request-access.css'
})
export class RequestAccessComponent {

  username        = '';
  email           = '';
  password        = '';
  confirmPassword = '';
  erreur          = '';
  succes          = '';
  chargement      = false;

  constructor(private auth: AuthService, private router: Router) {
    // Si déjà connecté → redirect
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/']);
    }
  }

  onSubmit(): void {
    this.erreur = '';
    this.succes = '';

    // ── Validations ──────────────────────────────────────
    if (!this.username.trim() || !this.email.trim() ||
        !this.password.trim() || !this.confirmPassword.trim()) {
      this.erreur = 'Veuillez remplir tous les champs.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.erreur = 'Les mots de passe ne correspondent pas.';
      return;
    }

    if (this.password.length < 6) {
      this.erreur = 'Le mot de passe doit contenir au moins 6 caractères.';
      return;
    }

    // ── Appel backend ─────────────────────────────────────
    this.chargement = true;

    this.auth.register({
      username: this.username,
      email:    this.email,
      password: this.password,
      role:     'VISITEUR'   // tout nouveau compte = Visiteur par défaut
    }).subscribe({
      next: () => {
        this.chargement = false;
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.chargement = false;
        if (err.status === 409) {
          this.erreur = 'Ce nom d\'utilisateur ou email est déjà utilisé.';
        } else if (err.status === 0) {
          this.erreur = 'Impossible de contacter le serveur.';
        } else {
          this.erreur = 'Une erreur est survenue. Veuillez réessayer.';
        }
      }
    });
  }
}