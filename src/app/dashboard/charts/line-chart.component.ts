// ============================================================
// line-chart.component.ts  —  Chart.js  —  MONETA
// ============================================================

import { Component, Input, OnChanges, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector:   'app-line-chart',
  standalone: true,
  imports:    [CommonModule],
  template:   `<canvas #canvas></canvas>`,
  styles:     [`canvas { width: 100% !important; max-height: 300px; }`]
})
export class LineChartComponent implements AfterViewInit, OnChanges, OnDestroy {

  @Input() data:  Record<string, number> = {};
  @Input() label: string = '';

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;

  ngAfterViewInit(): void { this.creerChart(); }

  ngOnChanges(): void {
    if (this.chart) { this.chart.destroy(); this.chart = null; }
    if (this.canvasRef) this.creerChart();
  }

  ngOnDestroy(): void {
    if (this.chart) this.chart.destroy();
  }

  private creerChart(): void {
    if (!this.canvasRef || !this.data || Object.keys(this.data).length === 0) return;

    // Trie par année croissante
    const sorted  = Object.entries(this.data).sort((a, b) => Number(a[0]) - Number(b[0]));
    const labels  = sorted.map(([k]) => k < '0' ? `${Math.abs(Number(k))} av. J.-C.` : `${k} ap. J.-C.`);
    const values  = sorted.map(([, v]) => v);

    this.chart = new Chart(this.canvasRef.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label:           this.label,
          data:            values,
          borderColor:     '#c0392b',
          backgroundColor: 'rgba(192,57,43,0.08)',
          borderWidth:     2.5,
          pointBackgroundColor: '#c9a84c',
          pointBorderColor:     '#c0392b',
          pointRadius:     5,
          pointHoverRadius:8,
          fill:            true,
          tension:         0.4
        }]
      },
      options: {
        responsive:          true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.parsed.y} monnaie(s)`
            }
          }
        },
        scales: {
          x: {
            grid:  { display: false },
            ticks: { font: { size: 10 }, maxRotation: 45 }
          },
          y: {
            beginAtZero: true,
            ticks:       { stepSize: 1, font: { size: 11 } },
            grid:        { color: '#f0ebe0' }
          }
        }
      }
    });
  }
}