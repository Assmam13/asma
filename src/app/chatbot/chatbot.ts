import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { timeout } from 'rxjs/operators';

interface Message {
  role: 'user' | 'bot';
  content: string;
  time: string;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.css'
})
export class ChatbotComponent implements OnInit, AfterViewChecked {

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  isOpen          = false;
  showWelcomeForm = true;
  isTyping        = false;
  hasNewMessage   = false;
  showSuggestions = true;
  shouldScroll    = false;

  userPrenom     = '';
  currentMessage = '';
  messages: Message[] = [];

  suggestions = [
    '🏛️ Monnaies puniques',
    '⚔️ Période romaine',
    '☪️ Dinars islamiques',
    '🗺️ Numidie',
  ];

  private apiUrl = 'http://localhost:5000/api/chat';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {}

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    this.hasNewMessage = false;
    if (this.isOpen) {
      this.shouldScroll = true;
    }
    this.cdr.detectChanges();
  }

  submitWelcome(): void {
    if (!this.userPrenom.trim()) return;
    this.showWelcomeForm = false;
    this.showSuggestions = true;
    this.addBotMessage(
      `Bonjour <strong>${this.userPrenom}</strong> ! 👋<br><br>
       Je suis <strong>MONETA IA</strong>, votre guide expert en monnaies tunisiennes anciennes.<br><br>
       Je peux vous renseigner sur les monnaies puniques de Carthage, romaines, byzantines, islamiques et numides.<br><br>
       Que souhaitez-vous savoir ? 🪙`
    );
    this.cdr.detectChanges();
  }

  sendMessage(): void {
    if (!this.currentMessage.trim() || this.isTyping) return;
    const msg = this.currentMessage.trim();
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

  private callRAGApi(question: string): void {
    this.isTyping     = true;
    this.shouldScroll = true;
    this.cdr.detectChanges();

    this.http.post<any>(this.apiUrl, {
      question: question,
      prenom:   this.userPrenom
    }).pipe(
      timeout(60000)
    ).subscribe({
      next: (response) => {
        this.isTyping        = false;
        this.showSuggestions = true;
        this.addBotMessage(response.answer || 'Je n\'ai pas trouvé de réponse.');
        this.shouldScroll = true;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.shouldScroll = true;
          this.cdr.detectChanges();
        }, 200);
      },
      error: () => {
        this.isTyping        = false;
        this.showSuggestions = true;
        this.addBotMessage(this.getFallbackResponse(question));
        this.shouldScroll = true;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.shouldScroll = true;
          this.cdr.detectChanges();
        }, 200);
      }
    });
  }

  private getFallbackResponse(question: string): string {
    const q = question.toLowerCase();
    if (q.includes('punique') || q.includes('carthage')) {
      return `Les monnaies <strong>puniques de Carthage</strong> 🏛️ sont parmi les plus anciennes de Tunisie.<br><br>
              Le <strong>Statère d'Or</strong> représente la déesse Tanit et un cheval — symboles du pouvoir carthaginois.`;
    }
    if (q.includes('romain')) {
      return `La période <strong>romaine</strong> en Tunisie (146 av. J.-C. - 439 ap. J.-C.) ⚔️<br><br>
              Des villes comme <strong>Hadrumetum (Sousse)</strong> et <strong>Thysdrus (El Djem)</strong> frappaient leurs propres bronzes.`;
    }
    if (q.includes('islamique') || q.includes('dinar') || q.includes('aghlabide')) {
      return `Les <strong>Aghlabides</strong> (800-909) frappaient des dinars d'or à Kairouan ☪️<br><br>
              avec des inscriptions coraniques en calligraphie coufique.`;
    }
    if (q.includes('numide') || q.includes('massinissa')) {
      return `Le roi <strong>Massinissa</strong> de Numidie 🗺️ a frappé des bronzes avec son portrait<br><br>
              et un cheval au galop — symbole de la puissance numide.`;
    }
    return `Je peux vous renseigner sur les monnaies tunisiennes 🪙 :<br><br>
            🏛️ <strong>Punique</strong> — Carthage<br>
            ⚔️ <strong>Romaine</strong> — Provinces d'Afrique<br>
            ✝️ <strong>Byzantine</strong> — Exarchat d'Afrique<br>
            ☪️ <strong>Islamique</strong> — Aghlabides, Fatimides, Hafsides<br>
            🗺️ <strong>Numide</strong> — Massinissa, Micipsa<br><br>
            Quelle période vous intéresse ?`;
  }

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
