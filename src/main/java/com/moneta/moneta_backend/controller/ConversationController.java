package com.moneta.moneta_backend.controller;

import com.moneta.moneta_backend.model.Conversation;
import com.moneta.moneta_backend.model.User;
import com.moneta.moneta_backend.repository.ConversationRepository;
import com.moneta.moneta_backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/conversations")
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:5000"})
public class ConversationController {

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private UserRepository userRepository;

    // ── POST /api/conversations ──────────────────────────
    @PostMapping
    public ResponseEntity<?> sauvegarder(@RequestBody Map<String, String> body) {
        String userIdentifier = body.get("user_id");
        String question       = body.get("question");
        String reponse        = body.get("reponse");
        String sessionId      = body.get("session_id");

        if (question == null || reponse == null) {
            return ResponseEntity.badRequest().body("question et reponse requis");
        }

        // Cherche par email d'abord
        Optional<User> userOpt = userRepository.findByEmail(userIdentifier);

        // Sinon par username
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByUsername(userIdentifier);
        }

        // Sinon cherche juste par le prénom (cas visiteur_prenom)
        if (userOpt.isEmpty() && userIdentifier != null && userIdentifier.startsWith("visiteur_")) {
            String prenom = userIdentifier.replace("visiteur_", "");
            userOpt = userRepository.findByUsername(prenom);
        }

        if (userOpt.isEmpty()) {
            // Log mais ne bloque pas — visiteur anonyme sans compte
            System.out.println("[CONV] Utilisateur introuvable: " + userIdentifier + " — conversation ignorée");
            return ResponseEntity.ok(Map.of("status", "skipped", "reason", "user not found"));
        }

        Conversation conv = new Conversation();
        conv.setUser(userOpt.get());
        conv.setQuestion(question);
        conv.setReponse(reponse);
        conv.setSessionId(sessionId != null ? sessionId : "default");

        conversationRepository.save(conv);
        System.out.println("[CONV] ✅ Sauvegardé pour: " + userOpt.get().getUsername());
        return ResponseEntity.ok(Map.of("status", "saved"));
    }

    // ── GET /api/conversations/{userId} ─────────────────
    @GetMapping("/{userId}")
    public ResponseEntity<List<Conversation>> getHistorique(@PathVariable Long userId) {
        return ResponseEntity.ok(
            conversationRepository.findByUserIdOrderByTimestampDesc(userId)
        );
    }

    // ── GET /api/conversations/session/{sessionId} ───────
    @GetMapping("/session/{sessionId}")
    public ResponseEntity<List<Conversation>> getParSession(@PathVariable String sessionId) {
        return ResponseEntity.ok(
            conversationRepository.findBySessionId(sessionId)
        );
    }
}
