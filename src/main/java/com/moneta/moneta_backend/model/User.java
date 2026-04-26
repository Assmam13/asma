package com.moneta.moneta_backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    // VISITEUR | SUPERVISEUR | ADMIN
    @Column(nullable = false)
    private String role = "VISITEUR";

    public Long   getId()                { return id; }
    public void   setId(Long v)          { this.id = v; }
    public String getUsername()          { return username; }
    public void   setUsername(String v)  { this.username = v; }
    public String getEmail()             { return email; }
    public void   setEmail(String v)     { this.email = v; }
    public String getPassword()          { return password; }
    public void   setPassword(String v)  { this.password = v; }
    public String getRole()              { return role; }
    public void   setRole(String v)      { this.role = v; }
}