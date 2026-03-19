import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';

interface ArcheoCoin {
  id: string;
  nom: string;
  epoque: 'Punique' | 'Romaine' | 'Byzantine' | 'Islamique' | 'Numide';
  materiau: string;
  latitude: number;
  longitude: number;
  description: string;
  annee: string;
  musee: string;
  image?: string;
}

// Interface pour les données Spring Boot
interface MonnaieApi {
  wikidataId: string;
  nom:         string;
  periode:     string;
  materiau:    string;
  region:      string;
  description: string;
  annee:       number;
  collection:  string;
  image:       string;
  imageRevers: string;
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
  private allMarkers: { marker: L.Marker; coin: ArcheoCoin }[] = [];

  epoqueActive = 'Toutes';
  chargement   = true;

  epoques = [
    { label: 'Toutes',    couleur: '' },
    { label: 'Punique',   couleur: '#c9a84c' },
    { label: 'Romaine',   couleur: '#c0392b' },
    { label: 'Byzantine', couleur: '#8e44ad' },
    { label: 'Islamique', couleur: '#27ae60' },
    { label: 'Numide',    couleur: '#2980b9' },
  ];

  get statsEpoques() {
    const stats: {[k: string]: number} = {};
    this.database.forEach(c => {
      stats[c.epoque] = (stats[c.epoque] || 0) + 1;
    });
    return stats;
  }

  // Coordonnées fixes par ID
  private coords: {[id: string]: [number, number]} = {
    'TUN001': [36.8529, 10.3233], 'TUN002': [36.8580, 10.3250],
    'TUN003': [36.8510, 10.3210], 'TUN004': [36.8540, 10.3260],
    'TUN005': [35.2967, 10.7061], 'TUN006': [36.8529, 10.3240],
    'TUN007': [36.8100, 10.1800], 'TUN008': [36.5603, 8.7560],
    'TUN009': [35.5000, 9.5000],  'TUN010': [35.8245, 10.6346],
    'TUN011': [36.4222, 9.2202],  'TUN012': [36.8529, 10.3233],
    'TUN013': [36.8600, 10.3200], 'TUN014': [35.6781, 10.0963],
    'TUN015': [35.6800, 10.0950], 'TUN016': [35.5047, 11.0622],
    'TUN017': [36.8192, 10.1658], 'TUN018': [36.8000, 10.1700],
    'TUN019': [36.3600, 9.1900],  'TUN020': [36.3700, 9.2000],
  };

  private database: ArcheoCoin[] = [];

