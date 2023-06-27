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

import { MidaTradingAccount, } from "#accounts/MidaTradingAccount";
import { date, MidaDate, } from "#dates/MidaDate";
import { MidaDateConvertible, } from "#dates/MidaDateConvertible";
import { decimal, MidaDecimal, } from "#decimals/MidaDecimal";
import { MidaDecimalConvertible, } from "#decimals/MidaDecimalConvertible";
import { MidaEvent, } from "#events/MidaEvent";
import { MidaEventListener, } from "#events/MidaEventListener";
import { logger, } from "#loggers/MidaLogger";
import { MidaOrder, } from "#orders/MidaOrder";
import { MidaOrderDirection, } from "#orders/MidaOrderDirection";
import { MidaOrderDirectives, } from "#orders/MidaOrderDirectives";
import { MidaOrderExecutionType, } from "#orders/MidaOrderExecutionType";
import { MidaOrderPurpose, } from "#orders/MidaOrderPurpose";
import { MidaOrderRejection, } from "#orders/MidaOrderRejection";
import { MidaOrderStatus, } from "#orders/MidaOrderStatus";
import { MidaOrderTimeInForce, } from "#orders/MidaOrderTimeInForce";
import { MidaPeriod, } from "#periods/MidaPeriod";
import { MidaPosition, } from "#positions/MidaPosition";
import { MidaPositionDirection, } from "#positions/MidaPositionDirection";
import { MidaPositionStatus, } from "#positions/MidaPositionStatus";
import { MidaProtection, } from "#protections/MidaProtection";
import { MidaProtectionDirectives, } from "#protections/MidaProtectionDirectives";
import { MidaSymbol, } from "#symbols/MidaSymbol";
import { MidaTick, } from "#ticks/MidaTick";
import { MidaTimeframe, } from "#timeframes/MidaTimeframe";
import { MidaTrade, } from "#trades/MidaTrade";
import { MidaTradeDirection, } from "#trades/MidaTradeDirection";
import { MidaTradePurpose, } from "#trades/MidaTradePurpose";
import { MidaTradeStatus, } from "#trades/MidaTradeStatus";
import { MidaEmitter, } from "#utilities/emitters/MidaEmitter";
import { createOrderResolver, uuid, } from "#utilities/MidaUtilities";
import { MidaPlaygroundAccount, } from "!/src/playground/accounts/MidaPlaygroundAccount";
import { MidaPlaygroundAccountConfiguration, } from "!/src/playground/accounts/MidaPlaygroundAccountConfiguration";
import { MidaPlaygroundCommissionCustomizer, } from "!/src/playground/customizers/MidaPlaygroundCommissionCustomizer";
import { MidaPlayground, } from "!/src/playground/MidaPlayground";
import { MidaPlaygroundEngineElapsedData, } from "!/src/playground/MidaPlaygroundEngineElapsedData";
import { MidaPlaygroundEngineParameters, } from "!/src/playground/MidaPlaygroundEngineParameters";
import { tickFromPeriod, } from "!/src/playground/MidaPlaygroundUtilities";
import { MidaPlaygroundOrder, } from "!/src/playground/orders/MidaPlaygroundOrder";
import { MidaPlaygroundPosition, } from "!/src/playground/positions/MidaPlaygroundPosition";
import { MidaPlaygroundTrade, } from "!/src/playground/trades/MidaPlaygroundTrade";

/*
 * 5W (Who, What, Where, When, Why)
 * This is a trading simulator created by Vasile Pește, Reiryoku Technologies and its contributors
*/

/**
 * *** *** *** Parameters and Features Documentation *** *** ***
 *
 * Feed Confirmation:
 * The parameter allowing to stop the engine from emitting new data until your logic
 * has completed processing the current data.
 * The Problem: when backtesting with Trading Systems, the engine might emit ticks
 * when the current tick is still being processed by the trading system logic, since
 * the engine and trading system are asynchronous and don't know each other, this can
 * lead to unexpected behaviour for example executing an order at an unexpected price.
 *
 * If waitFeedConfirmation is set to true and elapseTime is used, nextFeed() must
 * be invoked by the trading system when its data processing has finished
 */

export class MidaPlaygroundEngine {
    #localDate: MidaDate;

    // <generators>
    readonly #ticksGenerators: Record<string, AsyncGenerator<MidaTick | undefined>>;
    readonly #periodsGenerators: Record<string, Record<string, AsyncGenerator<MidaPeriod | undefined>>>;
    // </generators>

