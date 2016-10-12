import {log} from "../util";
import {bindAll, bind} from "../util";
import {ChannelManager, Channel} from "../channels";
import {Promise} from "es6-promise";
import {SubscriptionMessage} from "./";
import * as _ from "lodash";

export class Socket {

    private channelManager: ChannelManager;
    private io: SocketIO.Socket;
    private bindings: any;

    constructor(io: SocketIO.Socket, channelManager: ChannelManager) {
        this.io = io;
        this.channelManager = channelManager;

        this.bind();
    }

    get iosocket(): SocketIO.Socket {
        return this.io;
    }

    get id(): string {
        return this.io.id;
    }

    public join(channel: string, auth: any): Promise<Channel> {
        return this.channelManager.subscribe(channel, this, auth);
    }

    public leave(channel: string, auth: any): Promise<Channel> {
        return this.channelManager.unsubscribe(channel, this, auth);
    }

    public leaveAll(): Promise<Channel[]> {
        return Promise.all(this.channels.map((chanel: Channel) => chanel.unsubscribe(this, {})));
    }

    public close(reason?: string): Promise<Socket> {
        return this.leaveAll()
            .then(() => {
                if (reason) {
                    this.io.emit("disconnect-reason", reason);
                }
                this.io.disconnect(true);
                this.unbind();
                return this;
            });
    }

    public on(event: string, callback: Function): Socket {
        this.bindings.push(bind(this.io, event, callback));
        return this;
    }

    public errorOccured(error: any): void {
        if (error) {
            this.close("Error occured " + error);
            log.error(error);
        }
    }

    public emit(event: string, ...data: any[]): void {
        log.log("silly", "Emitting to %s, event %s with", this.id, event, data);
        this.iosocket.emit(event, ...data);
    }

    public isMemberOf(channel: Channel): boolean {
        return _.includes(this.channels, channel);
    }

    get channels(): Channel[] {
        return _.filter(this.channelManager.channels, (channel: Channel) => channel.isSubscribed(this));
    }

    private disconnected(): Promise<void> {
        return this.leaveAll().then(() => this.unbind());
    }

    private bind(): void {
        this.bindings = bindAll([
            [this.io, "subscribe", (message: SubscriptionMessage) => this.join(message.channel, message.auth || {})],
            [this.io, "unsubscribe", (message: SubscriptionMessage) => this.leave(message.channel, message.auth || {})],
            [this.io, "error", error => this.errorOccured(error)],
            [this.io, "disconnect", () => this.disconnected()],
        ]);
    }

    private unbind(): void {
        this.bindings.unbind();
    }
}