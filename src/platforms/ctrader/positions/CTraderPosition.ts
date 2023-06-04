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

import { decimal, MidaDecimal, } from "#decimals/MidaDecimal";
import { MidaOrder, } from "#orders/MidaOrder";
import { MidaOrderDirection, } from "#orders/MidaOrderDirection";
import { MidaPosition, } from "#positions/MidaPosition";
import { MidaPositionDirection, } from "#positions/MidaPositionDirection";
import { MidaPositionStatus, } from "#positions/MidaPositionStatus";
import { MidaProtectionChange, } from "#protections/MidaProtectionChange";
import { MidaProtectionChangeStatus, } from "#protections/MidaProtectionChangeStatus";
import { MidaProtectionDirectives, } from "#protections/MidaProtectionDirectives";
import { MidaEmitter, } from "#utilities/emitters/MidaEmitter";
import { GenericObject, } from "#utilities/GenericObject";
import { uuid, } from "#utilities/MidaUtilities";
import { CTraderAccount, } from "!/src/platforms/ctrader/CTraderAccount";
import { CTraderPositionParameters, } from "!/src/platforms/ctrader/positions/CTraderPositionParameters";

export class CTraderPosition extends MidaPosition {
    readonly #connection: CTraderConnection;
    readonly #cTraderEmitter: MidaEmitter;
    #updateEventUuid?: string;
    #rejectEventUuid?: string;
    readonly #protectionChangeRequests: Map<string, [ MidaProtectionDirectives, Function, ]>;

    public constructor ({
        id,
        symbol,
        tradingAccount,
        volume,
        direction,
        entryPrice,
        protection,
        connection,
        cTraderEmitter,
    }: CTraderPositionParameters) {
        super({
            id,
            symbol,
            volume,
            direction,
            entryPrice,
            tradingAccount,
            protection,
        });

        this.#connection = connection;
        this.#cTraderEmitter = cTraderEmitter;
        this.#updateEventUuid = undefined;
        this.#rejectEventUuid = undefined;
        this.#protectionChangeRequests = new Map();

        this.#configureListeners();
    }

    public override get tradingAccount (): CTraderAccount {
        return super.tradingAccount as CTraderAccount;
    }

    public override async getUsedMargin (): Promise<MidaDecimal> {
        if (this.status === MidaPositionStatus.CLOSED) {
            return decimal(0);
        }

        const plainPosition: GenericObject = this.tradingAccount.getPlainPositionById(this.id) as GenericObject;

        return decimal(plainPosition.usedMargin).divide(100);
    }

    public override async addVolume (volume: number): Promise<MidaOrder> {
        return this.tradingAccount.placeOrder({
            positionId: this.id,
            direction: this.direction === MidaPositionDirection.LONG ? MidaOrderDirection.BUY : MidaOrderDirection.SELL,
            volume: volume,
        });
    }

    public override async subtractVolume (volume: number): Promise<MidaOrder> {
        return this.tradingAccount.placeOrder({
            positionId: this.id,
            direction: this.direction === MidaPositionDirection.LONG ? MidaOrderDirection.SELL : MidaOrderDirection.BUY,
            volume: volume,
        });
    }

    public override async getUnrealizedSwap (): Promise<MidaDecimal> {
        if (this.status === MidaPositionStatus.CLOSED) {
            return decimal(0);
        }

        const plainPosition: GenericObject = this.tradingAccount.getPlainPositionById(this.id) as GenericObject;

        return decimal(plainPosition.swap).divide(100);
    }

    public override async getUnrealizedCommission (): Promise<MidaDecimal> {
        if (this.status === MidaPositionStatus.CLOSED) {
            return decimal(0);
        }

        const plainPosition: GenericObject = this.tradingAccount.getPlainPositionById(this.id) as GenericObject;

        return decimal(plainPosition.commission).divide(100).multiply(2);
    }

    public override async getUnrealizedGrossProfit (): Promise<MidaDecimal> {
        if (this.status === MidaPositionStatus.CLOSED) {
            return decimal(0);
        }

        const plainPosition: GenericObject = this.tradingAccount.getPlainPositionById(this.id) as GenericObject;

        return this.tradingAccount.getPlainPositionGrossProfit(plainPosition);
    }

