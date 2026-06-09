import { AuthConfig, Level, Package, Stack, LogPayload } from "./types";
import { getAuthToken } from "./auth";

const LOG_URL = "http://4.224.186.213/evaluation-service/logs";

let authConfig: AuthConfig | null = null;

export function initLogger(config: AuthConfig): void {
    authConfig = config;
}

export async function Log(
    stack: Stack,
    level: Level,
    pkg: Package,
    message: string
): Promise<void> {
    if (!authConfig) {
        console.error("[Logger] initLogger() not called. Log dropped:", message);
        return;
    }

    const payload: LogPayload = {
        stack,
        level,
        package: pkg,
        message,
    };

    try {
        const token = await getAuthToken(authConfig);

        const response = await fetch(LOG_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.error(`[Logger] Log API error ${response.status}: ${message}`);
        }
    } catch (error) {
        // Never crash the app due to logging failure
        console.error(`[Logger] Network error while logging: ${error}`);
    }
}