import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-request-access',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './request-access.html',
  styleUrl: './request-access.css'
})
export class RequestAccessComponent {
  constructor() {}

  onSubmit() {
    // Ici, vous pourrez ajouter la logique pour comparer les deux mots de passe
    console.log('Formulaire d\'inscription soumis !');
  }
}