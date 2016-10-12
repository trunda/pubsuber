import {Channel, PrivateChannel, PresenceChannel} from "./";
import {Socket} from "../sockets/socket";

export class ChannelManager {
    private channelsHolder: any = {};

    private channelPrefixMap: any = {
        "private-": PrivateChannel,
        "presence-": PresenceChannel,
    };

    public subscribe(channel: string, socket: Socket, auth: any): Promise<Channel> {
        return this.channel(channel).subscribe(socket, auth);
    }

    public unsubscribe(channel: string, socket: Socket, auth: any): Promise<Channel> {
        return this.channel(channel).unsubscribe(socket, auth);
    }

    /**
     * Getter for channel by name
     *
     * @param {string} channel
     * @returns {Channel}
     */
    public channel(channel: string): Channel {
        if (!this.channelsHolder[channel]) {
            this.channelsHolder[channel] = this.create(channel);
        }

        return this.channelsHolder[channel];
    }

    /**
     * Crete channel for given name
     * @param channel
     */
    protected create(channel: string): Channel {
        return new (<any> (this.getChannelClass(channel)))(channel);
    }

    /**
     * Find the most situable channel by prefix
     *
     * @param {string} channel
     * @returns {Channel}
     */
    protected getChannelClass(channel: string): Function {
        for (let prefix of Object.keys(this.channelPrefixMap)) {
            if (channel.lastIndexOf(prefix, 0) === 0) {
                return this.channelPrefixMap[prefix];
            }
        }

        return Channel;
    }

    /**
     * Get all active channels
     *
     * @returns {Channel[]}
     */
    get channels(): Channel[] {
        return this.channelsHolder;
    }
}
