import {Socket} from "../sockets/index";
import * as _ from "lodash";
import {log} from "../util";

export class Channel {

    private nameHolder: string;

    private socketsHolder: any = {};

    constructor(name: string) {
        this.nameHolder = name;
    }

    /**
     * Add socket to the channel
     *
     * @param {Socket} socket
     * @return {Promise<[Channel, any]>}
     */
    public subscribe(socket: Socket, options: any): Promise<Channel> {
        log.debug("socket %s is going to subscribes to %s.", socket.id, this.name);
        this.socketsHolder[socket.id] = socket;
        return Promise.resolve(this);
    }

    /**
     * Remove socket from channel
     *
     * @param {Socket} socket
     * @returns {Promise<Channel>}
     */
    public unsubscribe(socket: Socket, options: any): Promise<Channel> {
        log.debug("socket %s is going to unsubscribes from %s", socket.id, this.name);
        delete this.socketsHolder[socket.id];
        return Promise.resolve(this);
    }

    /**
     * Is socket subscribed to this channel?
     *
     * @param {Socket} socket
     * @returns {boolean}
     */
    public isSubscribed(socket: Socket): boolean {
        return _.find(this.members, (s: Socket) => socket.id === s.id) !== undefined;
    }

    public emit(event: string, ...data: any[]): void {
        this.members.forEach((s: Socket) => s.emit(event, ...data));
    }

    public broadcast(socket: Socket, event: string, ...data: any[]): void {
        log.log("silly", "Broadcasting to %d members (%s)", this.membersExcept(socket).length, event);
        this.membersExcept(socket).forEach((s: Socket) => s.emit(event, ...data));
    }

    protected membersExcept(socket: Socket): Socket[] {
        return _.filter(this.members, (s: Socket) => s.id !== socket.id);
    }

    /**
     * All sockets subscribed to the channel
     *
     * @returns {Socket[]}
     */
    get members(): Socket[] {
        return _.values<Socket>(this.socketsHolder);
    }

    get name(): string {
        return this.nameHolder;
    }

    private get io(): SocketIO.Server {
        if (this.members.length > 0) {
            return this.members[0].iosocket.server;
        }
    }
}