    // <ticks>
    #savedTicksLimit: number;
    readonly #localTicks: Record<string, MidaTick[]>;
    readonly #lastTicks: Record<string, MidaTick>;
    // </ticks>

    // <periods>
    #savedPeriodsLimit: number;
    readonly #localPeriods: Record<string, Record<string, MidaPeriod[]>>;
    // </periods>

    readonly #orders: Record<string, MidaPlaygroundOrder>; // For faster lookups
    readonly #ordersArray: MidaPlaygroundOrder[]; // For faster iterations

    readonly #trades: Record<string, MidaPlaygroundTrade>; // For faster lookups
    readonly #tradesArray: MidaPlaygroundTrade[]; // For faster iterations

    readonly #positions: Record<string, MidaPlaygroundPosition>; // For faster lookups
    readonly #positionsArray: MidaPlaygroundPosition[]; // For faster iterations

    readonly #tradingAccounts: Record<string, MidaPlaygroundAccount>;
    #commissionCustomizer?: MidaPlaygroundCommissionCustomizer;
    #waitFeedConfirmation: boolean;
    #feedResolver?: () => void;
    #feedResolverPromise: Promise<void> | undefined;

    readonly #emitter: MidaEmitter;
    readonly #protectedEmitter: MidaEmitter;

    public constructor ({
        localDate,
        commissionCustomizer,
        savedTicksLimit,
        savedPeriodsLimit,
    }: MidaPlaygroundEngineParameters = {}) {
        this.#localDate = date(localDate ?? 0);
        this.#ticksGenerators = {};
        this.#periodsGenerators = {};
        this.#savedTicksLimit = savedTicksLimit ?? 1000;
        this.#localTicks = {};
        this.#lastTicks = {};
        this.#savedPeriodsLimit = savedPeriodsLimit ?? 1000;
        this.#localPeriods = {};
        this.#orders = {};
        this.#ordersArray = [];
        this.#trades = {};
        this.#tradesArray = [];
        this.#positions = {};
        this.#positionsArray = [];
        this.#tradingAccounts = {};
        this.#commissionCustomizer = commissionCustomizer;
        this.#waitFeedConfirmation = false;
        this.#feedResolver = undefined;
        this.#feedResolverPromise = undefined;
        this.#emitter = new MidaEmitter();
        this.#protectedEmitter = new MidaEmitter();
    }

    public get localDate (): MidaDate {
        return this.#localDate;
    }

    public get orders (): MidaOrder[] {
        return this.#ordersArray;
    }

    public get trades (): MidaTrade[] {
        return this.#tradesArray;
    }

    public get positions (): MidaPosition[] {
        return this.#positionsArray;
    }

    public get savedTicksLimit (): number {
        return this.#savedTicksLimit;
    }

    public set savedTicksLimit (limit: number) {
        this.#savedTicksLimit = limit;
    }

    public get savedPeriodsLimit (): number {
        return this.#savedPeriodsLimit;
    }

    public set savedPeriodsLimit (limit: number) {
        this.#savedPeriodsLimit = limit;
    }

    public get waitFeedConfirmation (): boolean {
        return this.#waitFeedConfirmation;
    }

    public set waitFeedConfirmation (waitFeedConfirmation: boolean) {
        this.#waitFeedConfirmation = waitFeedConfirmation;
    }

    public setLocalDate (date: MidaDateConvertible): void {
        this.#localDate = new MidaDate(date);
    }

    public setTicksGenerator (symbol: string, generator: AsyncGenerator<MidaTick | undefined>): void {
        this.#ticksGenerators[symbol] = generator;
    }

    public setPeriodsGenerator (symbol: string, timeframe: MidaTimeframe, generator: AsyncGenerator<MidaPeriod | undefined>): void {
        if (!this.#periodsGenerators[symbol]) {
            this.#periodsGenerators[symbol] = {};
        }

        this.#periodsGenerators[symbol][timeframe] = generator;
    }

    public setCommissionCustomizer (customizer?: MidaPlaygroundCommissionCustomizer): void {
        this.#commissionCustomizer = customizer;
    }

    public async getSymbolExchangeRate (symbol: string): Promise<MidaDecimal[]> {
        let lastTick: MidaTick | undefined = this.#lastTicks[symbol];

        if (!lastTick) {
            for (const tick of this.#localTicks[symbol] ?? []) {
                if (tick.date.timestamp <= this.#localDate.timestamp) {
                    lastTick = tick;

                    this.#lastTicks[symbol] = tick;
                }
            }
        }

        if (!lastTick) {
            throw new Error("No quotes available");
        }

        return [ lastTick.bid, lastTick.ask, ];
    }

