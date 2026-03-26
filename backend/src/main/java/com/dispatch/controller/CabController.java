package com.dispatch.controller;

import com.dispatch.model.Cab;
import com.dispatch.repository.CabRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/cabs")
public class CabController {

    private final CabRepository cabRepository;

    public CabController(CabRepository cabRepository) {
        this.cabRepository = cabRepository;
    }

    @GetMapping
    public ResponseEntity<List<Cab>> getAllCabs() {
        return ResponseEntity.ok(cabRepository.findAll());
    }
}
