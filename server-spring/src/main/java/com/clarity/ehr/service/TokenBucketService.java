package com.clarity.ehr.service;

import com.clarity.ehr.entity.User;
import com.clarity.ehr.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Service
@RequiredArgsConstructor
public class TokenBucketService {

    private static final int DAILY_TOKEN_LIMIT = 100;
    private final UserRepository userRepository;

    /**
     * Check if reset is needed and reset if necessary.
     * Returns true if tokens are available, false if limit exceeded.
     */
    @Transactional
    public boolean consumeToken(User user) {
        LocalDateTime now = LocalDateTime.now();

        // ──────────────────────────────────────────────────────────────────────────────
        // CHECK: Is it time to reset the daily limit?
        // ──────────────────────────────────────────────────────────────────────────────
        if (user.getDailyTokenResetAt() == null || now.isAfter(user.getDailyTokenResetAt())) {
            // Reset tokens
            user.setDailyTokensRemaining(DAILY_TOKEN_LIMIT);
            // Set reset to tomorrow at midnight (00:00)
            user.setDailyTokenResetAt(
                now.toLocalDate().plusDays(1).atStartOfDay()
            );
            userRepository.save(user);
        }

        // ──────────────────────────────────────────────────────────────────────────────
        // DEDUCT: One token if available
        // ──────────────────────────────────────────────────────────────────────────────
        if (user.getDailyTokensRemaining() > 0) {
            user.setDailyTokensRemaining(user.getDailyTokensRemaining() - 1);
            userRepository.save(user);
            return true; // Token consumed successfully
        }

        return false; // Limit exceeded
    }

    /**
     * Get remaining tokens for user (with auto-reset if needed)
     */
    @Transactional
    public int getRemainingTokens(User user) {
        LocalDateTime now = LocalDateTime.now();

        if (user.getDailyTokenResetAt() == null || now.isAfter(user.getDailyTokenResetAt())) {
            user.setDailyTokensRemaining(DAILY_TOKEN_LIMIT);
            user.setDailyTokenResetAt(
                now.toLocalDate().plusDays(1).atStartOfDay()
            );
            userRepository.save(user);
        }

        return user.getDailyTokensRemaining();
    }

    /**
     * Get reset timestamp and remaining tokens
     */
    @Transactional(readOnly = true)
    public TokenStatus getTokenStatus(User user) {
        LocalDateTime now = LocalDateTime.now();
        int remaining = user.getDailyTokensRemaining() != null ? user.getDailyTokensRemaining() : DAILY_TOKEN_LIMIT;
        LocalDateTime resetAt = user.getDailyTokenResetAt();

        if (resetAt == null || now.isAfter(resetAt)) {
            resetAt = now.toLocalDate().plusDays(1).atStartOfDay();
            remaining = DAILY_TOKEN_LIMIT;
        }

        return new TokenStatus(remaining, resetAt, DAILY_TOKEN_LIMIT);
    }

    /**
     * DTO for token status response
     */
    public static class TokenStatus {
        public int remaining;
        public int limit;
        public String resetAt;
        public String resetAtISO;

        public TokenStatus(int remaining, LocalDateTime resetAt, int limit) {
            this.remaining = remaining;
            this.limit = limit;
            this.resetAt = resetAt.toString();
            this.resetAtISO = resetAt.toString();
        }
    }
}
