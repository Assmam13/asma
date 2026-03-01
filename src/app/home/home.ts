import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

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

  constructor() {}

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
}