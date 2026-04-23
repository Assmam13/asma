package com.moneta.moneta_backend.bi;

import java.util.Map;

public class BiDTO {

    // ── Statistiques globales ─────────────────────────────
    public static class StatsGlobales {
        private long totalMonnaies;
        private long totalUtilisateurs;
        private long totalVisiteurs;
        private long totalSuperviseurs;
        private long totalAdmins;
        private long visiteursAujourdhui;
        private long visiteursParSemaine;
        private long visiteursParMois;

        public StatsGlobales() {}

        public long getTotalMonnaies()           { return totalMonnaies; }
        public void setTotalMonnaies(long v)     { this.totalMonnaies = v; }
        public long getTotalUtilisateurs()       { return totalUtilisateurs; }
        public void setTotalUtilisateurs(long v) { this.totalUtilisateurs = v; }
        public long getTotalVisiteurs()          { return totalVisiteurs; }
        public void setTotalVisiteurs(long v)    { this.totalVisiteurs = v; }
        public long getTotalSuperviseurs()       { return totalSuperviseurs; }
        public void setTotalSuperviseurs(long v) { this.totalSuperviseurs = v; }
        public long getTotalAdmins()             { return totalAdmins; }
        public void setTotalAdmins(long v)       { this.totalAdmins = v; }
        public long getVisiteursAujourdhui()     { return visiteursAujourdhui; }
        public void setVisiteursAujourdhui(long v){ this.visiteursAujourdhui = v; }
        public long getVisiteursParSemaine()     { return visiteursParSemaine; }
        public void setVisiteursParSemaine(long v){ this.visiteursParSemaine = v; }
        public long getVisiteursParMois()        { return visiteursParMois; }
        public void setVisiteursParMois(long v)  { this.visiteursParMois = v; }
    }

    // ── Statistiques par catégorie ────────────────────────
    public static class StatsCategorie {
        private Map<String, Long> parPeriode;
        private Map<String, Long> parMateriau;
        private Map<String, Long> parRegion;
        private Map<String, Long> parAnnee;

        public StatsCategorie() {}

        public Map<String, Long> getParPeriode()        { return parPeriode; }
        public void setParPeriode(Map<String, Long> v)  { this.parPeriode = v; }
        public Map<String, Long> getParMateriau()       { return parMateriau; }
        public void setParMateriau(Map<String, Long> v) { this.parMateriau = v; }
        public Map<String, Long> getParRegion()         { return parRegion; }
        public void setParRegion(Map<String, Long> v)   { this.parRegion = v; }
        public Map<String, Long> getParAnnee()          { return parAnnee; }
        public void setParAnnee(Map<String, Long> v)    { this.parAnnee = v; }
    }

    // ── Dashboard complet ─────────────────────────────────
    public static class DashboardComplet {
        private StatsGlobales  globales;
        private StatsCategorie categories;

        public DashboardComplet() {}

        public StatsGlobales  getGlobales()           { return globales; }
        public void           setGlobales(StatsGlobales v)  { this.globales = v; }
        public StatsCategorie getCategories()         { return categories; }
        public void           setCategories(StatsCategorie v){ this.categories = v; }
    }
}