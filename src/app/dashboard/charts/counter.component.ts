// ============================================================
// counter.component.ts  —  Projet MONETA
// ============================================================

import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule }                from '@angular/common';

@Component({
  selector:   'app-counter',
  standalone: true,
  imports:    [CommonModule],
  template: `
    <div class="counter-card" [class]="'counter-' + color">
      <div class="counter-icon">{{ icon }}</div>
      <div class="counter-value">{{ displayValue }}</div>
      <div class="counter-label">{{ label }}</div>
    </div>
  `,
  styles: [`
    .counter-card {
      background: white;
      border-radius: 16px;
      padding: 1.5rem;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      border: 1px solid #ddd5c0;
      border-top: 4px solid #c9a84c;
      transition: transform 0.2s;
    }
    .counter-card:hover { transform: translateY(-3px); }
    .counter-or    { border-top-color: #c9a84c; }
    .counter-rouge { border-top-color: #c0392b; }
    .counter-vert  { border-top-color: #27ae60; }
    .counter-bleu  { border-top-color: #2980b9; }
    .counter-icon  { font-size: 2rem; margin-bottom: 0.5rem; }
    .counter-value {
      font-family: 'Cinzel', serif;
      font-size: 2.2rem;
      font-weight: 700;
      color: #1c1c2e;
      line-height: 1;
      margin-bottom: 0.4rem;
    }
    .counter-label {
      font-size: 0.82rem;
      color: #7a6a52;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 600;
    }
  `]
})
export class CounterComponent implements OnChanges {

  @Input() value: number = 0;
  @Input() label: string = '';
  @Input() icon:  string = '📊';
  @Input() color: string = 'or';

  displayValue = 0;

  ngOnChanges(): void {
    this.animer(0, this.value, 1000);
  }

  private animer(debut: number, fin: number, duree: number): void {
    const debut_temps = performance.now();
    const step = (temps_actuel: number) => {
      const elapsed  = temps_actuel - debut_temps;
      const progress = Math.min(elapsed / duree, 1);
      this.displayValue = Math.floor(debut + (fin - debut) * progress);
      if (progress < 1) requestAnimationFrame(step);
      else this.displayValue = fin;
    };
    requestAnimationFrame(step);
  }
}