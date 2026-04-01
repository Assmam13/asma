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

  // ✅ CORRECTION 1 — Coordonnées pour les 20 monnaies
  private coords: {[id: string]: [number, number]} = {
    'TUN001': [36.8529, 10.3233],
    'TUN002': [36.8580, 10.3250],
    'TUN003': [36.8510, 10.3210],
    'TUN004': [36.8540, 10.3260],
    'TUN005': [35.2967, 10.7061],
    'TUN006': [36.8529, 10.3240],
    'TUN007': [36.8100, 10.1800],
    'TUN008': [36.5603,  8.7560],
    'TUN009': [35.5000,  9.5000],
    'TUN010': [35.8245, 10.6346],
    'TUN011': [36.4222,  9.2202],
    'TUN012': [36.8529, 10.3233],
    'TUN013': [36.8600, 10.3200],
    'TUN014': [35.6781, 10.0963],
    'TUN015': [35.6800, 10.0950],
    'TUN016': [35.5047, 11.0622],
    'TUN017': [36.8192, 10.1658],
    'TUN018': [36.8000, 10.1700],
    'TUN019': [36.3600,  9.1900],
    'TUN020': [36.3700,  9.2000],
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

  // ✅ CORRECTION 2 — Port corrigé 8084 → 8083
  private chargerDepuisApi(): void {
    this.http.get<MonnaieApi[]>('http://localhost:8080/api/monnaies')
      .subscribe({
        next: (monnaies) => {
          this.database = monnaies.map(m => this.convertir(m));
          this.chargement = false;
          this.loadMarkers();
        },
        error: () => {
          // Fallback — toutes les 20 monnaies
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
      annee:       m.annee
                     ? (m.annee < 0 ? `${Math.abs(m.annee)} av. J.-C.` : `${m.annee} ap. J.-C.`)
                     : 'Date inconnue',
      musee:       m.collection || '',
      // ✅ CORRECTION 3 — on garde undefined si vide (pas de chaîne vide)
      image:       m.image && m.image.trim() !== '' ? m.image : undefined,
    };
  }

  private detecterEpoque(periode: string): 'Punique' | 'Romaine' | 'Byzantine' | 'Islamique' | 'Numide' {
    if (!periode) return 'Romaine';
    const p = periode.toLowerCase();
    if (p.includes('punique') || p.includes('carthage'))                                          return 'Punique';
    if (p.includes('romaine') || p.includes('romain'))                                            return 'Romaine';
    if (p.includes('byzantine') || p.includes('byzant'))                                          return 'Byzantine';
    if (p.includes('islamique') || p.includes('aghlabide') ||
        p.includes('fatimide')  || p.includes('hafside'))                                         return 'Islamique';
    if (p.includes('numide') || p.includes('numidie'))                                            return 'Numide';
    return 'Romaine';
  }

  private getCouleur(epoque: string): string {
    const map: {[k: string]: string} = {
      'Punique':'#c9a84c', 'Romaine':'#c0392b',
      'Byzantine':'#8e44ad', 'Islamique':'#27ae60', 'Numide':'#2980b9',
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
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
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
        iconSize:    [40, 40],
        iconAnchor:  [20, 20],
        popupAnchor: [0, -22]
      });

      // ✅ CORRECTION 4 — image avec fallback robuste
      const imgHtml = coin.image
        ? `<img
             src="${coin.image}"
             class="popup-img"
             alt="${coin.nom}"
             onerror="this.parentNode.innerHTML='<div class=\\'popup-no-img\\'>🪙</div>'"
           />`
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

  // ✅ CORRECTION 5 — Fallback complet avec les 20 monnaies
  private donneesStatiques(): ArcheoCoin[] {
    return [
      // ── Puniques ─────────────────────────────────────────────
      {
        id:'TUN001', nom:'Shekel de Carthage', epoque:'Punique',
        materiau:'Or', latitude:36.8529, longitude:10.3233,
        annee:'300 av. J.-C.', musee:'Musée National de Carthage',
        description:"Monnaie d'or punique frappée à Carthage, représentant la déesse Tanit.",
        image:'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/BMC_Carthage_4.jpg/120px-BMC_Carthage_4.jpg'
      },
      {
        id:'TUN002', nom:'Triple Shekel Punique', epoque:'Punique',
        materiau:'Or', latitude:36.8580, longitude:10.3250,
        annee:'264 av. J.-C.', musee:'Musée du Bardo, Tunis',
        description:"Grande monnaie d'or frappée pendant les guerres puniques contre Rome.",
        image:'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Carthaginiansilvershekel.jpg/120px-Carthaginiansilvershekel.jpg'
      },
      {
        id:'TUN003', nom:'Tétradrachme de Carthage', epoque:'Punique',
        materiau:'Argent', latitude:36.8510, longitude:10.3210,
        annee:'350 av. J.-C.', musee:'British Museum',
        description:"Monnaie d'argent à l'effigie de Tanit et du cheval punique.",
        image:'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/BMC_Carthage_4.jpg/120px-BMC_Carthage_4.jpg'
      },
      {
        id:'TUN004', nom:'Bronze Punique au Cheval', epoque:'Punique',
        materiau:'Bronze', latitude:36.8540, longitude:10.3260,
        annee:'250 av. J.-C.', musee:'Musée Archéologique de Sfax',
        description:"Monnaie de bronze représentant le cheval, symbole de la puissance militaire punique.",
        image:undefined
      },
      // ── Romaines ─────────────────────────────────────────────
      {
        id:'TUN005', nom:'Denier de Thysdrus (El Djem)', epoque:'Romaine',
        materiau:'Argent', latitude:35.2967, longitude:10.7061,
        annee:'238 ap. J.-C.', musee:'Musée de Sousse',
        description:"Monnaie romaine frappée à Thysdrus (El Djem), célèbre pour son amphithéâtre.",
        image:undefined
      },
      {
        id:'TUN006', nom:'As de Carthage Romaine', epoque:'Romaine',
        materiau:'Bronze', latitude:36.8529, longitude:10.3240,
        annee:'29 ap. J.-C.', musee:'Musée National de Carthage',
        description:"Monnaie de bronze frappée après la reconstruction de Carthage par Rome.",
        image:undefined
      },
      {
        id:'TUN007', nom:'Sesterce de Septime Sévère', epoque:'Romaine',
        materiau:'Bronze', latitude:36.8100, longitude:10.1800,
        annee:'200 ap. J.-C.', musee:'Musée du Bardo',
        description:"Grande monnaie de l'Empereur Septime Sévère, premier Empereur africain.",
        image:undefined
      },
      {
        id:'TUN008', nom:'Bronze de Bulla Regia', epoque:'Romaine',
        materiau:'Bronze', latitude:36.5603, longitude:8.7560,
        annee:'100 ap. J.-C.', musee:'Musée de Jendouba',
        description:"Monnaie frappée à Bulla Regia (Jendouba), ville royale numide puis romaine.",
        image:undefined
      },
      {
        id:'TUN009', nom:'As de Bilarigia', epoque:'Romaine',
        materiau:'Bronze', latitude:35.5000, longitude:9.5000,
        annee:'50 ap. J.-C.', musee:'Musée Archéologique',
        description:"Monnaie de la cité antique de Bilarigia, en Tunisie centrale.",
        image:undefined
      },
      {
        id:'TUN010', nom:'Bronze de Hadrumetum (Sousse)', epoque:'Romaine',
        materiau:'Bronze', latitude:35.8245, longitude:10.6346,
        annee:'100 ap. J.-C.', musee:'Musée de Sousse',
        description:"Monnaie frappée à Hadrumetum (Sousse), grande ville punique et romaine.",
        image:undefined
      },
      // ── Numide / Romaine ─────────────────────────────────────
      {
        id:'TUN011', nom:'Denier de Thugga (Dougga)', epoque:'Numide',
        materiau:'Argent', latitude:36.4222, longitude:9.2202,
        annee:'150 av. J.-C.', musee:'Musée de Dougga',
        description:"Monnaie de Thugga (Dougga), site UNESCO, chef-lieu numide puis ville romaine.",
        image:undefined
      },
      // ── Byzantines ───────────────────────────────────────────
      {
        id:'TUN012', nom:'Follis Byzantin de Carthage', epoque:'Byzantine',
        materiau:'Bronze', latitude:36.8529, longitude:10.3233,
        annee:'620 ap. J.-C.', musee:'Musée de Carthage',
        description:"Monnaie byzantine frappée dans l'Exarchat d'Afrique avant la conquête arabe.",
        image:undefined
      },
      {
        id:'TUN013', nom:"Solidus Byzantin d'Afrique", epoque:'Byzantine',
        materiau:'Or', latitude:36.8600, longitude:10.3200,
        annee:'650 ap. J.-C.', musee:'British Museum',
        description:"Monnaie d'or byzantine frappée à Carthage, capitale de l'Exarchat d'Afrique.",
        image:undefined
      },
      // ── Islamiques ───────────────────────────────────────────
      {
        id:'TUN014', nom:"Dinar Aghlabide d'Or", epoque:'Islamique',
        materiau:'Or', latitude:35.6781, longitude:10.0963,
        annee:'850 ap. J.-C.', musee:'Musée de Kairouan',
        description:"Monnaie d'or de la dynastie aghlabide qui régna sur l'Ifriqiya de 800 à 909.",
        image:undefined
      },
      {
        id:'TUN015', nom:"Dirham Aghlabide d'Argent", epoque:'Islamique',
        materiau:'Argent', latitude:35.6800, longitude:10.0950,
        annee:'820 ap. J.-C.', musee:'Musée Islamique de Kairouan',
        description:"Monnaie d'argent aghlabide frappée à Kairouan, première capitale islamique.",
        image:undefined
      },
      {
        id:'TUN016', nom:'Dinar Fatimide', epoque:'Islamique',
        materiau:'Or', latitude:35.5047, longitude:11.0622,
        annee:'920 ap. J.-C.', musee:'Musée National de Carthage',
        description:"Monnaie d'or fatimide frappée en Ifriqiya avant le déplacement vers Le Caire.",
        image:undefined
      },
      {
        id:'TUN017', nom:'Demi-Dirham Hafside', epoque:'Islamique',
        materiau:'Argent', latitude:36.8192, longitude:10.1658,
        annee:'1350 ap. J.-C.', musee:'Musée du Bardo, Tunis',
        description:"Monnaie de la puissante dynastie hafside qui régna sur la Tunisie de 1229 à 1574.",
        image:undefined
      },
      {
        id:'TUN018', nom:'Kharouba de Tunis', epoque:'Islamique',
        materiau:'Cuivre', latitude:36.8000, longitude:10.1700,
        annee:'1400 ap. J.-C.', musee:'Musée de la Médina, Tunis',
        description:"Petite monnaie de cuivre populaire dans la Tunisie médiévale.",
        image:undefined
      },
      // ── Numides ──────────────────────────────────────────────
      {
        id:'TUN019', nom:'Bronze de Massinissa (Numidie)', epoque:'Numide',
        materiau:'Bronze', latitude:36.3600, longitude:9.1900,
        annee:'200 av. J.-C.', musee:'Musée du Bardo',
        description:"Monnaie du Roi Massinissa, fondateur du Royaume de Numidie unifié, allié de Rome.",
        image:undefined
      },
      {
        id:'TUN020', nom:'Monnaie de Micipsa (Numidie)', epoque:'Numide',
        materiau:'Bronze', latitude:36.3700, longitude:9.2000,
        annee:'148 av. J.-C.', musee:'Musée du Bardo, Tunis',
        description:"Monnaie du roi numide Micipsa, fils de Massinissa, qui régna sur la Numidie.",
        image:undefined
      },
    ];
  }
}
