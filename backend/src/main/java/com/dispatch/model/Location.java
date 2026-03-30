package com.dispatch.model;

import jakarta.persistence.*;

@Entity
@Table(name = "locations")
public class Location {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Boolean isMainVenue = false;

    @Column
    private Double distanceFromMainVenue = 0.0;

    public Location() {}

    public Location(String name, Boolean isMainVenue) {
        this.name = name;
        this.isMainVenue = isMainVenue;
        this.distanceFromMainVenue = 0.0;
    }

    public Location(String name, Boolean isMainVenue, Double distanceFromMainVenue) {
        this.name = name;
        this.isMainVenue = isMainVenue;
        this.distanceFromMainVenue = distanceFromMainVenue == null ? 0.0 : Math.max(0.0, distanceFromMainVenue);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Boolean getIsMainVenue() { return isMainVenue; }
    public void setIsMainVenue(Boolean isMainVenue) { this.isMainVenue = isMainVenue; }

    public Double getDistanceFromMainVenue() { return distanceFromMainVenue; }
    public void setDistanceFromMainVenue(Double distanceFromMainVenue) {
        this.distanceFromMainVenue = distanceFromMainVenue == null ? 0.0 : Math.max(0.0, distanceFromMainVenue);
    }
}
