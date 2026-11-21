package mx.parking;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/parking")
public class ParkingController {
    private final ParkingService parking;

    ParkingController(ParkingService parking) {
        this.parking = parking;
    }

    record Entry(String plate) {}

    @GetMapping
    ParkingService.Dashboard dashboard() {
        return parking.dashboard();
    }

    @PostMapping("/stays")
    @ResponseStatus(HttpStatus.CREATED)
    ParkingService.Stay enter(@RequestBody Entry entry) {
        return parking.enter(entry.plate());
    }

    @PostMapping("/stays/{id}/exit")
    ParkingService.Stay exit(@PathVariable long id) {
        return parking.exit(id);
    }

    @ExceptionHandler(ResponseStatusException.class)
    ProblemDetail businessError(ResponseStatusException failure) {
        return failure.getBody();
    }
}
