package com.moneta.moneta_backend.controller;

import com.moneta.moneta_backend.model.User;
import com.moneta.moneta_backend.repository.UserRepository;
import com.moneta.moneta_backend.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired private UserRepository  userRepository;
    @Autowired private JwtUtil         jwtUtil;
    @Autowired private PasswordEncoder passwordEncoder;

    // ── LOGIN ─────────────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");

        Optional<User> userOpt = userRepository.findByUsername(username);

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Utilisateur introuvable"));
        }

        User user = userOpt.get();

        if (!passwordEncoder.matches(password, user.getPassword())) {
            return ResponseEntity.status(401).body(Map.of("error", "Mot de passe incorrect"));
        }

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole());

        return ResponseEntity.ok(Map.of(
            "token",    token,
            "username", user.getUsername(),
            "email",    user.getEmail(),
            "role",     user.getRole()
        ));
    }

    // ── REGISTER (public) ─────────────────────────────────
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String email    = body.get("email");
        String password = body.get("password");

        // ✅ NIVEAU 1 — Force toujours VISITEUR
        // Peu importe ce que l'utilisateur envoie dans "role", on ignore
        String role = "VISITEUR";

        if (userRepository.existsByUsername(username)) {
            return ResponseEntity.status(409).body(Map.of("error", "Nom d'utilisateur déjà utilisé"));
        }
        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.status(409).body(Map.of("error", "Email déjà utilisé"));
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(role);

        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole());

        return ResponseEntity.ok(Map.of(
            "token",    token,
            "username", user.getUsername(),
            "email",    user.getEmail(),
            "role",     user.getRole()
        ));
    }
}