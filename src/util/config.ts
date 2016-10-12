import * as _ from "lodash";
import * as fs from "fs";
import {log} from "./";

/**
 * Default options
 *
 * @type {{authUrl: string; bindAddress: string; bindPort: number}}
 */
let options = {
    authUrl: "http://localhost/broadcasting/auth",
    bindAddress: "0.0.0.0",
    bindPort: 3000,
};

// We will try to load (and overwrite) settings from config file
// in current working directory
const CONFIG_FILE = process.cwd() + "/pubsuber.json";
try {
    fs.accessSync(CONFIG_FILE, (<any> fs).F_OK);
    options = (<any> Object).assign({}, options, require(CONFIG_FILE));
    log.debug("Merging with default configuration");
} catch (e) {
    log.warn("Error during configuration loading, using default one.", e.message);
} finally {
    log.debug("Configuration loaded");
}

/**
 * Get/set option
 *
 * @param   {string} path
 * @param   {any} value
 * @returns {any}
 */
export function config(path: String, value?: any): any {
    if (value) {
        return _.set(options, path, value);
    } else {
        return _.get(options, path);
    }
}

