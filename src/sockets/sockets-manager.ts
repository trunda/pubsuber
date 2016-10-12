import { Socket } from "./socket";
import { log } from "../util";
import {ChannelManager} from "../channels";

export class SocketsManager {
    public channels: ChannelManager;
    private sockets: Socket[] = [];

    constructor(channels: ChannelManager = new ChannelManager()) {
        this.channels = channels;
    }

    public add(socket: SocketIO.Socket): Socket {
        const socketInstance = new Socket(socket, this.channels)
            .on("disconnect", () => this.remove(socketInstance));
        this.sockets.push(socketInstance);

        log.debug("new connection " + socketInstance.id);
        return socketInstance;
    }

    protected remove(socket: Socket) {
        socket.close();
        this.sockets = this.sockets.filter((s: Socket) => s.id !== socket.id);

        log.debug("disconnected " + socket.id);
    }

    public close(reason: string = "Server is shutting down."): Promise<void> {
        return Promise.all(this.sockets.map((socket: Socket) => socket.close(reason)));
    }

    get count(): number {
        return this.sockets.length;
    }
}
