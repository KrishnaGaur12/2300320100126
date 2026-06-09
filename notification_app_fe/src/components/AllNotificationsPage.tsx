"use client";

import {
    Container, Typography, Box, ToggleButton, ToggleButtonGroup,
    CircularProgress, Alert, IconButton, Tooltip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useState } from "react";
import { useNotifications } from "../hooks/useNotifications";
import NotificationCard from "./NotificationCard";
import { NotificationType } from "../types";

type Filter = NotificationType | "All";

export default function AllNotificationsPage() {
    const [filter, setFilter] = useState<Filter>("All");

    const { notifications, loading, error, refetch } = useNotifications({
        notification_type: filter === "All" ? undefined : filter,
    });

    const handleFilter = (_: React.MouseEvent<HTMLElement>, value: Filter | null) => {
        if (value) setFilter(value);
    };

    const newCount = notifications.filter((n) => n.isNew).length;

    return (
        <Container maxWidth="md" sx={{ py: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>Notifications</Typography>
                    {newCount > 0 && (
                        <Typography variant="caption" color="primary.main">
                            {newCount} new since last visit
                        </Typography>
                    )}
                </Box>
                <Tooltip title="Refresh">
                    <IconButton onClick={refetch} disabled={loading}>
                        <RefreshIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            <Box sx={{ mb: 2 }}>
                <ToggleButtonGroup value={filter} exclusive onChange={handleFilter} size="small">
                    {(["All", "Placement", "Result", "Event"] as Filter[]).map((f) => (
                        <ToggleButton key={f} value={f}>{f}</ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </Box>

            {loading && (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                    <CircularProgress />
                </Box>
            )}

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {!loading && !error && notifications.length === 0 && (
                <Alert severity="info">No notifications found.</Alert>
            )}

            {!loading && !error && notifications.map((n) => (
                <NotificationCard key={n.ID} notification={n} />
            ))}
        </Container>
    );
}