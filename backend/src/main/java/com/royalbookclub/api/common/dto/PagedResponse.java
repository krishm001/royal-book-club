package com.royalbookclub.api.common.dto;

import java.util.List;

/**
 * Standard container for paginated lists, supporting cursor-based or offset mechanisms.
 *
 * @param content List of items on current page
 * @param nextCursor Cursor token to fetch the next page (for Firestore pagination)
 * @param size Page size
 * @param hasMore Whether there are more items to fetch
 * @param <T> Type of content items
 */
public record PagedResponse<T>(
        List<T> content,
        String nextCursor,
        int size,
        boolean hasMore
) {
    public static <T> PagedResponse<T> of(List<T> content, String nextCursor, int size, boolean hasMore) {
        return new PagedResponse<>(content, nextCursor, size, hasMore);
    }
}
