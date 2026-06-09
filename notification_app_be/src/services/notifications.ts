import { Log } from "../../../logging_middleware/src";
import { config } from "../config";

type NotificationType = "Placement" | "Result" | "Event";

export interface Notification {
    ID: string;
    Type: NotificationType;
    Message: string;
    Timestamp: string;
}

export interface ScoredNotification extends Notification {
    priorityScore: number;
}

// token cache
let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

// ── auth ───────────────────────────────────────────────────────────────────────
export async function getToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    if (cachedToken && now < tokenExpiresAt - 30) {
        await Log("backend", "debug", "auth", "Using cached auth token");
        return cachedToken;
    }

    await Log("backend", "info", "auth", "Fetching new auth token from evaluation service");

    const res = await fetch(`${config.baseUrl}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config.authConfig),
    });

    if (!res.ok) {
        await Log("backend", "fatal", "auth", `Auth failed with status ${res.status}`);
        throw new Error(`Auth failed: ${res.status}`);
    }

    const data = await res.json();
    cachedToken = data.access_token;
    tokenExpiresAt = data.expires_in;

    await Log("backend", "info", "auth", "Auth token fetched and cached successfully");
    return cachedToken!;
}

// ── fetch all notifications ────────────────────────────────────────────────────
export async function fetchNotifications(params: {
    page?: number;
    limit?: number;
    notification_type?: string;
}): Promise<Notification[]> {
    await Log("backend", "info", "service", `Fetching notifications with params: ${JSON.stringify(params)}`);

    const token = await getToken();

    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.notification_type) query.set("notification_type", params.notification_type);

    const url = `${config.baseUrl}/notifications${query.toString() ? "?" + query.toString() : ""}`;

    const res = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });

    if (!res.ok) {
        const text = await res.text();

        await Log("backend", "error", "service", `Failed with status ${res.status} and body ${text}`);

        throw new Error(`Failed to fetch notifications: ${res.status}`);
    }

    const data = await res.json();
    await Log("backend", "info", "service", `Successfully fetched ${data.notifications.length} notifications`);
    return data.notifications;
}

// ── priority score ─────────────────────────────────────────────────────────────
const TYPE_WEIGHT: Record<NotificationType, number> = {
    Placement: 100,
    Result: 60,
    Event: 20,
};

function computeScore(notification: Notification): number {
    const typeWeight = TYPE_WEIGHT[notification.Type];
    const createdAt = new Date(notification.Timestamp).getTime();
    const hoursSinceCreated = (Date.now() - createdAt) / (1000 * 60 * 60);
    const recencyScore = Math.max(0, 50 - hoursSinceCreated);
    return typeWeight + recencyScore;
}

// ── min heap ───────────────────────────────────────────────────────────────────
class MinHeap {
    private heap: ScoredNotification[] = [];
    private capacity: number;

    constructor(capacity: number) {
        this.capacity = capacity;
    }

    private parentIndex(i: number) { return Math.floor((i - 1) / 2); }
    private leftChild(i: number) { return 2 * i + 1; }
    private rightChild(i: number) { return 2 * i + 2; }

    private swap(i: number, j: number) {
        [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    }

    private bubbleUp(i: number) {
        while (i > 0 && this.heap[i].priorityScore < this.heap[this.parentIndex(i)].priorityScore) {
            this.swap(i, this.parentIndex(i));
            i = this.parentIndex(i);
        }
    }

    private bubbleDown(i: number) {
        let smallest = i;
        const left = this.leftChild(i);
        const right = this.rightChild(i);
        if (left < this.heap.length && this.heap[left].priorityScore < this.heap[smallest].priorityScore) smallest = left;
        if (right < this.heap.length && this.heap[right].priorityScore < this.heap[smallest].priorityScore) smallest = right;
        if (smallest !== i) { this.swap(i, smallest); this.bubbleDown(smallest); }
    }

    push(notification: ScoredNotification) {
        if (this.heap.length < this.capacity) {
            this.heap.push(notification);
            this.bubbleUp(this.heap.length - 1);
        } else if (notification.priorityScore > this.heap[0].priorityScore) {
            this.heap[0] = notification;
            this.bubbleDown(0);
        }
    }

    getTopN(): ScoredNotification[] {
        return [...this.heap].sort((a, b) => b.priorityScore - a.priorityScore);
    }
}

// ── get priority notifications ─────────────────────────────────────────────────
export async function getPriorityNotifications(n: number): Promise<ScoredNotification[]> {
    await Log("backend", "info", "service", `Computing top ${n} priority notifications`);

    const notifications = await fetchNotifications({});
    const heap = new MinHeap(n);

    for (const notification of notifications) {
        const score = computeScore(notification);
        heap.push({ ...notification, priorityScore: parseFloat(score.toFixed(2)) });
    }

    const result = heap.getTopN();
    await Log("backend", "info", "service", `Returning ${result.length} priority notifications`);
    return result;
}