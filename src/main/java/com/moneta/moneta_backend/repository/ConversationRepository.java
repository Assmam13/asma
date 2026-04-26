package com.moneta.moneta_backend.repository;

import com.moneta.moneta_backend.model.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    // Récupérer tout l'historique d'un utilisateur
    List<Conversation> findByUserIdOrderByTimestampDesc(Long userId);

    // Récupérer par session de chat
    List<Conversation> findBySessionId(String sessionId);
}
