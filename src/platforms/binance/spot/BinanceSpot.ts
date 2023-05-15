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

import createBinanceConnection from "binance-api-node";

import { MidaTradingAccountOperativity, } from "#accounts/MidaTradingAccountOperativity";
import { MidaTradingAccountPositionAccounting, } from "#accounts/MidaTradingAccountPositionAccounting";
import { date, } from "#dates/MidaDate";
import { decimal, } from "#decimals/MidaDecimal";
import { MidaTradingPlatform, } from "#platforms/MidaTradingPlatform";
import { BinanceSpotAccount, } from "!/src/platforms/binance/spot/BinanceSpotAccount";
import { BinanceSpotLoginParameters, } from "!/src/platforms/binance/spot/BinanceSpotLoginParameters";

/** Used as internal map to cache logged accounts */
const loggedAccounts: Map<string, BinanceSpotAccount> = new Map();
const platformDescriptor: Readonly<Record<string, any>> = {
    name: "Binance Spot",
    siteUri: "https://www.binance.com",
    primaryAsset: "USDT",
    httpTestnet: "https://testnet.binance.vision/api",
    wsTestnet: "wss://testnet.binance.vision/ws",
};

export class BinanceSpot extends MidaTradingPlatform {
    private constructor () {
        super({ name: platformDescriptor.name, siteUri: platformDescriptor.siteUri, });
    }

    public override async login ({
        apiKey,
        apiSecret,
        useTestnet,
    }: BinanceSpotLoginParameters): Promise<BinanceSpotAccount> {
        if (loggedAccounts.has(apiKey)) {
            return loggedAccounts.get(apiKey) as BinanceSpotAccount;
        }

        const binanceConnectionParameters: Record<string, any> = {
            apiKey,
            apiSecret,
        };

        if (useTestnet) {
            binanceConnectionParameters.httpBase = platformDescriptor.httpTestnet;
            binanceConnectionParameters.wsBase = platformDescriptor.wsTestnet;
        }

        const tradingAccount: BinanceSpotAccount = new BinanceSpotAccount({
            id: "",
            platform: this,
            creationDate: date(0),
            primaryAsset: platformDescriptor.primaryAsset,
            indicativeLeverage: decimal(0),
            operativity: useTestnet ? MidaTradingAccountOperativity.DEMO : MidaTradingAccountOperativity.REAL,
            positionAccounting: MidaTradingAccountPositionAccounting.NETTED,
            binanceConnection: createBinanceConnection(binanceConnectionParameters),
        });

        await tradingAccount.preload();

        loggedAccounts.set(apiKey, tradingAccount);

        return tradingAccount;
    }

    /* *** *** *** Reiryoku Technologies *** *** *** */

    static #instance: BinanceSpot = new BinanceSpot();

    public static get instance (): BinanceSpot {
        return this.#instance;
    }
}
