import type { Metadata } from "next";
import Providers from "../components/Providers";

export const metadata: Metadata = {
    title: "CampusNotify",
    description: "Campus notification platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}