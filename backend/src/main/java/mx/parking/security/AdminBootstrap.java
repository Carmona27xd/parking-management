package mx.parking.security;

import java.nio.charset.StandardCharsets;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminBootstrap implements ApplicationRunner {
    private final JdbcClient db;
    private final PasswordEncoder encoder;
    private final String password;

    public AdminBootstrap(
            JdbcClient db,
            PasswordEncoder encoder,
            @Value("${PARKING_ADMIN_PASSWORD:}") String password) {
        this.db = db;
        this.encoder = encoder;
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (password.isEmpty()) {
            return;
        }

        boolean adminExists = db.sql("""
                SELECT EXISTS (SELECT 1 FROM app_user WHERE role = 'ADMIN')
                """).query(Boolean.class).single();
        if (adminExists) {
            return;
        }

        int bytes = password.getBytes(StandardCharsets.UTF_8).length;
        if (bytes < 12 || bytes > 72) {
            throw new IllegalArgumentException(
                    "PARKING_ADMIN_PASSWORD debe tener entre 12 y 72 bytes UTF-8");
        }

        db.sql("""
                INSERT INTO app_user (username, password_hash, role)
                VALUES ('admin', :hash, 'ADMIN')
                ON CONFLICT (lower(username)) DO NOTHING
                """)
                .param("hash", encoder.encode(password))
                .update();
    }
}