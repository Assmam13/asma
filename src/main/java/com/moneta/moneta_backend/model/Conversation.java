package com.moneta.moneta_backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "conversations")
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Lien vers l'utilisateur connecté
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String question;

    @Column(columnDefinition = "TEXT")
    private String reponse;

    @Column(nullable = false)
    private LocalDateTime timestamp = LocalDateTime.now();

    @Column(name = "session_id", length = 64)
    private String sessionId;

    // ── Getters & Setters ─────────────────────────────
    public Long getId()                     { return id; }
    public void setId(Long v)               { this.id = v; }
    public User getUser()                   { return user; }
    public void setUser(User v)             { this.user = v; }
    public String getQuestion()             { return question; }
    public void setQuestion(String v)       { this.question = v; }
    public String getReponse()              { return reponse; }
    public void setReponse(String v)        { this.reponse = v; }
    public LocalDateTime getTimestamp()     { return timestamp; }
    public void setTimestamp(LocalDateTime v){ this.timestamp = v; }
    public String getSessionId()            { return sessionId; }
    public void setSessionId(String v)      { this.sessionId = v; }
}

