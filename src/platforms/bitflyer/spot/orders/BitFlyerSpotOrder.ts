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

import { MidaOrder, } from "#orders/MidaOrder";
import { MidaOrderDirection, } from "#orders/MidaOrderDirection";
import { MidaOrderExecutionType, } from "#orders/MidaOrderExecutionType";
import { BitFlyerSpotAccount, } from "!/src/platforms/bitflyer/spot/BitFlyerSpotAccount";
import { BitFlyerSpotOrderParameters, } from "!/src/platforms/bitflyer/spot/orders/BitFlyerSpotOrderParameters";
import { BitFlyerSpotUtilities, } from "!/src/platforms/bitflyer/spot/utilities/BitFlyerSpotUtilities";

export class BitFlyerSpotOrder extends MidaOrder {
    public constructor ({
        id,
        tradingAccount,
        symbol,
        requestedVolume,
        direction,
        purpose,
        limitPrice,
        stopPrice,
        status,
        creationDate,
        lastUpdateDate,
        timeInForce,
        trades,
        rejection,
        isStopOut,
        clientOrderId,
    }: BitFlyerSpotOrderParameters) {
        super({
            id,
            tradingAccount,
            symbol,
            requestedVolume,
            direction,
            purpose,
            limitPrice,
            stopPrice,
            status,
            creationDate,
            lastUpdateDate,
            timeInForce,
            trades,
            rejection,
            isStopOut,
            clientOrderId,
        });
    }

    public override get tradingAccount (): BitFlyerSpotAccount {
        return super.tradingAccount as BitFlyerSpotAccount;
    }

    public override async cancel (): Promise<void> {
        if (!this.id) {
            return;
        }

        await this.tradingAccount.httpClient.post("/v1/me/cancelchildorder", {
            "product_code": this.symbol,
            "child_order_acceptance_id": this.id,
        });
    }

    public send (): void {
        if (this.id) {
            return;
        }

        const bitFlyerDirectives: Record<string, string> = {
            "product_code": this.symbol,
            side: this.direction === MidaOrderDirection.BUY ? "BUY" : "SELL",
            size: this.requestedVolume.toString(),
            "time_in_force": BitFlyerSpotUtilities.toBitFlyerTimeInForce(this.timeInForce),
        };

        if (this.executionType === MidaOrderExecutionType.STOP) {
            throw new Error("bitFlyer doesn't support STOP orders");
        }
        else if (this.executionType === MidaOrderExecutionType.LIMIT) {
            bitFlyerDirectives["child_order_type"] = "LIMIT";
            bitFlyerDirectives.price = this.limitPrice?.toString() as string;
        }
        else {
            bitFlyerDirectives["child_order_type"] = "MARKET";
        }

        const response: any = this.tradingAccount.httpClient.post("/v1/me/sendchildorder", bitFlyerDirectives);

        const id: string = response["child_order_acceptance_id"];

        if (!id) {
            console.log(response);

            throw new Error("Error while executing error");
        }

        this.id = id;
    }
}
