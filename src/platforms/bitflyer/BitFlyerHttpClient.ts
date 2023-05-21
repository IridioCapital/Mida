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

const BITFLYER_HTTP_URI: string = "https://api.bitflyer.com";

export class BitFlyerHttpClient {
    readonly #apiKey: string;
    readonly #apiSecret: string;

    public constructor (apiKey: string, apiSecret: string) {
        this.#apiKey = apiKey;
        this.#apiSecret = apiSecret;
    }

    public async post (path: string, body: Record<string, string>): Promise<any> {
        const method: string = "POST";
        const textBody: string = JSON.stringify(body);
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };

        // <authentication>
        const apiKey = this.#apiKey;
        const apiSecret = this.#apiSecret;

        if (apiKey && apiSecret) {
            const textTimestamp: string = Date.now().toString();
            const text = textTimestamp + method + path + textBody;
            const signature = crypto.createHmac("sha256", apiSecret).update(text).digest("hex");

            headers["ACCESS-KEY"] = apiKey;
            headers["ACCESS-TIMESTAMP"] = textTimestamp;
            headers["ACCESS-SIGN"] = signature;
        }
        // </authentication>

        const response = await fetch(`${BITFLYER_HTTP_URI}${path}`, {
            method,
            headers,
            body: textBody,
        });

        return response.json();
    }

    public async get (path: string, parameters: Record<string, string> = {}): Promise<any> {
        const method: string = "GET";
        const headers: Record<string, string> = {};

        // <authentication>
        const apiKey = this.#apiKey;
        const apiSecret = this.#apiSecret;

        if (apiKey && apiSecret) {
            const textTimestamp: string = Date.now().toString();
            const text = textTimestamp + method + path;
            const signature = crypto.createHmac("sha256", apiSecret).update(text).digest("hex");

            headers["ACCESS-KEY"] = apiKey;
            headers["ACCESS-TIMESTAMP"] = textTimestamp;
            headers["ACCESS-SIGN"] = signature;
        }
        // </authentication>

        const response = await fetch(`${BITFLYER_HTTP_URI}${path}?${new URLSearchParams(parameters).toString()}`, {
            method,
            headers,
        });

        return response.json();
    }
}
