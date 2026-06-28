package com.royalbookclub.api.stats.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.AggregateQuerySnapshot;
import com.google.cloud.firestore.Firestore;
import com.royalbookclub.api.stats.dto.StatsSummaryDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.concurrent.ExecutionException;

/**
 * Service to aggregate various platform statistics in real-time.
 */
@Service
public class StatsService {

    private static final Logger log = LoggerFactory.getLogger(StatsService.class);

    private final Firestore firestore;

    public StatsService(Firestore firestore) {
        this.firestore = firestore;
    }

    /**
     * Aggregates real-time count metrics from several Firestore collections.
     * Utilizes native .count() aggregation query for maximum efficiency.
     */
    public StatsSummaryDto getStatsSummary() {
        log.debug("Aggregating live database stats summary");
        try {
            // Count registered users
            ApiFuture<AggregateQuerySnapshot> usersFuture = firestore.collection("users").count().get();
            long membersCount = usersFuture.get().getCount();

            // Count total books (literary tomes)
            ApiFuture<AggregateQuerySnapshot> booksFuture = firestore.collection("books").count().get();
            long booksCount = booksFuture.get().getCount();

            // Count active checkouts: status must be CHECKED_OUT or REQUESTED_RETURN
            ApiFuture<AggregateQuerySnapshot> checkedOutFuture = firestore.collection("checkouts")
                    .whereEqualTo("status", "CHECKED_OUT")
                    .count().get();
            ApiFuture<AggregateQuerySnapshot> requestedReturnFuture = firestore.collection("checkouts")
                    .whereEqualTo("status", "REQUESTED_RETURN")
                    .count().get();

            long checkedOutCount = checkedOutFuture.get().getCount();
            long requestedReturnCount = requestedReturnFuture.get().getCount();
            long activeCheckoutsCount = checkedOutCount + requestedReturnCount;

            // Count upcoming salons (gatherings/events): date is >= today
            String today = LocalDate.now().toString(); // "YYYY-MM-DD"
            ApiFuture<AggregateQuerySnapshot> eventsFuture = firestore.collection("events")
                    .whereGreaterThanOrEqualTo("date", today)
                    .count().get();
            long upcomingSalonsCount = eventsFuture.get().getCount();

            log.debug("Stats retrieved: members={}, books={}, activeCheckouts={}, upcomingEvents={}",
                    membersCount, booksCount, activeCheckoutsCount, upcomingSalonsCount);

            return StatsSummaryDto.builder()
                    .membersCount(membersCount)
                    .booksCount(booksCount)
                    .activeCheckoutsCount(activeCheckoutsCount)
                    .upcomingSalonsCount(upcomingSalonsCount)
                    .build();

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Interrupted while collecting platform statistics", e);
            throw new RuntimeException("Failed to aggregate platform statistics", e);
        } catch (ExecutionException e) {
            log.error("Failed to execute Firestore aggregation query", e);
            throw new RuntimeException("Failed to aggregate platform statistics", e);
        }
    }
}
