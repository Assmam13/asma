import { Component, OnInit, OnDestroy } from '@angular/core';
import { LowerCasePipe, SlicePipe }    from '@angular/common';
import { FormsModule }                 from '@angular/forms';
import { RouterLink }                  from '@angular/router';
import { Subject }                     from 'rxjs';
import { takeUntil }                   from 'rxjs/operators';
import { MonnaiesService, Monnaie }    from './monnaies.service';

export interface Filtres {
  recherche: string;
  periode:   string;
  materiau:  string;
  region:    string;
  anneeMin:  number | null;
  anneeMax:  number | null;
}

@Component({
  selector:    'app-monnaies',
  standalone:  true,
  imports:     [FormsModule, RouterLink, LowerCasePipe, SlicePipe],
  templateUrl: './monnaies.html',
  styleUrls:   ['./monnaies.css']
})
export class MonnaiesComponent implements OnInit, OnDestroy {

  toutesMonnaies:      Monnaie[] = [];
  monnaiesFiltrees:    Monnaie[] = [];
  monnaieSelectionnee: Monnaie | null = null;

  // ── États d'Administration ──
  isEditing = false;
  backupMonnaie: Monnaie | null = null;

  // ✅ chargement = false dès le début — jamais de spinner bloquant
  chargement    = false;
  erreur:          string | null = null;
  totalMonnaies = 0;
  isFlipped     = false;

  filtres: Filtres = {
    recherche: '', periode: '', materiau: '',
    region: '', anneeMin: null, anneeMax: null
  };

  triActif     = 'nom';
  pageCourante = 1;
  parPage      = 20;
  totalPages   = 1;
  pages:         number[] = [];

  private destroy$ = new Subject<void>();

  constructor(private monnaiesService: MonnaiesService) {}

