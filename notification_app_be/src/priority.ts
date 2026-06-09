import dotenv from "dotenv";
dotenv.config();

import { initLogger, Log } from "../../logging_middleware/src";


const AUTH_CONFIG = {
    email: process.env.EMAIL!,
    name: process.env.NAME!,
    rollNo: process.env.ROLL_NO!,
    accessCode: process.env.ACCESS_CODE!,
    clientID: process.env.CLIENT_ID!,
    clientSecret: process.env.CLIENT_SECRET!,
};

const BASE_URL = process.env.BASE_URL!;
// ── types ──────────────────────────────────────────────────────────────────────
type NotificationType = "Placement" | "Result" | "Event";

interface RawNotification {
    ID: string;
    Type: NotificationType;
    Message: string;
    Timestamp: string;
}

interface ScoredNotification extends RawNotification {
    priorityScore: number;
}

// ── priority weights ───────────────────────────────────────────────────────────
const TYPE_WEIGHT: Record<NotificationType, number> = {
    Placement: 100,
    Result: 60,
    Event: 20,
};

// ── score calculation ──────────────────────────────────────────────────────────
function computeScore(notification: RawNotification): number {
    const typeWeight = TYPE_WEIGHT[notification.Type];

    const createdAt = new Date(notification.Timestamp).getTime();
    const now = Date.now();
    const hoursSinceCreated = (now - createdAt) / (1000 * 60 * 60);

    // recency score decays to 0 after 50 hours
    const recencyScore = Math.max(0, 50 - hoursSinceCreated);

    return typeWeight + recencyScore;
}


class MinHeap {
    private heap: ScoredNotification[] = [];
    private capacity: number;

    constructor(capacity: number) {
        this.capacity = capacity;
    }

    private parentIndex(i: number): number {
        return Math.floor((i - 1) / 2);
    }

    private leftChild(i: number): number {
        return 2 * i + 1;
    }

    private rightChild(i: number): number {
        return 2 * i + 2;
    }

    private swap(i: number, j: number): void {
        [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    }

    private bubbleUp(i: number): void {
        while (
            i > 0 &&
            this.heap[i].priorityScore < this.heap[this.parentIndex(i)].priorityScore
        ) {
            this.swap(i, this.parentIndex(i));
            i = this.parentIndex(i);
        }
    }

    private bubbleDown(i: number): void {
        let smallest = i;
        const left = this.leftChild(i);
        const right = this.rightChild(i);

        if (
            left < this.heap.length &&
            this.heap[left].priorityScore < this.heap[smallest].priorityScore
        ) {
            smallest = left;
        }

        if (
            right < this.heap.length &&
            this.heap[right].priorityScore < this.heap[smallest].priorityScore
        ) {
            smallest = right;
        }

        if (smallest !== i) {
            this.swap(i, smallest);
            this.bubbleDown(smallest);
        }
    }

    // returns current minimum score in the heap
    peekMin(): number {
        return this.heap.length > 0 ? this.heap[0].priorityScore : -Infinity;
    }

    size(): number {
        return this.heap.length;
    }

    // push a new notification into the heap
    // if heap is full and new score is lower than minimum, skip it
    push(notification: ScoredNotification): void {
        if (this.heap.length < this.capacity) {
            this.heap.push(notification);
            this.bubbleUp(this.heap.length - 1);
        } else if (notification.priorityScore > this.peekMin()) {
            this.heap[0] = notification;
            this.bubbleDown(0);
        }
    }

    // extract all items sorted by priority descending
    getTopN(): ScoredNotification[] {
        return [...this.heap].sort((a, b) => b.priorityScore - a.priorityScore);
    }
}

// ── auth token ─────────────────────────────────────────────────────────────────
async function getToken(): Promise<string> {
    await Log("backend", "info", "auth", "Requesting auth token from evaluation service");

    const res = await fetch(`${BASE_URL}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(AUTH_CONFIG),
    });

    if (!res.ok) {
        await Log("backend", "fatal", "auth", `Auth request failed with status ${res.status}`);
        throw new Error(`Auth failed: ${res.status}`);
    }

    const data = await res.json();
    await Log("backend", "info", "auth", "Auth token obtained successfully");
    return data.access_token;
}

// ── fetch notifications ────────────────────────────────────────────────────────
async function fetchNotifications(token: string): Promise<RawNotification[]> {
    await Log("backend", "info", "service", "Fetching notifications from evaluation service");

    const res = await fetch(`${BASE_URL}/notifications`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });

    if (!res.ok) {
        await Log("backend", "error", "service", `Failed to fetch notifications: status ${res.status}`);
        throw new Error(`Failed to fetch notifications: ${res.status}`);
    }

    const data = await res.json();
    await Log("backend", "info", "service", `Fetched ${data.notifications.length} notifications successfully`);
    return data.notifications;
}

async function getTopNotifications(n: number = 10): Promise<void> {

    initLogger(AUTH_CONFIG);

    await Log("backend", "info", "utils", `Starting priority inbox — finding top ${n} notifications`);

    try {
        const token = await getToken();
        const notifications = await fetchNotifications(token);

        await Log("backend", "debug", "utils", `Computing priority scores for ${notifications.length} notifications`);

        const heap = new MinHeap(n);

        for (const notification of notifications) {
            const score = computeScore(notification);
            heap.push({ ...notification, priorityScore: score });
        }

        const topN = heap.getTopN();

        await Log("backend", "info", "utils", `Successfully computed top ${topN.length} priority notifications`);

        console.log(`\n${"=".repeat(60)}`);
        console.log(`  TOP ${n} PRIORITY NOTIFICATIONS`);
        console.log(`${"=".repeat(60)}\n`);

        topN.forEach((notification, index) => {
            console.log(`#${index + 1}`);
            console.log(`  ID       : ${notification.ID}`);
            console.log(`  Type     : ${notification.Type}`);
            console.log(`  Message  : ${notification.Message}`);
            console.log(`  Timestamp: ${notification.Timestamp}`);
            console.log(`  Score    : ${notification.priorityScore.toFixed(2)}`);
            console.log();
        });

        console.log(`${"=".repeat(60)}`);
        console.log(`  Score = type weight (Placement=100, Result=60, Event=20)`);
        console.log(`        + recency (max 50, decays over 50 hours)`);
        console.log(`${"=".repeat(60)}\n`);

    } catch (error) {
        await Log("backend", "fatal", "utils", `Priority inbox failed: ${error}`);
        console.error("Error:", error);
        process.exit(1);
    }
}

// run
getTopNotifications(10);