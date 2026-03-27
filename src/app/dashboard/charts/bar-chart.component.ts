// ============================================================
// bar-chart.component.ts  —  Projet MONETA
// ============================================================

import { Component, Input, OnChanges, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector:   'app-bar-chart',
  standalone: true,
  imports:    [CommonModule],
  template:   `<canvas #canvas></canvas>`,
  styles:     [`canvas { width: 100% !important; max-height: 300px; }`]
})
export class BarChartComponent implements AfterViewInit, OnChanges, OnDestroy {

  @Input() data:  Record<string, number> = {};
  @Input() label: string = '';
  @Input() color: string = '#c0392b';

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;

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
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label:           this.label,
          data:            values,
          backgroundColor: this.color + 'CC',
          borderColor:     this.color,
          borderWidth:     1.5,
          borderRadius:    6,
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
            ticks: { font: { size: 11 }, maxRotation: 35 }
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