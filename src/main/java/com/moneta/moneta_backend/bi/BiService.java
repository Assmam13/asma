package com.moneta.moneta_backend.bi;

import com.moneta.moneta_backend.model.Monnaie;
import com.moneta.moneta_backend.model.User;
import com.moneta.moneta_backend.repository.MonnaieRepository;
import com.moneta.moneta_backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class BiService {

    @Autowired private MonnaieRepository monnaieRepository;
    @Autowired private UserRepository    userRepository;
    @Autowired private JdbcTemplate      jdbc;

    // ── Dashboard complet ─────────────────────────────────
    public BiDTO.DashboardComplet getDashboardComplet() {
        // Enregistre la visite d'aujourd'hui
        enregistrerVisite();

        BiDTO.DashboardComplet dashboard = new BiDTO.DashboardComplet();
        dashboard.setGlobales(getStatsGlobales());
        dashboard.setCategories(getStatsCategories());
        return dashboard;
    }

    // ── Enregistre visite du jour ─────────────────────────
    public void enregistrerVisite() {
        String sql = "INSERT INTO visites (date_visite, nombre) VALUES (?, 1) " +
                     "ON DUPLICATE KEY UPDATE nombre = nombre + 1";
        jdbc.update(sql, LocalDate.now());
    }

    // ── Stats globales ────────────────────────────────────
    public BiDTO.StatsGlobales getStatsGlobales() {
        List<User> users = userRepository.findAll();

        BiDTO.StatsGlobales stats = new BiDTO.StatsGlobales();
        stats.setTotalMonnaies(monnaieRepository.count());
        stats.setTotalUtilisateurs(users.size());
        stats.setTotalVisiteurs(users.stream().filter(u -> "VISITEUR".equals(u.getRole())).count());
        stats.setTotalSuperviseurs(users.stream().filter(u -> "SUPERVISEUR".equals(u.getRole())).count());
        stats.setTotalAdmins(users.stream().filter(u -> "ADMIN".equals(u.getRole())).count());

        // Visiteurs par période (depuis table visites)
        stats.setVisiteursAujourdhui(getVisiteurs("DAY"));
        stats.setVisiteursParSemaine(getVisiteurs("WEEK"));
        stats.setVisiteursParMois(getVisiteurs("MONTH"));

        return stats;
    }

    // ── Stats par catégories ──────────────────────────────
    public BiDTO.StatsCategorie getStatsCategories() {
        List<Monnaie> monnaies = monnaieRepository.findAll();

        BiDTO.StatsCategorie stats = new BiDTO.StatsCategorie();
        stats.setParPeriode(compterPar(monnaies, "periode"));
        stats.setParMateriau(compterPar(monnaies, "materiau"));
        stats.setParRegion(compterParRegion(monnaies));
        stats.setParAnnee(compterParAnnee(monnaies));
        return stats;
    }

    // ── Visiteurs depuis la table visites ─────────────────
    private long getVisiteurs(String periode) {
        String sql;
        switch (periode) {
            case "DAY":
                sql = "SELECT COALESCE(SUM(nombre), 0) FROM visites WHERE date_visite = CURDATE()";
                break;
            case "WEEK":
                sql = "SELECT COALESCE(SUM(nombre), 0) FROM visites WHERE date_visite >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
                break;
            case "MONTH":
                sql = "SELECT COALESCE(SUM(nombre), 0) FROM visites WHERE date_visite >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
                break;
            default:
                return 0;
        }
        Long result = jdbc.queryForObject(sql, Long.class);
        return result != null ? result : 0;
    }

    // ── Helper : compter par champ ────────────────────────
    private Map<String, Long> compterPar(List<Monnaie> monnaies, String champ) {
        return monnaies.stream()
            .filter(m -> getChamp(m, champ) != null && !getChamp(m, champ).isBlank())
            .collect(Collectors.groupingBy(m -> getChamp(m, champ), Collectors.counting()))
            .entrySet().stream()
            .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
            .collect(Collectors.toMap(
                Map.Entry::getKey, Map.Entry::getValue,
                (e1, e2) -> e1, LinkedHashMap::new
            ));
    }

    // ── Helper : top 8 régions ────────────────────────────
    private Map<String, Long> compterParRegion(List<Monnaie> monnaies) {
        return monnaies.stream()
            .filter(m -> m.getRegion() != null && !m.getRegion().isBlank())
            .collect(Collectors.groupingBy(Monnaie::getRegion, Collectors.counting()))
            .entrySet().stream()
            .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
            .limit(8)
            .collect(Collectors.toMap(
                Map.Entry::getKey, Map.Entry::getValue,
                (e1, e2) -> e1, LinkedHashMap::new
            ));
    }

    // ── Helper : par année (chronologique) ───────────────
    private Map<String, Long> compterParAnnee(List<Monnaie> monnaies) {
        return monnaies.stream()
            .filter(m -> m.getAnnee() != null)
            .collect(Collectors.groupingBy(
                m -> String.valueOf(m.getAnnee()),
                Collectors.counting()
            ))
            .entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
            .collect(Collectors.toMap(
                Map.Entry::getKey, Map.Entry::getValue,
                (e1, e2) -> e1, LinkedHashMap::new
            ));
    }

    // ── Helper : accès champ monnaie ─────────────────────
    private String getChamp(Monnaie m, String champ) {
        switch (champ) {
            case "periode":  return m.getPeriode();
            case "materiau": return m.getMateriau();
            case "region":   return m.getRegion();
            default:         return null;
        }
    }
}