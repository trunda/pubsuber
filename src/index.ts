import * as http from "http";
import * as sio from "socket.io";
import {SocketsManager} from "./sockets";

const server = http.createServer();
const io = sio(server);

server.listen(3000);

const sockets = new SocketsManager();
io.on("connection", (socket: SocketIO.Socket) => sockets.add(socket));
