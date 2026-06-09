

import Fastify from "fastify";
import cors from "@fastify/cors";
import { initLogger, Log } from "../../logging_middleware/src";
import { config } from "./config";
import { notificationRoutes } from "./routes/notifications";

// init logger before anything else
initLogger(config.authConfig);

const app = Fastify({ logger: false });

async function start() {
    try {
        // register cors so the Next.js frontend can talk to this
        await app.register(cors, {
            origin: "http://localhost:3000",
            methods: ["GET", "PATCH", "DELETE"],
        });

        await Log("backend", "info", "config", "CORS registered for http://localhost:3000");

        // register routes
        await app.register(notificationRoutes);
        await Log("backend", "info", "route", "Notification routes registered");

        // health check
        app.get("/health", async () => {
            await Log("backend", "debug", "handler", "Health check called");
            return { status: "ok" };
        });

        await app.listen({ port: config.port, host: "0.0.0.0" });
        await Log("backend", "info", "config", `Fastify server running on port ${config.port}`);


    } catch (error) {
        await Log("backend", "fatal", "config", `Server failed to start: ${error}`);

        process.exit(1);
    }
}

start();