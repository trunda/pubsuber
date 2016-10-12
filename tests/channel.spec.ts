import * as helpers from "./init";
import {expect} from "chai";
import {SocketsManager, Socket} from "../src/sockets";
import * as sinon from "sinon";

describe("channel.spec", () => {

    const socket: any = helpers.createSocket();
    let sockets: SocketsManager;
    let sandbox: Sinon.SinonSandbox;

    beforeEach(() => {
        sockets = new SocketsManager();
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sockets.close();
        sandbox.restore();
    });

    it("should wrap socket", () => {
        expect(sockets.add(socket)).to.be.instanceOf(Socket);
    });

    it("removes all listeners from socket after close", () => {
        sockets.add(socket);
        expect(Object.keys(socket._events).length).to.be.at.least(1);
        return sockets.close().then(() => {
            expect(Object.keys(socket._events).length).to.be.equal(0);
        });

    });

    it("it should receive new connection", () => {
        sockets.add(socket);
        expect(sockets.count).to.be.equal(1);
    });

    it("leaves all channels when disconnected", () => {
        const s: Socket = sockets.add(socket);

        return Promise.all([
            s.join("test-channel-1", {}),
            s.join("test-channel-2", {}),
        ]).then(() => Promise.all([
            s.leave("test-channel-1", {}),
            s.leave("test-channel-2", {}),
        ])).then(() => expect(s.channels.length).to.be.equal(0));
    });

    it("is right count of members afters subscription", () => {
        const s: Socket = sockets.add(socket);

        return Promise.all([
            s.join("test-channel-1", {}),
            s.join("test-channel-2", {}),
        ]).then(() => expect(s.channels.length).to.be.equal(2));
    });

    it("should have right count of sockets", () => {
        return Promise.all([
            sockets.add(helpers.createSocket()).join("test-channel", {}),
            sockets.add(helpers.createSocket()).join("test-channel", {}),
            sockets.add(helpers.createSocket()).join("test-channel", {}),
        ]).then(() => expect(sockets.channels.channel("test-channel").members.length).to.be.equal(3));
    });

    it("emits event to underlying sockets io objects", () => {
        const emitMethod: Sinon.SinonSpy = sandbox.spy(Socket.prototype, "emit");
        return Promise.all([
            sockets.add(helpers.createSocket()).join("test-channel", {}),
            sockets.add(helpers.createSocket()).join("test-channel", {}),
            sockets.add(helpers.createSocket()).join("test-channel", {}),
        ]).then(() => {
            sockets.channels.channel("test-channel").emit("test", "next", {});
            sinon.assert.alwaysCalledWith(emitMethod, "test", "next", {});
            expect(emitMethod.callCount).to.be.equal(3);
        });
    });
});
