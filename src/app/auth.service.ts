// ============================================================
// auth.service.ts  —  Projet MONETA
// ============================================================

import { Injectable }        from '@angular/core';
import { HttpClient }        from '@angular/common/http';
import { Router }            from '@angular/router';
import { Observable, tap }   from 'rxjs';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email:    string;
  password: string;
  role:     string;
}

export interface AuthResponse {
  token:    string;//JWT recu du backend
  username: string;
  email:    string;
  role:     string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private apiUrl = 'https://localhost:8443/api/auth'; //Pointe directement vers ton **AuthController.java** dans Spring Boot

  constructor(private http: HttpClient, private router: Router) {}

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => this.sauvegarderSession(res))
    );
  }
  
//Angular envoie → POST /api/auth/login { username, password }
//Backend répond → { token, username, email, role }
              //→ sauvegarderSession() stocke tout dans localStorage

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data).pipe(
      tap(res => this.sauvegarderSession(res))
    );
  }
/*Angular envoie → POST /api/auth/register { username, email, password, role }
Backend répond → { token, username, email, role }
              → sauvegarderSession() stocke tout dans localStorage*/
  private sauvegarderSession(res: AuthResponse): void { //stockage local
    localStorage.setItem('token',    res.token);//jwt authentifier les rq
    localStorage.setItem('username', res.username);
    localStorage.setItem('email',    res.email);
    localStorage.setItem('role',     res.role);
  }

 logout(): void {
  // ✅ Supprime seulement les clés d'auth, pas l'historique du chatbot
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  localStorage.removeItem('email');
  localStorage.removeItem('role');
  this.router.navigate(['/login']);
}

  getToken():    string | null { return localStorage.getItem('token');    }
  getUsername(): string | null { return localStorage.getItem('username'); }
  getEmail():    string | null { return localStorage.getItem('email');    }
  getRole():     string | null { return localStorage.getItem('role');     }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
/*Token JWT = 3 parties séparées par "."
  [header].[payload].[signature]
               ↑
         atob() décode cette partie
         payload.exp = date d'expiration
         Si exp > maintenant → connecté ✅
         Si exp < maintenant → expiré ❌*/
  isAdmin():       boolean { return this.getRole() === 'ADMIN'; }
  isSuperviseur(): boolean { return this.getRole() === 'SUPERVISEUR' || this.isAdmin(); }
  isVisiteur():    boolean { return this.isLoggedIn(); }
}