    public async getSymbolBid (symbol: string): Promise<MidaDecimal> {
        return (await this.getSymbolExchangeRate(symbol))[0];
    }

    public async getSymbolAsk (symbol: string): Promise<MidaDecimal> {
        return (await this.getSymbolExchangeRate(symbol))[1];
    }

    public async getSymbolPeriods (symbol: string, timeframe: MidaTimeframe): Promise<MidaPeriod[]> {
        return this.#localPeriods[symbol][timeframe] ?? [];
    }

    // eslint-disable-next-line max-lines-per-function
    public async placeOrder (tradingAccount: MidaPlaygroundAccount, directives: MidaOrderDirectives): Promise<MidaPlaygroundOrder> {
        const positionId: string | undefined = directives.positionId;
        let symbol: string;
        let purpose: MidaOrderPurpose;

        if (positionId) {
            const position: MidaPosition | undefined = await this.getOpenPositionById(positionId);

            if (!position) {
                throw new Error("Position not found");
            }

            symbol = position.symbol;

            if (
                directives.direction === MidaOrderDirection.BUY && position.direction === MidaPositionDirection.LONG ||
                directives.direction === MidaOrderDirection.SELL && position.direction === MidaPositionDirection.SHORT
            ) {
                purpose = MidaOrderPurpose.OPEN;
            }
            else {
                purpose = MidaOrderPurpose.CLOSE;
            }
        }
        else {
            symbol = directives.symbol as string;
            purpose = MidaOrderPurpose.OPEN; // Hedged account, always open a position if no specific position is impacted
        }

        const creationDate: MidaDate = this.#localDate;
        const order: MidaPlaygroundOrder = new MidaPlaygroundOrder({
            id: uuid(),
            tradingAccount,
            symbol,
            requestedVolume: decimal(directives.volume),
            direction: directives.direction,
            purpose,
            limitPrice: directives.limit !== undefined ? decimal(directives.limit) : undefined,
            stopPrice: directives.stop !== undefined ? decimal(directives.stop) : undefined,
            status: MidaOrderStatus.REQUESTED,
            creationDate,
            lastUpdateDate: creationDate,
            positionId,
            trades: [],
            timeInForce: directives.timeInForce ?? MidaOrderTimeInForce.GOOD_TILL_CANCEL,
            isStopOut: false,
            engineEmitter: this.#protectedEmitter,
            requestedProtection: directives.protection,
        });

        this.#orders[order.id] = order;
        this.#ordersArray.push(order);

        const resolver: Promise<MidaPlaygroundOrder> = createOrderResolver(order, directives.resolverEvents) as Promise<MidaPlaygroundOrder>;
        const listeners: { [eventType: string]: MidaEventListener } = directives.listeners ?? {};

        for (const eventType of Object.keys(listeners)) {
            order.on(eventType, listeners[eventType]);
        }

        this.acceptOrder(order.id);

        if (order.executionType === MidaOrderExecutionType.MARKET) {
            this.tryExecuteOrder(order); // Not necessary to await because of resolver
        }
        else {
            this.moveOrderToPending(order.id);

            // Used to check if the pending order can be executed at the current tick
            this.#updatePendingOrder(order, this.#lastTicks[symbol]); // Not necessary to await because of resolver
        }

        return resolver;
    }

