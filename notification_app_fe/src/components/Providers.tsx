"use client";

import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import Navbar from "./Navbar";

const theme = createTheme({
    palette: {
        primary: { main: "#1976d2" },
        warning: { main: "#ed6c02" },
    },
});

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AppRouterCacheProvider>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <Navbar />
                <main>{children}</main>
            </ThemeProvider>
        </AppRouterCacheProvider>
    );
}
