package mx.parking;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ParkingService {
    private final JdbcClient db;

    ParkingService(JdbcClient db) {
        this.db = db;
    }

    public record Config(int capacity, BigDecimal hourlyRate) {}

    public record Stay(long id, String plate, OffsetDateTime enteredAt, OffsetDateTime exitedAt,
                       BigDecimal hourlyRate, BigDecimal amount) {}

    public record Dashboard(int capacity, BigDecimal hourlyRate, List<Stay> active, List<Stay> recent) {}

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Dashboard dashboard() {
        Config config = db.sql("SELECT capacity, hourly_rate FROM parking_config WHERE id")
                .query(Config.class).single();
        List<Stay> active = db.sql("SELECT * FROM stay WHERE exited_at IS NULL ORDER BY entered_at DESC, id DESC")
                .query(Stay.class).list();
        List<Stay> recent = db.sql("SELECT * FROM stay WHERE exited_at IS NOT NULL ORDER BY exited_at DESC, id DESC LIMIT 20")
                .query(Stay.class).list();
        return new Dashboard(config.capacity(), config.hourlyRate(), active, recent);
    }

    @Transactional
    public Stay enter(String input) {
        String plate = normalize(input);
        // Serialize admissions so simultaneous arrivals cannot exceed capacity.
        Config config = db.sql("SELECT capacity, hourly_rate FROM parking_config WHERE id FOR UPDATE")
                .query(Config.class).single();
        boolean alreadyInside = db.sql("SELECT EXISTS (SELECT 1 FROM stay WHERE plate = :plate AND exited_at IS NULL)")
                .param("plate", plate).query(Boolean.class).single();
        if (alreadyInside) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "La placa ya tiene una estancia abierta.");
        }
        long occupied = db.sql("SELECT count(*) FROM stay WHERE exited_at IS NULL").query(Long.class).single();
        if (occupied >= config.capacity()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El estacionamiento está lleno.");
        }
        return db.sql("""
                INSERT INTO stay (plate, entered_at, hourly_rate)
                VALUES (:plate, :enteredAt, :rate) RETURNING *
                """)
                .param("plate", plate).param("enteredAt", now())
                .param("rate", config.hourlyRate()).query(Stay.class).single();
    }

    @Transactional
    public Stay exit(long id) {
        Stay stay = db.sql("SELECT * FROM stay WHERE id = :id FOR UPDATE")
                .param("id", id).query(Stay.class).optional()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Estancia inexistente."));
        if (stay.exitedAt() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Esta salida ya fue registrada.");
        }

        OffsetDateTime now = now();
        OffsetDateTime exitTime = now.isBefore(stay.enteredAt()) ? stay.enteredAt() : now;
        BigDecimal amount = stay.hourlyRate().multiply(BigDecimal.valueOf(
                billedHours(Duration.between(stay.enteredAt(), exitTime))));
        return db.sql("UPDATE stay SET exited_at = :exitTime, amount = :amount WHERE id = :id RETURNING *")
                .param("exitTime", exitTime).param("amount", amount).param("id", id)
                .query(Stay.class).single();
    }

    private static long billedHours(Duration duration) {
        long fullHours = duration.toHours();
        long partialHour = duration.minusHours(fullHours).isZero() ? 0 : 1;
        return Math.max(1, fullHours + partialHour);
    }

    private static OffsetDateTime now() {
        return OffsetDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.MICROS);
    }

    private static String normalize(String input) {
        if (input == null || !input.strip().matches("[A-Za-z0-9 -]{3,20}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ingresa una placa de 3 a 10 letras o números.");
        }
        String plate = input.strip().replace(" ", "").replace("-", "").toUpperCase(Locale.ROOT);
        if (plate.length() < 3 || plate.length() > 10) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ingresa una placa de 3 a 10 letras o números.");
        }
        return plate;
    }
}
