package com.clarity.ehr.security;

import com.clarity.ehr.entity.User;
import com.clarity.ehr.service.TokenBucketService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * Token Bucket Filter
 * Deducts one token per authenticated API request.
 * Resets tokens daily at midnight UTC.
 */
@Component
@RequiredArgsConstructor
public class TokenBucketFilter extends OncePerRequestFilter {

    private final TokenBucketService tokenBucketService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        // Skip auth endpoints — don't consume tokens
        String path = request.getRequestURI();
        if (path.startsWith("/api/auth/") || path.equals("/api/auth")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Get authenticated user
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth != null && auth.getPrincipal() instanceof User) {
            User user = (User) auth.getPrincipal();

            // Try to consume a token
            boolean tokenConsumed = tokenBucketService.consumeToken(user);

            if (!tokenConsumed) {
                // Token limit exceeded
                response.setStatus(HttpServletResponse.SC_TOO_MANY_REQUESTS);
                response.setContentType("application/json");

                TokenBucketService.TokenStatus status = tokenBucketService.getTokenStatus(user);
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Daily token limit exceeded");
                errorResponse.put("message", "You have reached your daily action limit. Please try again tomorrow.");
                errorResponse.put("remaining", status.remaining);
                errorResponse.put("limit", status.limit);
                errorResponse.put("resetsAt", status.resetAtISO);

                response.getWriter().write(toJson(errorResponse));
                return;
            }

            // Add token status to response headers for client visibility
            TokenBucketService.TokenStatus status = tokenBucketService.getTokenStatus(user);
            response.addHeader("X-Token-Remaining", String.valueOf(status.remaining));
            response.addHeader("X-Token-Limit", String.valueOf(status.limit));
            response.addHeader("X-Token-Reset", status.resetAtISO);
        }

        filterChain.doFilter(request, response);
    }

    private String toJson(Map<String, Object> map) {
        StringBuilder sb = new StringBuilder("{");
        map.forEach((key, value) -> {
            if (sb.length() > 1) sb.append(",");
            sb.append("\"").append(key).append("\":");
            if (value instanceof String) {
                sb.append("\"").append(value).append("\"");
            } else {
                sb.append(value);
            }
        });
        sb.append("}");
        return sb.toString();
    }
}
