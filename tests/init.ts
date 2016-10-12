import {log} from "../src/util";
import * as winston from "winston";
import {EventEmitter} from "events";

let socketId = 0;
log.remove(winston.transports.Console);

export function createSocket(): any {
    const io: any = new EventEmitter();
    io.disconnect = () => true;
    io.join = () => true;
    io.leave = () => true;
    io.id = "#test-id-" + socketId;
    io.request = {headers: {cookie: "test-cookie=cookie"}};
    io.to = () => ( {emit: () => true} );
    socketId += 1;
    return io;
}
