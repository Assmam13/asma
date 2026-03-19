// ============================================================
// auth.guard.ts  —  Projet MONETA
// ============================================================

import { inject }        from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { Router }        from '@angular/router';
import { AuthService }   from './auth.service';

// ── Tout utilisateur connecté ────────────────────────────
export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  router.navigate(['/login']);
  return false;
};

// ── Superviseur ou Admin ─────────────────────────────────
export const superviseurGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isSuperviseur()) return true;
  router.navigate(['/monnaies']);
  return false;
};

// ── Admin uniquement ─────────────────────────────────────
export const adminGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isAdmin()) return true;
  router.navigate(['/monnaies']);
  return false;
};