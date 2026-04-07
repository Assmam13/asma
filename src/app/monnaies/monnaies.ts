import { Component, OnInit, OnDestroy } from '@angular/core';
import { LowerCasePipe, SlicePipe }    from '@angular/common';
import { FormsModule }                 from '@angular/forms';
import { RouterLink }                  from '@angular/router';
import { Subject }                     from 'rxjs';
import { takeUntil }                   from 'rxjs/operators';
import { MonnaiesService, Monnaie }    from './monnaies.service';
import { AuthService }                 from '../auth.service';

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

  isEditing     = false;
  backupMonnaie: Monnaie | null = null;

  chargement    = false;
  erreur:         string | null = null;
  totalMonnaies = 0;
  isFlipped     = false;

  isAdmin = false;

  filtres: Filtres = {
    recherche: '', periode: '', materiau: '',
    region: '', anneeMin: null, anneeMax: null
  };

  triActif     = 'nom';
  pageCourante = 1;
  parPage      = 12;           // ✅ FIX: 12 au lieu de 20 pour moins de lag
  totalPages   = 1;
  pages:         number[] = [];

  showAddForm = false;
  nouvelleMonnaie: Monnaie = this.formulaireVide();

  private destroy$ = new Subject<void>();

  constructor(
    private monnaiesService: MonnaiesService,
    private authService: AuthService
  ) {}

  // ✅ FIX: Getter qui retourne uniquement les monnaies de la page courante
  get monnaiesPage(): Monnaie[] {
    const debut = (this.pageCourante - 1) * this.parPage;
    return this.monnaiesFiltrees.slice(debut, debut + this.parPage);
  }

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();
    this.chargement = true;
    this.monnaiesService.getMonnaies()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.chargement = false;
          if (data && data.length > 0) {
            this.toutesMonnaies = data;
            this.totalMonnaies  = data.length;
            this.appliquerFiltres();
          } else {
            this.chargerMockData();
          }
        },
        error: () => {
          this.chargement = false;
          this.chargerMockData();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Actions Admin ─────────────────────────────────────────
  activerEdition(): void {
    this.isEditing    = true;
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
    this.monnaiesService.updateMonnaie(this.monnaieSelectionnee.wikidataId, this.monnaieSelectionnee)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedCoin) => {
          const index = this.toutesMonnaies.findIndex(m => m.wikidataId === updatedCoin.wikidataId);
          if (index !== -1) this.toutesMonnaies[index] = { ...updatedCoin };
          this.isEditing = false;
          this.appliquerFiltres();
          alert('✅ Modifications enregistrées avec succès dans MariaDB.');
        },
        error: (err) => {
          alert(err.status === 404
            ? '❌ Cette monnaie n\'existe pas dans la base de données.'
            : '❌ Erreur lors de la sauvegarde.');
        }
      });
  }

  supprimerMonnaie(monnaie: Monnaie): void {
    if (!confirm(`Voulez-vous vraiment supprimer définitivement "${monnaie.nom}" ?`)) return;
    this.monnaiesService.deleteMonnaie(monnaie.wikidataId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toutesMonnaies = this.toutesMonnaies.filter(m => m.wikidataId !== monnaie.wikidataId);
          this.fermerDetail();
          this.appliquerFiltres();
          alert('✅ Monnaie supprimée avec succès.');
        },
        error: () => alert('❌ Erreur lors de la suppression.')
      });
  }

  // ── Formulaire d'ajout ────────────────────────────────────
  formulaireVide(): Monnaie {
    return {
      wikidataId: '', nom: '', description: '', image: null, imageRevers: null,
      periode: '', materiau: '', region: '', atelier: '',
      annee: null, diametre: null, poids: null, avers: '', revers: '', collection: ''
    };
  }

  annulerAjout(): void {
    this.showAddForm     = false;
    this.nouvelleMonnaie = this.formulaireVide();
  }

  ajouterMonnaie(): void {
    if (!this.nouvelleMonnaie.wikidataId || !this.nouvelleMonnaie.nom) return;
    this.monnaiesService.createMonnaie(this.nouvelleMonnaie)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (created) => {
          this.toutesMonnaies.unshift(created);
          this.totalMonnaies = this.toutesMonnaies.length;
          this.appliquerFiltres();
          this.annulerAjout();
          alert('✅ Monnaie ajoutée avec succès dans MariaDB.');
        },
        error: () => alert('❌ Erreur lors de l\'ajout.')
      });
  }

  // ── Données mock (fallback) ───────────────────────────────
  chargerMockData(): void {
    this.toutesMonnaies = [
      { wikidataId:'TUN001', nom:'Shekel de Carthage', description:"Monnaie d'or punique frappée à Carthage, représentant la déesse Tanit.", image:'https://en.numista.com/catalogue/photos/carthage/5e1cf63944e575.18700936-original.jpg', imageRevers:'https://en.numista.com/catalogue/photos/carthage/5e1cf63a13d119.62080118-original.jpg', periode:'Punique', materiau:'Or', region:'Carthage', atelier:'Carthage', annee:-300, diametre:18.0, poids:7.2, avers:'Tête de la déesse Tanit couronnée', revers:'Cheval debout, palmier dattier', collection:'Musée National de Carthage' },
      { wikidataId:'TUN002', nom:'Triple Shekel Punique', description:"Grande monnaie d'or frappée pendant les guerres puniques contre Rome.", image:'https://en.numista.com/catalogue/photos/carthage/5e2c191b5f7965.77077694-original.jpg', imageRevers:'https://en.numista.com/catalogue/photos/carthage/5e2c191c67dcd7.61914092-original.jpg', periode:'Punique', materiau:'Or', region:'Carthage', atelier:'Carthage', annee:-264, diametre:25.0, poids:21.0, avers:'Tête de Melqart / Héraclès', revers:'Lion bondissant à droite', collection:'Musée du Bardo, Tunis' },
      { wikidataId:'TUN003', nom:'Tétradrachme de Carthage', description:"Monnaie d'argent à l'effigie de Tanit et du cheval punique.", image:null, imageRevers:null, periode:'Punique', materiau:'Argent', region:'Carthage', atelier:'Carthage', annee:-350, diametre:26.0, poids:17.0, avers:'Tête de Tanit de face', revers:'Cheval debout', collection:'British Museum' },
      { wikidataId:'TUN005', nom:'Denier de Thysdrus', description:"Monnaie romaine frappée à Thysdrus (El Djem).", image:'https://en.numista.com/catalogue/photos/tunisie/65ec80084a7c13.17816864-original.jpg', imageRevers:'https://en.numista.com/catalogue/photos/tunisie/65ec8008e0e2a6.18523670-original.jpg', periode:'Romaine', materiau:'Argent', region:'El Djem', atelier:'Thysdrus', annee:238, diametre:19.0, poids:3.4, avers:'Portrait de Gordien Ier', revers:'L\'Afrique personnifiée', collection:'Musée de Sousse' },
      { wikidataId:'TUN014', nom:'Dinar Aghlabide', description:"Monnaie d'or de la dynastie aghlabide.", image:'https://en.numista.com/catalogue/photos/aghlabid_emirate/5edcdea0496b15.13206342-original.jpg', imageRevers:'https://en.numista.com/catalogue/photos/aghlabid_emirate/5edcdea05bbce1.30330371-original.jpg', periode:'Islamique - Aghlabide', materiau:'Or', region:'Kairouan', atelier:'Kairouan', annee:850, diametre:19.0, poids:4.25, avers:'Attestation de foi coufique', revers:'Nom de l\'Émir', collection:'Musée de Kairouan' },
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
        m.region?.toLowerCase().includes(q) ||
        m.periode?.toLowerCase().includes(q) ||
        m.materiau?.toLowerCase().includes(q)
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
    // ✅ FIX: Limiter les pages affichées à 10 max pour éviter overflow
    const maxPages  = Math.min(this.totalPages, 10);
    const startPage = Math.max(1, this.pageCourante - 5);
    this.pages = Array.from({ length: maxPages }, (_, i) => startPage + i)
                      .filter(p => p <= this.totalPages);
  }

  changerPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.pageCourante = p;
    this.calculerPagination();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Modal détail ──────────────────────────────────────────
  ouvrirDetail(m: Monnaie): void {
    this.monnaieSelectionnee     = m;
    this.isEditing               = false;
    this.isFlipped               = false;
    document.body.style.overflow = 'hidden';
  }

  fermerDetail(): void {
    this.monnaieSelectionnee     = null;
    this.isEditing               = false;
    document.body.style.overflow = '';
  }

  // ✅ FIX: Image fallback propre avec assets/
  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.onerror = null; // Évite boucle infinie
    img.src = 'assets/coin-placeholder.png';
  }

  // ✅ FIX: Vérifie si l'URL image est valide
  getImageSrc(url: string | null): string {
    if (url && url.startsWith('http')) return url;
    return 'assets/coin-placeholder.png';
  }

  formatAnnee(annee: number | null): string {
    if (annee === null || annee === undefined) return 'Date inconnue';
    return annee < 0 ? `${Math.abs(annee)} av. J.-C.` : `${annee} ap. J.-C.`;
  }
}