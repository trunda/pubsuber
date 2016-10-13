import * as helpers from "./init";
import {expect, use as chaiUse} from "chai";
import {SocketsManager, Socket} from "../src/sockets";
import * as sinon from "sinon";
import * as request from "request-promise-native";
import {Channel, PrivateChannel} from "../src/channels";

chaiUse(require("chai-subset"));

describe("private-channel.spec", () => {

    const io: any = helpers.createSocket();
    let sockets: SocketsManager;
    let socket: Socket;
    let sandbox: sinon.SinonSandbox;

    before(() => {
        sockets = new SocketsManager();
        socket = sockets.add(io);
    });

    after(() => {
        sockets.close();
    });

    beforeEach(() => {
        /**
         * We are testing async code, and it's not so easy to restore stubs when we just return promise. For this
         * purpose is good to use sinon sandbox, which is restored after each test and created before each test.
         * @see afterEach
         */
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sandbox.restore();
    });

    function subscribe(channel: string = "private-test-channel"): void {
        io.emit("subscribe", {
            channel, auth: {headers: {"X-CSRF-TOKEN": "test-csrf", Foo: "Bar"}},
        });
    }

    it("sends post request on subscription to private channel", () => {
        const stub = sandbox.stub(request, "post", (...args: any[]) => Promise.resolve(false));
        subscribe();
        sinon.assert.calledOnce(stub);
    });

    it("pass headers during post request", () => {
        const stub = sandbox.stub(request, "post", (...args: any[]) => Promise.resolve(false));
        subscribe();
        (<any> expect(stub.lastCall.args[1]).to).containSubset(
            {headers: {"X-CSRF-TOKEN": "test-csrf", Foo: "Bar", cookie: "test-cookie=cookie"}}
        );
    });

    it("disconnect socket, when auth failed", () => {
        sandbox.stub(request, "post", (...args: any[]) => Promise.reject({message: "test"}));
        const disconnectMethod = sandbox.stub(io, "disconnect", (...args: any[]) => true);
        const closeMethod = sandbox.spy(socket, "close");

        return socket.join("private-test-channel", {}).then((channel: Channel) => {
            sinon.assert.calledOnce(disconnectMethod);
            sinon.assert.calledOnce(closeMethod);
            expect(closeMethod.lastCall.args[0]).to.contain("Invalid authentication");
        });
    });

    it("joins channel when auth passed", () => {
        sandbox.stub(request, "post", (...args: any[]) => Promise.resolve(true));

        return socket.join("private-test-channel", {}).then(() => {
            expect(socket.isMemberOf(sockets.channels.channel("private-test-channel"))).to.be.ok;
        });
    });

    describe("does not authenticate when authenticated method intercepts", () => {
        it("by returning falsy value", () => {
            const authenticatedMethod = sandbox.stub(PrivateChannel.prototype, "authenticated", () => false);
            sandbox.stub(request, "post", (...args: any[]) => Promise.resolve(true));
            return socket.join("private-test-channel", {}).then((channel: Channel) => {
                sinon.assert.calledWith(authenticatedMethod, socket, true);
                expect(socket.isMemberOf(channel)).to.be.false;
            });
        });

        it("by exception", () => {
            const authenticatedMethod = sandbox.stub(PrivateChannel.prototype, "authenticated", () => {
                throw new Error("Test exception");
            });
            sandbox.stub(request, "post", (...args: any[]) => Promise.resolve(true));
            return socket.join("private-test-channel", {}).then((channel: Channel) => {
                sinon.assert.calledWith(authenticatedMethod, socket, true);
                expect(socket.isMemberOf(channel)).to.be.false;
            });
        });
    });
});
