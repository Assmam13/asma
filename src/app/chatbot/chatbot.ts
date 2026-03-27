import { Component, OnInit, OnChanges, ViewChild, ElementRef,
         AfterViewChecked, ChangeDetectorRef, Input, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { timeout } from 'rxjs/operators';

interface Message {
  role: 'user' | 'bot';
  content: string;
  time: string;
}

interface ConversationSession {
  prenom:   string;
  userId:   string;
  date:     string;
  messages: Message[];
}

interface ChatResponse {
  answer: string;
}

@Component({
  selector:    'app-chatbot',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './chatbot.html',
  styleUrl:    './chatbot.css'
})
export class ChatbotComponent implements OnInit, AfterViewChecked, OnChanges {

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  // ✅ Reçoit l'utilisateur connecté depuis app.ts
  @Input() utilisateurConnecte: { email?: string; prenom?: string; role?: string } | null = null;

  isOpen          = false;
  showWelcomeForm = true;
  isTyping        = false;
  hasNewMessage   = false;
  showSuggestions = true;
  shouldScroll    = false;
  showHistorique  = false;

  historique: ConversationSession[] = [];
  userPrenom     = '';
  currentMessage = '';
  messages:      Message[] = [];

  suggestions = [
    '🏛️ Monnaies puniques',
    '⚔️ Période romaine',
    '☪️ Dinars islamiques',
    '🗺️ Numidie',
  ];

  private apiUrl = 'http://localhost:5000/api/chat';

  // ✅ Clé unique par utilisateur (email si connecté, sinon prénom saisi)
  private get storageKey(): string {
    if (this.utilisateurConnecte?.email) {
      return `moneta_hist_${this.utilisateurConnecte.email}`;
    }
    // Visiteur anonyme → clé basée sur le prénom saisi dans le chatbot
    const prenom = this.userPrenom.trim().toLowerCase() || 'anonyme';
    return `moneta_hist_visiteur_${prenom}`;
  }

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this._chargerHistorique();
    if (this.utilisateurConnecte?.prenom) {
      this.userPrenom = this.utilisateurConnecte.prenom;
    }
  }

  // ✅ Détecte changement d'utilisateur (connexion / déconnexion)
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['utilisateurConnecte']) {
      const ancien  = changes['utilisateurConnecte'].previousValue;
      const nouveau = changes['utilisateurConnecte'].currentValue;
      const ancienEmail  = ancien?.email  ?? null;
      const nouveauEmail = nouveau?.email ?? null;
      if (ancienEmail !== nouveauEmail) {
        this._reinitialiserChat();
      }
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  // ── Réinitialise le chat quand l'utilisateur change ──
  private _reinitialiserChat(): void {
    this.messages        = [];
    this.showWelcomeForm = true;
    this.showSuggestions = true;
    this.showHistorique  = false;
    this.isOpen          = false;
    this.hasNewMessage   = false;
    this.userPrenom      = this.utilisateurConnecte?.prenom ?? '';
    this.currentMessage  = '';
    this._chargerHistorique();
    this.cdr.detectChanges();
  }

  // ── Toggle ────────────────────────────────────────────
  toggleChat(): void {
    this.isOpen         = !this.isOpen;
    this.hasNewMessage  = false;
    this.showHistorique = false;
    if (this.isOpen) this.shouldScroll = true;
    this.cdr.detectChanges();
  }

  toggleHistorique(): void {
    this.showHistorique = !this.showHistorique;
    this.cdr.detectChanges();
  }

  // ── Formulaire prénom ─────────────────────────────────
  submitWelcome(): void {
    if (!this.userPrenom.trim()) return;
    this.showWelcomeForm = false;
    this.showSuggestions = true;

    // ✅ Recharge l'historique avec la bonne clé (maintenant qu'on connaît le prénom)
    this._chargerHistorique();

    const sessionExistante = this.historique.find(
      h => h.prenom.toLowerCase() === this.userPrenom.toLowerCase()
    );

    if (sessionExistante && sessionExistante.messages.length > 0) {
      this.messages = [...sessionExistante.messages];
      this.addBotMessage(
        `Re-bonjour <strong>${this.userPrenom}</strong> ! 👋 Heureux de vous revoir.<br><br>
         J'ai retrouvé votre historique. Continuons ! 🪙`
      );
    } else {
      this.addBotMessage(
        `Bonjour <strong>${this.userPrenom}</strong> ! 👋<br><br>
         Je suis <strong>MONETA IA</strong>, votre guide expert en monnaies tunisiennes.<br><br>
         Je peux vous renseigner sur les monnaies puniques, romaines, byzantines, islamiques et numides.<br><br>
         Que souhaitez-vous savoir ? 🪙`
      );
    }
    this.cdr.detectChanges();
  }

  // ── Envoi de message ──────────────────────────────────
  sendMessage(): void {
    if (!this.currentMessage.trim() || this.isTyping) return;
    const msg            = this.currentMessage.trim();
    this.addUserMessage(msg);
    this.currentMessage  = '';
    this.showSuggestions = false;
    this.cdr.detectChanges();
    this.callRAGApi(msg);
  }

  sendSuggestion(suggestion: string): void {
    this.addUserMessage(suggestion);
    this.showSuggestions = false;
    this.cdr.detectChanges();
    const msg = suggestion.replace(/^[^\s]+\s/, '');
    this.callRAGApi(msg);
  }

  // ── Appel API Flask ───────────────────────────────────
  private callRAGApi(question: string): void {
    this.isTyping     = true;
    this.shouldScroll = true;
    this.cdr.detectChanges();

    // ✅ Headers sans erreur TypeScript
    const httpHeaders = new HttpHeaders({ 'Content-Type': 'application/json' });

    this.http.post<ChatResponse>(
      this.apiUrl,
      { question, prenom: this.userPrenom },
      { headers: httpHeaders }
    ).pipe(timeout(60000)).subscribe({
      next: (response) => {
        this.isTyping        = false;
        this.showSuggestions = true;
        this.addBotMessage(response.answer || 'Je n\'ai pas trouvé de réponse.');
        this._sauvegarderHistorique();
        this.shouldScroll = true;
        this.cdr.detectChanges();
        setTimeout(() => { this.shouldScroll = true; this.cdr.detectChanges(); }, 200);
      },
      error: () => {
        this.isTyping        = false;
        this.showSuggestions = true;
        this.addBotMessage(this.getFallbackResponse(question));
        this._sauvegarderHistorique();
        this.shouldScroll = true;
        this.cdr.detectChanges();
        setTimeout(() => { this.shouldScroll = true; this.cdr.detectChanges(); }, 200);
      }
    });
  }

  // ── Historique : Sauvegarde ───────────────────────────
  private _sauvegarderHistorique(): void {
    if (!this.userPrenom.trim()) return;
    const idx = this.historique.findIndex(
      h => h.prenom.toLowerCase() === this.userPrenom.toLowerCase()
    );
    const session: ConversationSession = {
      prenom:   this.userPrenom,
      userId:   this.utilisateurConnecte?.email ?? 'visiteur_anonyme',
      date:     new Date().toLocaleDateString('fr-FR'),
      messages: [...this.messages]
    };
    if (idx !== -1) {
      this.historique[idx] = session;
    } else {
      this.historique.push(session);
    }
    if (this.historique.length > 10) {
      this.historique = this.historique.slice(-10);
    }
    localStorage.setItem(this.storageKey, JSON.stringify(this.historique));
  }

  // ── Historique : Chargement ───────────────────────────
  private _chargerHistorique(): void {
    try {
      const data = localStorage.getItem(this.storageKey);
      this.historique = data ? JSON.parse(data) : [];
    } catch {
      this.historique = [];
    }
  }

  // ── Historique : Charger une session ──────────────────
  chargerSession(session: ConversationSession): void {
    this.userPrenom      = session.prenom;
    this.messages        = [...session.messages];
    this.showWelcomeForm = false;
    this.showHistorique  = false;
    this.shouldScroll    = true;
    this.addBotMessage(
      `📂 Historique du <strong>${session.date}</strong> restauré pour <strong>${session.prenom}</strong>.`
    );
    this.cdr.detectChanges();
  }

  // ── Historique : Supprimer tout ───────────────────────
  supprimerHistorique(): void {
    if (!confirm('Supprimer tout l\'historique des conversations ?')) return;
    this.historique = [];
    localStorage.removeItem(this.storageKey);
    this.showHistorique = false;
    this.cdr.detectChanges();
  }

  // ── Nouvelle conversation ─────────────────────────────
  nouvelleConversation(): void {
    if (this.messages.length > 0) this._sauvegarderHistorique();
    this.messages        = [];
    this.showWelcomeForm = true;
    this.showSuggestions = true;
    this.userPrenom      = this.utilisateurConnecte?.prenom ?? '';
    this.cdr.detectChanges();
  }

  // ── Fallback local ────────────────────────────────────
  private getFallbackResponse(question: string): string {
    const q = question.toLowerCase();
    if (q.includes('punique') || q.includes('carthage')) {
      return `Les monnaies <strong>puniques de Carthage</strong> 🏛️ sont parmi les plus anciennes de Tunisie.<br><br>
              Le <strong>Statère d'Or</strong> représente la déesse Tanit et un cheval.`;
    }
    if (q.includes('romain')) {
      return `La période <strong>romaine</strong> en Tunisie ⚔️<br><br>
              Des villes comme <strong>Hadrumetum (Sousse)</strong> frappaient leurs propres bronzes.`;
    }
    if (q.includes('islamique') || q.includes('dinar') || q.includes('aghlabide')) {
      return `Les <strong>Aghlabides</strong> frappaient des dinars d'or à Kairouan ☪️.`;
    }
    if (q.includes('numide') || q.includes('massinissa')) {
      return `Le roi <strong>Massinissa</strong> de Numidie 🗺️ a frappé des bronzes avec son portrait.`;
    }
    return `Je peux vous renseigner sur les monnaies tunisiennes 🪙 :<br><br>
            🏛️ Punique — ⚔️ Romaine — ✝️ Byzantine — ☪️ Islamique — 🗺️ Numide`;
  }

  // ── Utilitaires ───────────────────────────────────────
  private addBotMessage(content: string): void {
    this.messages.push({ role: 'bot', content, time: this.getTime() });
    this.shouldScroll = true;
    if (!this.isOpen) this.hasNewMessage = true;
  }

  private addUserMessage(content: string): void {
    this.messages.push({ role: 'user', content, time: this.getTime() });
    this.shouldScroll = true;
  }

  private getTime(): string {
    const now = new Date();
    return `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
  }

  private scrollToBottom(): void {
    try {
      this.messagesContainer.nativeElement.scrollTop =
        this.messagesContainer.nativeElement.scrollHeight;
    } catch (e) {}
  }
}
