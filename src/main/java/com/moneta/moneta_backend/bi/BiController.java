package com.moneta.moneta_backend.bi;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bi")
public class BiController {

    @Autowired
    private BiService biService;

    // ── Dashboard complet (Admin + Superviseur) ───────────
    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISEUR')")
    public ResponseEntity<BiDTO.DashboardComplet> getDashboard() {
        return ResponseEntity.ok(biService.getDashboardComplet());
    }

    // ── Stats globales (Admin uniquement) ─────────────────
    @GetMapping("/stats/globales")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BiDTO.StatsGlobales> getStatsGlobales() {
        return ResponseEntity.ok(biService.getStatsGlobales());
    }

    // ── Stats par catégories (Admin uniquement) ───────────
    @GetMapping("/stats/categories")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BiDTO.StatsCategorie> getStatsCategories() {
        return ResponseEntity.ok(biService.getStatsCategories());
    }

    // ✅ NOUVEAU — Stats scientifiques (Admin + Superviseur)
    // Monnaies par période, matériau, région, année
    // Pas de stats utilisateurs ni visiteurs
    @GetMapping("/stats/scientifiques")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERVISEUR')")
    public ResponseEntity<BiDTO.StatsCategorie> getStatsScientifiques() {
        return ResponseEntity.ok(biService.getStatsCategories());
    }

    // ── Enregistrer une visite ────────────────────────────
    @PostMapping("/visite")
    public ResponseEntity<Void> enregistrerVisite() {
        biService.enregistrerVisite();
        return ResponseEntity.ok().build();
    }
}
