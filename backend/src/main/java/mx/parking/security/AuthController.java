package mx.parking.security;

import java.util.List;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    public record CsrfResponse(String headerName, String token) {}
    public record SessionUser(String username, List<String> roles) {}

    @GetMapping("/csrf")
    ResponseEntity<CsrfResponse> csrf(CsrfToken csrf) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(new CsrfResponse(csrf.getHeaderName(), csrf.getToken()));
    }

    @GetMapping("/me")
    ResponseEntity<SessionUser> me(Authentication authentication) {
        List<String> roles = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .map(authority -> authority.replaceFirst("^ROLE_", ""))
                .toList();

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(new SessionUser(authentication.getName(), roles));
    }
}