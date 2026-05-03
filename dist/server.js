import http from 'node:http';
import path from 'node:path';
import express, {} from 'express';
import { Server } from 'socket.io';
import jose from "node-jose";
import { PUBLIC_KEY } from './utils/cert.js';
import authRouter from './auth/auth.routes.js';
import JWT from 'jsonwebtoken';
import { usersTable } from './db/schema.js';
import { eq } from 'drizzle-orm';
import { db } from './db/index.js';
async function main() {
    const app = express();
    app.use(express.json());
    const server = http.createServer(app);
    const PORT = process.env.PORT || 8181;
    app.get('/health', (req, res) => {
        res.json({ health: true });
    });
    // socket logic part
    const CHECKBOX_COUNT = 1000;
    const checkboxes = new Array(CHECKBOX_COUNT).fill(null);
    const rateLimitingHashMap = new Map();
    const io = new Server(server);
    io.use((socket, next) => {
        let token = socket.handshake.auth.token;
        if (!token && socket.handshake.headers.cookie) {
            const match = socket.handshake.headers.cookie.match(new RegExp('(^| )token=([^;]+)'));
            if (match)
                token = match[2];
        }
        if (!token) {
            return next(new Error("Authentication error: No token provided"));
        }
        try {
            const decoded = JWT.verify(token, PUBLIC_KEY, { algorithms: ["RS256"] });
            socket.user = decoded;
            next();
        }
        catch (err) {
            return next(new Error("Authentication error: Invalid or expired token"));
        }
    });
    io.on('connection', (socket) => {
        console.log("Socket connected", { id: socket.id });
        socket.emit("server:checkbox:status", checkboxes);
        socket.on("client:checkbox:change", (data) => {
            console.log(`Received checkbox change from client: ${socket.id}, Data:`, data);
            let lastOperationTime = rateLimitingHashMap.get(socket.id);
            if (lastOperationTime && (lastOperationTime + 2000 > Date.now())) {
                socket.emit("server:error", {
                    data,
                    message: "You are doing that too much. Please wait a moment before trying again."
                });
                return;
            }
            rateLimitingHashMap.set(socket.id, Date.now());
            checkboxes[data.index] = data.checked;
            io.emit("server:checkbox:change", data);
        });
    });
    app.use(express.static(path.resolve('./public')));
    // oidc-auth part
    app.get("/.well-known/openid-configuration", (req, res) => {
        const ISSUER = `http://localhost:${PORT}`;
        return res.json({
            issuer: ISSUER,
            authorization_endpoint: `${ISSUER}/o/authenticate`,
            userinfo_endpoint: `${ISSUER}/o/userinfo`,
            jwks_uri: `${ISSUER}/.well-known/jwks.json`,
        });
    });
    app.get("/.well-known/jwks.json", async (_, res) => {
        const key = await jose.JWK.asKey(PUBLIC_KEY, "pem");
        return res.json({ keys: [key.toJSON()] });
    });
    app.use("/o/auth", authRouter);
    app.get("/o/userinfo", async (req, res) => {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) {
            res
                .status(401)
                .json({ message: "Missing or invalid Authorization header." });
            return;
        }
        const token = authHeader.slice(7);
        let claims;
        try {
            claims = JWT.verify(token, PUBLIC_KEY, {
                algorithms: ["RS256"],
            });
        }
        catch {
            res.status(401).json({ message: "Invalid or expired token." });
            return;
        }
        const [user] = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, claims.sub))
            .limit(1);
        if (!user) {
            res.status(404).json({ message: "User not found." });
            return;
        }
        res.json({
            sub: user.id,
            email: user.email,
            email_verified: user.emailVerified,
            given_name: user.name,
            name: user.name,
            picture: user.profileImageURL,
        });
    });
    server.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}
main().catch(console.error);
//# sourceMappingURL=server.js.map