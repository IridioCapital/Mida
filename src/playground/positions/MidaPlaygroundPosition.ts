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

import { decimal, MidaDecimal, } from "#decimals/MidaDecimal";
import { MidaOrder, } from "#orders/MidaOrder";
import { MidaOrderDirection, } from "#orders/MidaOrderDirection";
import { MidaPosition, } from "#positions/MidaPosition";
import { MidaPositionDirection, } from "#positions/MidaPositionDirection";
import { MidaPositionStatus, } from "#positions/MidaPositionStatus";
import { MidaProtection, } from "#protections/MidaProtection";
import { MidaProtectionChange, } from "#protections/MidaProtectionChange";
import { MidaProtectionChangeRejection, } from "#protections/MidaProtectionChangeRejection";
import { MidaProtectionChangeStatus, } from "#protections/MidaProtectionChangeStatus";
import { MidaProtectionDirectives, } from "#protections/MidaProtectionDirectives";
import { MidaSymbol, } from "#symbols/MidaSymbol";
import { MidaEmitter, } from "#utilities/emitters/MidaEmitter";
import { MidaPlaygroundAccount, } from "!/src/playground/accounts/MidaPlaygroundAccount";
import { MidaPlaygroundPositionParameters, } from "!/src/playground/positions/MidaPlaygroundPositionParameters";
import { MidaPlaygroundTrade, } from "!/src/playground/trades/MidaPlaygroundTrade";

export class MidaPlaygroundPosition extends MidaPosition {
    readonly #engineEmitter: MidaEmitter;
    readonly #openingTrades: MidaPlaygroundTrade[];
    readonly #closingTrades: MidaPlaygroundTrade[];
    #realizedCommission: MidaDecimal;
    #realizedProfit: MidaDecimal;

    public constructor ({
        id,
        symbol,
        tradingAccount,
        volume,
        direction,
        entryPrice,
        protection,
        engineEmitter,
    }: MidaPlaygroundPositionParameters) {
        super({
            id,
            symbol,
            volume,
            direction,
            entryPrice,
            tradingAccount,
            protection,
        });

        this.#engineEmitter = engineEmitter;
        this.#openingTrades = [];
        this.#closingTrades = [];
        this.#realizedCommission = decimal(0);
        this.#realizedProfit = decimal(0);

        this.#configureListeners();
    }

    public override get tradingAccount (): MidaPlaygroundAccount {
        return super.tradingAccount as MidaPlaygroundAccount;
    }

    public get openingTrades (): MidaPlaygroundTrade[] {
        return this.#openingTrades;
    }

    public get closingTrades (): MidaPlaygroundTrade[] {
        return this.#closingTrades;
    }

    public get trades (): MidaPlaygroundTrade[] {
        return [ ...this.openingTrades, ...this.closingTrades, ];
    }

    public get realizedCommission (): MidaDecimal {
        return this.#realizedCommission;
    }

    public get realizedProfit (): MidaDecimal {
        return this.#realizedProfit;
    }

