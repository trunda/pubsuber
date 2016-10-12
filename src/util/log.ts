import * as Winston from "winston";

/**
 * Instance of winston logger (used as global logger)
 * @type {LoggerInstance}
 */
export const log = new Winston.Logger({
    transports: [
        new Winston.transports.Console({
            level: "debug",
            colorize: true,
            timestamp: true,
        }),
    ],
});
