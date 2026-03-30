package com.dispatch.config;

import com.dispatch.model.AppSetting;
import com.dispatch.model.Cab;
import com.dispatch.model.EventItinerary;
import com.dispatch.model.Location;
import com.dispatch.repository.AppSettingRepository;
import com.dispatch.repository.CabRepository;
import com.dispatch.repository.EventItineraryRepository;
import com.dispatch.repository.LocationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final LocationRepository locationRepository;
    private final CabRepository cabRepository;
    private final EventItineraryRepository eventRepository;
    private final AppSettingRepository settingRepository;
    private final String defaultEventImageUrl;

    public DataSeeder(LocationRepository locationRepository,
                      CabRepository cabRepository,
                      EventItineraryRepository eventRepository,
                      AppSettingRepository settingRepository,
                      @Value("${app.events.default-image-url:/images/default-event.svg}") String defaultEventImageUrl) {
        this.locationRepository = locationRepository;
        this.cabRepository = cabRepository;
        this.eventRepository = eventRepository;
        this.settingRepository = settingRepository;
        this.defaultEventImageUrl = defaultEventImageUrl;
    }

    @Override
    public void run(String... args) {
        // Seed admin settings with defaults if not already set
        settingRepository.findById("admin.phone")
                .orElseGet(() -> settingRepository.save(new AppSetting("admin.phone", "+91-9900000000")));
        settingRepository.findById("admin.name")
                .orElseGet(() -> settingRepository.save(new AppSetting("admin.name", "Event Admin")));

        if (locationRepository.count() > 0) {
            return; // Locations/cabs/events already seeded
        }

        // Main venue
        locationRepository.save(new Location("Grand Event Center", true, 0.0));

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

        for (int i = 0; i < hotels.length; i++) {
            // Seed realistic one-way distances in km from the main venue.
            double distanceKm = 2.0 + ((i % 10) * 0.8);
            locationRepository.save(new Location(hotels[i], false, distanceKm));
        }

        // "Others" escape-hatch — guests fill in a custom destination at booking time
        locationRepository.save(new Location("Others", false, 0.0));

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

            seedEvent("Registration & Welcome Kit", "Pick up your badge and welcome kit", defaultEventImageUrl, venue, today, LocalTime.of(8, 0), LocalTime.of(10, 0));
            seedEvent("Opening Ceremony", "Keynote address and event kickoff", defaultEventImageUrl, venue, today, LocalTime.of(10, 0), LocalTime.of(11, 30));
            seedEvent("Networking Lunch", "Buffet lunch and networking session", defaultEventImageUrl, venue, today, LocalTime.of(12, 0), LocalTime.of(13, 30));
            seedEvent("Panel Discussion: Future of Tech", "Industry leaders share insights", defaultEventImageUrl, venue, today, LocalTime.of(14, 0), LocalTime.of(15, 30));
            seedEvent("Workshop: Hands-on AI", "Interactive AI/ML workshop", defaultEventImageUrl, venue, today, LocalTime.of(16, 0), LocalTime.of(17, 30));
            seedEvent("Gala Dinner", "Formal dinner with live entertainment", defaultEventImageUrl, venue, today, LocalTime.of(19, 0), LocalTime.of(22, 0));

            seedEvent("Breakfast Meetup", "Morning coffee and pastries", defaultEventImageUrl, venue, tomorrow, LocalTime.of(8, 30), LocalTime.of(9, 30));
            seedEvent("Hackathon Finals", "Top teams present their projects", defaultEventImageUrl, venue, tomorrow, LocalTime.of(10, 0), LocalTime.of(13, 0));
            seedEvent("Closing Ceremony & Awards", "Award ceremony and closing remarks", defaultEventImageUrl, venue, tomorrow, LocalTime.of(14, 0), LocalTime.of(16, 0));
        }

        log.info("action=seed_complete venues=1 hotels=30 others=1 cabs=40 events=9");
        log.info("action=seed_admin_config note='Admin settings editable from dashboard settings panel'");
    }

    private void seedEvent(String title, String description, String imageUrl, Location location, LocalDate date, LocalTime start, LocalTime end) {
        EventItinerary event = new EventItinerary();
        event.setTitle(title);
        event.setDescription(description);
        event.setImageUrl(imageUrl);
        event.setLocation(location);
        event.setStartTime(LocalDateTime.of(date, start));
        event.setEndTime(LocalDateTime.of(date, end));
        eventRepository.save(event);
    }
}