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

import {
    ContractClient,
    ContractOrderRequest as BybitOrderDirectives,
    USDCTimeInForce,
} from "bybit-api";

import { BinanceSpotTrade, } from "!/src/platforms/binance/spot/trades/BinanceSpotTrade";
import { BybitFuturesOrderParameters, } from "!/src/platforms/bybit/futures/orders/BybitFuturesOrderParameters";
import { BybitFuturesUtilities, } from "!/src/platforms/bybit/futures/utilities/BybitFuturesUtilities";
import { date, MidaDate, } from "#dates/MidaDate";
import { decimal, MidaDecimal, } from "#decimals/MidaDecimal";
import { MidaEvent, } from "#events/MidaEvent";
import { MidaOrder, } from "#orders/MidaOrder";
import { MidaOrderDirection, } from "#orders/MidaOrderDirection";
import { MidaOrderDirectives, } from "#orders/MidaOrderDirectives";
import { MidaOrderRejection, } from "#orders/MidaOrderRejection";
import { MidaOrderStatus, } from "#orders/MidaOrderStatus";
import { MidaProtectionDirectives, } from "#protections/MidaProtectionDirectives";
import { MidaTradeDirection, } from "#trades/MidaTradeDirection";
import { MidaTradePurpose, } from "#trades/MidaTradePurpose";
import { MidaTradeStatus, } from "#trades/MidaTradeStatus";
import { MidaEmitter, } from "#utilities/emitters/MidaEmitter";

