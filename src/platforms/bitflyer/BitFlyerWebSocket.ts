/*
 * Copyright Reiryoku Technologies and its contributors, www.reiryoku.com, www.mida.org
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
*/

import * as crypto from "node:crypto";
import { WebSocket, } from "ws";

const BITFLYER_WEB_SOCKET_URI: string = "wss://ws.lightstream.bitflyer.com/json-rpc";

export async function createBitflyerPrivateWs (apiKey: string, apiSecret: string): Promise<WebSocket> {
    const socket: WebSocket = new WebSocket(BITFLYER_WEB_SOCKET_URI);
    const timestamp: string = Date.now().toString();
    const nonce: string = crypto.randomBytes(16).toString("hex");
    const signature: string = crypto.createHmac("sha256", apiSecret).update(`${timestamp}${nonce}`).digest("hex");
    const authentication: Record<string, string> = {
        timestamp,
        nonce,
        signature,
        "api_key": apiKey,
    };

    await new Promise((resolve, reject) => {
        socket.on("open", async () => {
            socket.send(JSON.stringify({
                jsonrpc: "2.0",
                method: "auth",
                params: authentication,
            }), resolve);
        });

        socket.on("error", (e) => {
            reject(e);
        });
    });

    return socket;
}
