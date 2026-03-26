package com.dispatch.model;

import jakarta.persistence.*;

@Entity
@Table(name = "cabs")
public class Cab {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String licensePlate;

    @Column(nullable = false)
    private String driverName;

    @Column(nullable = false)
    private String driverPhone;

    @Column(nullable = false)
    private Integer capacity = 4;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CabStatus status = CabStatus.AVAILABLE;

    public Cab() {}

    public Cab(String licensePlate, String driverName, String driverPhone, Integer capacity) {
        this.licensePlate = licensePlate;
        this.driverName = driverName;
        this.driverPhone = driverPhone;
        this.capacity = capacity;
        this.status = CabStatus.AVAILABLE;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getLicensePlate() { return licensePlate; }
    public void setLicensePlate(String licensePlate) { this.licensePlate = licensePlate; }

    public String getDriverName() { return driverName; }
    public void setDriverName(String driverName) { this.driverName = driverName; }

    public String getDriverPhone() { return driverPhone; }
    public void setDriverPhone(String driverPhone) { this.driverPhone = driverPhone; }

    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }

    public CabStatus getStatus() { return status; }
    public void setStatus(CabStatus status) { this.status = status; }
}