    // Leverage is not supported for now (please just set a high balance)
    public override async getUsedMargin (): Promise<MidaDecimal> {
        return decimal(0);
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

    // TODO
    public override async getUnrealizedSwap (): Promise<MidaDecimal> {
        return decimal(0);
    }

    // Commission is applied at every trade so total commission is always
    // realized, use realizedCommission property
    public override async getUnrealizedCommission (): Promise<MidaDecimal> {
        return decimal(0);
    }

    public override async getUnrealizedGrossProfit (): Promise<MidaDecimal> {
        if (this.status === MidaPositionStatus.CLOSED) {
            return decimal(0);
        }

        const entryPrice: MidaDecimal = this.entryPrice as MidaDecimal;
        const completeSymbol: MidaSymbol = await this.tradingAccount.getSymbol(this.symbol) as MidaSymbol;
        const [ bid, ask, ] = await Promise.all([ this.tradingAccount.getSymbolBid(this.symbol), this.tradingAccount.getSymbolAsk(this.symbol), ]);
        let grossProfit: MidaDecimal;

        if (this.direction === MidaPositionDirection.LONG) {
            grossProfit = bid.sub(entryPrice);
        }
        else {
            grossProfit = entryPrice.sub(ask);
        }

        return grossProfit.mul(this.volume).mul(completeSymbol.lotUnits);
    }

    public override async changeProtection (protection: MidaProtectionDirectives): Promise<MidaProtectionChange> {
        const requestedProtection: MidaProtectionDirectives = protection;
        const [ bid, ask, ] =
                await Promise.all([ this.tradingAccount.getSymbolBid(this.symbol), this.tradingAccount.getSymbolAsk(this.symbol), ]);
        let rejected: boolean = false;

        // <protection-validation>
        if (this.direction === MidaPositionDirection.LONG) {
            if ("stopLoss" in requestedProtection && decimal(requestedProtection.stopLoss).greaterThanOrEqual(bid)) {
                rejected = true;
            }

            if ("takeProfit" in requestedProtection && decimal(requestedProtection.takeProfit).lessThanOrEqual(bid)) {
                rejected = true;
            }
        }
        else {
            if ("stopLoss" in requestedProtection && decimal(requestedProtection.stopLoss).lessThanOrEqual(ask)) {
                rejected = true;
            }

            if ("takeProfit" in requestedProtection && decimal(requestedProtection.takeProfit).greaterThanOrEqual(ask)) {
                rejected = true;
            }
        }

        if (rejected) {
            return {
                status: MidaProtectionChangeStatus.REJECTED,
                rejection: MidaProtectionChangeRejection.INVALID_PROTECTION,
                requestedProtection,
            };
        }
        // </protection-validation>

        await this.onProtectionChange(requestedProtection as MidaProtection);

        return {
            status: MidaProtectionChangeStatus.SUCCEEDED,
            requestedProtection,
        };
    }

    #configureListeners (): void {
        this.#engineEmitter.on("trade", async (event) => {
            const { trade, } = event.descriptor;

            if (trade.positionId !== this.id) {
                return;
            }

            this.#realizedCommission =
                    this.#realizedCommission.add(trade.commission);

            if (trade.isOpening) {
                this.#openingTrades.push(trade);
            }
            else {
                const profit = await this.getUnrealizedGrossProfit();
                this.#realizedProfit =
                        this.#realizedProfit.add(profit.mul(trade.volume.div(this.volume)));

                this.#closingTrades.push(trade);
            }

            this.onTrade(trade);
            this.#updateEntryPrice();
        });
    }

    #updateEntryPrice (): void {
        let pivotVolume: MidaDecimal = this.volume;

        if (this.status === MidaPositionStatus.CLOSED) {
            this.onEntryPriceUpdate(undefined);

            return;
        }

        const openingTrades: MidaPlaygroundTrade[] = this.openingTrades;
        let entryPrice: MidaDecimal = decimal(0);

        // @ts-ignore
        openingTrades.sort((a: MidaPlaygroundTrade, b: MidaPlaygroundTrade) => a.executionDate.timestamp - b.executionDate.timestamp);

        for (const trade of openingTrades) {
            const remainingVolume: MidaDecimal = pivotVolume.sub(trade.volume);

            if (remainingVolume.lessThan(0)) {
                entryPrice = entryPrice.add(pivotVolume.mul(trade.executionPrice as MidaDecimal));
                pivotVolume = decimal(0);
            }
            else {
                entryPrice = entryPrice.add(trade.volume.mul(trade.executionPrice as MidaDecimal));
                pivotVolume = remainingVolume;
            }
        }

        if (!pivotVolume.isZero()) {
            console.log("Error during position entry price calculation");
        }

        this.onEntryPriceUpdate(entryPrice.div(this.volume));
    }
}
