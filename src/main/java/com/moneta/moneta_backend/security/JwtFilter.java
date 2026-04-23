package com.moneta.moneta_backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtFilter extends OncePerRequestFilter 
//OncePerRequestFilter garantit que le filtre s'exécute une seule fois par requête — jamais deux fois accidentellement
{

    @Autowired
    private JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");
// Lire le header Authorization
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7); // Extraire le token : "Bearer eyJhbGci..."
                                                                          //↑
                                                                         //  7 caractères → substring(7) coupe "Bearer "
                                                                         // → reste seulement le token

            if (jwtUtil.validateToken(token)) {   //Valider le token
                String username = jwtUtil.extractUsername(token);
                String role     = jwtUtil.extractRole(token);
                //Appelle JwtUtil.java pour vérifier que le token est valide et pas expiré, puis lit le username et le rôle dedans.

                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(
                                username,
                                null,
                                List.of(new SimpleGrantedAuthority("ROLE_" + role))
                        );
//Authentifier dans Spring Security

                SecurityContextHolder.getContext().setAuthentication(auth);
                //SecurityContextHolder = la mémoire de Spring pour cette requête. Il sait maintenant qui envoie la requête et quel est son rôle.
            }
        }

        chain.doFilter(request, response);
        //Laisser passer
// Que le token soit valide ou non, cette ligne **laisse continuer** la requête. La différence c'est que **sans token valide**, `SecurityContextHolder` reste vide → Spring Security bloque automatiquement.

    }
}