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

    public Location() {}

    public Location(String name, Boolean isMainVenue) {
        this.name = name;
        this.isMainVenue = isMainVenue;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Boolean getIsMainVenue() { return isMainVenue; }
    public void setIsMainVenue(Boolean isMainVenue) { this.isMainVenue = isMainVenue; }
}
