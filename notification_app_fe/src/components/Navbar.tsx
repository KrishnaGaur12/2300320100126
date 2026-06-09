"use client";

import { AppBar, Toolbar, Typography, Button, Box, useMediaQuery, useTheme } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import StarIcon from "@mui/icons-material/Star";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
    const pathname = usePathname();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    return (
        <AppBar position="sticky" color="default" elevation={1}>
            <Toolbar sx={{ gap: 2 }}>
                <Typography
                    variant={isMobile ? "body1" : "h6"}
                    sx={{ flexGrow: 1, color: "primary.main", fontWeight: 700 }}
                >
                    CampusNotify
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                        component={Link}
                        href="/"
                        startIcon={<NotificationsIcon />}
                        variant={pathname === "/" ? "contained" : "text"}
                        size={isMobile ? "small" : "medium"}
                    >
                        {isMobile ? "All" : "All Notifications"}
                    </Button>
                    <Button
                        component={Link}
                        href="/priority"
                        startIcon={<StarIcon />}
                        variant={pathname === "/priority" ? "contained" : "text"}
                        size={isMobile ? "small" : "medium"}
                        color="warning"
                    >
                        {isMobile ? "Priority" : "Priority Inbox"}
                    </Button>
                </Box>
            </Toolbar>
        </AppBar>
    );
}