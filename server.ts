import { createServer } from "node:http";
import path from "node:path";
import express from "express";
import next from "next";
import { Server } from "socket.io";
import {
  createRoom,
  getRoomCodes,
  getRoomForPlayer,
  handleBid,
  handleDisconnect,
  handleJoin,
  handleNextRound,
  handlePlayCard,
  handleStartGame,
  publicStateFor
} from "./src/server/game";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number(process.env.PORT || 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function main() {
  await app.prepare();

  const expressApp = express();
  const server = createServer(expressApp);
  const io = new Server(server, {
    cors: {
      origin: true,
      credentials: true
    }
  });

  expressApp.use("/cards", express.static(path.join(process.cwd(), "cards")));

  expressApp.use((req, res) => {
    return handle(req, res);
  });

  const emitRoom = (roomCode: string) => {
    const room = getRoomCodes().includes(roomCode) ? roomCode : undefined;
    if (!room) return;

    for (const socket of io.sockets.sockets.values()) {
      const playerRoom = getRoomForPlayer(socket.id);
      if (playerRoom === roomCode) {
        socket.emit("state", publicStateFor(roomCode, socket.id));
      }
    }
  };

  io.on("connection", (socket) => {
    socket.on("createRoom", (payload, ack) => {
      const result = createRoom(socket.id, payload);
      ack?.(result);
      if (result.ok) emitRoom(result.roomCode);
    });

    socket.on("joinRoom", (payload, ack) => {
      const result = handleJoin(socket.id, payload);
      ack?.(result);
      if (result.ok) emitRoom(result.roomCode);
    });

    socket.on("startGame", (payload, ack) => {
      const result = handleStartGame(socket.id, payload);
      ack?.(result);
      if (result.ok) emitRoom(result.roomCode);
    });

    socket.on("placeBid", (payload, ack) => {
      const result = handleBid(socket.id, payload);
      ack?.(result);
      if (result.ok) emitRoom(result.roomCode);
    });

    socket.on("playCard", (payload, ack) => {
      const result = handlePlayCard(socket.id, payload);
      ack?.(result);
      if (result.ok) emitRoom(result.roomCode);
    });

    socket.on("nextRound", (payload, ack) => {
      const result = handleNextRound(socket.id, payload);
      ack?.(result);
      if (result.ok) emitRoom(result.roomCode);
    });

    socket.on("disconnect", () => {
      const roomCode = handleDisconnect(socket.id);
      if (roomCode) emitRoom(roomCode);
    });
  });

  server.listen(port, hostname, () => {
    console.log(`Romanian Whist is running at http://localhost:${port}`);
    console.log(`Phones should open http://<this-computer-lan-ip>:${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