    public override async changeProtection (protection: MidaProtectionDirectives): Promise<MidaProtectionChange> {
        const requestDescriptor: GenericObject = {
            positionId: this.id,
            stopLoss: this.stopLoss?.toNumber(),
            takeProfit: this.takeProfit?.toNumber(),
            trailingStopLoss: this.trailingStopLoss,
        };

        if ("stopLoss" in protection) {
            requestDescriptor.stopLoss = protection.stopLoss === undefined
                ? undefined : decimal(protection.stopLoss).toNumber();
        }

        if ("takeProfit" in protection) {
            requestDescriptor.takeProfit = protection.takeProfit === undefined
                ? undefined : decimal(protection.takeProfit).toNumber();
        }

        if ("trailingStopLoss" in protection) {
            requestDescriptor.trailingStopLoss = protection.trailingStopLoss === true;
        }

        const id: string = uuid();
        const protectionChangePromise: Promise<MidaProtectionChange> = new Promise((resolver: any) => {
            this.#protectionChangeRequests.set(id, [ protection, resolver, ]);
        });

        this.#sendCommand("ProtoOAAmendPositionSLTPReq", requestDescriptor, id);

        return protectionChangePromise;
    }

    #onUpdate (descriptor: GenericObject): void {
        const cTraderOrder: GenericObject = descriptor.order;
        const positionId: string = cTraderOrder?.positionId?.toString();
        const messageId: string = descriptor.clientMsgId;

        if (positionId && positionId === this.id) {
            switch (descriptor.executionType) {
                case "SWAP": {
                    // TODO: pass the real quantity
                    this.onSwap(decimal(0));

                    break;
                }
                case "ORDER_ACCEPTED":
                case "ORDER_CANCELLED":
                case "ORDER_REPLACED": {
                    if (cTraderOrder.orderType === "STOP_LOSS_TAKE_PROFIT") {
                        this.onProtectionChange(this.tradingAccount.normalizeProtection(descriptor.position));

                        const protectionChangeRequest: any[] | undefined = this.#protectionChangeRequests.get(messageId);

                        if (protectionChangeRequest) {
                            protectionChangeRequest[1]({
                                status: MidaProtectionChangeStatus.SUCCEEDED,
                                requestedProtection: protectionChangeRequest[0],
                            });
                        }
                    }

                    break;
                }
                case "ORDER_PARTIAL_FILL":
                case "ORDER_FILLED": {
                    const position: any = descriptor.position;

                    this.onEntryPriceUpdate(position.positionStatus === "POSITION_STATUS_OPEN" ? position.price : undefined);
                    this.onTrade(this.tradingAccount.normalizeTrade(descriptor.deal));

                    break;
                }
            }
        }

        if (descriptor?.position?.positionStatus === "POSITION_STATUS_CLOSED") {
            this.#removeEventsListeners();
        }
    }

    #configureListeners (): void {
        this.#updateEventUuid = this.#cTraderEmitter.on("execution", (event): void => {
            const descriptor: GenericObject = event.descriptor.descriptor;

            if (descriptor.ctidTraderAccountId.toString() === this.tradingAccount.id) {
                this.#onUpdate(descriptor);
            }
        });

        // <protection-validation-error>
        this.#rejectEventUuid = this.#cTraderEmitter.on("order-error", (event): void => {
            const descriptor: GenericObject = event.descriptor.descriptor;
            const messageId: string = descriptor.clientMsgId;
            const protectionChangeRequest: any[] | undefined = this.#protectionChangeRequests.get(messageId);

            if (protectionChangeRequest) {
                protectionChangeRequest[1]({
                    status: MidaProtectionChangeStatus.REJECTED,
                    requestedProtection: protectionChangeRequest[0],
                });
            }
        });
        // </protection-validation-error>
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

    async #sendCommand (payloadType: string, parameters?: GenericObject, messageId?: string): Promise<GenericObject> {
        return this.#connection.sendCommand(payloadType, {
            ctidTraderAccountId: this.tradingAccount.id,
            ...parameters ?? {},
        }, messageId);
    }
}
