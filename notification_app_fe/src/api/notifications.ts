import { Notification, NotificationsResponse } from "../types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function getNotifications(params?: {
    page?: number;
    limit?: number;
    notification_type?: string;
}): Promise<Notification[]> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.notification_type) query.set("notification_type", params.notification_type);

    const url = `${BASE_URL}/api/notifications${query.toString() ? "?" + query.toString() : ""}`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch notifications: ${res.status}`);

    const data: NotificationsResponse = await res.json();
    return data.data.notifications;
}

export async function getPriorityNotifications(n: number = 10): Promise<Notification[]> {
    const res = await fetch(`${BASE_URL}/api/notifications/priority?n=${n}`, {
        cache: "no-store",
    });
    if (!res.ok) throw new Error(`Failed to fetch priority notifications: ${res.status}`);

    const data: NotificationsResponse = await res.json();
    return data.data.notifications;
}