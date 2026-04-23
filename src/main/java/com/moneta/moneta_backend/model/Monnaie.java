package com.moneta.moneta_backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "monnaies")
public class Monnaie {

    @Id
    @Column(name = "wikidata_id", length = 30)
    private String wikidataId;

    private String nom;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String image;

    @Column(name = "image_revers", columnDefinition = "TEXT")
    private String imageRevers;

    private String materiau;
    private String region;
    private String atelier;
    private String periode;
    private Integer annee;
    private Double  diametre;
    private Double  poids;

    @Column(columnDefinition = "TEXT")
    private String avers;

    @Column(columnDefinition = "TEXT")
    private String revers;

    private String collection;

    public String  getWikidataId()          { return wikidataId; }
    public void    setWikidataId(String v)  { this.wikidataId = v; }
    public String  getNom()                 { return nom; }
    public void    setNom(String v)         { this.nom = v; }
    public String  getDescription()         { return description; }
    public void    setDescription(String v) { this.description = v; }
    public String  getImage()               { return image; }
    public void    setImage(String v)       { this.image = v; }
    public String  getImageRevers()         { return imageRevers; }
    public void    setImageRevers(String v) { this.imageRevers = v; }
    public String  getMateriau()            { return materiau; }
    public void    setMateriau(String v)    { this.materiau = v; }
    public String  getRegion()              { return region; }
    public void    setRegion(String v)      { this.region = v; }
    public String  getAtelier()             { return atelier; }
    public void    setAtelier(String v)     { this.atelier = v; }
    public String  getPeriode()             { return periode; }
    public void    setPeriode(String v)     { this.periode = v; }
    public Integer getAnnee()               { return annee; }
    public void    setAnnee(Integer v)      { this.annee = v; }
    public Double  getDiametre()            { return diametre; }
    public void    setDiametre(Double v)    { this.diametre = v; }
    public Double  getPoids()               { return poids; }
    public void    setPoids(Double v)       { this.poids = v; }
    public String  getAvers()               { return avers; }
    public void    setAvers(String v)       { this.avers = v; }
    public String  getRevers()              { return revers; }
    public void    setRevers(String v)      { this.revers = v; }
    public String  getCollection()          { return collection; }
    public void    setCollection(String v)  { this.collection = v; }
}