  ngOnInit(): void {
    // ✅ Charge mock data immédiatement — pas d'attente
    this.chargerMockData();
    // Essaie le backend en arrière-plan
    this.monnaiesService.getMonnaies()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          if (data && data.length > 0) {
            this.toutesMonnaies = data;
            this.totalMonnaies  = data.length;
            this.appliquerFiltres();
          }
        },
        error: () => {} // mock data déjà affichées
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Charge depuis Spring Boot (MariaDB) ───────────────────
  chargerDepuisBackend(): void {
    this.monnaiesService.getMonnaies()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          if (data && data.length > 0) {
            this.toutesMonnaies = data;
            this.totalMonnaies  = data.length;
            this.appliquerFiltres();
          } else {
            this.chargerMockData();
          }
        },
        error: () => {
          this.chargerMockData();
        }
      });
  }

  // ── Actions Administrateur (Modifier / Supprimer) ───────────
  activerEdition(): void {
    this.isEditing = true;
    // Crée une copie de sauvegarde pour annuler si besoin
    this.backupMonnaie = JSON.parse(JSON.stringify(this.monnaieSelectionnee));
  }

  annulerEdition(): void {
    if (this.backupMonnaie) {
      this.monnaieSelectionnee = JSON.parse(JSON.stringify(this.backupMonnaie));
    }
    this.isEditing = false;
  }

  sauvegarderModification(): void {
    if (!this.monnaieSelectionnee) return;

    console.log("Données envoyées pour modification :", this.monnaieSelectionnee);

    // On utilise l'ID (wikidataId) pour savoir quelle ligne modifier dans MariaDB
    this.monnaiesService.updateMonnaie(this.monnaieSelectionnee.wikidataId, this.monnaieSelectionnee)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedCoin) => {
          // 1. Mettre à jour la liste principale localement
          const index = this.toutesMonnaies.findIndex(m => m.wikidataId === updatedCoin.wikidataId);
          if (index !== -1) {
            this.toutesMonnaies[index] = { ...updatedCoin };
          }
          
          // 2. Désactiver le mode édition et rafraîchir l'affichage
          this.isEditing = false;
          this.appliquerFiltres();
          
          alert("✅ Modifications enregistrées avec succès dans MariaDB.");
        },
        error: (err) => {
          console.error("Erreur détaillée du serveur :", err);
          
          // Si l'erreur est 404, c'est souvent parce qu'on essaie de modifier une Mock Data
          if (err.status === 404) {
            alert("❌ Erreur : Cette monnaie n'existe pas dans la base de données (c'est peut-être une donnée de test).");
          } else {
            alert("❌ Erreur lors de la sauvegarde. Vérifiez la console (F12) pour plus de détails.");
          }
        }
      });
  }

  supprimerMonnaie(monnaie: Monnaie): void {
    const confirmation = confirm(`Voulez-vous vraiment supprimer définitivement "${monnaie.nom}" ?`);
    
    if (confirmation) {
      this.monnaiesService.deleteMonnaie(monnaie.wikidataId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            // 1. Retire la monnaie de la liste source
            this.toutesMonnaies = this.toutesMonnaies.filter(m => m.wikidataId !== monnaie.wikidataId);
            
            // 2. Met à jour la liste affichée (filtres + pagination)
            this.appliquerFiltres();
            
            // 3. Ferme la fenêtre de détails si elle était ouverte
            this.fermerDetail();
            
            alert("🗑️ Monnaie supprimée avec succès de la base de données.");
          },
          error: (err) => {
            console.error("Erreur lors de la suppression", err);
            if (err.status === 404) {
              alert("Info : Cette monnaie n'existe plus dans MariaDB.");
              // Même en cas de 404, on la retire de l'écran car elle est déjà partie
              this.toutesMonnaies = this.toutesMonnaies.filter(m => m.wikidataId !== monnaie.wikidataId);
              this.appliquerFiltres();
            } else {
              alert("❌ Impossible de supprimer la monnaie.");
            }
          }
        });
    }
  }

  // ── Mock data tunisiennes ─────────────────────────────────
  chargerMockData(): void {
    this.toutesMonnaies = [
      { wikidataId:'TUN001', nom:'Statère d\'Or de Carthage',       description:"Monnaie en or frappée à Carthage au IVe siècle av. J.-C. Symbole du pouvoir punique en Méditerranée.", image:'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/BMC_Carthage_4.jpg/320px-BMC_Carthage_4.jpg', imageRevers:null, periode:'Punique',    materiau:'Or',     region:'Carthage',            atelier:'Carthage',     annee:-350, diametre:19.0, poids:9.4,  avers:'Tête de Tanit couronnée de laurier',  revers:'Cheval debout, palmier dattier',          collection:'Musée de Carthage' },
      { wikidataId:'TUN002', nom:'Shekel d\'Argent de Carthage',     description:"Monnaie en argent de Carthage frappée pendant les guerres puniques contre Rome.",                        image:'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Carthaginiansilvershekel.jpg/320px-Carthaginiansilvershekel.jpg', imageRevers:null, periode:'Punique',    materiau:'Argent', region:'Carthage',            atelier:'Carthage',     annee:-260, diametre:24.0, poids:7.2,  avers:'Tête d\'Héraklès-Melqart',          revers:'Cheval dressé, étoile en haut',           collection:'Musée du Bardo' },
      { wikidataId:'TUN003', nom:'Bronze Punique de Carthage',       description:"Monnaie de bronze punique en circulation dans tout le territoire de Carthage en Afrique du Nord.",       image:null, imageRevers:null, periode:'Punique',    materiau:'Bronze', region:'Carthage',            atelier:'Carthage',     annee:-300, diametre:20.0, poids:8.5,  avers:'Tête de Tanit à gauche',             revers:'Cheval au pas, légende punique',          collection:'Musée National de Carthage' },
      { wikidataId:'TUN004', nom:'Trishekel de Carthage',            description:"Grande monnaie d\'argent de Carthage valant 3 shekels, frappée lors des campagnes en Sicile.",           image:null, imageRevers:null, periode:'Punique',    materiau:'Argent', region:'Carthage',            atelier:'Carthage',     annee:-320, diametre:32.0, poids:21.5, avers:'Tête de Perséphone / Tanit',         revers:'Quadrige au galop conduit par aurige',    collection:'Musée du Bardo, Tunis' },
      { wikidataId:'TUN005', nom:'Denier de Thysdrus (El Djem)',     description:"Monnaie romaine frappée à Thysdrus (El Djem), célèbre pour son amphithéâtre.",                           image:null, imageRevers:null, periode:'Romaine',    materiau:'Argent', region:'El Djem (Thysdrus)',  atelier:'Thysdrus',     annee:238,  diametre:19.0, poids:3.4,  avers:'Portrait de l\'Empereur Gordien Ier', revers:'L\'Afrique personnifiée tenant des épis', collection:'Musée de Sousse' },
      { wikidataId:'TUN006', nom:'As de Carthage Romaine',           description:"Monnaie de bronze frappée après la reconstruction de Carthage par Rome.",                                image:null, imageRevers:null, periode:'Romaine',    materiau:'Bronze', region:'Carthage Romaine',    atelier:'Carthago',     annee:29,   diametre:27.0, poids:11.0, avers:'Buste d\'Auguste lauré à droite',     revers:'Carthago debout, gouvernail',             collection:'Musée National de Carthage' },
      { wikidataId:'TUN007', nom:'Sesterce de Septime Sévère',       description:"Grande monnaie de l\'Empereur Septime Sévère, premier Empereur africain.",                               image:null, imageRevers:null, periode:'Romaine',    materiau:'Bronze', region:'Afrique du Nord',     atelier:'Rome',         annee:200,  diametre:33.0, poids:25.0, avers:'Buste de Septime Sévère lauré',       revers:'La Victoire ailée tenant couronne',       collection:'Musée du Bardo' },
      { wikidataId:'TUN008', nom:'Bronze de Bulla Regia',            description:"Monnaie frappée à Bulla Regia (Jendouba), ville royale numide puis romaine.",                            image:null, imageRevers:null, periode:'Romaine',    materiau:'Bronze', region:'Bulla Regia (Jendouba)', atelier:'Bulla Regia', annee:100,  diametre:22.0, poids:7.5,  avers:'Tête de Jupiter lauré',               revers:'Légende BULLA REGIA',                     collection:'Musée de Jendouba' },
      { wikidataId:'TUN009', nom:'As de Bilarigia',                  description:"Monnaie de la cité antique de Bilarigia, en Tunisie centrale.",                                          image:null, imageRevers:null, periode:'Romaine',    materiau:'Bronze', region:'Bilarigia (Tunisie)', atelier:'Bilarigia',    annee:50,   diametre:21.0, poids:8.0,  avers:'Tête de l\'Empereur Auguste',         revers:'Légende BILARIGIA',                       collection:'Musée Archéologique' },
      { wikidataId:'TUN010', nom:'Bronze de Hadrumetum (Sousse)',    description:"Monnaie frappée à Hadrumetum (Sousse), grande ville punique et romaine.",                                image:null, imageRevers:null, periode:'Romaine',    materiau:'Bronze', region:'Hadrumetum (Sousse)', atelier:'Hadrumetum',   annee:100,  diametre:23.0, poids:9.0,  avers:'Portrait de l\'Empereur Hadrien',     revers:'Neptune tenant un trident',               collection:'Musée de Sousse' },
      { wikidataId:'TUN011', nom:'Denier de Thugga (Dougga)',        description:"Monnaie de Thugga (Dougga), site UNESCO, chef-lieu numide puis ville romaine.",                          image:null, imageRevers:null, periode:'Numide/Romaine', materiau:'Argent', region:'Thugga (Dougga)', atelier:'Thugga',    annee:-150, diametre:17.0, poids:3.8,  avers:'Portrait du Roi Massinissa',          revers:'Cheval au galop, légende libyque',        collection:'Musée de Dougga' },
      { wikidataId:'TUN012', nom:'Follis Byzantin de Carthage',      description:"Monnaie byzantine frappée dans l\'Exarchat d\'Afrique avant la conquête arabe.",                        image:null, imageRevers:null, periode:'Byzantine',  materiau:'Bronze', region:'Carthage (Exarchat)', atelier:'Carthage Byzantine', annee:620, diametre:28.0, poids:10.5, avers:'Héraclius debout en armure',         revers:'Grand M, date de règne',                  collection:'Musée de Carthage' },
      { wikidataId:'TUN013', nom:'Solidus Byzantin d\'Afrique',      description:"Monnaie d\'or byzantine frappée à Carthage, capitale de l\'Exarchat d\'Afrique.",                       image:null, imageRevers:null, periode:'Byzantine',  materiau:'Or',     region:'Carthage (Exarchat)', atelier:'Carthago',     annee:650,  diametre:20.0, poids:4.5,  avers:'Buste de l\'Empereur Constant II',    revers:'Croix sur globe',                         collection:'British Museum' },
      { wikidataId:'TUN014', nom:'Dinar Aghlabide d\'Or',            description:"Monnaie d\'or de la dynastie aghlabide qui régna sur l\'Ifriqiya de 800 à 909.",                       image:null, imageRevers:null, periode:'Islamique - Aghlabide', materiau:'Or', region:'Kairouan', atelier:'Kairouan', annee:850, diametre:19.0, poids:4.25, avers:'Attestation de foi en arabe coufique', revers:'Nom de l\'Émir et date hégirienne',       collection:'Musée de Kairouan' },
      { wikidataId:'TUN015', nom:'Dirham Aghlabide d\'Argent',       description:"Monnaie d\'argent aghlabide frappée à Kairouan, première capitale islamique du Maghreb.",               image:null, imageRevers:null, periode:'Islamique - Aghlabide', materiau:'Argent', region:'Kairouan', atelier:'Kairouan', annee:820, diametre:25.0, poids:2.9, avers:'Inscription coranique en coufique',   revers:'Nom de l\'Émir et date AH',               collection:'Musée Islamique de Kairouan' },
      { wikidataId:'TUN016', nom:'Dinar Fatimide',                   description:"Monnaie d\'or fatimide frappée en Ifriqiya avant le déplacement vers Le Caire.",                        image:null, imageRevers:null, periode:'Islamique - Fatimide', materiau:'Or', region:'Al-Mahdiyya', atelier:'Al-Mahdiyya', annee:920, diametre:21.0, poids:4.2, avers:'Formule chiite ismaélienne coufique', revers:'Nom du Calife al-Mahdi',                  collection:'Musée National de Carthage' },
      { wikidataId:'TUN017', nom:'Demi-Dirham Hafside',              description:"Monnaie de la puissante dynastie hafside qui régna sur la Tunisie de 1229 à 1574.",                    image:null, imageRevers:null, periode:'Islamique - Hafside', materiau:'Argent', region:'Tunis', atelier:'Tunis', annee:1350, diametre:15.0, poids:1.5, avers:'Calligraphie : nom du Sultan hafside', revers:'Devise de la dynastie et année AH',       collection:'Musée du Bardo, Tunis' },
      { wikidataId:'TUN018', nom:'Kharouba de Tunis',                description:"Petite monnaie de cuivre populaire dans la Tunisie médiévale, en circulation dans les souks.",         image:null, imageRevers:null, periode:'Islamique - Hafside', materiau:'Cuivre', region:'Tunis', atelier:'Tunis', annee:1400, diametre:14.0, poids:2.0, avers:'Étoile à cinq branches',             revers:'Inscription arabe : Tunis',               collection:'Musée de la Médina, Tunis' },
      { wikidataId:'TUN019', nom:'Bronze de Massinissa (Numidie)',   description:"Monnaie du Roi Massinissa, fondateur du Royaume de Numidie unifié, allié de Rome.",                    image:null, imageRevers:null, periode:'Numide',     materiau:'Bronze', region:'Cirta (Constantine)', atelier:'Numidie',   annee:-200, diametre:22.0, poids:9.5,  avers:'Portrait de Massinissa diadémé',       revers:'Cheval au galop, légende néo-punique',    collection:'Musée du Bardo' },
      { wikidataId:'TUN020', nom:'Monnaie de Micipsa (Numidie)',     description:"Monnaie du roi numide Micipsa, fils de Massinissa, qui régna sur la Numidie.",                         image:null, imageRevers:null, periode:'Numide',     materiau:'Bronze', region:'Numidie',             atelier:'Numidie',      annee:-148, diametre:20.0, poids:7.8,  avers:'Portrait de Micipsa lauré',           revers:'Éléphant à droite',                       collection:'Musée du Bardo, Tunis' }
    ];
    this.totalMonnaies = this.toutesMonnaies.length;
    this.appliquerFiltres();
  }

  // ── Filtrage ──────────────────────────────────────────────
  appliquerFiltres(): void {
    let res = [...this.toutesMonnaies];
    if (this.filtres.recherche.trim()) {
      const q = this.filtres.recherche.toLowerCase();
      res = res.filter(m =>
        m.nom?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q) ||
        m.region?.toLowerCase().includes(q)
      );
    }
    if (this.filtres.periode)
      res = res.filter(m => m.periode?.toLowerCase().includes(this.filtres.periode.toLowerCase()));
    if (this.filtres.materiau)
      res = res.filter(m => m.materiau?.toLowerCase().includes(this.filtres.materiau.toLowerCase()));
    if (this.filtres.region)
      res = res.filter(m => m.region?.toLowerCase().includes(this.filtres.region.toLowerCase()));
    if (this.filtres.anneeMin !== null)
      res = res.filter(m => (m.annee ?? 0) >= this.filtres.anneeMin!);
    if (this.filtres.anneeMax !== null)
      res = res.filter(m => (m.annee ?? 0) <= this.filtres.anneeMax!);

    this.monnaiesFiltrees = res;
    this.pageCourante     = 1;
    this.trierMonnaies();
    this.calculerPagination();
  }

  trierMonnaies(): void {
    this.monnaiesFiltrees.sort((a, b) => {
      switch (this.triActif) {
        case 'annee':    return (a.annee ?? 0) - (b.annee ?? 0);
        case 'materiau': return (a.materiau ?? '').localeCompare(b.materiau ?? '');
        default:         return (a.nom ?? '').localeCompare(b.nom ?? '');
      }
    });
  }

  reinitialiserFiltres(): void {
    this.filtres = { recherche:'', periode:'', materiau:'', region:'', anneeMin:null, anneeMax:null };
    this.appliquerFiltres();
  }

  hasFiltresActifs(): boolean {
    return !!(this.filtres.periode || this.filtres.materiau || this.filtres.region || this.filtres.recherche);
  }

  calculerPagination(): void {
    this.totalPages = Math.ceil(this.monnaiesFiltrees.length / this.parPage);
    this.pages      = Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  changerPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.pageCourante = p;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Modal ─────────────────────────────────────────────────
  ouvrirDetail(m: Monnaie): void {
    this.monnaieSelectionnee     = m;
    this.isEditing               = false; // Réinitialise l'édition à chaque ouverture
    this.isFlipped               = false;
    document.body.style.overflow = 'hidden';
  }

  fermerDetail(): void {
    this.monnaieSelectionnee     = null;
    this.isEditing               = false;
    document.body.style.overflow = '';
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).src = 'coin-placeholder.svg';
  }

  formatAnnee(annee: number | null): string {
    if (annee === null || annee === undefined) return 'Date inconnue';
    return annee < 0 ? `${Math.abs(annee)} av. J.-C.` : `${annee} ap. J.-C.`;
  }
}