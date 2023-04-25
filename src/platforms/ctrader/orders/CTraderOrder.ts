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

import { CTraderConnection, } from "@reiryoku/ctrader-layer";

import { date, MidaDate, } from "#dates/MidaDate";
import { MidaOrder, } from "#orders/MidaOrder";
import { MidaOrderRejection, } from "#orders/MidaOrderRejection";
import { MidaOrderStatus, } from "#orders/MidaOrderStatus";
import { MidaPosition, } from "#positions/MidaPosition";
import { MidaPositionStatus, } from "#positions/MidaPositionStatus";
import { MidaQueue, } from "#queues/MidaQueue";
import { MidaEmitter, } from "#utilities/emitters/MidaEmitter";
import { CTraderAccount, } from "!/src/platforms/ctrader/CTraderAccount";
import { CTraderOrderParameters, } from "!/src/platforms/ctrader/orders/CTraderOrderParameters";

export class CTraderOrder extends MidaOrder {
    // The uuid associated to the order request
    readonly #uuid: string;
    readonly #connection: CTraderConnection;
    readonly #cTraderEmitter: MidaEmitter;
    readonly #updateEventQueue: MidaQueue<Record<string, any>>;
    #updateEventUuid?: string;
    #rejectEventUuid?: string;

    // eslint-disable-next-line max-lines-per-function
    public constructor ({
        id,
        tradingAccount,
        symbol,
        requestedVolume,
        direction,
        purpose,
        limitPrice,
        stopPrice,
        requestedProtection,
        status,
        creationDate,
        lastUpdateDate,
        timeInForce,
        expirationDate,
        trades,
        rejection,
        isStopOut,
        label,
        uuid,
        connection,
        cTraderEmitter,
    }: CTraderOrderParameters) {
        super({
            id,
            tradingAccount,
            symbol,
            requestedVolume,
            direction,
            purpose,
            limitPrice,
            stopPrice,
            requestedProtection,
            status,
            creationDate,
            lastUpdateDate,
            timeInForce,
            expirationDate,
            trades,
            rejection,
            isStopOut,
            label,
        });

        this.#uuid = uuid;
        this.#connection = connection;
        this.#cTraderEmitter = cTraderEmitter;
        this.#updateEventQueue = new MidaQueue({ worker: (descriptor: Record<string, any>): Promise<void> => this.#onUpdate(descriptor), });
        this.#updateEventUuid = undefined;
        this.#rejectEventUuid = undefined;

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

    public override get tradingAccount (): CTraderAccount {
        return super.tradingAccount as CTraderAccount;
    }

    public override async cancel (): Promise<void> {
        if (this.status !== MidaOrderStatus.PENDING) {
            return;
        }

        await this.#connection.sendCommand("ProtoOACancelOrderReq", {
            ctidTraderAccountId: this.tradingAccount.id,
            orderId: this.id,
        });
    }

    // eslint-disable-next-line max-lines-per-function, complexity
    async #onUpdate (descriptor: Record<string, any>): Promise<void> {
        const order: Record<string, any> = descriptor.order;
        const orderId: string = order.orderId.toString();
        const orderCreationTimestamp: number = Number(order.tradeData.openTimestamp);

        if (!this.id && orderId) {
            this.id = orderId;
        }

        if (Number.isFinite(orderCreationTimestamp) && !this.creationDate) {
            this.creationDate = date(orderCreationTimestamp);
        }

        const lastUpdateTimestamp: number = Number(order.utcLastUpdateTimestamp);

        if (Number.isFinite(lastUpdateTimestamp) && (!this.lastUpdateDate || this.lastUpdateDate.timestamp !== lastUpdateTimestamp)) {
            this.lastUpdateDate = date(lastUpdateTimestamp);
        }

        switch (descriptor.executionType.toUpperCase()) {
            case "ORDER_ACCEPTED": {
                this.onStatusChange(MidaOrderStatus.ACCEPTED);

                if (order.orderType.toUpperCase() !== "MARKET") {
                    this.onStatusChange(MidaOrderStatus.PENDING);
                }

                break;
            }
            case "ORDER_PARTIAL_FILL":
            case "ORDER_FILLED": {
                if (!this.positionId) {
                    this.positionId = order.positionId.toString();
                }

                this.onTrade(this.tradingAccount.normalizeTrade(descriptor.deal));

                // Enters if the order is executed
                if (order.orderStatus.toUpperCase() === "ORDER_STATUS_FILLED") {
                    if (order.orderType.toUpperCase() === "MARKET" && this.requestedProtection) {
                        const position: MidaPosition | undefined = await this.getPosition();

                        if (position?.status === MidaPositionStatus.OPEN) {
                            await position.changeProtection(this.requestedProtection);
                        }
                    }

                    this.onStatusChange(MidaOrderStatus.EXECUTED);
                    this.#removeEventsListeners();
                }

                break;
            }
            case "ORDER_CANCELLED": {
                this.onStatusChange(MidaOrderStatus.CANCELLED);
                this.#removeEventsListeners();

                break;
            }
            case "ORDER_EXPIRED": {
                this.onStatusChange(MidaOrderStatus.EXPIRED);
                this.#removeEventsListeners();

                break;
            }
            case "ORDER_REJECTED": {
                this.#onReject(descriptor);

                break;
            }
        }
    }

    #onReject (descriptor: Record<string, any>): void {
        const currentDate: MidaDate = date();
        this.creationDate = currentDate;
        this.lastUpdateDate = currentDate;

        switch (descriptor.errorCode) {
            case "MARKET_CLOSED":
            case "SYMBOL_HAS_HOLIDAY": {
                this.rejection = MidaOrderRejection.MARKET_CLOSED;

                break;
            }
            case "SYMBOL_NOT_FOUND":
            case "UNKNOWN_SYMBOL": {
                this.rejection = MidaOrderRejection.SYMBOL_NOT_FOUND;

                break;
            }
            case "TRADING_DISABLED": {
                this.rejection = MidaOrderRejection.SYMBOL_TRADING_DISABLED;

                break;
            }
            case "NOT_ENOUGH_MONEY": {
                this.rejection = MidaOrderRejection.NOT_ENOUGH_MONEY;

                break;
            }
            case "TRADING_BAD_VOLUME": {
                this.rejection = MidaOrderRejection.INVALID_VOLUME;

                break;
            }
            default: {
                this.rejection = MidaOrderRejection.UNKNOWN;

                console.log("Unknown cTrader Open API error");
                console.log(descriptor);
                console.log("Consult the cTrader Open API documentation to find a complete explanation");
            }
        }

        this.onStatusChange(MidaOrderStatus.REJECTED);
        this.#removeEventsListeners();
    }

    #configureListeners (): void {
        // <order-execution>
        this.#updateEventUuid = this.#cTraderEmitter.on("execution", (event): void => {
            const descriptor: Record<string, any> = event.descriptor.descriptor;
            const orderId: string | undefined = descriptor?.order?.orderId?.toString();

            if (
                descriptor.ctidTraderAccountId.toString() === this.tradingAccount.id &&
                (orderId && orderId === this.id || descriptor.clientMsgId === this.#uuid)
            ) {
                this.#updateEventQueue.add(descriptor);
            }
        });
        // </order-execution>

        // <request-validation-errors>
        this.#rejectEventUuid = this.#cTraderEmitter.on("order-error", (event): void => {
            const descriptor: Record<string, any> = event.descriptor.descriptor;
            const orderId: string | undefined = descriptor?.order?.orderId?.toString();

            if (
                descriptor.ctidTraderAccountId.toString() === this.tradingAccount.id &&
                (orderId && orderId === this.id || descriptor.clientMsgId === this.#uuid)
            ) {
                this.#onReject(descriptor);
            }
        });
        // </request-validation-errors>
    }

    #removeEventsListeners (): void {
        if (this.#updateEventUuid) {
            this.#cTraderEmitter.removeEventListener(this.#updateEventUuid);

            this.#updateEventUuid = undefined;
        }

        if (this.#rejectEventUuid) {
            this.#cTraderEmitter.removeEventListener(this.#rejectEventUuid);

            this.#rejectEventUuid = undefined;
        }
    }
}
