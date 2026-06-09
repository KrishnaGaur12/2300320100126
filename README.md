# Campus Notification Platform

This repository contains my submission for the Full Stack campus hiring evaluation. It implements a notification platform for students to receive updates regarding Placements, Events, and Results.

## Project Structure

The codebase is divided into three main components:

- **logging_middleware/**: A custom TypeScript logging package. It handles authentication with the evaluation service and is used across the backend to log events.
- **notification_app_be/**: A Fastify-based Node.js backend. It exposes REST API endpoints for fetching notifications and includes a priority algorithm using a min-heap to sort notifications by weight and recency.
- **notification_app_fe/**: A Next.js frontend built with React and Material UI. It displays all notifications and maintains the read/unread state on the client side.

## System Design

The architecture, database schema, scaling tradeoffs, and system design decisions are documented in [notification_system_design.md](./notification_system_design.md).

## Setup Instructions

### Backend
1. Navigate to `notification_app_be/`
2. Run `npm install`
3. Create a `.env` file based on the provided `.env.example`
4. Run `npm run dev` to start the Fastify server on port 3001.

### Frontend
1. Navigate to `notification_app_fe/`
2. Run `npm install`
3. Run `npm run dev` to start the Next.js app on port 3000.

### Priority Script (Stage 6)
To run the standalone priority inbox algorithm script:
```bash
cd notification_app_be
npx ts-node src/priority.ts
```

## Screenshots

*(Note: Replace the placeholder links below with the actual paths to your screenshots once you add them to the repository)*

### Frontend Views
- [All Notifications - Desktop View](./screenshots/fe_all_desktop.png)
- [All Notifications - Mobile View](./screenshots/fe_all_mobile.png)
- [Priority Inbox - Desktop View](./screenshots/fe_priority_desktop.png)
- [Priority Inbox - Mobile View](./screenshots/fe_priority_mobile.png)

### Backend API Responses
- [GET /api/notifications](./screenshots/be_get_all.png)
- [GET /api/notifications?notification_type=Placement](./screenshots/be_get_filtered.png)
- [GET /api/notifications/priority?n=10](./screenshots/be_get_priority.png)
- [Terminal Output: Stage 6 Priority Script](./screenshots/stage6_terminal.png)
