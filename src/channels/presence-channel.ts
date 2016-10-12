import {Channel, PrivateChannel} from "./";
import {Socket} from "../sockets";
import * as _ from "lodash";

export class PresenceChannel extends PrivateChannel {
    /**
     * Storage for user data received from HTTP auth calls
     * @type {{}}
     */
    protected membersDataHolder: any = {};

    /**
     * What object key identifies uniqueness of member data
     * @type {string}
     */
    public dataKey: string = "user_id";

    /**
     * This method is called after successful auth request.
     * This is the only time, when we can save the received data.
     *
     * @param {Socket} socket
     * @param {any} response
     * @returns {boolean}
     */
    protected authenticated(socket: Socket, response: any): boolean {
        this.membersDataHolder[socket.id] = response.channel_data;
        return super.authenticated(socket, response);
    }

    /**
     * This hook is called after successful auth and after real subscription is done
     *
     * @param {Socket} Socket
     * @returns {Promise<PresenceChannel>}
     */
    protected joined(socket: Socket): Promise<Channel> {
        if (this.userPresenceCount(socket) === 1) {
            this.broadcast(socket, "presence:joining", this.name, this.membersDataHolder[socket.id]);
            this.emitSubscribed();
        } else {
            this.emitSubscribedOnlyToSocket(socket);
        }

        return Promise.resolve(this);
    }

    /**
     * Called after socket leaves this channel
     *
     * @param {Socket} socket
     * @returns {Promise<PresenceChannel>}
     */
    protected leaved(socket: Socket): Promise<Channel> {
        const isThisLastPresence = this.userPresenceCount(socket) === 1;
        const leaving = this.membersDataHolder[socket.id];
        delete this.membersDataHolder[socket.id];
        if (isThisLastPresence) {
            this.emit("presence:leaving", this.name, leaving);
            this.emitSubscribed();
        }

        return Promise.resolve(this);
    }

    /**
     * How many times is user (using this socket) already present with another sockets?
     * This happens when user open new tab for example.
     *
     * This method is used to determine if joining and leaving events should be emitted.
     *
     * @param {Socket} socket
     * @returns {number}
     */
    protected userPresenceCount(socket: Socket): number {
        if (!this.membersDataHolder[socket.id]) { return 0; }
        const id = this.membersDataHolder[socket.id][this.dataKey];
        return _.countBy(this.membersDataHolder, this.dataKey)[id] || 0;
    }

    /**
     * Filter member data to not contain given socket's data.
     * It has to be determined by user id.
     *
     * @param {Socket} socket
     * @returns {any}
     */
    protected membersDataWithoutUser(socket: Socket): any[] {
        if (this.membersDataHolder[socket.id]) {
            const id = this.membersDataHolder[socket.id].user_id;
            return _.filter(this.membersData, (data) => data.user_id !== id);
        } else {
            return this.membersData;
        }
    }

    /**
     * Emit subscribed event to all connected sockets
     *
     * @returns {void}
     */
    protected emitSubscribed(): void {
        this.members.forEach((socket: Socket) => this.emitSubscribedOnlyToSocket(socket));
    }

    /**
     * Emit subscribed event only to given socket
     *
     * @param {Socket} socket
     * @returns {void}
     */
    protected emitSubscribedOnlyToSocket(socket: Socket): void {
        socket.emit("presence:subscribed", this.name, this.membersDataWithoutUser(socket));
    }

    /**
     * Get memebers data.
     *
     * All data is unique based on `dataKey` property. Last added with same `dataKey` value
     * has preference.
     *
     * @returns {any[]}
     */
    get membersData(): any[] {
        return _.reverse(_.uniqBy<any>(_.reverse(_.values(this.membersDataHolder)), this.dataKey));
    }
}
