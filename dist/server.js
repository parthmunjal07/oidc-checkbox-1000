import http from 'node:http';
import path from 'node:path';
import express, {} from 'express';
import { Server } from 'socket.io';
async function main() {
    const app = express();
    app.use(express.json());
    const server = http.createServer(app);
    const PORT = process.env.PORT || 8000;
    app.get('/health', (req, res) => {
        res.json({ health: true });
    });
    const CHECKBOX_COUNT = 1000;
    const checkboxes = new Array(CHECKBOX_COUNT).fill(null);
    const rateLimitingHashMap = new Map();
    const io = new Server(server);
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
    server.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}
main().catch(console.error);
//# sourceMappingURL=server.js.map