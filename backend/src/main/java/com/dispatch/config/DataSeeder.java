package com.dispatch.config;

import com.dispatch.model.Cab;
import com.dispatch.model.Location;
import com.dispatch.repository.CabRepository;
import com.dispatch.repository.LocationRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private final LocationRepository locationRepository;
    private final CabRepository cabRepository;

    public DataSeeder(LocationRepository locationRepository, CabRepository cabRepository) {
        this.locationRepository = locationRepository;
        this.cabRepository = cabRepository;
    }

    @Override
    public void run(String... args) {
        if (locationRepository.count() > 0) {
            return; // Already seeded
        }

        // Seed the main venue
        locationRepository.save(new Location("Grand Event Center", true));

        // Seed 30 hotels
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

        // Seed 40 cabs
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

        System.out.println("Seeded: 1 venue, 30 hotels, 40 cabs");
    }
}
