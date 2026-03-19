// ============================================================
// login.ts  —  Projet MONETA
// ============================================================

import { Component }     from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule }   from '@angular/forms';
import { RouterLink }    from '@angular/router';
import { Router }        from '@angular/router';
import { AuthService }   from '../auth.service';

@Component({
  selector:    'app-login',
  standalone:  true,
  imports:     [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl:    './login.css'
})
export class LoginComponent {

  username  = '';
  password  = '';
  erreur    = '';
  chargement = false;

  constructor(private auth: AuthService, private router: Router) {
    // Si déjà connecté → redirect direct
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/']);
    }
  }

  seConnecter(): void {
    this.erreur = '';

    if (!this.username.trim() || !this.password.trim()) {
      this.erreur = 'Veuillez remplir tous les champs.';
      return;
    }

    this.chargement = true;

    this.auth.login({ username: this.username, password: this.password }).subscribe({
      next: () => {
        this.chargement = false;
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.chargement = false;
        if (err.status === 401) {
          this.erreur = 'Identifiants incorrects. Veuillez réessayer.';
        } else if (err.status === 0) {
          this.erreur = 'Impossible de contacter le serveur.';
        } else {
          this.erreur = 'Une erreur est survenue. Veuillez réessayer.';
        }
      }
    });
  }
}