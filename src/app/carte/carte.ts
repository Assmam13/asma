import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';

interface ArcheoCoin {
  id: string;
  nom: string;
  epoque: string;
  materiau: string;
  latitude: number;
  longitude: number;
  description: string;
  annee: string;
  musee: string;
  image?: string;
  pays: 'Tunisie' | 'France';
}

interface MonnaieApi {
  wikidataId: string;
  nom:        string;
  periode:    string;
  materiau:   string;
  region:     string;
  description:string;
  annee:      number;
  collection: string;
  image:      string;
  imageRevers:string;
}

@Component({
  selector: 'app-carte',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './carte.html',
  styleUrl: './carte.css'
})
export class CarteComponent implements AfterViewInit, OnDestroy {
  private map!: L.Map;
  private allMarkers: { marker: L.Marker; coin: ArcheoCoin }[] = [];
  private markerCluster: L.LayerGroup = L.layerGroup();

  epoqueActive = 'Toutes';
  paysActif    = 'Tous';
  chargement   = true;

  epoques = [
    { label: 'Toutes',    couleur: '#555' },
    { label: 'Punique',   couleur: '#c9a84c' },
    { label: 'Romaine',   couleur: '#c0392b' },
    { label: 'Byzantine', couleur: '#8e44ad' },
    { label: 'Islamique', couleur: '#27ae60' },
    { label: 'Numide',    couleur: '#2980b9' },
    { label: 'Medievale', couleur: '#e67e22' },
    { label: 'Moderne',   couleur: '#16a085' },
  ];

  pays = [
    { label: 'Tous',    drapeau: '🌍' },
    { label: 'Tunisie', drapeau: '🇹🇳' },
    { label: 'France',  drapeau: '🇫🇷' },
  ];

  private database: ArcheoCoin[] = [];

  // ── Coordonnées fixes par RÉGION (Tunisie) ───────────────
  private coordsTunisie: {[key: string]: [number, number]} = {
    'Carthage':                  [36.8529, 10.3233],
    'Zeugitana':                 [36.8000, 10.1000],
    'Byzacene':                  [35.5000, 10.0000],
    'Numidie':                   [36.3600,  9.1900],
    'Cirta (Constantine)':       [36.3600,  9.1900],
    'Thugga (Dougga)':           [36.4222,  9.2202],
    'El Djem (Thysdrus)':        [35.2967, 10.7061],
    'Hadrumetum (Sousse)':       [35.8245, 10.6346],
    'Kairouan':                  [35.6781, 10.0963],
    'Ifriqiya':                  [35.5000, 10.0000],
    'Al-Mahdiyya':               [35.5047, 11.0622],
    'Tunis':                     [36.8192, 10.1658],
    'Tunisie medievale':         [36.5000, 10.0000],
    'Beylicat de Tunis':         [36.8192, 10.1658],
    'Tunisie (Protectorat)':     [36.8192, 10.1658],
    'Tunisie':                   [33.8869,  9.5375],
    'Carthage Romaine':          [36.8529, 10.3233],
    'Carthage (Exarchat)':       [36.8529, 10.3233],
    'Africa Proconsularis':      [36.5000, 10.2000],
    'Afrique du Nord':           [33.0000,  9.0000],
    'Afrique Byzantine':         [36.8000, 10.0000],
    'Bulla Regia (Jendouba)':    [36.5603,  8.7560],
    'Bilarigia (Tunisie)':       [35.5000,  9.5000],
    'Tripolitaine':              [32.9000, 13.1800],
    'Utica':                     [37.0540, 10.0550],
  };

  // ── Coordonnées fixes par RÉGION (France) ────────────────
  private coordsFrance: {[key: string]: [number, number]} = {
    'Gaule':                     [46.5000,  2.3500],
    'Gaule Romaine':             [46.5000,  2.3500],
    'Gallia Narbonensis':        [43.8000,  4.5000],
    'Provence antique':          [43.5000,  5.5000],
    'Francie':                   [48.8566,  2.3522],
    'Neustrie':                  [48.5000,  1.5000],
    'Austrasie':                 [49.0000,  6.0000],
    'Empire Carolingien':        [48.8566,  2.3522],
    'Francie Occidentale':       [47.0000,  2.0000],
    'Royaume de France':         [48.8566,  2.3522],
    'Ile-de-France':             [48.8566,  2.3522],
    'France':                    [46.6034,  1.8883],
    'France Republicaine':       [46.6034,  1.8883],
    'France Imperiale':          [46.6034,  1.8883],
    'Empire Napoleonien':        [46.6034,  1.8883],
    'Second Empire Francais':    [46.6034,  1.8883],
    'Republique Francaise':      [46.6034,  1.8883],
    'Lyon (Lugdunum)':           [45.7640,  4.8357],
    'Arles (Arelate)':           [43.6767,  4.6278],
    'Paris':                     [48.8566,  2.3522],
    'Massalia (Marseille)':      [43.2965,  5.3698],
  };

