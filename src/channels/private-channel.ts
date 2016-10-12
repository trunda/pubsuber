import {Channel} from "./channel";
import {Socket} from "../sockets";
import * as request from "request-promise-native";
import {config} from "../util";
import {log} from "../util/log";

export class PrivateChannel extends Channel {

    /**
     * Subscribe to the channel, we are HTTP POST auth request before, if auth fails we are rejecting connection
     * and sending rejection reason as "disconnect-reason" event through socket.io. This event can be catched
     * on client side like this:
     *
     * Example:
     *   import Echo from "laravel-echo";
     *
     *   const echo = window.echo = new Echo({
     *      broadcaster: 'socket.io',
     *      host: 'http://localhost:3000',
     *   });
     *
     *   echo.connector.socket.on("disconnect-reason", function(reason) {
     *      console.error(reason);
     *   });
     *
     * @param {Socket} socket
     * @param {any} auth
     * @returns {Promise<Channel>}
     */
    public subscribe(socket: Socket, auth: any): Promise<Channel> {
        return this.auth(socket, auth)
            .then((authenticated) => {
                if (authenticated) {
                    return super.subscribe(socket, auth)
                        .then(() => this.joined(socket));
                } else {
                    return this.unauthorized(socket);
                }
            })
            .catch(err => this.unauthorized(socket));
    }

    /**
     * Deny request fro subscription
     *
     * @param {Socket} socket
     * @param {any} err
     * @returns {PrivateChannel}
     */
    protected unauthorized(socket: Socket): Promise<Channel> {
        log.warn("User is not authenticated for channel %s, disconnetcting", this.name);
        return <Promise<Channel>> socket.close("Invalid authentication for channel: " + this.name).then(() => this);
    }

    /**
     * Unsubscribe from the channel, here is no need to verify auth. If the user joined channel before, he has to
     * be authenticated. If not, nothing will actually happen.
     *
     * @param {Socket} socket
     * @param {any} auth
     * @returns {Promise<Channel>}
     */
    public unsubscribe(socket: Socket, auth: any): Promise<Channel> {
        return super.unsubscribe(socket, auth).then(() => this.leaved(socket));
    }

    /**
     * Sends HTTP POST request to configured endpoint.
     * We have to preserve all auth headers we received from laravel and append cookies
     *
     * @param {Socket} socket
     * @param {any} auth
     * @returns {Promise<boolean>}
     */
    protected auth(socket: Socket, auth: any): Promise<boolean> {
        let options = {
            json: true,
            headers: { cookie: socket.iosocket.request.headers.cookie },
            body: { channel_name: this.name },
        };
        options.headers = (<any> Object).assign(auth.headers || {}, options.headers);

        return (<request.RequestPromise> request.post(config("authUrl"), options))
            .then((response: any) => this.authenticated(socket, response));
    }

    /**
     * Authenticated callback. This method can intercept the authentication by throwing an exception or return false.
     * When this method does not intercept, developer can be sure that socket will join the channel.
     *
     * @param {Socket} socket
     * @param {any} response
     * @returns {boolean}
     */
    protected authenticated(socket: Socket, response: any): boolean {
        return true;
    }

    /**
     * This is where joined events should be called
     *
     * @param socket
     */
    protected joined(socket: Socket): Promise<Channel> {
        return Promise.resolve(this);
    }

    /**
     * This is where leaved events should be called
     *
     * @param socket
     */
    protected leaved(socket: Socket): Promise<Channel> {
        return Promise.resolve(this);
    }
}
