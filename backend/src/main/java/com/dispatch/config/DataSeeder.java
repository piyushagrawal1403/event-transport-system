package com.dispatch.config;

import com.dispatch.model.Cab;
import com.dispatch.model.EventItinerary;
import com.dispatch.model.Location;
import com.dispatch.repository.CabRepository;
import com.dispatch.repository.EventItineraryRepository;
import com.dispatch.repository.LocationRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Component
public class DataSeeder implements CommandLineRunner {

    private final LocationRepository locationRepository;
    private final CabRepository cabRepository;
    private final EventItineraryRepository eventRepository;

    public DataSeeder(LocationRepository locationRepository, CabRepository cabRepository, EventItineraryRepository eventRepository) {
        this.locationRepository = locationRepository;
        this.cabRepository = cabRepository;
        this.eventRepository = eventRepository;
    }

    @Override
    public void run(String... args) {
        if (locationRepository.count() > 0) {
            return; // Already seeded
        }

        // Main venue
        locationRepository.save(new Location("Grand Event Center", true));

        // Hotels
        String[] hotels = {
                "Taj West End", "Marriott Downtown", "Hilton Garden Inn",
                "ITC Royal Bengal", "Hyatt Regency", "The Oberoi",
                "Radisson Blu", "JW Marriott", "Le Meridien",
                "Sheraton Grand", "The Leela Palace", "Four Seasons",
                "Novotel City Centre", "Holiday Inn Express", "Crowne Plaza",
                "InterContinental", "Renaissance Hotel", "Westin Garden",
                "Park Hyatt", "Ritz Carlton", "Shangri-La",
                "Mandarin Oriental", "St. Regis", "W Hotel",
                "Fairmont", "Sofitel", "Grand Hyatt",
                "Conrad", "Waldorf Astoria", "Peninsula Hotel"
        };

        for (String hotel : hotels) {
            locationRepository.save(new Location(hotel, false));
        }

        // "Others" escape-hatch — guests fill in a custom destination at booking time
        locationRepository.save(new Location("Others", false));

        // 40 drivers
        String[] driverFirstNames = {
                "Rajesh", "Suresh", "Mahesh", "Dinesh", "Ramesh",
                "Ganesh", "Mukesh", "Naresh", "Kamlesh", "Jitesh",
                "Amit", "Sumit", "Rohit", "Mohit", "Vinit",
                "Ajay", "Vijay", "Sanjay", "Jay", "Ravi",
                "Arun", "Varun", "Kiran", "Praveen", "Naveen",
                "Mohan", "Rohan", "Sohan", "Gopal", "Krishna",
                "Deepak", "Alok", "Ashok", "Santosh", "Prakash",
                "Manoj", "Anuj", "Rahul", "Nikhil", "Vishal"
        };

        for (int i = 1; i <= 40; i++) {
            String plate = String.format("KA-01-AB-%04d", 1000 + i);
            String driverName = driverFirstNames[i - 1] + " Kumar";
            String driverPhone = String.format("98765%05d", 10000 + i);
            cabRepository.save(new Cab(plate, driverName, driverPhone, 4));
        }

        // Sample events
        Location venue = locationRepository.findAll().stream()
                .filter(Location::getIsMainVenue).findFirst().orElse(null);
        if (venue != null) {
            LocalDate today = LocalDate.now();
            LocalDate tomorrow = today.plusDays(1);

            seedEvent("Registration & Welcome Kit", "Pick up your badge and welcome kit", venue, today, LocalTime.of(8, 0), LocalTime.of(10, 0));
            seedEvent("Opening Ceremony", "Keynote address and event kickoff", venue, today, LocalTime.of(10, 0), LocalTime.of(11, 30));
            seedEvent("Networking Lunch", "Buffet lunch and networking session", venue, today, LocalTime.of(12, 0), LocalTime.of(13, 30));
            seedEvent("Panel Discussion: Future of Tech", "Industry leaders share insights", venue, today, LocalTime.of(14, 0), LocalTime.of(15, 30));
            seedEvent("Workshop: Hands-on AI", "Interactive AI/ML workshop", venue, today, LocalTime.of(16, 0), LocalTime.of(17, 30));
            seedEvent("Gala Dinner", "Formal dinner with live entertainment", venue, today, LocalTime.of(19, 0), LocalTime.of(22, 0));

            seedEvent("Breakfast Meetup", "Morning coffee and pastries", venue, tomorrow, LocalTime.of(8, 30), LocalTime.of(9, 30));
            seedEvent("Hackathon Finals", "Top teams present their projects", venue, tomorrow, LocalTime.of(10, 0), LocalTime.of(13, 0));
            seedEvent("Closing Ceremony & Awards", "Award ceremony and closing remarks", venue, tomorrow, LocalTime.of(14, 0), LocalTime.of(16, 0));
        }

        System.out.println("Seeded: 1 venue, 30 hotels, 1 Others location, 40 cabs, 9 events");
    }

    private void seedEvent(String title, String description, Location location, LocalDate date, LocalTime start, LocalTime end) {
        EventItinerary event = new EventItinerary();
        event.setTitle(title);
        event.setDescription(description);
        event.setLocation(location);
        event.setStartTime(LocalDateTime.of(date, start));
        event.setEndTime(LocalDateTime.of(date, end));
        eventRepository.save(event);
    }
}