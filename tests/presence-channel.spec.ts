import * as helpers from "./init";
import {expect, use as chaiUse} from "chai";
import {SocketsManager, Socket} from "../src/sockets";
import * as sinon from "sinon";
import * as request from "request-promise-native";
import {Channel} from "../src/channels/channel";
import * as _ from "lodash";

chaiUse(require("chai-subset"));

describe("presence-channel.spec", () => {

    let sockets: SocketsManager;
    let sandbox: sinon.SinonSandbox;
    let userIds = 1;

    beforeEach(() => {
        userIds = 1;
        sockets = new SocketsManager();
        /**
         * We are testing async code, and it's not so easy to restore stubs when we just return promise. For this
         * purpose is good to use sinon sandbox, which is restored after each test and created before each test.
         * @see afterEach
         */
        sandbox = sinon.sandbox.create();
    });

    function connect(): Socket {
        return sockets.add(helpers.createSocket());
    }

    function addToChannel(channel: String, name: String = "John Dode", id = null): any {
        const socket = connect();
        const data = {channel_data: {
            user_id: id ? id : userIds,
            user_info: {
                name,
            },
        }};
        const emitMethod: Sinon.SinonSpy = sandbox.spy(socket.iosocket, "emit");
        const stub = sinon.stub(request, "post", () => Promise.resolve(data));
        userIds++;
        return socket.join("presence-test-channel", {}).then(() => {
            stub.restore();
            return [socket, emitMethod];
        });
    }

    afterEach(() => {
        sandbox.restore();
        sockets.close();
    });

    it("because presence channel is kind of private channel auth should be called", () => {
        const socket: Socket = connect();
        const postMethod = sandbox.stub(request, "post", () => Promise.resolve(true));
        return socket.join("presence-test-channel", {})
            .then(() => sinon.assert.calledOnce(postMethod));
    });

    it("socket should be member of channel if he joined", () => {
        const socket: Socket = connect();
        sandbox.stub(request, "post", () => Promise.resolve(true));
        return socket.join("presence-test-channel", {})
            .then((channel: Channel) => expect(socket.isMemberOf(channel)).to.be.ok);
    });

    it("socket should not be member of channel if he joined and then left", () => {
        const socket: Socket = connect();
        sandbox.stub(request, "post", () => Promise.resolve(true));
        return socket.join("presence-test-channel", {})
            .then(() => socket.leave("presence-test-channel", {}))
            .then(() => expect(socket.isMemberOf(sockets.channels.channel("presence-test-channel"))).to.be.not.ok);
    });

    it("sends current members list to subscribed socket", () => {
        return addToChannel("presence-test-channel", "User A", 1)
            .then(() => addToChannel("presence-test-channel", "User B", 2))
            .then(() => addToChannel("presence-test-channel", "User C", 3))
            .then((values: [Socket, Sinon.SinonSpy]) => {
                const [socket, emitMethod] = values;
                sinon.assert.calledWith(emitMethod, "presence:subscribed", "presence-test-channel", [
                    {user_id: 1, user_info: {name: "User A"}},
                    {user_id: 2, user_info: {name: "User B"}},
                ]);
            });
    });

    it("sends member list unique by user_id with last sent name", () => {
        return addToChannel("presence-test-channel", "User A", 1)
            .then(() => addToChannel("presence-test-channel", "User A fixed", 1))
            .then(() => addToChannel("presence-test-channel", "User C", 2))
            .then((values: [Socket, Sinon.SinonSpy]) => {
                const [socket, emitMethod] = values;
                sinon.assert.calledWith(emitMethod, "presence:subscribed", "presence-test-channel", [
                    {user_id: 1, user_info: {name: "User A fixed"}},
                ]);
            });
    });

    it("removes user after he leaves channel from emitted data", () => {
        return addToChannel("presence-test-channel", "User A", 1)
            .then(() => addToChannel("presence-test-channel", "User B", 2))
            .then((values: [Socket, Sinon.SinonSpy]) => values[0].leave("presence-test-channel", {}))
            .then(() => addToChannel("presence-test-channel", "User C", 3))
            .then((values: [Socket, Sinon.SinonSpy]) => {
                const [socket, emitMethod] = values;
                sinon.assert.calledWith(emitMethod, "presence:subscribed", "presence-test-channel", [
                    {user_id: 1, user_info: {name: "User A"}},
                ]);
            });
    });

    it("send only one event joining when user with same user_id joins multiple times", () => {
        const stub: Sinon.SinonSpy = sandbox.stub(Socket.prototype, "emit")
            .withArgs("presence:joining");
        return addToChannel("presence-test-channel", "User A", 1)
            .then(() => addToChannel("presence-test-channel", "User B", 2))
            .then(() => addToChannel("presence-test-channel", "User C", 3))
            .then(() => addToChannel("presence-test-channel", "User C", 3))
            .then(() => addToChannel("presence-test-channel", "User D", 4))
            /**
             * Event is emitted to:
             * - A when enters B (1)
             * - A, B when enters C (2)
             * - A, B, C when enter D (3)
             *
             * this is 7 in total.
             *
             * We are testing that no event is emitted when User C (with same id) enters
             * for the second time.
             */
            .then(() => sinon.assert.callCount(stub, 7));
    });

    it("send only one event leaving when user with same user_id leaves everywhere", () => {
        const stub: Sinon.SinonSpy = sandbox.stub(Socket.prototype, "emit")
            .withArgs("presence:leaving");
        const toLeave: Socket[] = [];
        return addToChannel("presence-test-channel", "User A", 1)
            .then(() => addToChannel("presence-test-channel", "User B", 2))
            .then(() => addToChannel("presence-test-channel", "User C", 3))
            .then((values: [Socket]) => toLeave.push(values[0]))
            .then(() => addToChannel("presence-test-channel", "User C", 3))
            .then((values: [Socket]) => toLeave.push(values[0]))
            .then(() => addToChannel("presence-test-channel", "User D", 4))
            .then(() => Promise.all(toLeave.map((socket: Socket) => socket.leave("presence-test-channel", {}))))
            /**
             * Event is emitted to A, B and D, when C leaves, but only once (on second leave) so stub have to
             * be called thrice.
             */
            .then(() => sinon.assert.calledThrice(stub));
    });

    it("sends member list on every change (but not if it is same user)", () => {
        const stub: Sinon.SinonSpy = sandbox.stub(Socket.prototype, "emit")
            .withArgs("presence:subscribed");
        const toLeave: Socket[] = [];
        return addToChannel("presence-test-channel", "User A", 1)
            .then(() => addToChannel("presence-test-channel", "User B", 2))
            .then(() => addToChannel("presence-test-channel", "User C", 3))
            .then((values: [Socket]) => toLeave.push(values[0]))
            // We have 6 calls now
            .then(() => sinon.assert.callCount(stub, 6))
            .then(() => addToChannel("presence-test-channel", "User C", 3))
            .then((values: [Socket]) => toLeave.push(values[0]))
            // User enters from another tab for instance, so he have to receive members list +1
            .then(() => sinon.assert.callCount(stub, 7))
            .then(() => toLeave[0].leave("presence-test-channel", {}))
            // One left of instances left, but there is still another one, no change.
            .then(() => sinon.assert.callCount(stub, 7))
            .then(() => toLeave[1].leave("presence-test-channel", {}))
            // All instances of user with id 3 are gone, to another two ones is sent new member list so +2
            .then(() => sinon.assert.callCount(stub, 9));
    });
});
