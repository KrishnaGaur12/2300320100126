"use client";

import { useEffect, useState, useCallback } from "react";
import { Notification } from "../types";
import { getNotifications, getPriorityNotifications } from "../api/notifications";

// persists seen IDs for the entire browser session
const seenIds = new Set<string>();

export function useNotifications(params?: { notification_type?: string }) {
    const type = params?.notification_type;
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getNotifications({ notification_type: type });

            // tag notifications not yet seen as new
            const tagged = data.map((n) => ({
                ...n,
                isNew: !seenIds.has(n.ID),
            }));

            setNotifications(tagged);

            // mark all as seen after render
            data.forEach((n) => seenIds.add(n.ID));
        } catch {
            setError("Failed to load notifications. Is the backend running?");
        } finally {
            setLoading(false);
        }
    }, [type]);

    useEffect(() => {
        let isMounted = true;
        Promise.resolve().then(() => {
            if (isMounted) fetchData();
        });
        return () => { isMounted = false; };
    }, [fetchData]);

    return { notifications, loading, error, refetch: fetchData };
}

export function usePriorityNotifications(n: number) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getPriorityNotifications(n);
            setNotifications(data);
        } catch {
            setError("Failed to load priority notifications. Is the backend running?");
        } finally {
            setLoading(false);
        }
    }, [n]);

    useEffect(() => {
        let isMounted = true;
        Promise.resolve().then(() => {
            if (isMounted) fetchData();
        });
        return () => { isMounted = false; };
    }, [fetchData]);

    return { notifications, loading, error, refetch: fetchData };
}