// ============================================================
// mode-ia.ts — MONETA Mode IA (style Google AI Mode)
// ============================================================

import {
  Component, ViewChild, ElementRef,
  AfterViewChecked, OnInit
} from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule }   from '@angular/forms';
import { HttpClient }    from '@angular/common/http';
import { AuthService }   from '../auth.service';

export interface Message {
  id:   number;
  role: 'user' | 'ai';
  text: string;
  html: string;
}

@Component({
  selector:    'app-mode-ia',
  standalone:  true,
  imports:     [CommonModule, FormsModule],
  templateUrl: './mode-ia.html',
  styleUrls:   ['./mode-ia.css']
})
export class ModeIaComponent implements OnInit, AfterViewChecked {

  @ViewChild('scrollArea') scrollArea!: ElementRef;
  @ViewChild('mainInput') mainInput!: ElementRef;
  @ViewChild('bottomInput') bottomInput!: ElementRef;

  messages:  Message[] = [];
  query      = '';
  isTyping   = false;
  hasStarted = false;  // true quand premier message envoyé
  private msgId = 0;
  private shouldScroll = false;

  private chatbotUrl = 'https://localhost:5000/chat';

  constructor(public auth: AuthService, private http: HttpClient) {}

  ngOnInit(): void {
    setTimeout(() => this.mainInput?.nativeElement?.focus(), 200);
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  private scrollToBottom(): void {
    try {
      const el = this.scrollArea?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  // ── Envoi message ─────────────────────────────────────────
  envoyer(): void {
    const q = this.query.trim();
    if (!q || this.isTyping) return;

    this.hasStarted = true;
    this.query      = '';

    // Message utilisateur
    this.messages.push({
      id:   ++this.msgId,
      role: 'user',
      text: q,
      html: q
    });
    this.shouldScroll = true;

    // Typing
    this.isTyping = true;

    // Appel API RAG ou fallback local
    this.http.post<any>(this.chatbotUrl, { question: q }).subscribe({
      next: (res) => {
        const rep = res.answer || res.response || res.reply || '';
        this.afficherReponse(rep || this.repondreLocalement(q));
      },
      error: () => {
        setTimeout(() => {
          this.afficherReponse(this.repondreLocalement(q));
        }, 900 + Math.random() * 600);
      }
    });

    // Focus bas
    setTimeout(() => this.bottomInput?.nativeElement?.focus(), 100);
  }

  private afficherReponse(texte: string): void {
    this.isTyping = false;
    this.messages.push({
      id:   ++this.msgId,
      role: 'ai',
      text: texte,
      html: this.formaterHTML(texte)
    });
    this.shouldScroll = true;
  }

  // ── Formater en HTML riche ────────────────────────────────
  private formaterHTML(text: string): string {
    let html = text;

    // Titres ## → <h3>
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');

    // Gras **texte**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italique *texte*
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Listes - item
    html = html.replace(/^[-•] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');

    // Sauts de ligne
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    return `<p>${html}</p>`;
  }

  // ── Suggestions ───────────────────────────────────────────
  clickSuggestion(texte: string): void {
    this.query = texte;
    this.envoyer();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.envoyer();
    }
  }

  // ── Réponses locales ──────────────────────────────────────
  private repondreLocalement(q: string): string {
    const question = q.toLowerCase();

    if (question.includes('punique') || question.includes('carthage') || question.includes('tanit')) {
      return `L'histoire des **monnaies puniques** est indissociable de Carthage, cité fondée en 814 av. J.-C. par des marchands phéniciens.

## Les principales dénominations

- **Le Statère d'or** : monnaie de prestige représentant la déesse Tanit couronnée à l'avers et un cheval au revers. Il pesait environ 9,4 grammes.
- **Le Shekel d'argent** : monnaie courante des guerres puniques contre Rome, avec le portrait d'Héraklès-Melqart.
- **Le Bronze punique** : monnaie de circulation quotidienne, représentant Tanit et un cheval au galop.

## Évolutions par période

Les premières émissions apparaissent vers 410 av. J.-C. pour financer les campagnes militaires en Sicile. L'iconographie s'inspira des modèles grecs tout en intégrant des symboles phéniciens comme le palmier dattier et l'étoile à huit branches.

La chute de Carthage en 146 av. J.-C. mit fin à la frappe punique, remplacée progressivement par le système monétaire romain.`;
    }

    if (question.includes('islamique') || question.includes('dinar') || question.includes('aghlabide') || question.includes('fatimide')) {
      return `L'histoire des monnaies islamiques commence véritablement avec la grande réforme du calife omeyyade **Abd al-Malik** en 696-697 (77 H).

Voici les trois piliers du système monétaire islamique classique :

- **Le Dinar (Or)** : monnaie de prestige pesant environ **4,25 grammes**. Les premiers dinars omeyyades supprimèrent toute représentation humaine au profit d'inscriptions calligraphiées en caractères coufiques, incluant la profession de foi (*Shahada*).
- **Le Dirham (Argent)** : utilisé pour les transactions courantes, il pesait environ **2,975 grammes**. Inspiré de la drachme perse, il devint purement épigraphique.
- **Le Fals (Cuivre)** : destiné aux petits échanges quotidiens sur les marchés locaux.

## Évolutions majeures par dynasties

En Ifriqiya (Tunisie actuelle), la **dynastie aghlabide** (800-909) frappa des dinars à Kairouan, première capitale islamique du Maghreb. Les **Fatimides** (909-972) introduisirent ensuite une calligraphie chiite distinctive avant de partir conquérir l'Égypte.`;
    }

    if (question.includes('romaine') || question.includes('romain') || question.includes('denier') || question.includes('sesterce')) {
      return `Les **monnaies romaines** d'Afrique du Nord constituent un témoignage exceptionnel de la romanisation de la région après la chute de Carthage en 146 av. J.-C.

## Les ateliers monétaires en Tunisie

- **Carthago** : principal atelier après la refondation romaine sous Auguste
- **Hadrumetum (Sousse)** : frappe de bronzes municipaux
- **Thysdrus (El Djem)** : célèbre pour ses deniers de l'Empereur Gordien Ier (238 ap. J.-C.)
- **Thugga (Dougga)** : monnaies numido-romaines bilingues

## Les dénominations principales

L'**Aureus d'or**, le **Denier d'argent**, le **Sesterce de bronze** et l'**As de cuivre** formaient un système décimal cohérent. L'Afrique Proconsulaire était si riche — grenier à blé de Rome — que ses monnaies représentent souvent *l'Afrique personnifiée* tenant des épis de blé au revers.`;
    }

    if (question.includes('byzantine') || question.includes('byzant') || question.includes('follis') || question.includes('solidus')) {
      return `Les **monnaies byzantines** d'Afrique furent frappées à Carthage pendant l'**Exarchat d'Afrique** (533-698 ap. J.-C.), dernière présence romaine sur le continent.

Après la reconquête de l'Afrique du Nord par **Justinien Ier** en 533, l'atelier de Carthage fut rouvert et frappa des monnaies distinctives :

- **Le Solidus d'or** : monnaie de référence de l'Empire, portant le portrait de l'Empereur en armure
- **Le Follis de bronze** : monnaie populaire avec le grand **M** (= 40 *nummi*) au revers et la date de règne
- **Le Demi-Follis** : valeur de 20 *nummi*, plus rare

## Fin de l'atelier de Carthage

La conquête arabe mit définitivement fin à l'atelier de Carthage en **698 ap. J.-C.**, remplacé par les premières frappes islamiques. Les dernières monnaies byzantines d'Afrique sont aujourd'hui très recherchées par les collectionneurs.`;
    }

    if (question.includes('numide') || question.includes('massinissa') || question.includes('jugurtha')) {
      return `Le **Royaume de Numidie** produisit ses propres monnaies entre le IIIe et le Ier siècle av. J.-C., sous l'influence croissante de Rome.

## Les rois numides et leurs monnaies

- **Massinissa** (202-148 av. J.-C.) : fondateur de la Numidie unifiée et allié de Rome contre Carthage. Ses bronzes portent son portrait diadémé et un cheval au galop avec une légende néo-punique.
- **Micipsa** (148-118 av. J.-C.) : fils de Massinissa, continua la frappe à Cirta (Constantine actuelle).
- **Jugurtha** (118-105 av. J.-C.) : neveu de Micipsa, célèbre pour sa résistance à Rome. Ses monnaies sont parmi les plus rares.

## Caractéristiques iconographiques

Les monnaies numides s'inspirent à la fois du style punique (cheval, éléphant) et du style hellénistique (portraits royaux diadémés). Les légendes sont en **néo-punique** ou en **libyque**, témoignant de la culture berbère originale.`;
    }

    if (question.includes('hafside') || question.includes('husseinite') || question.includes('protectorat')) {
      return `La **Tunisie médiévale et moderne** connut plusieurs dynasties dont les monnaies témoignent d'une riche histoire numismatique.

## Dynasties principales

- **Hafsides** (1229-1574) : leurs dinars d'or et demi-dirhams d'argent portent le nom du Sultan en calligraphie arabe ornée. L'atelier de Tunis était le principal centre de frappe.
- **Husseinites** (1705-1881) : le Beylicat de Tunis, vassal de l'Empire Ottoman, frappait des **Piastres**, **Riyals** et **Boudjous** avec la toughra du Bey.
- **Protectorat français** (1881-1956) : les monnaies portent à la fois les symboles français (RF, Marianne) et la toughra du Bey tunisien. Frappées à Paris.
- **République tunisienne** (1956-) : le **Dinar tunisien** et ses subdivisions (millimes) portent la carte de la Tunisie et les symboles nationaux.`;
    }

    if (question.includes('bonjour') || question.includes('salut') || question.includes('hello')) {
      return `Bonjour ! Je suis **MONETA Intelligence**, votre assistant spécialisé en numismatique archéologique.

Je peux vous aider à explorer et comprendre les monnaies de Tunisie et de France à travers les âges :

- 🏛 **Monnaies puniques** de Carthage (VIIe - IIe s. av. J.-C.)
- ⚔ **Monnaies romaines** d'Afrique du Nord (IIe s. av. - Ve s. ap.)
- ✝ **Monnaies byzantines** de l'Exarchat d'Afrique (VIe - VIIe s.)
- ☪ **Monnaies islamiques** : Aghlabides, Fatimides, Hafsides
- 🗺 **Monnaies numides** des rois berbères
- ⚜ **Monnaies françaises** de l'Antiquité gauloise à l'Euro

Que souhaitez-vous découvrir ?`;
    }

    return `Votre question sur **"${q}"** est très intéressante ! 

Je peux vous renseigner sur les grandes périodes numismatiques de MONETA :

- Les **monnaies puniques** de Carthage et leur iconographie de Tanit
- Les **monnaies romaines** frappées en Afrique du Nord
- Les **monnaies byzantines** de l'Exarchat d'Afrique
- Les **monnaies islamiques** : Dinars aghlabides, fatimides et hafsides
- Les **monnaies numides** des rois berbères Massinissa et Jugurtha
- Les **monnaies françaises** de la Gaule à l'Euro

Précisez votre question pour que je puisse vous donner une réponse détaillée !`;
  }
}