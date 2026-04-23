package com.moneta.moneta_backend.repository;

import com.moneta.moneta_backend.model.Monnaie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository pour l'entité Monnaie.
 * JpaRepository fournit déjà toutes les méthodes nécessaires :
 * - findAll()
 * - findById(String id)
 * - save(Monnaie m) -> Utilisé pour l'ajout et la modification (PUT)
 * - deleteById(String id) -> Utilisé pour la suppression (DELETE)
 */
@Repository
public interface MonnaieRepository extends JpaRepository<Monnaie, String> {
    // La clé primaire (ID) est de type String car ton entité utilise wikidataId
}