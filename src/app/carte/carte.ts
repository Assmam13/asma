import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';

// 1. Définition de la structure des données (Votre Base de Données)
interface ArcheoCoin {
  id: string;
  nom: string;
  epoque: 'Antique' | 'Romaine' | 'Islamique';
  materiau: string;
  latitude: number;
  longitude: number;
  description: string;
}

@Component({
  selector: 'app-carte',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './carte.html',
  styleUrl: './carte.css'
})
export class CarteComponent implements AfterViewInit, OnDestroy {
  private map!: L.Map;

  // 2. Simulation de votre base de données
  private database: ArcheoCoin[] = [
    {
      id: 'C001',
      nom: 'Sicle de Carthage',
      epoque: 'Antique',
      materiau: 'Argent',
      latitude: 36.8529, 
      longitude: 10.3233, // Carthage
      description: 'Monnaie frappée lors de la première guerre punique.'
    },
    {
      id: 'R045',
      nom: 'Sesterce d\'Auguste',
      epoque: 'Romaine',
      materiau: 'Bronze',
      latitude: 36.4222, 
      longitude: 9.2202, // Dougga
      description: 'Découverte près du Capitole, excellent état de conservation.'
    },
    {
      id: 'I012',
      nom: 'Dinar Aghlabide',
      epoque: 'Islamique',
      materiau: 'Or',
      latitude: 35.6781, 
      longitude: 10.0963, // Kairouan
      description: 'Monnaie d\'or pur trouvée lors des fouilles des bassins.'
    }
  ];

  constructor() {}

  ngAfterViewInit(): void {
    this.initMap();
    this.loadMarkers();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove(); // Nettoyer la mémoire en quittant la page
    }
  }

  // 3. Initialisation de la carte Leaflet
  private initMap(): void {
    // Coordonnées centrales (ex: Tunisie) et niveau de zoom
    this.map = L.map('historical-map').setView([35.8, 9.8], 7);

    // Ajout de la couche visuelle (Tuiles OpenStreetMap)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(this.map);
  }

  // 4. Boucle pour lier les données aux marqueurs
  private loadMarkers(): void {
    this.database.forEach(coin => {
      // Déterminer la couleur selon l'époque
      let markerColor = '#dd0031'; // Rouge Moneta par défaut
      if (coin.epoque === 'Antique') markerColor = '#f39c12'; // Orange
      if (coin.epoque === 'Islamique') markerColor = '#27ae60'; // Vert

      // Création d'une icône HTML personnalisée (contourne les bugs d'images Angular/Leaflet)
      const customIcon = L.divIcon({
        className: 'custom-pin',
        html: `<div style="background-color: ${markerColor}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      // Création du Pop-up HTML
      const popupContent = `
        <div class="popup-title">${coin.nom}</div>
        <div class="popup-era">${coin.epoque} • ${coin.materiau}</div>
        <p class="popup-desc">${coin.description}</p>
      `;

      // Ajout du marqueur sur la carte
      L.marker([coin.latitude, coin.longitude], { icon: customIcon })
        .addTo(this.map)
        .bindPopup(popupContent);
    });
  }
}