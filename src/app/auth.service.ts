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
  token:    string;
  username: string;
  email:    string;
  role:     string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private apiUrl = 'http://localhost:8083/api/auth';

  constructor(private http: HttpClient, private router: Router) {}

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap(res => this.sauvegarderSession(res))
    );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data).pipe(
      tap(res => this.sauvegarderSession(res))
    );
  }

  private sauvegarderSession(res: AuthResponse): void {
    localStorage.setItem('token',    res.token);
    localStorage.setItem('username', res.username);
    localStorage.setItem('email',    res.email);
    localStorage.setItem('role',     res.role);
  }

  logout(): void {
    localStorage.clear();
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

  isAdmin():       boolean { return this.getRole() === 'ADMIN'; }
  isSuperviseur(): boolean { return this.getRole() === 'SUPERVISEUR' || this.isAdmin(); }
  isVisiteur():    boolean { return this.isLoggedIn(); }
}