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

import { MidaTradingAccountOperativity, } from "#accounts/MidaTradingAccountOperativity";
import { MidaTradingAccountParameters, } from "#accounts/MidaTradingAccountParameters";
import { MidaTradingAccountPositionAccounting, } from "#accounts/MidaTradingAccountPositionAccounting";
import { MidaAsset, } from "#assets/MidaAsset";
import { MidaAssetStatement, } from "#assets/MidaAssetStatement";
import { MidaDate, } from "#dates/MidaDate";
import { MidaDecimal, } from "#decimals/MidaDecimal";
import { unsupportedOperationError, } from "#errors/MidaErrorUtilities";
import { MidaEvent, } from "#events/MidaEvent";
import { MidaEventListener, } from "#events/MidaEventListener";
import { MidaOrder, } from "#orders/MidaOrder";
import { MidaOrderDirectives, } from "#orders/MidaOrderDirectives";
import { MidaPeriod, } from "#periods/MidaPeriod";
import { MidaTradingPlatform, } from "#platforms/MidaTradingPlatform";
import { MidaPosition, } from "#positions/MidaPosition";
import { MidaSymbol, } from "#symbols/MidaSymbol";
import { MidaSymbolFundingDescriptor, } from "#symbols/MidaSymbolFundingDescriptor";
import { MidaSymbolTradeStatus, } from "#symbols/MidaSymbolTradeStatus";
import { MidaTimeframe, } from "#timeframes/MidaTimeframe";
import { MidaTrade, } from "#trades/MidaTrade";
import { MidaEmitter, } from "#utilities/emitters/MidaEmitter";
import { GenericObject, } from "#utilities/GenericObject";
import { MidaMarketWatcher, } from "#watchers/MidaMarketWatcher";
import { MidaCryptoWithdrawalDirectives, } from "#withdrawals/MidaCryptoWithdrawalDirectives";

/** Represents a trading account */
export abstract class MidaTradingAccount {
    readonly #id: string;
    readonly #platform: MidaTradingPlatform;
    readonly #creationDate: MidaDate;
    readonly #primaryAsset: string;
    readonly #operativity: MidaTradingAccountOperativity;
    readonly #positionAccounting: MidaTradingAccountPositionAccounting;
    readonly #indicativeLeverage: MidaDecimal;
    readonly #emitter: MidaEmitter;

    protected constructor ({
        id,
        platform,
        creationDate,
        primaryAsset,
        operativity,
        positionAccounting,
        indicativeLeverage,
    }: MidaTradingAccountParameters) {
        this.#id = id;
        this.#platform = platform;
        this.#creationDate = creationDate;
        this.#primaryAsset = primaryAsset;
        this.#operativity = operativity;
        this.#positionAccounting = positionAccounting;
        this.#indicativeLeverage = indicativeLeverage;
        this.#emitter = new MidaEmitter();
    }

    /** The account id */
    public get id (): string {
        return this.#id;
    }

    /** The account trading platform */
    public get platform (): MidaTradingPlatform {
        return this.#platform;
    }

    /** The account creation date */
    public get creationDate (): MidaDate {
        return this.#creationDate;
    }

    /** The account primary asset */
    public get primaryAsset (): string {
        return this.#primaryAsset;
    }

    /** The account operativity (demo or real) */
    public get operativity (): MidaTradingAccountOperativity {
        return this.#operativity;
    }

    /** The account position accounting (hedged or netted) */
    public get positionAccounting (): MidaTradingAccountPositionAccounting {
        return this.#positionAccounting;
    }

    /** The account indicative leverage */
    public get indicativeLeverage (): MidaDecimal {
        return this.#indicativeLeverage;
    }

    /** Indicates if the account operativity is demo */
    public get isDemo (): boolean {
        return this.operativity === MidaTradingAccountOperativity.DEMO;
    }

    /** Indicates if the account positioning is hedged */
    public get isHedged (): boolean {
        return this.#positionAccounting === MidaTradingAccountPositionAccounting.HEDGED;
    }

    /** Used to check if the account is still connected */
    public abstract stillConnected (): Promise<boolean>;

    /** Used to get the account primary asset balance */
    public abstract getBalance (): Promise<MidaDecimal>;

    /** Used to get the account assets balance (all the owned assets) */
    public abstract getBalanceSheet (): Promise<MidaAssetStatement[]>;

    /** Used to get the account primary asset balance if all the owned assets were liquidated for it */
    public abstract getEquity (): Promise<MidaDecimal>;

    /** Used to get the account used margin */
    public abstract getUsedMargin (): Promise<MidaDecimal>;

    /**
     * Used to get the account most recent orders for a symbol
     * @param symbol The string representation of the symbol
     */
    public abstract getOrders (symbol: string): Promise<MidaOrder[]>;

    /** Used to get the account pending orders */
    public abstract getPendingOrders (): Promise<MidaOrder[]>;

    /**
     * Used to get the account most recent trades for a symbol
     * @param symbol The string representation of the symbol
     */
    public abstract getTrades (symbol: string): Promise<MidaTrade[]>;

    /** Used to get the account open positions */
    public abstract getOpenPositions (): Promise<MidaPosition[]>;

    /**
     * Used to place an order
     * @param directives The order directives
     */
    public abstract placeOrder (directives: MidaOrderDirectives): Promise<MidaOrder>;

    /** Used to get the account available assets */
    public abstract getAssets (): Promise<string[]>;