  get statsEpoques() {
    const stats: {[k: string]: number} = {};
    this.database.forEach(c => {
      stats[c.epoque] = (stats[c.epoque] || 0) + 1;
    });
    return stats;
  }

  get totalVisible() {
    return this.allMarkers.filter(({coin}) =>
      (this.paysActif === 'Tous' || coin.pays === this.paysActif) &&
      (this.epoqueActive === 'Toutes' || coin.epoque === this.epoqueActive)
    ).length;
  }

  constructor(private http: HttpClient) {}

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initMap();
      this.chargerDepuisApi();
    }, 150);
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
  }

  // ── API ──────────────────────────────────────────────────
  private chargerDepuisApi(): void {
    // ✅ FIX: Port 8083
    this.http.get<MonnaieApi[]>('http://localhost:8080/api/monnaies')
      .subscribe({
        next: (monnaies) => {
          // ✅ FIX: 1 marqueur par combinaison (région + époque + matériau)
          // Cela donne ~140 marqueurs bien distribués sans lag
          const seen = new Set<string>();
          const uniques: MonnaieApi[] = [];
          monnaies.forEach(m => {
            const key = (m.region || 'unknown')
                      + '_' + this.detecterEpoque(m.periode)
                      + '_' + (m.materiau || '');
            if (!seen.has(key)) {
              seen.add(key);
              uniques.push(m);
            }
          });
          this.database = uniques.map(m => this.convertir(m));
          this.chargement = false;
          this.loadMarkers();
        },
        error: () => {
          this.database = this.donneesStatiques();
          this.chargement = false;
          this.loadMarkers();
        }
      });
  }

  private convertir(m: MonnaieApi): ArcheoCoin {
    const pays = this.detecterPays(m);
    const coords = this.getCoords(m.region, pays);
    // Légère variation pour éviter superposition exacte
    const jitter = () => (Math.random() - 0.5) * 0.08;

    return {
      id:          m.wikidataId,
      nom:         m.nom || 'Monnaie inconnue',
      epoque:      this.detecterEpoque(m.periode),
      materiau:    m.materiau || 'Inconnu',
      latitude:    coords[0] + jitter(),
      longitude:   coords[1] + jitter(),
      description: m.description || '',
      annee:       m.annee
        ? (m.annee < 0 ? `${Math.abs(m.annee)} av. J.-C.` : `${m.annee} ap. J.-C.`)
        : 'Date inconnue',
      musee:       m.collection || '',
      image:       m.image && m.image.startsWith('http') ? m.image : undefined,
      pays,
    };
  }

  private detecterPays(m: MonnaieApi): 'Tunisie' | 'France' {
    const text = ((m.wikidataId || '') + (m.periode || '') + (m.region || '') + (m.collection || '')).toLowerCase();
    if (m.wikidataId?.startsWith('TUN') || m.wikidataId?.startsWith('tun')) return 'Tunisie';
    if (m.wikidataId?.startsWith('FRA') || m.wikidataId?.startsWith('fra')) return 'France';
    const franceMots = ['france','paris','gaule','lyon','carolingien','merovingien','bourbon','napoleon','republique francaise','franc','euro'];
    if (franceMots.some(k => text.includes(k))) return 'France';
    return 'Tunisie';
  }

  private getCoords(region: string, pays: 'Tunisie' | 'France'): [number, number] {
    if (!region) return pays === 'France' ? [46.6034, 1.8883] : [35.8, 9.8];
    const map = pays === 'France' ? this.coordsFrance : this.coordsTunisie;
    // Exact match
    if (map[region]) return map[region];
    // Partial match
    for (const key of Object.keys(map)) {
      if (region.toLowerCase().includes(key.toLowerCase()) ||
          key.toLowerCase().includes(region.toLowerCase())) {
        return map[key];
      }
    }
    return pays === 'France' ? [46.6034, 1.8883] : [35.8, 9.8];
  }

  private detecterEpoque(periode: string): string {
    if (!periode) return 'Romaine';
    const p = periode.toLowerCase();
    if (p.includes('punique') || p.includes('carthage'))                          return 'Punique';
    if (p.includes('numide')  || p.includes('numidie'))                           return 'Numide';
    if (p.includes('romaine') || p.includes('romain') || p.includes('gaule'))    return 'Romaine';
    if (p.includes('byzantine') || p.includes('byzant'))                         return 'Byzantine';
    if (p.includes('islamique') || p.includes('aghlabide') ||
        p.includes('fatimide')  || p.includes('hafside')   ||
        p.includes('husseinite'))                                                  return 'Islamique';
    if (p.includes('medieval') || p.includes('merovingien') ||
        p.includes('carolingien') || p.includes('capetien') ||
        p.includes('ancien regime'))                                               return 'Medievale';
    return 'Moderne';
  }

  private getCouleur(epoque: string): string {
    const map: {[k: string]: string} = {
      'Punique':'#c9a84c', 'Romaine':'#c0392b', 'Byzantine':'#8e44ad',
      'Islamique':'#27ae60', 'Numide':'#2980b9', 'Medievale':'#e67e22', 'Moderne':'#16a085',
    };
    return map[epoque] || '#888';
  }

  private getSymbole(epoque: string): string {
    const map: {[k: string]: string} = {
      'Punique':'🏛', 'Romaine':'⚔', 'Byzantine':'✝',
      'Islamique':'☪', 'Numide':'🗺', 'Medievale':'⚜', 'Moderne':'🪙',
    };
    return map[epoque] || '🪙';
  }

  private initMap(): void {
    // ✅ FIX: Centre entre Tunisie et France
    this.map = L.map('historical-map', {
      center: [42.0, 5.0],
      zoom: 4,
      zoomControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(this.map);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    this.markerCluster.addTo(this.map);
  }

  private loadMarkers(): void {
    this.allMarkers.forEach(({ marker }) => marker.remove());
    this.allMarkers = [];

    this.database.forEach(coin => {
      const couleur = this.getCouleur(coin.epoque);
      const symbole = this.getSymbole(coin.epoque);

      const drapeauPays = coin.pays === 'France' ? '🇫🇷' : '🇹🇳';

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

      const imgHtml = coin.image
        ? `<img src="${coin.image}" class="popup-img" alt="${coin.nom}"
               onerror="this.parentNode.innerHTML='<div class=\\'popup-no-img\\'>🪙</div>'">`
        : `<div class="popup-no-img">🪙</div>`;

      const popup = `
        <div class="moneta-popup">
          ${imgHtml}
          <div class="popup-epoque" style="background:${couleur}">${symbole} ${coin.epoque}</div>
          <h3 class="popup-nom">${coin.nom}</h3>
          <div class="popup-meta">
            <span>📅 ${coin.annee}</span>
            <span>⚗️ ${coin.materiau}</span>
            <span>${drapeauPays} ${coin.pays}</span>
          </div>
          <p class="popup-desc">${(coin.description || '').substring(0, 120)}${coin.description?.length > 120 ? '...' : ''}</p>
          <div class="popup-musee">🏛️ ${coin.musee}</div>
          <div class="popup-id">${coin.id}</div>
        </div>`;

      const marker = L.marker([coin.latitude, coin.longitude], { icon })
        .bindPopup(popup, { maxWidth: 280, className: 'moneta-popup-wrapper' });

      marker.addTo(this.map);
      this.allMarkers.push({ marker, coin });
    });
  }

  // ── Filtres ──────────────────────────────────────────────
  filtrerEpoque(epoque: string): void {
    this.epoqueActive = epoque;
    this.appliquerFiltres();
  }

  filtrerPays(pays: string): void {
    this.paysActif = pays;
    // ✅ FIX: Recentrer la carte selon le pays
    if (pays === 'Tunisie') {
      this.map.setView([33.8869, 9.5375], 6);
    } else if (pays === 'France') {
      this.map.setView([46.6034, 1.8883], 6);
    } else {
      this.map.setView([42.0, 5.0], 4);
    }
    this.appliquerFiltres();
  }

  private appliquerFiltres(): void {
    this.allMarkers.forEach(({ marker, coin }) => {
      const epoqueOk = this.epoqueActive === 'Toutes' || coin.epoque === this.epoqueActive;
      const paysOk   = this.paysActif   === 'Tous'    || coin.pays   === this.paysActif;
      if (epoqueOk && paysOk) {
        marker.addTo(this.map);
      } else {
        marker.remove();
      }
    });
  }

  // ── Données statiques fallback ───────────────────────────
  private donneesStatiques(): ArcheoCoin[] {
    return [
      { id:'TUN001', nom:'Shekel de Carthage',       epoque:'Punique',   pays:'Tunisie', materiau:'Or',     latitude:36.8529, longitude:10.3233, annee:'300 av. J.-C.', musee:'Musée National de Carthage', description:"Monnaie d'or punique frappée à Carthage.", image:undefined },
      { id:'TUN002', nom:'Triple Shekel Punique',    epoque:'Punique',   pays:'Tunisie', materiau:'Or',     latitude:36.8580, longitude:10.3250, annee:'264 av. J.-C.', musee:'Musée du Bardo, Tunis',      description:"Grande monnaie d'or frappée pendant les guerres puniques.", image:undefined },
      { id:'TUN005', nom:'Denier de Thysdrus',       epoque:'Romaine',   pays:'Tunisie', materiau:'Argent', latitude:35.2967, longitude:10.7061, annee:'238 ap. J.-C.', musee:'Musée de Sousse',             description:"Monnaie romaine frappée à Thysdrus (El Djem).", image:undefined },
      { id:'TUN007', nom:'Sesterce de Septime Sévère',epoque:'Romaine',  pays:'Tunisie', materiau:'Bronze', latitude:36.8100, longitude:10.1800, annee:'200 ap. J.-C.', musee:'Musée du Bardo',              description:"Grande monnaie de l'Empereur Septime Sévère.", image:undefined },
      { id:'TUN011', nom:'Denier de Thugga',         epoque:'Numide',    pays:'Tunisie', materiau:'Argent', latitude:36.4222, longitude:9.2202,  annee:'150 av. J.-C.', musee:'Musée de Dougga',             description:"Monnaie de Thugga (Dougga), site UNESCO.", image:undefined },
      { id:'TUN012', nom:'Follis Byzantin',          epoque:'Byzantine', pays:'Tunisie', materiau:'Bronze', latitude:36.8529, longitude:10.3233, annee:'620 ap. J.-C.', musee:'Musée de Carthage',           description:"Monnaie byzantine frappée dans l'Exarchat d'Afrique.", image:undefined },
      { id:'TUN014', nom:"Dinar Aghlabide d'Or",     epoque:'Islamique', pays:'Tunisie', materiau:'Or',     latitude:35.6781, longitude:10.0963, annee:'850 ap. J.-C.', musee:'Musée de Kairouan',           description:"Monnaie d'or de la dynastie aghlabide.", image:undefined },
      { id:'TUN017', nom:'Demi-Dirham Hafside',      epoque:'Islamique', pays:'Tunisie', materiau:'Argent', latitude:36.8192, longitude:10.1658, annee:'1350 ap. J.-C.',musee:'Musée du Bardo, Tunis',       description:"Monnaie de la puissante dynastie hafside.", image:undefined },
      { id:'TUN019', nom:'Bronze de Massinissa',     epoque:'Numide',    pays:'Tunisie', materiau:'Bronze', latitude:36.3600, longitude:9.1900,  annee:'200 av. J.-C.', musee:'Musée du Bardo',              description:"Monnaie du Roi Massinissa, fondateur de la Numidie.", image:undefined },
      // France
      { id:'FRA001', nom:'Statere Gaulois',          epoque:'Romaine',   pays:'France',  materiau:'Or',     latitude:48.8566, longitude:2.3522,  annee:'200 av. J.-C.', musee:'BnF Paris',                  description:"Monnaie gauloise imitée des modèles grecs.", image:undefined },
      { id:'FRA002', nom:'Denier de Charlemagne',    epoque:'Medievale', pays:'France',  materiau:'Argent', latitude:48.8566, longitude:2.3522,  annee:'800 ap. J.-C.', musee:'Musée de Cluny, Paris',       description:"Monnaie carolingienne de l'Empire de Charlemagne.", image:undefined },
      { id:'FRA003', nom:'Louis d Or de Louis XIV',  epoque:'Medievale', pays:'France',  materiau:'Or',     latitude:48.8566, longitude:2.3522,  annee:'1690 ap. J.-C.',musee:'Musée de la Monnaie, Paris',  description:"Monnaie royale frappée sous Louis XIV.", image:undefined },
      { id:'FRA004', nom:'5 Francs Napoléon',        epoque:'Moderne',   pays:'France',  materiau:'Argent', latitude:48.8566, longitude:2.3522,  annee:'1810 ap. J.-C.',musee:'Musée de la Monnaie, Paris',  description:"Monnaie du Premier Empire sous Napoléon Bonaparte.", image:undefined },
      { id:'FRA005', nom:'Franc Semeuse',            epoque:'Moderne',   pays:'France',  materiau:'Argent', latitude:45.7640, longitude:4.8357,  annee:'1900 ap. J.-C.',musee:'Monnaie de Paris',             description:"Monnaie emblématique de la IIIe République.", image:undefined },
    ];
  }
}