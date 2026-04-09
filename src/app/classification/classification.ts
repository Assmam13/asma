import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface PredictionResult {
  success: boolean;
  fichier: string;
  prediction: {
    classe: string;
    confiance: number;
    description: string;
  };
  top3: {
    classe: string;
    confiance: number;
    description: string;
  }[];
  toutes_classes: {
    classe: string;
    confiance: number;
  }[];
}

@Component({
  selector: 'app-classification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './classification.html',
  styleUrls: ['./classification.css']
})
export class ClassificationComponent {

  // ── État ──────────────────────────────────────────────────
  imagePreview:  string | null = null;
  selectedFile:  File | null   = null;
  chargement     = false;
  resultat:      PredictionResult | null = null;
  erreur:        string | null = null;

  private apiUrl = 'http://localhost:8000';

  // Couleurs par époque
  private couleurs: {[k: string]: string} = {
    'Punique':   '#c9a84c',
    'Romaine':   '#c0392b',
    'Byzantine': '#8e44ad',
    'Islamique': '#27ae60',
    'Numide':    '#2980b9',
    'Medievale': '#e67e22',
    'Moderne':   '#16a085',
  };

  private symboles: {[k: string]: string} = {
    'Punique':   '🏛',
    'Romaine':   '⚔',
    'Byzantine': '✝',
    'Islamique': '☪',
    'Numide':    '🗺',
    'Medievale': '⚜',
    'Moderne':   '🪙',
  };

  constructor(private http: HttpClient) {}

  // ── Sélection de fichier ──────────────────────────────────
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      this.erreur = 'Veuillez sélectionner une image (JPG, PNG, etc.)';
      return;
    }

    this.selectedFile = file;
    this.resultat     = null;
    this.erreur       = null;

    // Prévisualisation
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  // ── Drag & Drop ───────────────────────────────────────────
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer?.files[0];
    if (file && file.type.startsWith('image/')) {
      this.selectedFile = file;
      this.resultat     = null;
      this.erreur       = null;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  // ── Prédiction ────────────────────────────────────────────
  classifier(): void {
    if (!this.selectedFile) return;

    this.chargement = true;
    this.erreur     = null;
    this.resultat   = null;

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.http.post<PredictionResult>(`${this.apiUrl}/predict`, formData)
      .subscribe({
        next: (res) => {
          this.resultat   = res;
          this.chargement = false;
        },
        error: (err) => {
          this.chargement = false;
          if (err.status === 0) {
            this.erreur = '❌ API CNN non disponible. Lancez api_cnn.py sur le port 8000.';
          } else {
            this.erreur = `❌ Erreur ${err.status}: ${err.error?.detail || err.message}`;
          }
        }
      });
  }

  // ── Reset ─────────────────────────────────────────────────
  reinitialiser(): void {
    this.imagePreview = null;
    this.selectedFile = null;
    this.resultat     = null;
    this.erreur       = null;
  }

  // ── Helpers ───────────────────────────────────────────────
  getCouleur(classe: string): string {
    return this.couleurs[classe] || '#888';
  }

  getSymbole(classe: string): string {
    return this.symboles[classe] || '🪙';
  }

  getNiveauConfiance(confiance: number): string {
    if (confiance >= 70) return 'Très élevée';
    if (confiance >= 50) return 'Élevée';
    if (confiance >= 30) return 'Moyenne';
    return 'Faible';
  }

  getNiveauCouleur(confiance: number): string {
    if (confiance >= 70) return '#27ae60';
    if (confiance >= 50) return '#f39c12';
    if (confiance >= 30) return '#e67e22';
    return '#c0392b';
  }
}