    /**
     * Used to get a complete asset by its string representation
     * @param asset The string representation of the asset
     */
    public abstract getAsset (asset: string): Promise<MidaAsset | undefined>;

    /**
     * Used to get the balance of an asset
     * @param asset The string representation of the asset
     */
    public abstract getAssetBalance (asset: string): Promise<MidaAssetStatement>;

    /**
     * Used to get the deposit address of a crypto asset
     * @param asset The string representation of the asset
     * @param net The string representation of the network
     */
    public getCryptoAssetDepositAddress (asset: string, net: string): Promise<string> {
        throw unsupportedOperationError(this.#platform);
    }

    /**
     * Used to withdraw crypto to an address
     * @param directives The withdrawal directives
     */
    public withdrawCrypto (directives: MidaCryptoWithdrawalDirectives): Promise<string> {
        throw unsupportedOperationError(this.#platform);
    }

    /** Used to get the account available symbols */
    public abstract getSymbols (): Promise<string[]>;

    /**
     * Used to get a complete symbol by its string representation
     * @param symbol The string representation of the symbol
     */
    public abstract getSymbol (symbol: string): Promise<MidaSymbol | undefined>;

    /**
     * Indicates if a symbol market is open
     * @param symbol The string representation of the symbol
     */
    public abstract isSymbolMarketOpen (symbol: string): Promise<boolean>;

    /**
     * Used to get the most recent periods of a symbol
     * @param symbol The string representation of the symbol
     * @param timeframe The periods timeframe
     */
    public abstract getSymbolPeriods (symbol: string, timeframe: MidaTimeframe): Promise<MidaPeriod[]>;

    /**
     * Used to get the current best bid price of a symbol
     * @param symbol The string representation of the symbol
     */
    public abstract getSymbolBid (symbol: string): Promise<MidaDecimal>;

    /**
     * Used to get the current best ask price of a symbol
     * @param symbol The string representation of the symbol
     */
    public abstract getSymbolAsk (symbol: string): Promise<MidaDecimal>;

    /**
     * Used to get the current average price of a symbol
     * @param symbol The string representation of the symbol
     */
    public abstract getSymbolAverage (symbol: string): Promise<MidaDecimal>;

    /**
     * Used to get the current trade status of a symbol
     * @param symbol The string representation of the symbol
     */
    public abstract getSymbolTradeStatus (symbol: string): Promise<MidaSymbolTradeStatus>;

    /**
     * Used to get the current funding descriptor of a symbol
     * @param symbol The string representation of the symbol
     */
    public getSymbolFundingDescriptor (symbol: string): Promise<MidaSymbolFundingDescriptor> {
        throw unsupportedOperationError(this.#platform);
    }

    /**
     * Used to watch the ticks of a symbol
     * @see MidaMarketWatcher
     * @param symbol The string representation of the symbol
     */
    public async watchSymbolTicks (symbol: string): Promise<void> {
        throw unsupportedOperationError(this.#platform);
    }

    /**
     * Used to watch the periods of a symbol
     * @see MidaMarketWatcher
     * @param symbol The string representation of the symbol
     * @param timeframe The timeframe to watch
     */
    public async watchSymbolPeriods (symbol: string, timeframe: MidaTimeframe): Promise<void> {
        throw unsupportedOperationError(this.#platform);
    }

    /**
     * Used to get the account orders in a specific time range
     * @param fromTimestamp The start of the time range
     * @param toTimestamp The end of the time range
     */
    public async getOrdersHistory (fromTimestamp: number, toTimestamp: number): Promise<MidaOrder[]> {
        throw unsupportedOperationError(this.#platform);
    }

    /**
     * Used to get the account trades in a specific time range
     * @param fromTimestamp The start of the time range
     * @param toTimestamp The end of the time range
     */
    public async getTradesHistory (fromTimestamp: number, toTimestamp: number): Promise<MidaTrade[]> {
        throw unsupportedOperationError(this.#platform);
    }

    /** Used to get the trading platform date */
    public abstract getDate (): Promise<MidaDate>;

    /** Used to get account the free margin */
    public async getFreeMargin (): Promise<MidaDecimal> {
        const [ equity, usedMargin, ]: MidaDecimal[] = await Promise.all([ this.getEquity(), this.getUsedMargin(), ]);

        return equity.subtract(usedMargin);
    }

    /** Used to get the account margin level, returns NaN if no margin is used */
    public async getMarginLevel (): Promise<MidaDecimal | undefined> {
        const [ equity, usedMargin, ]: MidaDecimal[] = await Promise.all([ this.getEquity(), this.getUsedMargin(), ]);

        if (usedMargin.equals(0)) {
            return undefined;
        }

        return equity.divide(usedMargin).multiply(100);
    }

    public async getCryptoDepositAddress (asset: string, net: string): Promise<string> {
        return this.getCryptoAssetDepositAddress(asset, net);
    }

    public on (type: string): Promise<MidaEvent>;
    public on (type: string, listener: MidaEventListener): string;
    public on (type: string, listener?: MidaEventListener): Promise<MidaEvent> | string {
        if (!listener) {
            return this.#emitter.on(type);
        }

        return this.#emitter.on(type, listener);
    }

    public removeEventListener (uuid: string): void {
        this.#emitter.removeEventListener(uuid);
    }

    protected notifyListeners (type: string, descriptor?: GenericObject): void {
        this.#emitter.notifyListeners(type, descriptor);
    }
}