    /**
     * Elapses a given amount of time (triggering the respective market data)
     * @param seconds Amount of seconds to elapse
     */
    // eslint-disable-next-line max-lines-per-function
    public async elapseTime (seconds: number): Promise<MidaPlaygroundEngineElapsedData> {
        if (seconds <= 0) {
            return {
                elapsedTicks: [],
                elapsedPeriods: [],
            };
        }

        const previousDate: MidaDate = this.#localDate;
        const currentDate: MidaDate = previousDate.addSeconds(seconds);

        // <feed-ticks-from-generators>
        const elapsedTicks: MidaTick[] = [];

        // Assumption: generated ticks are ordered by time
        for (const [ symbol, generator, ] of Object.entries(this.#ticksGenerators)) {
            while (true) {
                const tick: MidaTick | undefined = (await generator.next()).value;

                if (!tick) {
                    logger.info(`Playground | ${symbol} ticks generator has reached its end`);

                    break;
                }

                // Terminate generation if a tick of the future is encountered
                // (assume that generated ticks are ordered by time)
                if (tick.date.timestamp > currentDate.timestamp) {
                    break;
                }

                if (tick.date.timestamp > previousDate.timestamp) {
                    elapsedTicks.push(tick);
                }
            }
        }
        // </feed-ticks-from-generators>

        // <feed-periods-from-generators>
        const elapsedPeriods: MidaPeriod[] = [];

        for (const [ symbol, timeframesMap, ] of Object.entries(this.#periodsGenerators)) {
            for (const [ timeframe, generator, ] of Object.entries(timeframesMap)) {
                while (true) {
                    const period: MidaPeriod | undefined = (await generator.next()).value;

                    if (!period) {
                        logger.info(`Playground | ${symbol} ${timeframe} periods generator has reached its end`);

                        break;
                    }

                    // TODO: Trigger also opened candles, not only closed
                    // Terminate generation if a period of the future is encountered
                    // (assume that generated periods are ordered by time)
                    if (period.endDate.timestamp > currentDate.timestamp) {
                        break;
                    }

                    if (period.endDate.timestamp > previousDate.timestamp) {
                        elapsedPeriods.push(period);
                    }
                }
            }
        }
        // </feed-periods-from-generators>

        const elapsedData: (MidaTick | MidaPeriod)[] = [ ...elapsedTicks, ...elapsedPeriods, ];

        elapsedData.sort((a: MidaTick | MidaPeriod, b: MidaTick | MidaPeriod): number => {
            const left: number = a instanceof MidaTick ? a.date.timestamp : a.endDate.timestamp;
            const right: number = b instanceof MidaTick ? b.date.timestamp : b.endDate.timestamp;

            return left - right;
        });

        logger.info(`Playground | Preparing to process ${elapsedTicks.length} ticks and ${elapsedPeriods.length} periods`);

        for (let i = 0, length = elapsedData.length; i < length; ++i) {
            const data: MidaTick | MidaPeriod = elapsedData[i];

            if (data instanceof MidaTick) {
                await this.#processTick(data);
            }
            else {
                await this.#processPeriod(data);
            }
        }

        this.#localDate = currentDate;

        logger.info("Playground | Elapse completed");

        return {
            elapsedTicks,
            elapsedPeriods,
        };
    }

    public async elapseTicks (quantity: number = 1): Promise<MidaPlaygroundEngineElapsedData> {
        if (quantity <= 0) {
            return {
                elapsedTicks: [],
                elapsedPeriods: [],
            };
        }

        const currentTimestamp = this.#localDate.timestamp;

        // <feed-ticks-from-generators>
        const elapsedTicks: MidaTick[] = [];

        // Assumption: generated ticks are ordered by time
        for (const [ symbol, generator, ] of Object.entries(this.#ticksGenerators)) {
            while (true) {
                const tick: MidaTick | undefined = (await generator.next()).value;

                if (!tick) {
                    logger.info(`Playground | ${symbol} ticks generator has reached its end`);

                    break;
                }

                if (tick.date.timestamp > currentTimestamp) {
                    elapsedTicks.push(tick);
                }

                if (elapsedTicks.length >= quantity) {
                    break;
                }
            }
        }
        // </feed-ticks-from-generators>

        for (let i = 0, length = elapsedTicks.length; i < length; ++i) {
            await this.#processTick(elapsedTicks[i]);
        }

        return {
            elapsedTicks,
            elapsedPeriods: [],
        };
    }

    // <feed-confirmation>
    public nextFeed (): void {
        if (this.#feedResolver) {
            this.#feedResolver();

            this.#feedResolver = undefined;
        }
    }
    // </feed-confirmation>

    public addSymbolTicks (symbol: string, ticks: MidaTick[]): void {
        const localTicks: MidaTick[] = this.getSymbolTicks(symbol);
        const updatedTicks: MidaTick[] = [ ...localTicks, ...ticks, ];

        updatedTicks.sort((a: MidaTick, b: MidaTick): number => a.date.timestamp - b.date.timestamp);

        this.#localTicks[symbol] =
                this.savedTicksLimit > 0 ? updatedTicks.slice(-this.savedTicksLimit) : updatedTicks;
    }

    public addSymbolPeriods (symbol: string, periods: MidaPeriod[]): void {
        const timeframe: MidaTimeframe = periods[0].timeframe;
        const localPeriods: MidaPeriod[] = this.#localPeriods[symbol]?.[timeframe] ?? [];
        const updatedPeriods: MidaPeriod[] = localPeriods.concat(periods);

        updatedPeriods.sort((a: MidaPeriod, b: MidaPeriod): number => a.startDate.timestamp - b.startDate.timestamp);

        const cappedPeriods: MidaPeriod[] =
                this.savedPeriodsLimit > 0 ? updatedPeriods.slice(-this.savedPeriodsLimit) : updatedPeriods;

        if (!this.#localPeriods[symbol]) {
            this.#localPeriods[symbol] = {};
        }

        this.#localPeriods[symbol][timeframe] = cappedPeriods;
    }

    public getSymbolTicks (symbol: string): MidaTick[] {
        return this.#localTicks[symbol] ?? [];
    }

    public getOrdersByAccount (tradingAccount: MidaPlaygroundAccount): MidaPlaygroundOrder[] {
        return this.#ordersArray
            .filter((order: MidaOrder) => tradingAccount === order.tradingAccount);
    }

    public getTradesByAccount (tradingAccount: MidaPlaygroundAccount): MidaPlaygroundTrade[] {
        return this.#tradesArray
            .filter((trade: MidaTrade) => tradingAccount === trade.tradingAccount);
    }

    public async getPendingOrders (): Promise<MidaPlaygroundOrder[]> {
        const pendingOrders: MidaPlaygroundOrder[] = [];

        for (const account of Object.values(this.#tradingAccounts)) {
            pendingOrders.push(...await account.getPendingOrders());
        }

        return pendingOrders;
    }

    public async getOpenPositions (): Promise<MidaPlaygroundPosition[]> {
        const openPositions = [];

        for (let i = 0, length = this.#positionsArray.length; i < length; ++i) {
            const position: MidaPlaygroundPosition = this.#positionsArray[i];

            if (position.status === MidaPositionStatus.OPEN) {
                openPositions.push(position);
            }
        }

        return openPositions;
    }

    public async getOpenPositionById (id: string): Promise<MidaPlaygroundPosition | undefined> {
        const openPositions: MidaPlaygroundPosition[] = await this.getOpenPositions();

        for (const position of openPositions) {
            if (position.id === id) {
                return position;
            }
        }

        return undefined;
    }

    public async getOpenPositionsByAccount (tradingAccount: MidaPlaygroundAccount): Promise<MidaPlaygroundPosition[]> {
        return [ ...await this.getOpenPositions(), ]
            .filter((position: MidaPosition) => tradingAccount === position.tradingAccount) as MidaPlaygroundPosition[];
    }

    // eslint-disable-next-line max-lines-per-function, complexity
    protected async tryExecuteOrder (order: MidaPlaygroundOrder): Promise<MidaOrder> {
        const tradingAccount: MidaPlaygroundAccount = order.tradingAccount;
        const executedVolume: MidaDecimal = order.requestedVolume;
        const symbol = order.symbol;
        const completeSymbol: MidaSymbol | undefined = await tradingAccount.getSymbol(symbol);

        if (!completeSymbol) {
            this.rejectOrder(order.id, MidaOrderRejection.SYMBOL_NOT_FOUND);

            return order;
        }

        // <impacted-position-validation>
        let positionId: string | undefined = order.positionId;
        let position: MidaPlaygroundPosition | undefined = undefined;

        if (positionId) {
            position = this.#positions[positionId];

            if (!position || position.status !== MidaPositionStatus.OPEN) {
                this.rejectOrder(order.id, MidaOrderRejection.POSITION_NOT_FOUND);

                return order;
            }
        }
        // </impacted-position-validation>

        // <execution-price>
        const [ bid, ask, ] = await Promise.all([ this.getSymbolBid(symbol), this.getSymbolAsk(symbol), ]);
        const executionPrice: MidaDecimal = order.direction === MidaOrderDirection.SELL ? bid : ask;
        const executionDate: MidaDate = this.#localDate;
        // <execution-price>

        // <protection-validation>
        const requestedProtection: MidaProtectionDirectives = order.requestedProtection ?? {};

        if (order.direction === MidaOrderDirection.BUY) {
            if ("stopLoss" in requestedProtection && decimal(requestedProtection.stopLoss).greaterThanOrEqual(bid)) {
                this.rejectOrder(order.id, MidaOrderRejection.INVALID_STOP_LOSS);

                return order;
            }

            if ("takeProfit" in requestedProtection && decimal(requestedProtection.takeProfit).lessThanOrEqual(bid)) {
                this.rejectOrder(order.id, MidaOrderRejection.INVALID_TAKE_PROFIT);

                return order;
            }
        }
        else {
            if ("stopLoss" in requestedProtection && decimal(requestedProtection.stopLoss).lessThanOrEqual(ask)) {
                this.rejectOrder(order.id, MidaOrderRejection.INVALID_STOP_LOSS);

                return order;
            }

            if ("takeProfit" in requestedProtection && decimal(requestedProtection.takeProfit).greaterThanOrEqual(ask)) {
                this.rejectOrder(order.id, MidaOrderRejection.INVALID_TAKE_PROFIT);

                return order;
            }
        }
        // </protection-validation>

        let grossProfit: MidaDecimal = executedVolume;
        let grossProfitAsset: string = completeSymbol.baseAsset;

        if (order.direction === MidaOrderDirection.SELL) {
            grossProfit = grossProfit.multiply(executionPrice);
            grossProfitAsset = completeSymbol.quoteAsset;
        }

        // <trade>
        let assetToWithdraw: string = completeSymbol.quoteAsset;
        let volumeToWithdraw: MidaDecimal = grossProfit.multiply(executionPrice);
        let assetToDeposit: string = completeSymbol.baseAsset;
        let volumeToDeposit: MidaDecimal = grossProfit;

        if (order.direction === MidaOrderDirection.SELL) {
            assetToWithdraw = completeSymbol.baseAsset;
            volumeToWithdraw = executedVolume;
            assetToDeposit = completeSymbol.quoteAsset;
            volumeToDeposit = grossProfit;
        }

        if (!await this.accountHasFunds(tradingAccount, assetToWithdraw, volumeToWithdraw)) {
            this.rejectOrder(order.id, MidaOrderRejection.NOT_ENOUGH_MONEY);

            return order;
        }

        await tradingAccount.withdraw(assetToWithdraw, volumeToWithdraw);
        await tradingAccount.deposit(assetToDeposit, volumeToDeposit);

        // <commission>
        const [ commissionAsset, commission, ] =
            await this.#commissionCustomizer?.(order, {
                volume: executedVolume,
                executionPrice,
                executionDate,
            }) ?? [ tradingAccount.primaryAsset, decimal(0), ];

        await tradingAccount.withdraw(commissionAsset, commission);
        // </commission>

        // <swap>
        const swap: MidaDecimal = decimal(0);
        const swapAsset: string = tradingAccount.primaryAsset;

        await tradingAccount.deposit(swapAsset, swap);
        // </swap>

        if (!position) {
            const protection: MidaProtection = {};

            if ("stopLoss" in requestedProtection) {
                protection.stopLoss = decimal(requestedProtection.stopLoss);
            }

            if ("takeProfit" in requestedProtection) {
                protection.takeProfit = decimal(requestedProtection.takeProfit);
            }

            position = new MidaPlaygroundPosition({
                id: uuid(),
                symbol: order.symbol,
                volume: decimal(0), // Automatically updated after execution
                direction: order.direction === MidaOrderDirection.BUY ? MidaPositionDirection.LONG : MidaPositionDirection.SHORT,
                protection,
                tradingAccount: order.tradingAccount,
                engineEmitter: this.#protectedEmitter,
            });

            this.#positions[position.id] = position;
            this.#positionsArray.push(position);
        }

        positionId = position.id;

        let accountPrimaryGrossProfit: MidaDecimal = decimal(0);

        if (position && order.purpose === MidaOrderPurpose.CLOSE) {
            accountPrimaryGrossProfit =
                    executedVolume.div(position.volume).mul(await position.getUnrealizedGrossProfit());
        }

        const trade: MidaPlaygroundTrade = new MidaPlaygroundTrade({
            id: uuid(),
            orderId: order.id,
            positionId,
            symbol: order.symbol,
            volume: executedVolume,
            direction: order.direction === MidaOrderDirection.BUY ? MidaTradeDirection.BUY : MidaTradeDirection.SELL,
            status: MidaTradeStatus.EXECUTED,
            purpose: order.purpose === MidaOrderPurpose.OPEN ? MidaTradePurpose.OPEN : MidaTradePurpose.CLOSE,
            executionDate,
            executionPrice,
            grossProfit: accountPrimaryGrossProfit,
            commission,
            swap,
            commissionAsset,
            grossProfitAsset: tradingAccount.primaryAsset,
            swapAsset,
            tradingAccount,
        });

        this.#trades[trade.id] = trade;
        this.#tradesArray.push(trade);

        this.#emitter.notifyListeners("trade", { trade, });
        this.#protectedEmitter.notifyListeners("trade", { trade, });
        // </trade>

        this.#protectedEmitter.notifyListeners("order-execute", {
            order,
            trades: [ trade, ],
        });

        return order;
    }