  constructor(private http: HttpClient) {}

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initMap();
      this.chargerDepuisApi();
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
  }

  // ── Chargement depuis Spring Boot ────────────────────────
  private chargerDepuisApi(): void {
    this.http.get<MonnaieApi[]>('http://localhost:8084/api/monnaies')
      .subscribe({
        next: (monnaies) => {
          this.database = monnaies.map(m => this.convertir(m));
          this.chargement = false;
          this.loadMarkers();
        },
        error: () => {
          // Fallback données statiques
          this.database = this.donneesStatiques();
          this.chargement = false;
          this.loadMarkers();
        }
      });
  }

  private convertir(m: MonnaieApi): ArcheoCoin {
    const coords = this.coords[m.wikidataId] || [35.8, 9.8];
    return {
      id:          m.wikidataId,
      nom:         m.nom || 'Monnaie inconnue',
      epoque:      this.detecterEpoque(m.periode),
      materiau:    m.materiau || 'Inconnu',
      latitude:    coords[0],
      longitude:   coords[1],
      description: m.description || '',
      annee:       m.annee ? (m.annee < 0 ? `${Math.abs(m.annee)} av. J.-C.` : `${m.annee} ap. J.-C.`) : '',
      musee:       m.collection || '',
      image:       m.image || undefined,
    };
  }

  private detecterEpoque(periode: string): 'Punique' | 'Romaine' | 'Byzantine' | 'Islamique' | 'Numide' {
    if (!periode) return 'Romaine';
    const p = periode.toLowerCase();
    if (p.includes('punique') || p.includes('carthage')) return 'Punique';
    if (p.includes('romaine') || p.includes('romain'))   return 'Romaine';
    if (p.includes('byzantine') || p.includes('byzant')) return 'Byzantine';
    if (p.includes('islamique') || p.includes('aghlabide') || p.includes('fatimide') || p.includes('hafside')) return 'Islamique';
    if (p.includes('numide') || p.includes('numidie'))   return 'Numide';
    return 'Romaine';
  }

  private getCouleur(epoque: string): string {
    const map: {[k: string]: string} = {
      'Punique':   '#c9a84c', 'Romaine':   '#c0392b',
      'Byzantine': '#8e44ad', 'Islamique': '#27ae60', 'Numide': '#2980b9',
    };
    return map[epoque] || '#888';
  }

  private getSymbole(epoque: string): string {
    const map: {[k: string]: string} = {
      'Punique':'🏛', 'Romaine':'⚔', 'Byzantine':'✝', 'Islamique':'☪', 'Numide':'🗺',
    };
    return map[epoque] || '🪙';
  }

  private initMap(): void {
    this.map = L.map('historical-map', { center: [35.8, 9.8], zoom: 7, zoomControl: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd', maxZoom: 19
    }).addTo(this.map);
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
  }

  private loadMarkers(): void {
    this.database.forEach(coin => {
      const couleur = this.getCouleur(coin.epoque);
      const symbole = this.getSymbole(coin.epoque);

      const icon = L.divIcon({
        className: '',
        html: `<div class="coin-marker" style="--c:${couleur}">
                 <div class="coin-marker-pulse"></div>
                 <div class="coin-marker-dot">${symbole}</div>
               </div>`,
        iconSize: [40, 40], iconAnchor: [20, 20], popupAnchor: [0, -22]
      });

      // ✅ Image depuis MariaDB
      const imgHtml = coin.image
        ? `<img src="${coin.image}" class="popup-img" onerror="this.style.display='none'" />`
        : `<div class="popup-no-img">🪙</div>`;

      const popup = `
        <div class="moneta-popup">
          ${imgHtml}
          <div class="popup-epoque" style="background:${couleur}">${symbole} ${coin.epoque}</div>
          <h3 class="popup-nom">${coin.nom}</h3>
          <div class="popup-meta">
            <span>📅 ${coin.annee}</span>
            <span>⚗️ ${coin.materiau}</span>
          </div>
          <p class="popup-desc">${coin.description}</p>
          <div class="popup-musee">🏛️ ${coin.musee}</div>
          <div class="popup-id">${coin.id}</div>
        </div>`;

      const marker = L.marker([coin.latitude, coin.longitude], { icon })
        .addTo(this.map)
        .bindPopup(popup, { maxWidth: 280, className: 'moneta-popup-wrapper' });

      this.allMarkers.push({ marker, coin });
    });
  }

  filtrerEpoque(epoque: string): void {
    this.epoqueActive = epoque;
    this.allMarkers.forEach(({ marker, coin }) => {
      if (epoque === 'Toutes' || coin.epoque === epoque) {
        marker.addTo(this.map);
      } else {
        marker.remove();
      }
    });
  }

  // ── Fallback données statiques ────────────────────────────
  private donneesStatiques(): ArcheoCoin[] {
    return [
      { id:'TUN001', nom:'Statère d\'Or de Carthage',    epoque:'Punique',   materiau:'Or',     latitude:36.8529, longitude:10.3233, annee:'350 av. J.-C.', musee:'Musée de Carthage',  description:'Symbole du pouvoir punique.', image:'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/BMC_Carthage_4.jpg/120px-BMC_Carthage_4.jpg' },
      { id:'TUN002', nom:'Shekel d\'Argent de Carthage', epoque:'Punique',   materiau:'Argent', latitude:36.8580, longitude:10.3250, annee:'260 av. J.-C.', musee:'Musée du Bardo',     description:'Frappée pendant les guerres puniques.', image:'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Carthaginiansilvershekel.jpg/120px-Carthaginiansilvershekel.jpg' },
      { id:'TUN014', nom:'Dinar Aghlabide d\'Or',        epoque:'Islamique', materiau:'Or',     latitude:35.6781, longitude:10.0963, annee:'850 ap. J.-C.', musee:'Musée de Kairouan',  description:'Frappée par la dynastie aghlabide à Kairouan.' },
      { id:'TUN011', nom:'Denier de Thugga',             epoque:'Numide',    materiau:'Argent', latitude:36.4222, longitude:9.2202,  annee:'150 av. J.-C.', musee:'Musée de Dougga',    description:'Site UNESCO, chef-lieu numide puis ville romaine.' },
      { id:'TUN005', nom:'Denier de Thysdrus',           epoque:'Romaine',   materiau:'Argent', latitude:35.2967, longitude:10.7061, annee:'238 ap. J.-C.', musee:'Musée de Sousse',    description:'Frappée à El Djem, célèbre pour son amphithéâtre.' },
      { id:'TUN012', nom:'Follis Byzantin de Carthage',  epoque:'Byzantine', materiau:'Bronze', latitude:36.8529, longitude:10.3233, annee:'620 ap. J.-C.', musee:'Musée de Carthage',  description:'Frappée avant la conquête arabe.' },
    ];
  }
}
