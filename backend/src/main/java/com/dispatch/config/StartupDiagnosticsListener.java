package com.dispatch.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Logs a clear marker when the Spring application context is fully initialized
 * and the app is ready to serve traffic.
 *
 * <p>This listener is active only in the {@code prod} profile and is intended
 * as a temporary diagnostic aid to confirm whether the startup hang occurs
 * before or after the context finishes loading. Remove once the root cause is
 * identified and resolved.
 */
@Component
@Profile("prod")
public class StartupDiagnosticsListener {

    private static final Logger log = LoggerFactory.getLogger(StartupDiagnosticsListener.class);

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady(ApplicationReadyEvent event) {
        log.info("action=application_ready status=startup_complete "
                + "message='ApplicationReadyEvent fired — Spring context fully initialized and Tomcat is serving requests'");
    }
}
