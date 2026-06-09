export type NotificationType = "Placement" | "Result" | "Event";

export interface Notification {
    ID: string;
    Type: NotificationType;
    Message: string;
    Timestamp: string;
    priorityScore?: number;
    isNew?: boolean;
}

export interface NotificationsResponse {
    success: boolean;
    data: {
        notifications: Notification[];
    };
}