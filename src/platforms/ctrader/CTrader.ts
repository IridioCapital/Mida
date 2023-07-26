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

import { MidaTradingPlatform, } from "#platforms/MidaTradingPlatform";
import { baseActions, } from "#plugins/MidaPluginActions";
import { CTraderAccount, } from "!/src/platforms/ctrader/CTraderAccount";
import { CTraderApplication, } from "!/src/platforms/ctrader/CTraderApplication";
import { CTraderLoginParameters, } from "!/src/platforms/ctrader/CTraderLoginParameters";

/** Used as internal map to cache logged accounts */
const loggedAccounts: Map<string, CTraderAccount> = new Map();
const platformDescriptor: Record<string, string> = {
    name: "cTrader",
    siteUri: "https://ctrader.com",
    demoProxy: "demo.ctraderapi.com",
    liveProxy: "live.ctraderapi.com",
};

class CTrader extends MidaTradingPlatform {
    private constructor () {
        super({ name: platformDescriptor.name, siteUri: platformDescriptor.siteUri, });
    }

    public async login ({
        clientId,
        clientSecret,
        demoProxy,
        liveProxy,
        accessToken,
        accountId,
    }: CTraderLoginParameters): Promise<CTraderAccount> {
        if (loggedAccounts.has(accountId)) {
            const loggedAccount = loggedAccounts.get(accountId) as CTraderAccount;
            const stillConnected = await loggedAccount.stillConnected();

            if (stillConnected) {
                // Used to refetch the preloaded data that may be out of date
                await loggedAccount.preload();

                return loggedAccount;
            }

            loggedAccounts.delete(loggedAccount.id);
        }

        const cTraderApplication: CTraderApplication = await CTraderApplication.create({
            clientId,
            clientSecret,
            demoProxy: demoProxy ?? platformDescriptor.demoProxy,
            liveProxy: liveProxy ?? platformDescriptor.liveProxy,
        });

        const tradingAccount: CTraderAccount = await cTraderApplication.loginTradingAccount(accessToken, accountId);

        await tradingAccount.preload();

        loggedAccounts.set(accountId, tradingAccount);

        return tradingAccount;
    }

    /* *** *** *** Reiryoku Technologies *** *** *** */

    static #instance: CTrader = new CTrader();

    public static get instance (): CTrader {
        return this.#instance;
    }
}

baseActions.addPlatform("cTrader", CTrader.instance);

// <public-api>
export { CTrader, };

export { CTraderAccount, } from "!/src/platforms/ctrader/CTraderAccount";
export { CTraderAccountParameters, } from "!/src/platforms/ctrader/CTraderAccountParameters";
export { CTraderApplication, } from "!/src/platforms/ctrader/CTraderApplication";
export { CTraderApplicationParameters, } from "!/src/platforms/ctrader/CTraderApplicationParameters";
export { CTraderLoginParameters, } from "!/src/platforms/ctrader/CTraderLoginParameters";

export { CTraderOrder, } from "!/src/platforms/ctrader/orders/CTraderOrder";
export { CTraderOrderParameters, } from "!/src/platforms/ctrader/orders/CTraderOrderParameters";

export { CTraderPosition, } from "!/src/platforms/ctrader/positions/CTraderPosition";
export { CTraderPositionParameters, } from "!/src/platforms/ctrader/positions/CTraderPositionParameters";

export { CTraderTrade, } from "!/src/platforms/ctrader/trades/CTraderTrade";
export { CTraderTradeParameters, } from "!/src/platforms/ctrader/trades/CTraderTradeParameters";
// </public-api>