    public async createAccount (configuration: MidaPlaygroundAccountConfiguration = {}): Promise<MidaPlaygroundAccount> {
        const id: string = configuration.id ?? uuid();
        const account: MidaPlaygroundAccount = new MidaPlaygroundAccount({
            id,
            ownerName: configuration.ownerName ?? "",
            platform: MidaPlayground.instance,
            primaryAsset: configuration.primaryAsset ?? "USD",
            engine: this,
        });

        // <balance-sheet>
        const balanceSheet: Record<string, MidaDecimalConvertible> = configuration.balanceSheet ?? {};

        for (const asset of Object.keys(balanceSheet)) {
            if (balanceSheet.hasOwnProperty(asset)) {
                await account.deposit(asset, balanceSheet[asset]);
            }
        }
        // </balance-sheet>

        MidaPlayground.addTradingAccount(id, account);
        this.#tradingAccounts[id] = account;

        return account;
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

    protected notifyListeners (type: string, descriptor?: Record<string, any>): void {
        this.#emitter.notifyListeners(type, descriptor);
    }

    async #processTick (tick: MidaTick): Promise<void> {
        const symbol = tick.symbol;
        this.#localDate = tick.date;
        this.#lastTicks[symbol] = tick;

        // await this.addSymbolTicks(symbol, [ tick, ]);
        await this.#onTick(tick);
    }

