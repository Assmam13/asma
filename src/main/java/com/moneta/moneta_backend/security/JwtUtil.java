package com.moneta.moneta_backend.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class JwtUtil {

    // ✅ Clé secrète — change cette valeur en production
    private static final String SECRET = "monetaSecretKeyMonetaSecretKeyMoneta2025!!";
    private static final long   EXPIRATION_MS = 86400000; // 24 heures

    private final SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes());

    // ── Générer un token ─────────────────────────────────
    public String generateToken(String username, String role) {
        return Jwts.builder()
                .subject(username) // ← qui est l'utilisateur
                .claim("role", role)  // ← son rôle (ADMIN/SUPERVISEUR/VISITEUR)
                .issuedAt(new Date())  // ← quand il a été créé
                .expiration(new Date(System.currentTimeMillis() + EXPIRATION_MS)) // ← expire dans 24h
                .signWith(key)  // ← signé avec la clé secrète
                .compact();   // ← transforme en string JWT
    } 

    // ── Extraire le username du token ────────────────────
    public String extractUsername(String token) {
        return getClaims(token).getSubject();   
       //Lit le username dans le token | `JwtFilter.java`
    }

    // ── Extraire le rôle du token ────────────────────────
    public String extractRole(String token) {
        return getClaims(token).get("role", String.class);
       // Lit le rôle dans le token | `JwtFilter.java` |
    }

    // ── Valider le token ─────────────────────────────────
    public boolean validateToken(String token) {
        try {
            getClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
        // Vérifie signature + expiration | `JwtFilter.java` |
    }

    private Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
    //Décode le token (privé)
}