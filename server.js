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

    const io = new Server
}