import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { ChatbotComponent } from './chatbot/chatbot';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Component({
  selector:    'app-root',
  standalone:  true,
  imports:     [RouterOutlet, ChatbotComponent, CommonModule],
  templateUrl: './app.html',
  styleUrl:    './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('pfe-angular-app');

  // ✅ Utilisateur connecté — alimenté depuis AuthService
  utilisateurConnecte: { email?: string; prenom?: string; role?: string } | null = null;

  // ✅ Pages où le chatbot est caché
  private pagesPubliques = ['/login', '/request-access', '/forgot-password'];
  afficherChatbot = false;

  constructor(private router: Router, private auth: AuthService) {
    // Écoute les changements de route
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects || event.url;

      // Cache le chatbot sur les pages publiques
      this.afficherChatbot = !this.pagesPubliques.some(p => url.startsWith(p));

      // ✅ Met à jour l'utilisateur connecté à chaque navigation
      this._mettreAJourUtilisateur();
    });
  }

  ngOnInit(): void {
    this._mettreAJourUtilisateur();
  }

  // ✅ Lit l'utilisateur depuis AuthService (localStorage)
  private _mettreAJourUtilisateur(): void {
    if (this.auth.isLoggedIn()) {
      this.utilisateurConnecte = {
        email:  this.auth.getEmail()    ?? undefined,
        prenom: this.auth.getUsername() ?? undefined,
        role:   this.auth.getRole()     ?? undefined,
      };
    } else {
      // ✅ Déconnecté → réinitialise le chatbot
      this.utilisateurConnecte = null;
    }
  }
}
