"use client";

import {
    Container, Typography, Box, Slider, CircularProgress,
    Alert, IconButton, Tooltip, ToggleButton, ToggleButtonGroup, Chip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useState } from "react";
import { usePriorityNotifications } from "../hooks/useNotifications";
import NotificationCard from "./NotificationCard";
import { NotificationType } from "../types";

type Filter = NotificationType | "All";

export default function PriorityPage() {
    const [topN, setTopN] = useState<number>(10);
    const [typeFilter, setTypeFilter] = useState<Filter>("All");

    const { notifications, loading, error, refetch } = usePriorityNotifications(topN);

    const filtered = typeFilter === "All"
        ? notifications
        : notifications.filter((n) => n.Type === typeFilter);

    const handleFilter = (_: React.MouseEvent<HTMLElement>, value: Filter | null) => {
        if (value) setTypeFilter(value);
    };

    return (
        <Container maxWidth="md" sx={{ py: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>Priority Inbox</Typography>
                    <Typography variant="caption" color="text.secondary">
                        Ranked by type importance + recency
                    </Typography>
                </Box>
                <Tooltip title="Refresh">
                    <IconButton onClick={refetch} disabled={loading}>
                        <RefreshIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            <Box sx={{ mb: 3, px: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Show top notifications</Typography>
                    <Chip label={`Top ${topN}`} color="warning" size="small" />
                </Box>
                <Slider
                    value={topN}
                    min={5}
                    max={20}
                    step={5}
                    marks={[
                        { value: 5, label: "5" },
                        { value: 10, label: "10" },
                        { value: 15, label: "15" },
                        { value: 20, label: "20" },
                    ]}
                    onChange={(_, val) => setTopN(val as number)}
                    color="warning"
                />
            </Box>

            <Box sx={{ mb: 2 }}>
                <ToggleButtonGroup value={typeFilter} exclusive onChange={handleFilter} size="small">
                    {(["All", "Placement", "Result", "Event"] as Filter[]).map((f) => (
                        <ToggleButton key={f} value={f}>{f}</ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </Box>

            <Box
                sx={{ mb: 2, p: 1.5, backgroundColor: "grey.50", borderRadius: 2, border: "1px solid", borderColor: "divider" }}
            >
                <Typography variant="caption" color="text.secondary">
                    Score = type weight (Placement: 100, Result: 60, Event: 20) + recency (max 50, decays over 50 hours)
                </Typography>
            </Box>

            {loading && (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                    <CircularProgress color="warning" />
                </Box>
            )}

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {!loading && !error && filtered.length === 0 && (
                <Alert severity="info">No notifications found for this filter.</Alert>
            )}

            {!loading && !error && filtered.map((n, index) => (
                <Box key={n.ID} sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ pt: 2, minWidth: 24, fontWeight: 700 }}>
                        #{index + 1}
                    </Typography>
                    <Box sx={{ flex: 1 }}>
                        <NotificationCard notification={n} showScore />
                    </Box>
                </Box>
            ))}
        </Container>
    );
}