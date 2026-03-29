package com.dispatch.model;

import jakarta.persistence.*;

@Entity
@Table(name = "app_settings")
public class AppSetting {

    /** Natural-key, e.g. "admin.phone", "admin.name" */
    @Id
    @Column(name = "setting_key")
    private String key;

    @Column(name = "setting_value", nullable = false)
    private String value;

    public AppSetting() {}

    public AppSetting(String key, String value) {
        this.key = key;
        this.value = value;
    }

    public String getKey()             { return key; }
    public void   setKey(String key)   { this.key = key; }
    public String getValue()           { return value; }
    public void   setValue(String val) { this.value = val; }
}
