package com.moneta.moneta_backend.controller;

import com.moneta.moneta_backend.model.Monnaie;
import com.moneta.moneta_backend.service.WikidataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/monnaies")
public class MonnaiesController {

    @Autowired
    private WikidataService wikidataService;

    // ── GET toutes les monnaies ───────────────────────────
    @GetMapping
    public List<Monnaie> getMonnaies(
            @RequestParam(required = false) String periode,
            @RequestParam(required = false) String materiau,
            @RequestParam(required = false) String region) {
        return wikidataService.rechercherMonnaies(periode, materiau, region);
    }

    // ── PUT modifier une monnaie ──────────────────────────
    @PutMapping("/{id}")
    public ResponseEntity<Monnaie> updateMonnaie(@PathVariable String id, @RequestBody Monnaie monnaieDetails) {
        System.out.println(">>> Tentative de modification pour l'ID : " + id);
        try {
            Monnaie updated = wikidataService.update(id, monnaieDetails);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            System.err.println(">>> Erreur modification : " + e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    // ── DELETE supprimer une monnaie ──────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMonnaie(@PathVariable String id) {
        System.out.println(">>> Requête DELETE reçue pour l'ID : " + id);
        try {
            wikidataService.delete(id);
            System.out.println(">>> Suppression réussie dans la base MariaDB !");
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            System.err.println(">>> Erreur lors de la suppression : " + e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    // ── POST ajouter une monnaie ──────────────────────────
    @PostMapping
    public ResponseEntity<Monnaie> addMonnaie(@RequestBody Monnaie nouvelleMonnaie) {
        System.out.println(">>> Tentative d'ajout d'une monnaie : " + nouvelleMonnaie.getNom());
        try {
            Monnaie savedMonnaie = wikidataService.save(nouvelleMonnaie);
            return ResponseEntity.ok(savedMonnaie);
        } catch (Exception e) {
            System.err.println(">>> Erreur lors de l'ajout : " + e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
}