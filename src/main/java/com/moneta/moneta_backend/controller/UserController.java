package com.moneta.moneta_backend.controller;

import com.moneta.moneta_backend.model.User;
import com.moneta.moneta_backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    // ── GET tous les utilisateurs (Admin seulement) ───────
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // ── NIVEAU 3 — Changer le rôle (Admin seulement) ─────
    @PutMapping("/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> changerRole(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        String nouveauRole = body.get("role");

        // Valider que le rôle est valide
        if (!List.of("VISITEUR", "SUPERVISEUR", "ADMIN").contains(nouveauRole)) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "Rôle invalide. Valeurs acceptées: VISITEUR, SUPERVISEUR, ADMIN"));
        }

        return userRepository.findById(id).map(user -> {
            user.setRole(nouveauRole);
            userRepository.save(user);
            return ResponseEntity.ok(Map.of(
                "message",  "Rôle mis à jour avec succès",
                "username", user.getUsername(),
                "role",     user.getRole()
            ));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── DELETE utilisateur (Admin seulement) ──────────────
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        if (!userRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        userRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Utilisateur supprimé avec succès"));
    }
}