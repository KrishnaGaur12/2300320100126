"use client";

import { Card, CardContent, Chip, Typography, Box } from "@mui/material";
import WorkIcon from "@mui/icons-material/Work";
import EventIcon from "@mui/icons-material/Event";
import SchoolIcon from "@mui/icons-material/School";
import FiberNewIcon from "@mui/icons-material/FiberNew";
import { Notification } from "../types";

interface Props {
    notification: Notification;
    showScore?: boolean;
}

const typeConfig = {
    Placement: { color: "success" as const, icon: <WorkIcon fontSize="small" /> },
    Result: { color: "primary" as const, icon: <SchoolIcon fontSize="small" /> },
    Event: { color: "warning" as const, icon: <EventIcon fontSize="small" /> },
};

function formatTime(timestamp: string): string {
    return new Date(timestamp).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function NotificationCard({ notification, showScore = false }: Props) {
    const { color, icon } = typeConfig[notification.Type];

    return (
        <Card
            elevation={0}
            sx={{
                border: "1px solid",
                borderColor: notification.isNew ? "primary.main" : "divider",
                borderRadius: 2,
                mb: 1.5,
                transition: "box-shadow 0.2s",
                "&:hover": { boxShadow: 3 },
                backgroundColor: notification.isNew ? "#f0f7ff" : "background.paper",
            }}
        >
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                        <Chip icon={icon} label={notification.Type} color={color} size="small" variant="outlined" />
                        {notification.isNew && (
                            <Chip icon={<FiberNewIcon fontSize="small" />} label="New" color="primary" size="small" />
                        )}
                    </Box>
                    {showScore && notification.priorityScore !== undefined && (
                        <Chip
                            label={`Score: ${notification.priorityScore.toFixed(1)}`}
                            size="small"
                            color="secondary"
                            variant="outlined"
                        />
                    )}
                </Box>

                <Typography variant="body1" sx={{ mt: 1, fontWeight: 500, textTransform: "capitalize" }}>
                    {notification.Message}
                </Typography>

                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                    {formatTime(notification.Timestamp)}
                </Typography>
            </CardContent>
        </Card>
    );
}