export class BybitFuturesOrder extends MidaOrder {
    readonly #bybitConnection: ContractClient;
    readonly #bybitEmitter: MidaEmitter;
    readonly #directives?: MidaOrderDirectives;

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
        bybitConnection,
        bybitEmitter,
        directives,
    }: BybitFuturesOrderParameters) {
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

        this.#bybitConnection = bybitConnection;
        this.#bybitEmitter = bybitEmitter;
        this.#directives = directives;

        // Listen events only if the order is not in a final state
        if (
            status !== MidaOrderStatus.CANCELLED &&
            status !== MidaOrderStatus.REJECTED &&
            status !== MidaOrderStatus.EXPIRED &&
            status !== MidaOrderStatus.EXECUTED
        ) {
            this.#configureListeners();
        }
    }

    public override async cancel (): Promise<void> {
        if (this.status !== MidaOrderStatus.PENDING) {
            return;
        }

        try {
            await this.#bybitConnection.cancelOrder({
                symbol: this.symbol,
                orderId: this.id,
            });

            this.lastUpdateDate = date();
            this.onStatusChange(MidaOrderStatus.CANCELLED);
        }
        catch (error) {
            console.log(error);
        }
    }

    public send (): void {
        const directives = this.#directives;

        if (!directives) {
            return;
        }

        if (directives.positionId || !directives.symbol) {
            this.onStatusChange(MidaOrderStatus.REJECTED);
            this.rejection = MidaOrderRejection.UNKNOWN;

            return;
        }

        const symbol: string = directives.symbol;
        const direction: MidaOrderDirection = directives.direction;
        const volume: MidaDecimal = decimal(directives.volume);

        const bybitDirectives: Partial<BybitOrderDirectives> = {
            symbol,
            side: direction === MidaOrderDirection.BUY ? "Buy" : "Sell",
            qty: volume.toString(),
        };

        if (directives.limit) {
            bybitDirectives.price = decimal(directives.limit).toString();
            bybitDirectives.orderType = "Limit";
        }
        else {
            bybitDirectives.orderType = "Market";
        }

        if (this.timeInForce) {
            bybitDirectives.timeInForce =
                BybitFuturesUtilities.toBybitTimeInForce(this.timeInForce) as USDCTimeInForce;
        }

        if (directives.clientOrderId) {
            bybitDirectives.orderLinkId = directives.clientOrderId;
        }

        const protection: MidaProtectionDirectives = directives.protection ?? {};

        if ("takeProfit" in protection) {
            bybitDirectives.takeProfit = decimal(protection.takeProfit).toString();
        }

        if ("stopLoss" in protection) {
            bybitDirectives.stopLoss = decimal(protection.stopLoss).toString();
        }

        this.#bybitConnection.submitOrder(bybitDirectives as BybitOrderDirectives)
            .then((descriptor: Record<string, any>): void => this.#onResponse(descriptor));
    }

    #onResponse (descriptor: Record<string, any>): void {
        if (descriptor["ret_code"]) {
            this.#onResponseReject(descriptor);

            return;
        }

        const orderId: string = descriptor["order_id"];
        const lastUpdateDate: MidaDate = date(descriptor["updated_time"]);

        this.id = orderId;
        this.creationDate = lastUpdateDate;
        this.lastUpdateDate = lastUpdateDate;
    }

    #onResponseReject (descriptor: Record<string, any>): void {
        const currentDate: MidaDate = date();

        this.creationDate = currentDate;
        this.lastUpdateDate = currentDate;

        // Documentation Reference https://bybit-exchange.github.io/docs/futuresV2/linear/#t-errors
        switch (descriptor["ret_code"]) {
            case 130021: {
                this.rejection = MidaOrderRejection.NOT_ENOUGH_MONEY;

                break;
            }
            case 10001: {
                this.rejection = MidaOrderRejection.SYMBOL_NOT_FOUND;

                break;
            }
            default: {
                this.rejection = MidaOrderRejection.UNKNOWN;

                console.log(descriptor);
            }
        }

        this.onStatusChange(MidaOrderStatus.REJECTED);
    }

    // eslint-disable-next-line max-lines-per-function
    #onUpdate (descriptor: Record<string, any>): void {
        const orderId: string = descriptor.orderId.toString();
        const lastUpdateDate: MidaDate = new MidaDate();
        const plainStatus: string = descriptor.orderStatus.toUpperCase();
        let status: MidaOrderStatus = MidaOrderStatus.REQUESTED;

        if (!this.id) {
            this.id = orderId;
        }

        if (!this.lastUpdateDate || this.lastUpdateDate.timestamp !== lastUpdateDate.timestamp) {
            this.lastUpdateDate = lastUpdateDate;
        }

        switch (plainStatus) {
            case "NEW": {
                if (descriptor.orderType.toUpperCase() !== "MARKET") {
                    status = MidaOrderStatus.PENDING;
                }

                break;
            }
            case "PARTIALLY_FILLED":
            case "FILLED": {
                if (descriptor.isOrderWorking === false) {
                    status = MidaOrderStatus.EXECUTED;
                }

                break;
            }
            case "PENDING_CANCEL":
            case "CANCELED": {
                status = MidaOrderStatus.CANCELLED;

                break;
            }
            case "EXPIRED": {
                status = MidaOrderStatus.EXPIRED;

                break;
            }
            case "REJECTED": {
                status = MidaOrderStatus.REJECTED;
                this.rejection = MidaOrderRejection.UNKNOWN;

                console.log("Unknonw Binance Spot order reject reason");
                console.log(descriptor.orderRejectReason);

                break;
            }
        }

        if (descriptor.executionType.toUpperCase() === "TRADE") {
            this.onTrade(new BinanceSpotTrade({
                commission: decimal(descriptor.commission),
                commissionAsset: descriptor.commissionAsset,
                direction: this.#directives?.direction === MidaOrderDirection.BUY ? MidaTradeDirection.BUY : MidaTradeDirection.SELL,
                executionDate: lastUpdateDate,
                executionPrice: decimal(descriptor.priceLastTrade),
                id: descriptor.tradeId.toString(),
                orderId,
                positionId: "",
                purpose: this.#directives?.direction === MidaOrderDirection.BUY ? MidaTradePurpose.OPEN : MidaTradePurpose.CLOSE,
                status: MidaTradeStatus.EXECUTED,
                symbol: this.#directives?.symbol as string,
                tradingAccount: this.tradingAccount,
                volume: decimal(descriptor.lastTradeQuantity),
            }));
        }

        if (this.status !== status) {
            this.onStatusChange(status);
        }
    }

    #configureListeners (): void {
        this.#bybitEmitter.on("update", (event: MidaEvent): void => {
            const descriptor = event.descriptor;

            if (descriptor.eventType !== "executionReport") {
                return;
            }

            if (!this.id || descriptor?.orderId.toString() !== this.id) {
                return;
            }

            this.#onUpdate(descriptor);
        });
    }
}
