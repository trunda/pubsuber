/**
 * This function is used to securely bind events,
 * it returns function which can be used to remove listener
 *
 * Example:
 *    let subscriber = bind(this.socket, "message", (data) => console.log(data));
 *    setTimeout(() => subscriber(), 5000);
 *
 * @param {any} to
 * @param {string} event
 * @param {Function} callback
 * @returns {()=>any|void|Socket}
 */
export function bind(to: any, event: string, callback: Function): Function {
    to.on(event, callback);
    return () => to.removeListener(event, callback);
}

/**
 * Bind multiple events at once
 *
 * Example:
 *    let subscriptions = bindAll([
 *      [this.socket, "message", (data) => console.log(data)],
 *      [this.socket, "message", (data) => console.log(data)],
 *      [this.socket, "message", (data) => console.log(data)],
 *    ]);
 *
 *    setTimeout(() => subscriptions(), 5000);
 * @param events
 * @returns {any}
 */
export function bindAll(events: Array<any>): any {
    const result: any = events.map((event) => bind.apply(null, event));
    result.unbind = () => {
        result.forEach((unbind: Function) => unbind());
    };

    return result;
}