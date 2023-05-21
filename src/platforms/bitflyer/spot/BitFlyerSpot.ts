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

import { WebSocket, } from "ws";

import { MidaTradingAccountOperativity, } from "#accounts/MidaTradingAccountOperativity";
import { MidaTradingAccountPositionAccounting, } from "#accounts/MidaTradingAccountPositionAccounting";
import { date, } from "#dates/MidaDate";
import { decimal, } from "#decimals/MidaDecimal";
import { MidaTradingPlatform, } from "#platforms/MidaTradingPlatform";
import { BitFlyerAccountRegion, } from "!/src/platforms/bitflyer/BitFlyerAccountRegion";
import { BitFlyerHttpClient, } from "!/src/platforms/bitflyer/BitFlyerHttpClient";
import { createBitflyerPrivateWs, } from "!/src/platforms/bitflyer/BitflyerWebSocket";
import { BitFlyerSpotAccount, } from "!/src/platforms/bitflyer/spot/BitFlyerSpotAccount";
import { BitFlyerSpotLoginParameters, } from "!/src/platforms/bitflyer/spot/BitFlyerSpotLoginParameters";

const platformDescriptor: Readonly<Record<string, any>> = {
    name: "bitFlyer Spot",
    siteUri: "https://bitflyer.com",
};

export class BitFlyerSpot extends MidaTradingPlatform {
    public constructor () {
        super({ name: platformDescriptor.name, siteUri: platformDescriptor.siteUri, });
    }

    public override async login ({
        apiKey,
        apiSecret,
        region = BitFlyerAccountRegion.EUROPE,
    }: BitFlyerSpotLoginParameters): Promise<any> {
        const httpClient: BitFlyerHttpClient = new BitFlyerHttpClient(apiKey, apiSecret);
        const wsClient: WebSocket = await createBitflyerPrivateWs(apiKey, apiSecret);
        let primaryAsset;

        switch (region) {
            case BitFlyerAccountRegion.JAPAN: {
                primaryAsset = "JPY";

                break;
            }
            case BitFlyerAccountRegion.EUROPE: {
                primaryAsset = "EUR";

                break;
            }
            case BitFlyerAccountRegion.USA: {
                primaryAsset = "USD";

                break;
            }
        }

        return new BitFlyerSpotAccount({
            id: "",
            platform: this,
            creationDate: date(0),
            primaryAsset,
            indicativeLeverage: decimal(0),
            operativity: MidaTradingAccountOperativity.REAL,
            positionAccounting: MidaTradingAccountPositionAccounting.NETTED,
            httpClient,
            wsClient,
            region,
        });
    }

    /* *** *** *** Reiryoku Technologies *** *** *** */

    static #instance: BitFlyerSpot = new BitFlyerSpot();

    public static get instance (): BitFlyerSpot {
        return this.#instance;
    }
}