    async #onTick (tick: MidaTick): Promise<void> {
        // <feed-confirmation>
        if (this.#waitFeedConfirmation) {
            this.#feedResolverPromise = new Promise<void>((resolve) => {
                this.#feedResolver = (): void => resolve();
            });
        }
        // </feed-confirmation>

        await this.#updatePendingOrders(tick);
        await this.#updateOpenPositions(tick);

        this.#emitter.notifyListeners("tick", { tick, });

        /*
        for (const account of this.#tradingAccounts) {
            // <margin-call>
            const marginLevel: MidaDecimal | undefined = await account.getMarginLevel();

            if (marginLevel?.lessThanOrEqual(account.marginCallLevel)) {
                this.notifyListeners("margin-call", { marginLevel, });
            }
            // </margin-call>
        }
        */

        // <feed-confirmation>
        if (this.#waitFeedConfirmation) {
            await this.#feedResolverPromise;
        }
        // </feed-confirmation>
    }

    async #processPeriod (period: MidaPeriod): Promise<void> {
        await this.addSymbolPeriods(period.symbol, [ period, ]);
        await this.#onPeriodUpdate(period);

        if (period.isClosed) {
            await this.#onPeriodClose(period);

            const elapsedTicks: MidaTick[] = [ tickFromPeriod(period, "close"), ];

            /*
            for (let i: number = 0, length: number = elapsedTicks.length; i < length; ++i) {
                await this.#processTick(elapsedTicks[i]);
            }
            */
        }
    }

    async #onPeriodUpdate (period: MidaPeriod): Promise<void> {
        // <feed-confirmation>
        if (this.#waitFeedConfirmation) {
            this.#feedResolverPromise = new Promise<void>((resolve) => {
                this.#feedResolver = (): void => resolve();
            });
        }
        // </feed-confirmation>

        this.#emitter.notifyListeners("period-update", { period, });

        // <feed-confirmation>
        if (this.#waitFeedConfirmation) {
            await this.#feedResolverPromise;
        }
        // </feed-confirmation>
    }

    async #onPeriodClose (period: MidaPeriod): Promise<void> {
        // <feed-confirmation>
        if (this.#waitFeedConfirmation) {
            this.#feedResolverPromise = new Promise<void>((resolve) => {
                this.#feedResolver = (): void => resolve();
            });
        }
        // </feed-confirmation>

        this.#emitter.notifyListeners("period-close", { period, });

        // <feed-confirmation>
        if (this.#waitFeedConfirmation) {
            await this.#feedResolverPromise;
        }
        // </feed-confirmation>
    }

    async #updatePendingOrders (tick: MidaTick): Promise<void> {
        const orders: MidaPlaygroundOrder[] = await this.getPendingOrders();

        for (const order of orders) {
            await this.#updatePendingOrder(order, tick);
        }
    }

    async #updatePendingOrder (order: MidaPlaygroundOrder, tick: MidaTick): Promise<void> {
        const bid: MidaDecimal = tick.bid;
        const ask: MidaDecimal = tick.ask;
        const limitPrice: MidaDecimal | undefined = order.limitPrice;
        const stopPrice: MidaDecimal | undefined = order.stopPrice;

        // <limit>
        if (limitPrice) {
            if (
                order.direction === MidaOrderDirection.SELL && bid.greaterThanOrEqual(limitPrice)
                || order.direction === MidaOrderDirection.BUY && ask.lessThanOrEqual(limitPrice)
            ) {
                logger.info(`Playground | Pending Order ${order.id} hit limit`);

                await this.tryExecuteOrder(order);
            }
        }
        // </limit>

        // <stop>
        if (stopPrice) {
            if (
                order.direction === MidaOrderDirection.SELL && bid.lessThanOrEqual(stopPrice)
                || order.direction === MidaOrderDirection.BUY && ask.greaterThanOrEqual(stopPrice)
            ) {
                logger.info(`Playground | Pending Order ${order.id} hit stop`);

                await this.tryExecuteOrder(order);
            }
        }
        // </stop>
    }

    async #updateOpenPositions (tick: MidaTick): Promise<void> {
        const openPositions: MidaPosition[] = await this.getOpenPositions();

        for (let i = 0, length = openPositions.length; i < length; ++i) {
            await this.#updateOpenPosition(openPositions[i], tick);
        }
    }

    async #updateOpenPosition (position: MidaPosition, tick: MidaTick): Promise<void> {
        const tradingAccount: MidaTradingAccount = position.tradingAccount;
        const bid: MidaDecimal = tick.bid;
        const ask: MidaDecimal = tick.ask;
        const stopLoss: MidaDecimal | undefined = position.stopLoss;
        const takeProfit: MidaDecimal | undefined = position.takeProfit;

        // <stop-loss>
        if (stopLoss) {
            if (
                position.direction === MidaPositionDirection.SHORT && ask.greaterThanOrEqual(stopLoss)
                || position.direction === MidaPositionDirection.LONG && bid.lessThanOrEqual(stopLoss)
            ) {
                logger.info(`Playground | Position ${position.id} hit stop loss`);

                await position.close();
            }
        }
        // </stop-loss>

        // <take-profit>
        if (takeProfit) {
            if (
                position.direction === MidaPositionDirection.SHORT && ask.lessThanOrEqual(takeProfit)
                || position.direction === MidaPositionDirection.LONG && bid.greaterThanOrEqual(takeProfit)
            ) {
                logger.info(`Playground | Position ${position.id} hit take profit`);

                await position.close();
            }
        }
        // </take-profit>

        /*
        // <stop-out>
        const marginLevel: MidaDecimal | undefined = await tradingAccount.getMarginLevel();

        if (marginLevel?.lessThanOrEqual(account.stopOutLevel)) {
            await position.close();

            this.notifyListeners("stop-out", {
                positionId: position.id,
                marginLevel,
            });
        }
        // </stop-out>
        */

        // <negative-balance-protection>
        const equity: MidaDecimal = await tradingAccount.getEquity();

        if (equity.lessThanOrEqual(0)) {
            await position.close();
        }
        // </negative-balance-protection>
    }

    public cancelOrder (orderId: string): void {
        this.#protectedEmitter.notifyListeners("order-cancel", {
            orderId,
            cancelDate: this.#localDate,
        });

        logger.warn(`Playground | Order ${orderId} canceled`);
    }

    protected rejectOrder (orderId: string, rejection: MidaOrderRejection): void {
        this.#protectedEmitter.notifyListeners("order-reject", {
            orderId,
            rejectionDate: this.#localDate,
            rejection,
        });

        logger.warn(`Playground | Order ${orderId} rejected: ${rejection}`);
    }

    protected acceptOrder (orderId: string): void {
        this.#protectedEmitter.notifyListeners("order-accept", {
            orderId,
            acceptDate: this.#localDate,
        });
    }

    protected moveOrderToPending (orderId: string): void {
        this.#protectedEmitter.notifyListeners("order-pending", {
            orderId,
            pendingDate: this.#localDate,
        });
    }

    protected async accountHasFunds (tradingAccount: MidaPlaygroundAccount, asset: string, volume: MidaDecimalConvertible): Promise<boolean> {
        const { freeVolume, } = await tradingAccount.getAssetBalance(asset);

        return freeVolume.greaterThanOrEqual(volume);
    }
}
