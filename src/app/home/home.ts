import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent {
  isAIMode: boolean = false;
  isSearchFocused: boolean = false;

  constructor(private router: Router) {}

  toggleAIMode(): void {
    this.isAIMode = !this.isAIMode;
    
    if (this.isAIMode) {
      console.log('Mode MIA Activé: Moneta Intelligence Archéologique prête.');
    } else {
      console.log('Mode MIA Désactivé: Retour à la recherche standard.');
    }
  }

  onSearchFocus(): void {
    this.isSearchFocused = true;
  }

  onSearchBlur(): void {
    this.isSearchFocused = false;
  }

  // This checks if the user is on the main dashboard page
  isWelcomeVisible(): boolean {
    // If URL is just / or /home, show banner. Otherwise (like /cartes), hide it.
    return this.router.url === '/' || this.router.url === '/home';
  }
}