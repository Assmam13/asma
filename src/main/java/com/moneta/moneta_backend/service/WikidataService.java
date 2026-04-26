package com.moneta.moneta_backend.service;

import com.moneta.moneta_backend.model.Monnaie;
import com.moneta.moneta_backend.repository.MonnaieRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;	

@Service
public class WikidataService {

    @Autowired
    private MonnaieRepository repository;

    // Méthode pour récupérer les monnaies
    public List<Monnaie> rechercherMonnaies(String periode, String materiau, String region) {
        return repository.findAll(); // retourne tout pour l'instant
        //⚠️ Les filtres periode, materiau, region sont reçus mais pas encore utilisés — retourne tout. C'est prévu pour le Sprint 2
    }

    // AJOUTE CETTE MÉTHODE (C'est elle qui enlève l'erreur du contrôleur)
    public Monnaie update(String id, Monnaie details) {
        return repository.findById(id).map(m -> {
            m.setNom(details.getNom());
            m.setDescription(details.getDescription());
            m.setImage(details.getImage());
            m.setImageRevers(details.getImageRevers());
            m.setMateriau(details.getMateriau());
            m.setRegion(details.getRegion());
            m.setAtelier(details.getAtelier());
            m.setPeriode(details.getPeriode());
            m.setAnnee(details.getAnnee());
            m.setDiametre(details.getDiametre());
            m.setPoids(details.getPoids());
            m.setAvers(details.getAvers());
            m.setRevers(details.getRevers());
            m.setCollection(details.getCollection());
            return repository.save(m);
        }).orElseThrow(() -> new RuntimeException("Monnaie non trouvée"));  //Cherche la monnaie par ID
                                                                            //↓
                                                                           //Trouvée ? → copie les nouveaux champs → sauvegarde ✅
                                                                          //Non trouvée ? → lance une erreur → Controller retourne 404 
    }

    // AJOUTE CETTE MÉTHODE
    public void delete(String id) {
        // On affiche dans la console pour vérifier que la méthode est bien appelée
        System.out.println("Tentative de suppression de l'ID : " + id);
        
        if (repository.existsById(id)) {
            repository.deleteById(id);
            System.out.println("Suppression réussie dans la base.");
        } else {
            System.err.println("ID introuvable dans la base : " + id);
            throw new RuntimeException("ID non trouvé");
        }
    }
    public Monnaie save(Monnaie monnaie) {
        return repository.save(monnaie);
    }
}