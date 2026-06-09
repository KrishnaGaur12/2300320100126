import { FastifyInstance } from "fastify";
import { Log } from "../../../logging_middleware/src";
import {
    fetchNotifications,
    getPriorityNotifications,
} from "../services/notifications";

export async function notificationRoutes(app: FastifyInstance) {
    // GET /api/notifications
    app.get("/api/notifications", async (request, reply) => {
        await Log("backend", "info", "route", "GET /api/notifications called");

        const { page, limit, notification_type } = request.query as {
            page?: string;
            limit?: string;
            notification_type?: string;
        };

        try {
            const notifications = await fetchNotifications({
                page: page ? parseInt(page) : undefined,
                limit: limit ? parseInt(limit) : undefined,
                notification_type,
            });

            await Log("backend", "info", "handler", `Returning ${notifications.length} notifications`);

            return reply.status(200).send({
                success: true,
                data: { notifications },
            });
        } catch (error) {
            await Log("backend", "error", "handler", `GET /api/notifications failed: ${error}`);
            return reply.status(500).send({
                success: false,
                message: "Failed to fetch notifications",
            });
        }
    });

    // GET /api/notifications/priority?n=10
    app.get("/api/notifications/priority", async (request, reply) => {
        await Log("backend", "info", "route", "GET /api/notifications/priority called");

        const { n } = request.query as { n?: string };
        const topN = n ? parseInt(n) : 10;

        if (isNaN(topN) || topN <= 0) {
            await Log("backend", "warn", "handler", `Invalid n value received: ${n}`);
            return reply.status(400).send({
                success: false,
                message: "n must be a positive number",
            });
        }

        try {
            const notifications = await getPriorityNotifications(topN);

            await Log("backend", "info", "handler", `Returning top ${notifications.length} priority notifications`);

            return reply.status(200).send({
                success: true,
                data: { notifications },
            });
        } catch (error) {
            await Log("backend", "error", "handler", `GET /api/notifications/priority failed: ${error}`);
            return reply.status(500).send({
                success: false,
                message: "Failed to fetch priority notifications",
            });
        }
    });
}