import dotenv from "dotenv";
dotenv.config();

// central place for all env vars — if anything is missing we catch it early
const requiredEnvVars = [
    "BASE_URL",
    "EMAIL",
    "NAME",
    "ROLL_NO",
    "ACCESS_CODE",
    "CLIENT_ID",
    "CLIENT_SECRET",
];

for (const key of requiredEnvVars) {
    if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
}

export const config = {
    baseUrl: process.env.BASE_URL!,
    port: parseInt(process.env.PORT || "3001"),
    authConfig: {
        email: process.env.EMAIL!,
        name: process.env.NAME!,
        rollNo: process.env.ROLL_NO!,
        accessCode: process.env.ACCESS_CODE!,
        clientID: process.env.CLIENT_ID!,
        clientSecret: process.env.CLIENT_SECRET!,
    },
};