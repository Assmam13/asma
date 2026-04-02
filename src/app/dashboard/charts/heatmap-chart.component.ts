// ============================================================
// heatmap-chart.component.ts  —  Apache ECharts  —  MONETA
// ============================================================

import { Component, Input, OnChanges, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as echarts from 'echarts';

@Component({
  selector:   'app-heatmap-chart',
  standalone: true,
  imports:    [CommonModule],
  template:   `<div #chartContainer style="width:100%;height:320px;"></div>`,
})
export class HeatmapChartComponent implements AfterViewInit, OnChanges, OnDestroy {

  @Input() data: Record<string, number> = {};

  @ViewChild('chartContainer') containerRef!: ElementRef<HTMLDivElement>;

  private chart: echarts.ECharts | null = null;

  ngAfterViewInit(): void {
    this.creerChart();
  }

  ngOnChanges(): void {
    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }
    if (this.containerRef) {
      this.creerChart();
    }
  }

  ngOnDestroy(): void {
    if (this.chart) this.chart.dispose();
  }

  private creerChart(): void {
    if (!this.containerRef || !this.data || Object.keys(this.data).length === 0) return;

    this.chart = echarts.init(this.containerRef.nativeElement);

    const regions = Object.keys(this.data);
    const values  = Object.values(this.data);
    const maxVal  = Math.max(...values);

    // Prépare les données pour le heatmap (x=région, y=0, valeur=count)
    const seriesData = regions.map((region, i) => [i, 0, values[i]]);

    const option: echarts.EChartsOption = {
      tooltip: {
        position: 'top',
        formatter: (params: any) => {
          const region = regions[params.data[0]];
          return `<strong>${region}</strong><br/>Monnaies : ${params.data[2]}`;
        }
      },
      grid: {
        top: '10%',
        left: '15%',
        right: '5%',
        bottom: '25%'
      },
      xAxis: {
        type: 'category',
        data: regions,
        axisLabel: {
          rotate: 35,
          fontSize: 11,
          color: '#7a6a52'
        },
        splitArea: { show: true }
      },
      yAxis: {
        type: 'category',
        data: ['Concentration'],
        axisLabel: { fontSize: 11, color: '#7a6a52' },
        splitArea: { show: true }
      },
      visualMap: {
        min:        0,
        max:        maxVal,
        calculable: true,
        orient:     'horizontal',
        left:       'center',
        bottom:     '0%',
        inRange: {
          color: ['#f5f0e8', '#e8d5a3', '#c9a84c', '#c0392b', '#7b1a0f']
        },
        textStyle: { color: '#7a6a52', fontSize: 11 }
      },
      series: [{
        name:         'Concentration',
        type:         'heatmap',
        data:         seriesData,
        label:        {
          show:      true,
          formatter: (params: any) => params.data[2],
          fontSize:  12,
          color:     '#1c1c2e'
        },
        emphasis: {
          itemStyle: {
            shadowBlur:   10,
            shadowColor:  'rgba(192,57,43,0.5)'
          }
        }
      }]
    };

    this.chart.setOption(option);

    // Responsive resize
    window.addEventListener('resize', () => this.chart?.resize());
  }
}