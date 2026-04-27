import http from 'node:http'
import path from 'node:path'

import express from 'express'
import { Server } from 'socket.io';


async function main(){

    const app = express()
    app.use(express.json())

    const server = http.createServer(app);
    const PORT = process.env.PORT || 8000;
    app.get('/health', (req, res) => {
        res.json({
            health: true
        });
    });

    const CHECKBOX_COUNT = 1000;
    const checkboxes = new Array(CHECKBOX_COUNT).fill(null);
    const rateLimitingHashMap = new Map();

    const io = new Server()
    io.attach(server)

    io.on('connection', (socket) => {
        console.log("Socket connected", { id: socket.id });
        socket.emit("server:checkbox:status", checkboxes);

        socket.on("client:checkbox:change", (data) => {
            console.log(`Received checkbox change from client: ${socket.id}, Data:`, data);
            let lastOperationTime = rateLimitingHashMap.get(socket.id);
            if (lastOperationTime) {
                if (lastOperationTime + 2000 > Date.now()) {
                    socket.emit("server:error", { data, message: "You are doing that too much. Please wait a moment before trying again." });
                    return;
                }
                else {
                    rateLimitingHashMap.set(socket.id, Date.now());
                }
            }
            else {
                rateLimitingHashMap.set(socket.id, Date.now());
            }
            checkboxes[data.index] = data.checked;
            io.emit("server:checkbox:change", data);
        })
    })

    app.use(express.static(path.resolve('./public')))

    server.listen(PORT, () => {
        console.log(`server is running on http://localhost:${PORT}`);
    })
}

main()