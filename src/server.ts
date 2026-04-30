import http from 'node:http';
import path from 'node:path';
import express, { type Request, type Response } from 'express';
import { Server } from 'socket.io';
import jose from "node-jose"
import { PUBLIC_KEY } from './utils/cert.js';


export interface CheckboxData {
    index: number;
    checked: boolean;
}

export interface ErrorData {
    data: CheckboxData;
    message: string;
}

export interface ServerToClientEvents {
    "server:checkbox:status": (checkboxes: (boolean | null)[]) => void;
    "server:checkbox:change": (data: CheckboxData) => void;
    "server:error": (error: ErrorData) => void;
}

export interface ClientToServerEvents {
    "client:checkbox:change": (data: CheckboxData) => void;
}

async function main() {
    const app = express();
    app.use(express.json());

    const server = http.createServer(app);
    const PORT = process.env.PORT || 8000;

    app.get('/health', (req: Request, res: Response) => {
        res.json({ health: true });
    });

    // socket logic part

    const CHECKBOX_COUNT = 1000;
    const checkboxes: (boolean | null)[] = new Array(CHECKBOX_COUNT).fill(null);
    const rateLimitingHashMap = new Map<string, number>();
    const io = new Server<ClientToServerEvents, ServerToClientEvents>(server);

    io.on('connection', (socket) => {
        console.log("Socket connected", { id: socket.id });
        
        socket.emit("server:checkbox:status", checkboxes);

        socket.on("client:checkbox:change", (data: CheckboxData) => {
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

    server.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

main().catch(console.error);