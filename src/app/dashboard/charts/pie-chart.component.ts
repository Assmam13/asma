// ============================================================
// pie-chart.component.ts  —  Projet MONETA
// ============================================================

import { Component, Input, OnChanges, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector:   'app-pie-chart',
  standalone: true,
  imports:    [CommonModule],
  template:   `<canvas #canvas></canvas>`,
  styles:     [`canvas { width: 100% !important; max-height: 300px; }`]
})
export class PieChartComponent implements AfterViewInit, OnChanges, OnDestroy {

  @Input() data:  Record<string, number> = {};
  @Input() label: string = '';

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;

  // Palette archéologique MONETA
  private couleurs = [
    '#c9a84c', '#c0392b', '#2c3e50', '#7a6a52',
    '#e8d5a3', '#922b21', '#1c1c2e', '#ddd5c0'
  ];

  ngAfterViewInit(): void {
    this.creerChart();
  }

  ngOnChanges(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
    if (this.canvasRef) {
      this.creerChart();
    }
  }

  ngOnDestroy(): void {
    if (this.chart) this.chart.destroy();
  }

  private creerChart(): void {
    if (!this.canvasRef || !this.data || Object.keys(this.data).length === 0) return;

    const labels = Object.keys(this.data);
    const values = Object.values(this.data);

    this.chart = new Chart(this.canvasRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          label:           this.label,
          data:            values,
          backgroundColor: this.couleurs.slice(0, labels.length),
          borderColor:     '#ffffff',
          borderWidth:     2,
          hoverOffset:     8
        }]
      },
      options: {
        responsive:          true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels:   { font: { size: 11 }, padding: 12 }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
                const pct   = ((ctx.parsed / total) * 100).toFixed(1);
                return ` ${ctx.label} : ${ctx.parsed} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }
}