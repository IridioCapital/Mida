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

import { MidaTradingAccount, } from "#accounts/MidaTradingAccount";
import { MidaAsset, } from "#assets/MidaAsset";
import { MidaAssetStatement, } from "#assets/MidaAssetStatement";
import { date, MidaDate, } from "#dates/MidaDate";
import { decimal, MidaDecimal, } from "#decimals/MidaDecimal";
import { unsupportedOperationError, } from "#errors/MidaErrorUtilities";
import { MidaEventListener, } from "#events/MidaEventListener";
import { logger, } from "#loggers/MidaLogger";
import { MidaOrder, } from "#orders/MidaOrder";
import { MidaOrderDirection, } from "#orders/MidaOrderDirection";
import { MidaOrderDirectives, } from "#orders/MidaOrderDirectives";
import { MidaOrderPurpose, } from "#orders/MidaOrderPurpose";
import { MidaOrderStatus, } from "#orders/MidaOrderStatus";
import { MidaOrderTimeInForce, } from "#orders/MidaOrderTimeInForce";
import { MidaPeriod, } from "#periods/MidaPeriod";
import { MidaPosition, } from "#positions/MidaPosition";
import { MidaPositionDirection, } from "#positions/MidaPositionDirection";
import { MidaProtection, } from "#protections/MidaProtection";
import { MidaSymbol, } from "#symbols/MidaSymbol";
import { MidaSymbolTradeStatus, } from "#symbols/MidaSymbolTradeStatus";
import { MidaTick, } from "#ticks/MidaTick";
import { MidaTickMovement, } from "#ticks/MidaTickMovement";
import { MidaTimeframe, } from "#timeframes/MidaTimeframe";
import { MidaTrade, } from "#trades/MidaTrade";
import { MidaTradeDirection, } from "#trades/MidaTradeDirection";
import { MidaTradePurpose, } from "#trades/MidaTradePurpose";
import { MidaTradeRejection, } from "#trades/MidaTradeRejection";
import { MidaTradeStatus, } from "#trades/MidaTradeStatus";
import { MidaEmitter, } from "#utilities/emitters/MidaEmitter";
import { uuid, } from "#utilities/MidaUtilities";
import { CTraderAccountParameters, } from "!/src/platforms/ctrader/CTraderAccountParameters";
import { CTraderOrder, } from "!/src/platforms/ctrader/orders/CTraderOrder";
import { CTraderPosition, } from "!/src/platforms/ctrader/positions/CTraderPosition";
import { CTraderTrade, } from "!/src/platforms/ctrader/trades/CTraderTrade";
import { CTraderUtilities, } from "!/src/platforms/ctrader/utilities/CTraderUtilities";

export class CTraderAccount extends MidaTradingAccount {
    readonly #connection: CTraderConnection;
    readonly #cTraderEmitter: MidaEmitter;
    readonly #brokerName: string;
    readonly #cTraderAssets: Map<string, Record<string, any>>;
    readonly #assets: Map<string, MidaAsset>;
    readonly #cTraderSymbols: Map<string, Record<string, any>>;
    readonly #symbols: Map<string, MidaSymbol>;
    readonly #completeSymbols: Map<string, Record<string, any>>;
    readonly #symbolsCategories: Map<string, Record<string, any>>;
    readonly #tickListeners: Map<string, number>;
    readonly #periodListeners: Map<string, MidaTimeframe[]>;
    readonly #cTraderOrders: Map<string, any>;
    readonly #orders: Map<string, CTraderOrder>;
    readonly #cTraderTrades: Map<string, Record<string, any>>;
    readonly #trades: Map<string, CTraderTrade>;
    readonly #cTraderPositions: Map<string, Record<string, any>>;
    readonly #positions: Map<string, CTraderPosition>;
    readonly #lastTicks: Map<string, MidaTick>;
    readonly #lastPeriods: Map<string, Map<string, MidaPeriod>>;
    readonly #internalTickListeners: Map<string, Function>;
    readonly #depositConversionChains: Map<string, Record<string, any>[]>;
    readonly #lastTicksPromises: Map<string, Promise<MidaTick>>;

    public constructor ({
        id,
        platform,
        creationDate,
        primaryAsset,
        operativity,
        positionAccounting,
        indicativeLeverage,
        connection,
        brokerName,
    }: CTraderAccountParameters) {
        super({
            id,
            platform,
            creationDate,
            primaryAsset,
            operativity,
            positionAccounting,
            indicativeLeverage,
        });

        this.#connection = connection;
        this.#cTraderEmitter = new MidaEmitter();
        this.#brokerName = brokerName;
        this.#cTraderAssets = new Map();
        this.#assets = new Map();
        this.#cTraderSymbols = new Map();
        this.#symbols = new Map();
        this.#completeSymbols = new Map();
        this.#symbolsCategories = new Map();
        this.#tickListeners = new Map();
        this.#periodListeners = new Map();
        this.#cTraderOrders = new Map();
        this.#orders = new Map();
        this.#cTraderTrades = new Map();
        this.#trades = new Map();
        this.#cTraderPositions = new Map();
        this.#positions = new Map();
        this.#lastTicks = new Map();
        this.#lastPeriods = new Map();
        this.#internalTickListeners = new Map();
        this.#depositConversionChains = new Map();
        this.#lastTicksPromises = new Map();

        this.#configureListeners();
    }

    public get brokerName (): string {
        return this.#brokerName;
    }

    public get plainOpenPositions (): Record<string, any>[] {
        const plainOpenPositions: Record<string, any>[] = [];

        for (const plainPosition of [ ...this.#cTraderPositions.values(), ]) {
            if (plainPosition.positionStatus === "POSITION_STATUS_OPEN") {
                plainOpenPositions.push(plainPosition);
            }
        }

        return plainOpenPositions;
    }

    public async preloadAssetsAndSymbols (): Promise<void> {
        await Promise.all([ this.#preloadAssets(), this.#preloadPlainSymbols(), ]);
    }

    public async preload (): Promise<void> {
        await Promise.all([ this.preloadAssetsAndSymbols(), this.#preloadPlainOpenPositionsAndPendingOrders(), ]);
    }

    public override async getBalance (): Promise<MidaDecimal> {
        const accountDescriptor: Record<string, any> = await this.#getAccountDescriptor();

        return decimal(accountDescriptor.balance).divide(100);
    }

    public override async getBalanceSheet (): Promise<MidaAssetStatement[]> {
        if ((await this.getBalance()).greaterThan(0)) {
            return [ await this.getAssetBalance(this.primaryAsset), ];
        }

        return [];
    }

    public override async getUsedMargin (): Promise<MidaDecimal> {
        let usedMargin: MidaDecimal = decimal(0);

        for (const plainOpenPosition of this.plainOpenPositions) {
            usedMargin = usedMargin.add(plainOpenPosition.usedMargin);
        }

        return usedMargin.divide(100);
    }

    public override async getEquity (): Promise<MidaDecimal> {

        const unrealizedNetProfits: MidaDecimal[] =
            // eslint-disable-next-line max-len
            await Promise.all(this.plainOpenPositions.map((plainOpenPosition: Record<string, any>) => this.getPlainPositionNetProfit(plainOpenPosition)));
        let equity: MidaDecimal = await this.getBalance();

        for (const unrealizedNetProfit of unrealizedNetProfits) {
            equity = equity.add(unrealizedNetProfit);
        }

        return equity;
    }

    public override async getAssets (): Promise<string[]> {
        return [ ...this.#assets.keys(), ];
    }

    // https://help.ctrader.com/open-api/model-messages/#protooainterval
    public override async isSymbolMarketOpen (symbol: string): Promise<boolean> {
        const completeSymbol: Record<string, any> = this.#getCompletePlainSymbol(symbol);
        const schedules: Record<string, any>[] = completeSymbol.schedule;
        const actualDate: Date = new Date();
        const actualTimestamp: number = actualDate.getTime();
        const lastSundayTimestamp: number = CTraderUtilities.getLastSunday(actualDate).getTime();

        for (const schedule of schedules) {
            if (
                actualTimestamp >= lastSundayTimestamp + schedule.startSecond * 1000 &&
                actualTimestamp < lastSundayTimestamp + schedule.endSecond * 1000
            ) {
                return true;
            }
        }

        return false;
    }

    public override async getSymbolPeriods (symbol: string, timeframe: MidaTimeframe): Promise<MidaPeriod[]> {
        const W1: number = MidaTimeframe.toSeconds("W1") as number * 1000;
        const now: number = Date.now();
        const stringTimeframe: string = timeframe;
        let from = now - W1;

        // https://help.ctrader.com/open-api/messages/#protooagettrendbarsreq
        if (
            stringTimeframe === "M1"
            || stringTimeframe === "M2"
            || stringTimeframe === "M3"
            || stringTimeframe === "M4"
            || stringTimeframe === "M5"
        ) {
            from = now - W1 * 5;
        }
        else if (
            stringTimeframe === "M10"
            || stringTimeframe === "M15"
            || stringTimeframe === "M30"
            || stringTimeframe === "H1"
        ) {
            from = now - W1 * 35;
        }
        else if (
            stringTimeframe === "H4"
            || stringTimeframe === "H12"
            || stringTimeframe === "D1"
        ) {
            from = now - 31622400000;
        }
        else if (
            stringTimeframe === "W1"
            || stringTimeframe === "MO1"
        ) {
            from = now - 158112000000;
        }

        const cTraderSymbol: any = this.#cTraderSymbols.get(symbol);
        const symbolId: string = cTraderSymbol.symbolId.toString();
        const cTraderPeriods: any[] = (await this.#sendCommand("ProtoOAGetTrendbarsReq", {
            fromTimestamp: from,
            toTimestamp: now,
            period: CTraderUtilities.toCTraderTimeframe(timeframe),
            symbolId,
            count: 4000,
        })).trendbar;

        return cTraderPeriods
            .map((period) => CTraderUtilities.normalizePeriod(period, symbol, undefined, timeframe))
            .sort((a, b): number => a.startDate.timestamp - b.startDate.timestamp);
    }

    public override async getSymbols (): Promise<string[]> {
        const symbols: string[] = [];

        for (const plainSymbol of [ ...this.#cTraderSymbols.values(), ]) {
            symbols.push(plainSymbol.symbolName);
        }

        return symbols;
    }

    public override async getSymbol (symbol: string): Promise<MidaSymbol | undefined> {
        const plainSymbol: Record<string, any> | undefined = this.#cTraderSymbols.get(symbol);

        if (!plainSymbol) {
            return undefined;
        }

        let normalizedSymbol: MidaSymbol | undefined = this.#symbols.get(symbol);

        if (normalizedSymbol) {
            return normalizedSymbol;
        }

        const completePlainSymbol: Record<string, any> = this.#getCompletePlainSymbol(symbol);
        const lotUnits: MidaDecimal = decimal(completePlainSymbol.lotSize).divide(100);
        normalizedSymbol = new MidaSymbol({
            symbol,
            tradingAccount: this,
            description: plainSymbol.description,
            baseAsset: this.getAssetById(plainSymbol.baseAssetId)?.toString() as string,
            quoteAsset: this.getAssetById(plainSymbol.quoteAssetId)?.toString() as string,
            leverage: decimal(-1), // TODO: Add leverage
            minLots: decimal(completePlainSymbol.minVolume).divide(lotUnits).divide(100),
            maxLots: decimal(completePlainSymbol.maxVolume).divide(lotUnits).divide(100),
            lotUnits,
            pipPosition: Number(completePlainSymbol.pipPosition),
            digits: 2, // TODO: todo
        });

        this.#symbols.set(symbol, normalizedSymbol);

        return normalizedSymbol;
    }

    public override async getAsset (asset: string): Promise<MidaAsset | undefined> {
        return this.#assets.get(asset);
    }

    public override async getAssetBalance (asset: string): Promise<MidaAssetStatement> {
        if (asset === this.primaryAsset) {
            return {
                tradingAccount: this,
                date: date(),
                asset,
                freeVolume: await this.getFreeMargin(),
                lockedVolume: await this.getUsedMargin(),
                borrowedVolume: decimal(0),
            };
        }

        return {
            tradingAccount: this,
            date: date(),
            asset,
            freeVolume: decimal(0),
            lockedVolume: decimal(0),
            borrowedVolume: decimal(0),
        };
    }

    public override async getCryptoAssetDepositAddress (asset: string, net: string): Promise<string> {
        throw unsupportedOperationError(this.platform);
    }

    public override async watchSymbolTicks (symbol: string): Promise<void> {
        const symbolDescriptor: Record<string, any> | undefined = this.#cTraderSymbols.get(symbol);

        if (!symbolDescriptor) {
            logger.fatal(`Symbol "${symbol}" not found`);

            throw new Error();
        }

        const listenersCount: number = this.#tickListeners.get(symbol) ?? 0;

        this.#tickListeners.set(symbol, listenersCount + 1);

        if (listenersCount === 0) {
            await this.#sendCommand("ProtoOASubscribeSpotsReq", {
                symbolId: symbolDescriptor.symbolId,
                subscribeToSpotTimestamp: true,
            });
        }
    }

    public override async watchSymbolPeriods (symbol: string, timeframe: MidaTimeframe): Promise<void> {
        const symbolDescriptor: Record<string, any> | undefined = this.#cTraderSymbols.get(symbol);

        if (!symbolDescriptor) {
            logger.fatal(`Symbol "${symbol}" not found`);

            throw new Error();
        }

        // Periods subscription requires ticks subscription
        await this.watchSymbolTicks(symbol);

        const listenedTimeframes: MidaTimeframe[] = this.#periodListeners.get(symbol) ?? [];

        if (!listenedTimeframes.includes(timeframe)) {
            await this.#sendCommand("ProtoOASubscribeLiveTrendbarReq", {
                symbolId: symbolDescriptor.symbolId,
                period: CTraderUtilities.toCTraderTimeframe(timeframe),
            });
            listenedTimeframes.push(timeframe);
            this.#periodListeners.set(symbol, listenedTimeframes);
        }
    }

    public override async getOrders (symbol: string): Promise<MidaOrder[]> {
        const W1: number = MidaTimeframe.toSeconds("W1") as number * 1000;
        const now: number = Date.now();
        const from: number = now - W1;

        // Get and cache orders from cTrader servers
        await Promise.all([ this.getCTraderOrders(from, now), this.getCTraderOrders(from - W1, now - W1), ]);

        const cTraderOrders = [ ...this.#cTraderOrders.values(), ];

        return cTraderOrders
            .map((order) => this.normalizeOrder(order))
            .filter((order: MidaOrder): boolean => order.symbol === symbol)
            // @ts-ignore
            .sort((a: MidaOrder, b: MidaOrder): number => a.creationDate?.timestamp - b.creationDate?.timestamp);
    }

    public override async getPendingOrders (): Promise<MidaOrder[]> {
        const pendingOrders: MidaOrder[] = [];

        for (const plainOrder of [ ...this.#cTraderOrders.values(), ]) {
            if (
                plainOrder.orderStatus === "ORDER_STATUS_ACCEPTED"
                && (plainOrder.orderType.toUpperCase() === "LIMIT" || plainOrder.orderType.toUpperCase() === "STOP")
            ) {
                pendingOrders.push(this.normalizeOrder(plainOrder));
            }
        }

        return pendingOrders;
    }

    public override async getTrades (symbol: string): Promise<MidaTrade[]> {
        const W1: number = MidaTimeframe.toSeconds("W1") as number * 1000;
        const now: number = Date.now();
        const from: number = now - W1;

        // Get and cache orders from cTrader servers
        await Promise.all([ this.getCTraderTrades(from, now), this.getCTraderTrades(from - W1, now - W1), ]);

        return [ ...this.#cTraderTrades.values(), ]
            .map((trade: any): MidaTrade => this.normalizeTrade(trade))
            .filter((trade: MidaTrade): boolean => trade.symbol === symbol);
    }

    public override async getDate (): Promise<MidaDate> {
        return date();
    }

    async #getSymbolLastTick (symbol: string): Promise<MidaTick> {
        // Check if symbol ticks are already being listened
        if (this.#lastTicks.has(symbol)) {
            // Return the last tick
            return this.#lastTicks.get(symbol) as MidaTick;
        }

        if (this.#lastTicksPromises.has(symbol)) {
            return this.#lastTicksPromises.get(symbol) as Promise<MidaTick>;
        }

        const symbolDescriptor: Record<string, any> | undefined = this.#cTraderSymbols.get(symbol);

        if (!symbolDescriptor) {
            throw new Error();
        }

        const lastTickPromise: Promise<MidaTick> = new Promise((resolve: any) => {
            this.#internalTickListeners.set(symbol, (tick: MidaTick) => {
                this.#internalTickListeners.delete(symbol);
                this.#lastTicksPromises.delete(symbol);
                resolve(tick);
            });

            // Start listening for ticks, the first event always contains the last known tick
            this.watchSymbolTicks(symbol);
        });

        this.#lastTicksPromises.set(symbol, lastTickPromise);

        return lastTickPromise;
    }

    public override async getOpenPositions (): Promise<MidaPosition[]> {
        return this.plainOpenPositions.map((plainPosition: Record<string, any>) => this.normalizePosition(plainPosition)) as MidaPosition[];
    }

    // eslint-disable-next-line max-lines-per-function
    public normalizeOrder (plainOrder: Record<string, any>): CTraderOrder {
        const orderId: string = plainOrder.orderId;
        let normalizedOrder: CTraderOrder | undefined = this.#orders.get(orderId);

        if (normalizedOrder) {
            return normalizedOrder;
        }

        const tradeSide: string = plainOrder.tradeData.tradeSide.toUpperCase();
        const symbol: string = this.#getPlainSymbolById(plainOrder.tradeData.symbolId)?.symbolName;
        const completePlainSymbol: Record<string, any> = this.#getCompletePlainSymbol(symbol);
        const lotUnits: MidaDecimal = decimal(completePlainSymbol.lotSize).divide(100);
        const requestedVolume: MidaDecimal = decimal(plainOrder.tradeData.volume).divide(100).divide(lotUnits);
        const purpose: MidaOrderPurpose = plainOrder.closingOrder === false ? MidaOrderPurpose.OPEN : MidaOrderPurpose.CLOSE;
        const openDate: MidaDate = date(plainOrder.tradeData.openTimestamp);
        const expirationDate: MidaDate | undefined = plainOrder.expirationTimestamp ? date(plainOrder.expirationTimestamp) : undefined;
        const direction: MidaOrderDirection = tradeSide === "SELL" ? MidaOrderDirection.SELL : MidaOrderDirection.BUY;
        const limitPrice: MidaDecimal | undefined = plainOrder.limitPrice ? decimal(plainOrder.limitPrice) : undefined;
        const stopPrice: MidaDecimal | undefined = plainOrder.stopPrice ? decimal(plainOrder.stopPrice) : undefined;
        const stopLoss: MidaDecimal | undefined = plainOrder.stopLoss ? decimal(plainOrder.stopLoss) : undefined;
        const takeProfit: MidaDecimal | undefined = plainOrder.takeProfit ? decimal(plainOrder.takeProfit) : undefined;
        let status: MidaOrderStatus;

        switch (plainOrder.orderStatus) {
            case "ORDER_STATUS_ACCEPTED": {
                if (plainOrder.orderType.toUpperCase() === "LIMIT" || plainOrder.orderType.toUpperCase() === "STOP") {
                    status = MidaOrderStatus.PENDING;
                }
                else {
                    status = MidaOrderStatus.ACCEPTED;
                }

                break;
            }
            case "ORDER_STATUS_FILLED": {
                status = MidaOrderStatus.EXECUTED;

                break;
            }
            case "ORDER_STATUS_REJECTED": {
                status = MidaOrderStatus.REJECTED;

                break;
            }
            case "ORDER_STATUS_EXPIRED": {
                status = MidaOrderStatus.EXPIRED;

                break;
            }
            case "ORDER_STATUS_CANCELLED": {
                status = MidaOrderStatus.CANCELLED;

                break;
            }
            default: {
                status = MidaOrderStatus.REQUESTED;
            }
        }

        normalizedOrder = new CTraderOrder({
            id: orderId,
            positionId: plainOrder.positionId.toString(),
            tradingAccount: this,
            symbol,
            requestedVolume,
            direction,
            purpose,
            limitPrice,
            stopPrice,
            requestedProtection: {
                stopLoss,
                takeProfit,
                trailingStopLoss: plainOrder.trailingStopLoss === true,
            },
            status,
            creationDate: openDate,
            lastUpdateDate: date(plainOrder.utcLastUpdateTimestamp),
            timeInForce: CTraderUtilities.normalizeTimeInForce(plainOrder.timeInForce),
            expirationDate,
            trades: [],
            rejection: undefined,
            isStopOut: plainOrder.isStopOut === true,
            label: plainOrder.tradeData?.label,
            uuid: plainOrder.clientOrderId || undefined,
            connection: this.#connection,
            cTraderEmitter: this.#cTraderEmitter,
        });

        this.#orders.set(orderId, normalizedOrder);

        return normalizedOrder;
    }

    public normalizePosition (position: Record<string, any>): CTraderPosition {
        const symbol: string = this.#getPlainSymbolById(position.tradeData.symbolId.toString())?.symbolName;
        const completePlainSymbol: Record<string, any> = this.#getCompletePlainSymbol(symbol);
        const lotUnits: MidaDecimal = decimal(completePlainSymbol.lotSize).divide(100);
        const volume: MidaDecimal = decimal(position.tradeData.volume).divide(lotUnits).divide(100);

        return new CTraderPosition({
            id: position.positionId.toString(),
            tradingAccount: this,
            volume,
            symbol,
            protection: this.normalizeProtection({
                takeProfit: position.takeProfit,
                stopLoss: position.stopLoss,
                trailingStopLoss: position.trailingStopLoss,
            }),
            direction: position.tradeData.tradeSide === "BUY" ? MidaPositionDirection.LONG : MidaPositionDirection.SHORT,
            connection: this.#connection,
            cTraderEmitter: this.#cTraderEmitter,
        });
    }

    public override async getSymbolBid (symbol: string): Promise<MidaDecimal> {
        return (await this.#getSymbolLastTick(symbol)).bid;
    }

    public override async getSymbolAsk (symbol: string): Promise<MidaDecimal> {
        return (await this.#getSymbolLastTick(symbol)).ask;
    }

    public override async getSymbolAverage (symbol: string): Promise<MidaDecimal> {
        const { bid, ask, } = await this.#getSymbolLastTick(symbol);

        return bid.add(ask).divide(2);
    }

    public override async getSymbolTradeStatus (symbol: string): Promise<MidaSymbolTradeStatus> {
        const completePlainSymbol: Record<string, any> = this.#getCompletePlainSymbol(symbol);

        switch (completePlainSymbol.tradingMode.toUpperCase()) {
            case "ENABLED": {
                return MidaSymbolTradeStatus.ENABLED;
            }
            case "DISABLED_WITH_PENDINGS_EXECUTION":
            case "DISABLED_WITHOUT_PENDINGS_EXECUTION": {
                return MidaSymbolTradeStatus.DISABLED;
            }
            case "CLOSE_ONLY_MODE": {
                return MidaSymbolTradeStatus.CLOSE_ONLY;
            }
            default: {
                logger.warn("Unknown symbol trading mode");

                return "" as MidaSymbolTradeStatus;
            }
        }
    }

    // eslint-disable-next-line max-lines-per-function, complexity
    public override async placeOrder (directives: MidaOrderDirectives): Promise<CTraderOrder> {
        const internalId: string = uuid();
        const positionId: string | undefined = directives.positionId;
        const limitPrice: MidaDecimal | undefined = directives.limit !== undefined ? decimal(directives.limit) : undefined;
        const stopPrice: MidaDecimal | undefined = directives.stop !== undefined ? decimal(directives.stop) : undefined;
        let symbol: string | undefined = undefined;
        let requestedVolume: MidaDecimal | undefined = directives.volume !== undefined ? decimal(directives.volume) : undefined;
        let existingPosition: CTraderPosition | undefined = undefined;
        let purpose: MidaOrderPurpose;
        let requestDirectives: Record<string, any> = {};

        // Check if directives are related to an existing position
        if (positionId) {
            const plainPosition: Record<string, any> = this.#cTraderPositions.get(positionId) as Record<string, any>;
            existingPosition = this.normalizePosition(plainPosition);
            symbol = existingPosition.symbol;

            if (!requestedVolume) {
                requestedVolume = existingPosition.volume;
            }

            if (
                existingPosition.direction === MidaPositionDirection.LONG && directives.direction === MidaOrderDirection.BUY
                || existingPosition.direction === MidaPositionDirection.SHORT && directives.direction === MidaOrderDirection.SELL
            ) {
                purpose = MidaOrderPurpose.OPEN;
            }
            else {
                purpose = MidaOrderPurpose.CLOSE;
            }
        }
        else if (directives.symbol) {
            purpose = MidaOrderPurpose.OPEN;
            symbol = directives.symbol;
        }
        else {
            logger.fatal("Invalid directives");

            throw new Error();
        }

        if (!requestedVolume) {
            logger.fatal("Invalid volume");

            throw new Error();
        }

        const timeInForce: MidaOrderTimeInForce = directives.timeInForce ?? MidaOrderTimeInForce.GOOD_TILL_CANCEL;
        let normalizedExpirationDate: MidaDate | undefined = undefined;

        if (timeInForce === MidaOrderTimeInForce.GOOD_TILL_DATE) {
            const { expirationDate, } = directives;

            if (expirationDate === undefined) {
                logger.fatal("Expiration date is required for GOOD_TILL_DATE orders");

                throw new Error();
            }

            normalizedExpirationDate = date(expirationDate);
        }

        const order: CTraderOrder = new CTraderOrder({
            id: "",
            tradingAccount: this,
            symbol,
            requestedVolume,
            direction: directives.direction,
            purpose,
            limitPrice,
            stopPrice,
            status: MidaOrderStatus.REQUESTED,
            requestedProtection: directives.protection,
            creationDate: undefined,
            lastUpdateDate: undefined,
            timeInForce,
            expirationDate: normalizedExpirationDate,
            trades: [],
            rejection: undefined,
            isStopOut: false, // Stop out orders are sent by the platform
            label: directives.label,
            uuid: internalId,
            connection: this.#connection,
            cTraderEmitter: this.#cTraderEmitter,
        });

        const plainSymbol: Record<string, any> = this.#cTraderSymbols.get(symbol) as Record<string, any>;
        const completePlainSymbol: Record<string, any> = this.#getCompletePlainSymbol(symbol);
        const lotUnits: MidaDecimal = decimal(completePlainSymbol.lotSize).divide(100);
        const normalizedVolume: MidaDecimal = requestedVolume.multiply(lotUnits).multiply(100);

        requestDirectives = {
            symbolId: plainSymbol.symbolId.toString(),
            volume: normalizedVolume.toString(),
            tradeSide: directives.direction === MidaOrderDirection.BUY ? "BUY" : "SELL",
            timeInForce: CTraderUtilities.toCTraderTimeInForce(timeInForce),
        };

        if (timeInForce === MidaOrderTimeInForce.GOOD_TILL_DATE) {
            requestDirectives.expirationTimestamp = normalizedExpirationDate?.timestamp;
        }

        const label: string | undefined = directives.label;

        if (label) {
            requestDirectives.label = label;
        }

        if (!existingPosition) {
            const {
                stopLoss,
                takeProfit,
                trailingStopLoss,
            } = directives.protection ?? {};

            if (limitPrice) {
                requestDirectives.orderType = "LIMIT";
                requestDirectives.limitPrice = Number(limitPrice.toString());
            }
            else if (stopPrice) {
                requestDirectives.orderType = "STOP";
                requestDirectives.stopPrice = Number(stopPrice.toString());
            }
            else {
                requestDirectives.orderType = "MARKET";
            }

            // cTrader Open API doesn't allow using absolute protection on market orders
            // Protection is set on market orders after the order is executed
            if (requestDirectives.orderType !== "MARKET") {
                if (stopLoss !== undefined) {
                    requestDirectives.stopLoss = Number(decimal(stopLoss).toString());
                }

                if (takeProfit !== undefined) {
                    requestDirectives.takeProfit = Number(decimal(takeProfit).toString());
                }

                if (trailingStopLoss) {
                    requestDirectives.trailingStopLoss = true;
                }
            }
        }
        else {
            requestDirectives.positionId = positionId;
            requestDirectives.orderType = "MARKET";
        }

        const resolverEvents: string[] = directives.resolverEvents ?? [
            "reject",
            "pending",
            "cancel",
            "expire",
            "execute",
        ];
        const resolver: Promise<CTraderOrder> = new Promise((resolve: (order: CTraderOrder) => void) => {
            if (resolverEvents.length === 0) {
                resolve(order);
            }
            else {
                const resolverEventsUuids: Map<string, string> = new Map();

                for (const eventType of resolverEvents) {
                    resolverEventsUuids.set(eventType, order.on(eventType, (): void => {
                        for (const uuid of [ ...resolverEventsUuids.values(), ]) {
                            order.removeEventListener(uuid);
                        }

                        resolve(order);
                    }));
                }
            }
        });

        const listeners: { [eventType: string]: MidaEventListener } = directives.listeners ?? {};

        for (const eventType of Object.keys(listeners)) {
            order.on(eventType, listeners[eventType]);
        }

        // Cache the order as soon as it gets an id
        const normalizeEventUuid: string = order.on("*", () => {
            const id: string | undefined = order.id;

            if (id) {
                order.removeEventListener(normalizeEventUuid);
                this.#orders.set(id, order);
            }
        });

        this.#sendCommand("ProtoOANewOrderReq", requestDirectives, internalId);

        return resolver;
    }

    // eslint-disable-next-line max-lines-per-function
    public normalizeTrade (plainTrade: Record<string, any>): CTraderTrade {
        const id: string = plainTrade.dealId.toString();
        const orderId: string = plainTrade.orderId.toString();
        const symbol: string = this.#getPlainSymbolById(plainTrade.symbolId.toString())?.symbolName;
        const completePlainSymbol: Record<string, any> = this.#getCompletePlainSymbol(symbol);
        const lotUnits: MidaDecimal = decimal(completePlainSymbol.lotSize).divide(100);
        const filledVolume: MidaDecimal = decimal(plainTrade.filledVolume).divide(lotUnits).divide(100);
        let direction: MidaTradeDirection;

        switch (plainTrade.tradeSide.toUpperCase()) {
            case "SELL": {
                direction = MidaTradeDirection.SELL;

                break;
            }
            case "BUY": {
                direction = MidaTradeDirection.BUY;

                break;
            }
            default: {
                throw new Error();
            }
        }

        let status: MidaTradeStatus;
        let rejection: MidaTradeRejection | undefined = undefined;

        switch (plainTrade.dealStatus.toUpperCase()) {
            case "PARTIALLY_FILLED":
            case "FILLED": {
                status = MidaTradeStatus.EXECUTED;

                break;
            }
            case "MISSED": {
                status = MidaTradeStatus.REJECTED;
                rejection = MidaTradeRejection.MISSED;

                break;
            }
            case "REJECTED": {
                status = MidaTradeStatus.REJECTED;
                rejection = MidaTradeRejection.NO_LIQUIDITY;

                break;
            }
            case "ERROR":
            case "INTERNALLY_REJECTED": {
                status = MidaTradeStatus.REJECTED;
                rejection = MidaTradeRejection.UNKNOWN;

                break;
            }
            default: {
                throw new Error();
            }
        }

        const purpose: MidaTradePurpose = plainTrade.closePositionDetail ? MidaTradePurpose.CLOSE : MidaTradePurpose.OPEN;
        const executionDate = date(plainTrade.executionTimestamp);
        const rejectionDate: MidaDate | undefined = undefined;
        const plainExecutionPrice: string = plainTrade.executionPrice;
        const plainGrossProfit: string | undefined = plainTrade?.closePositionDetail?.grossProfit;
        const plainCommission: string | undefined = plainTrade.commission;
        const plainSwap: string | undefined = plainTrade?.closePositionDetail?.swap;

        return new CTraderTrade({
            id,
            orderId,
            positionId: plainTrade.positionId.toString(),
            volume: filledVolume,
            direction,
            status,
            purpose,
            executionDate,
            rejectionDate,
            executionPrice: plainExecutionPrice ? decimal(plainExecutionPrice) : undefined,
            grossProfit: plainGrossProfit ? decimal(plainGrossProfit).divide(100) : undefined,
            commission: plainCommission ? decimal(plainCommission).divide(100) : undefined,
            commissionAsset: this.primaryAsset,
            swap: plainSwap ? decimal(plainSwap).divide(100) : undefined,
            grossProfitAsset: this.primaryAsset,
            swapAsset: this.primaryAsset,
            symbol,
            rejection,
            tradingAccount: this,
        });
    }

    public getAssetById (id: string): MidaAsset | undefined {
        const plainAsset: Record<string, any> | undefined = this.#getPlainAssetById(id);

        if (!plainAsset) {
            return undefined;
        }

        return this.#assets.get(plainAsset.name);
    }

    public normalizeProtection (plainPosition: Record<string, any>): MidaProtection {
        const takeProfit: MidaDecimal | undefined = plainPosition.takeProfit ? decimal(plainPosition.takeProfit) : undefined;
        const stopLoss: MidaDecimal | undefined = plainPosition.stopLoss ? decimal(plainPosition.stopLoss) : undefined;
        const trailingStopLoss: boolean = Boolean(plainPosition.trailingStopLoss);
        const protection: MidaProtection = {};

        if (takeProfit) {
            protection.takeProfit = takeProfit;
        }

        if (stopLoss) {
            protection.stopLoss = stopLoss;
            protection.trailingStopLoss = trailingStopLoss;
        }

        return protection;
    }

    protected async getCTraderOrders (from: number, to: number): Promise<Record<string, any>[]> {
        const cTraderOrders: any[] = (await this.#connection.sendCommand("ProtoOAOrderListReq", {
            ctidTraderAccountId: this.id,
            fromTimestamp: from,
            toTimestamp: to,
        })).order;

        for (const order of cTraderOrders) {
            this.#cTraderOrders.set(order.orderId.toString(), order);
        }

        return cTraderOrders;
    }

    async #getAccountDescriptor (): Promise<Record<string, any>> {
        return (await this.#sendCommand("ProtoOATraderReq")).trader;
    }

    // eslint-disable-next-line id-length
    async #preloadPlainOpenPositionsAndPendingOrders (): Promise<void> {
        const accountOperativityDescriptor: Record<string, any> = await this.#sendCommand("ProtoOAReconcileReq");
        const plainOpenPositions: Record<string, any>[] = accountOperativityDescriptor.position;
        const plainPendingOrders: Record<string, any>[] = accountOperativityDescriptor.order;

        for (const plainOpenPosition of plainOpenPositions) {
            this.#cTraderPositions.set(plainOpenPosition.positionId, plainOpenPosition);
        }

        for (const plainOrder of plainPendingOrders) {
            this.#cTraderOrders.set(plainOrder.orderId, plainOrder);
        }
    }

    async #preloadAssets (): Promise<void> {
        const assets: Record<string, any>[] = (await this.#sendCommand("ProtoOAAssetListReq")).asset;

        this.#cTraderAssets.clear();
        this.#assets.clear();
        assets.forEach((plainAsset: Record<string, any>): void => {
            const name: string = plainAsset.name;

            this.#cTraderAssets.set(name, plainAsset);
            this.#assets.set(name, new MidaAsset({
                asset: name,
                description: "",
                measurementUnit: "",
                tradingAccount: this,
            }));
        });
    }

    async #preloadPlainSymbols (): Promise<void> {
        // <light-symbols>
        const plainSymbols: Record<string, any>[] = (await this.#sendCommand("ProtoOASymbolsListReq")).symbol;

        this.#cTraderSymbols.clear();
        plainSymbols.forEach((plainSymbol: Record<string, any>): void => {
            this.#cTraderSymbols.set(plainSymbol.symbolName, plainSymbol);
        });
        // </light-symbols>

        // <complete-symbols>
        const completePlainSymbols: Record<string, any>[] = (await this.#sendCommand("ProtoOASymbolByIdReq", {
            symbolId: plainSymbols.map((plainSymbol) => plainSymbol.symbolId),
        })).symbol;

        this.#completeSymbols.clear();
        completePlainSymbols.forEach((completePlainSymbol: Record<string, any>): void => {
            this.#completeSymbols.set(completePlainSymbol.symbolId, completePlainSymbol);
        });
        // </complete-symbols>
    }

    protected async getCTraderTrades (from: number, to: number): Promise<any[]> {
        const cTraderTrades: any[] = (await this.#connection.sendCommand("ProtoOADealListReq", {
            ctidTraderAccountId: this.id,
            fromTimestamp: from,
            toTimestamp: to,
        })).deal;

        for (const trade of cTraderTrades) {
            this.#cTraderTrades.set(trade.dealId.toString(), trade);
        }

        return cTraderTrades;
    }

    // The first tick recived after subscription will always contain the last known bid and ask price
    // eslint-disable-next-line max-lines-per-function
    #onTick (descriptor: Record<string, any>): void {
        const symbol: string = this.#getPlainSymbolById(descriptor.symbolId.toString())?.symbolName as string;
        const bid: MidaDecimal | undefined = descriptor.bid ? decimal(descriptor.bid).divide(100000) : undefined;
        const ask: MidaDecimal | undefined = descriptor.ask ? decimal(descriptor.ask).divide(100000) : undefined;
        const isFirstTick: boolean = !this.#lastTicks.has(symbol);
        const previousTick: MidaTick | undefined = this.#lastTicks.get(symbol);
        const movement: MidaTickMovement = ((): MidaTickMovement => {
            if (!ask) {
                return MidaTickMovement.BID;
            }

            if (!bid) {
                return MidaTickMovement.ASK;
            }

            return MidaTickMovement.BID_ASK;
        })();
        const tick: MidaTick = new MidaTick({
            symbol,
            bid: bid ?? previousTick?.bid,
            ask: ask ?? previousTick?.ask,
            date: date(),
            movement,
        });

        this.#lastTicks.set(symbol, tick);
        this.#internalTickListeners.get(symbol)?.(tick);

        // The first tick is used only to get the last known bid and ask price
        if (isFirstTick) {
            return;
        }

        if (this.#tickListeners.has(symbol)) {
            this.notifyListeners("tick", { tick, });
        }

        // <periods>
        const listenedTimeframes: MidaTimeframe[] = this.#periodListeners.get(symbol) ?? [];

        for (const plainPeriod of descriptor.trendbar ?? []) {
            const period: MidaPeriod = CTraderUtilities.normalizePeriod(plainPeriod, symbol, tick);

            if (!listenedTimeframes.includes(period.timeframe)) {
                continue;
            }

            const previousPeriods: Map<string, MidaPeriod> = this.#lastPeriods.get(symbol) ?? new Map();
            const previousPeriod: MidaPeriod | undefined = previousPeriods.get(period.timeframe);

            // If the current candlestick timestamp is greater than the previous one
            // then the current tick has opened a new candlestick and the previous one is now closed
            if (previousPeriod && period.endDate.timestamp > previousPeriod.endDate.timestamp) {
                this.notifyListeners("period-update", {
                    period: new MidaPeriod({
                        symbol,
                        startDate: previousPeriod.startDate,
                        endDate: previousPeriod.startDate,
                        quotationPrice: previousPeriod.quotationPrice,
                        open: previousPeriod.open,
                        high: previousPeriod.high,
                        low: previousPeriod.low,
                        close: previousPeriod.close,
                        volume: previousPeriod.volume,
                        timeframe: previousPeriod.timeframe,
                        isClosed: true,
                        ticks: previousPeriod.ticks,
                    }),
                });
            }

            previousPeriods.set(period.timeframe, period);
            this.#lastPeriods.set(symbol, previousPeriods);
            this.notifyListeners("period-update", { period, });
        }
        // </periods>
    }

    #onUpdate (descriptor: Record<string, any>): void {
        // <update-orders>
        const plainOrder: Record<string, any> = descriptor.order;

        if (plainOrder?.orderId && plainOrder.orderType && plainOrder.tradeData) {
            const orderId: string = plainOrder.orderId.toString();
            const orderAlreadyExists: boolean = this.#cTraderOrders.has(orderId);

            this.#cTraderOrders.set(orderId, plainOrder);

            if (!orderAlreadyExists && descriptor.executionType.toUpperCase() === "ORDER_ACCEPTED") {
                this.notifyListeners("order", { order: this.normalizeOrder(plainOrder), });
            }
        }
        // </update-orders>

        // <update-trades>
        const plainTrade: Record<string, any> = descriptor.deal;

        if (plainTrade?.orderId && plainTrade?.dealId && plainTrade?.positionId) {
            const tradeId: string = plainTrade.dealId.toString();
            const tradeAlreadyExists: boolean = this.#cTraderTrades.has(tradeId);

            this.#cTraderTrades.set(plainTrade.dealId, plainTrade);

            if (!tradeAlreadyExists) {
                this.notifyListeners("trade", { trade: this.normalizeTrade(plainTrade), });
            }
        }
        // </update-trades>

        // <update-positions>
        const plainPosition: Record<string, any> = descriptor.position;

        if (plainPosition?.positionId && plainPosition?.positionStatus) {
            this.#cTraderPositions.set(plainPosition.positionId, plainPosition);
        }
        // </update-positions>

        this.#cTraderEmitter.notifyListeners("execution", { descriptor, });
    }

    // eslint-disable-next-line max-lines-per-function
    #configureListeners (): void {
        // <execution>
        this.#connection.on("ProtoOAExecutionEvent", ({ descriptor, }): void => {
            if (descriptor.ctidTraderAccountId.toString() === this.id) {
                this.#onUpdate(descriptor);
            }
        });
        // </execution>

        // <ticks>
        this.#connection.on("ProtoOASpotEvent", ({ descriptor, }): void => {
            if (descriptor.ctidTraderAccountId.toString() === this.id) {
                this.#onTick(descriptor);
            }
        });
        // </ticks>

        // <symbol-update>
        this.#connection.on("ProtoOASymbolChangedEvent", ({ descriptor, }): void => {
            if (descriptor.ctidTraderAccountId.toString() !== this.id) {
                return;
            }

            const symbolId: string = descriptor.symbolId.toString();
            const plainSymbol: Record<string, any> | undefined = this.#getPlainSymbolById(symbolId);

            if (plainSymbol) {
                this.#completeSymbols.delete(plainSymbol.symbolId);
            }

            this.preloadAssetsAndSymbols();
        });
        // </symbol-update>

        // <position-update>
        this.#connection.on("ProtoOAMarginChangedEvent", ({ descriptor, }): void => {
            if (descriptor.ctidTraderAccountId.toString() !== this.id) {
                return;
            }

            // const positionId: string = descriptor.positionId.toString();
        });
        // </position-update>

        this.#connection.on("ProtoOAOrderErrorEvent", ({ descriptor, }): void => {
            this.#cTraderEmitter.notifyListeners("order-error", { descriptor, });
        });
    }

    #getPlainSymbolById (id: string): Record<string, any> | undefined {
        for (const plainSymbol of [ ...this.#cTraderSymbols.values(), ]) {
            if (plainSymbol.symbolId.toString() === id) {
                return plainSymbol;
            }
        }

        return undefined;
    }

    #getCompletePlainSymbol (symbol: string): Record<string, any> {
        const plainSymbol: Record<string, any> | undefined = this.#cTraderSymbols.get(symbol) as Record<string, any>;

        if (!plainSymbol) {
            logger.fatal(`Symbol ${symbol} not found`);

            throw new Error();
        }

        const completePlainSymbol: Record<string, any> | undefined = this.#completeSymbols.get(plainSymbol.symbolId);

        if (!completePlainSymbol) {
            logger.fatal(`Symbol ${symbol} not found`);

            throw new Error();
        }

        return completePlainSymbol;
    }

    #getPlainAssetById (id: string): Record<string, any> | undefined {
        return [ ...this.#cTraderAssets.values(), ].find((asset: Record<string, any>) => asset.assetId.toString() === id);
    }

    #getPlainAssetByName (name: string): Record<string, any> | undefined {
        return [ ...this.#cTraderAssets.values(), ].find((asset: Record<string, any>) => asset.name === name);
    }

    // eslint-disable-next-line max-lines-per-function
    public async getPlainPositionGrossProfit (plainPosition: Record<string, any>): Promise<MidaDecimal> {
        const plainSymbol: Record<string, any> | undefined = this.#getPlainSymbolById(plainPosition.tradeData.symbolId);
        const symbol: string = plainSymbol?.symbolName;

        if (!plainSymbol) {
            throw new Error();
        }

        const completePlainSymbol: Record<string, any> = this.#getCompletePlainSymbol(symbol);
        const lotUnits: MidaDecimal = decimal(completePlainSymbol.lotSize).divide(100);
        const volume: MidaDecimal = decimal(plainPosition.tradeData.volume).divide(100).divide(lotUnits);
        const openPrice: MidaDecimal = decimal(plainPosition.price);
        const lastSymbolTick: MidaTick = await this.#getSymbolLastTick(symbol);
        let direction: MidaPositionDirection;
        let closePrice: MidaDecimal;

        switch (plainPosition.tradeData.tradeSide.toUpperCase()) {
            case "SELL": {
                direction = MidaPositionDirection.SHORT;
                closePrice = lastSymbolTick.ask;

                break;
            }
            case "BUY": {
                direction = MidaPositionDirection.LONG;
                closePrice = lastSymbolTick.bid;

                break;
            }
            default: {
                throw new Error();
            }
        }

        let grossProfit: MidaDecimal;

        if (direction === MidaPositionDirection.LONG) {
            grossProfit = closePrice.subtract(openPrice).multiply(volume).multiply(lotUnits);
        }
        else {
            grossProfit = openPrice.subtract(closePrice).multiply(volume).multiply(lotUnits);
        }

        const quoteAssedId: string = plainSymbol.quoteAssetId.toString();
        const depositAssetId: string = this.#getPlainAssetByName(this.primaryAsset)?.assetId.toString() as string;
        let depositExchangeRate: MidaDecimal = decimal(1);

        // <rate-for-conversion-to-deposit-asset>
        if (quoteAssedId !== depositAssetId) {
            let depositConversionChain: Record<string, any>[] = this.#depositConversionChains.get(symbol) ?? [];
            let movedAssetId: string = quoteAssedId;

            if (!depositConversionChain) {
                depositConversionChain = (await this.#sendCommand("ProtoOASymbolsForConversionReq", {
                    firstAssetId: quoteAssedId,
                    lastAssetId: depositAssetId,
                })).symbol as Record<string, any>[];

                this.#depositConversionChains.set(symbol, depositConversionChain);
            }

            for (const plainLightSymbol of depositConversionChain) {
                const lastLightSymbolTick: MidaTick = await this.#getSymbolLastTick(plainLightSymbol.symbolName);
                const supposedClosePrice: MidaDecimal = lastLightSymbolTick.ask;

                if (plainLightSymbol.baseAssetId.toString() === movedAssetId) {
                    depositExchangeRate = depositExchangeRate.multiply(supposedClosePrice);
                    movedAssetId = plainLightSymbol.quoteAssetId.toString();
                }
                else {
                    depositExchangeRate = depositExchangeRate.multiply(decimal(1).divide(supposedClosePrice));
                    movedAssetId = plainLightSymbol.baseAssetId.toString();
                }
            }
        }
        // </rate-for-converion-to-deposit-asset>

        // Return the gross profit converted to deposit asset
        return grossProfit.multiply(depositExchangeRate);
    }

    public async getPlainPositionNetProfit (plainPosition: Record<string, any>): Promise<MidaDecimal> {
        const grossProfit: MidaDecimal = await this.getPlainPositionGrossProfit(plainPosition);
        const totalCommission: MidaDecimal = decimal(plainPosition.commission).divide(100).multiply(2);
        const totalSwap: MidaDecimal = decimal(plainPosition.swap).divide(100);

        return grossProfit.add(totalCommission).add(totalSwap);
    }

    public getPlainPositionById (id: string): Record<string, any> | undefined {
        return this.#cTraderPositions.get(id);
    }

    public async getPlainOrderById (id: string): Promise<Record<string, any> | undefined> {
        if (this.#cTraderOrders.has(id)) {
            return this.#cTraderOrders.get(id);
        }

        const W1: number = 604800000; // max. 1 week as indicated at https://spotware.github.io/open-api-docs/messages/#protooaorderlistreq
        let toTimestamp: number = Date.now();
        let fromTimestamp: number = toTimestamp - W1;
        let totalTimestamp: number = W1;

        // Since there is no interface to request an order by id, search through the orders of the past 3 weeks
        while (totalTimestamp / W1 <= 3) {
            const plainOrders: Record<string, any>[] = (await this.#sendCommand("ProtoOAOrderListReq", {
                fromTimestamp,
                toTimestamp,
            })).order;

            if (plainOrders.length === 0) {
                return undefined;
            }

            for (const plainOrder of plainOrders) {
                const orderId: string = Number(plainOrder.orderId).toString();

                if (!this.#cTraderOrders.has(orderId)) {
                    this.#cTraderOrders.set(orderId, plainOrder);
                }
            }

            if (this.#cTraderOrders.has(id)) {
                return this.#cTraderOrders.get(id);
            }

            toTimestamp = fromTimestamp;
            fromTimestamp -= W1;
            totalTimestamp += W1;
        }

        return undefined;
    }

    public async getPlainDealById (id: string): Promise<Record<string, any> | undefined> {
        if (this.#cTraderTrades.has(id)) {
            return this.#cTraderTrades.get(id);
        }

        // Max. 1 week as indicated at https://spotware.github.io/open-api-docs/messages/#protooadeallistreq
        const W1: number = MidaTimeframe.toSeconds("W1") as number * 1000;
        let toTimestamp: number = Date.now();
        let fromTimestamp: number = toTimestamp - W1;
        let totalTimestamp: number = W1;

        // Since there is no interface to request a deal by id, search through the deals of the past 3 weeks
        while (totalTimestamp / W1 <= 3) {
            const plainDeals: Record<string, any>[] = (await this.#sendCommand("ProtoOADealListReq", {
                fromTimestamp,
                toTimestamp,
            })).deal;

            if (plainDeals.length === 0) {
                return undefined;
            }

            for (const plainDeal of plainDeals) {
                const dealId: string = Number(plainDeal.dealId).toString();

                if (!this.#cTraderTrades.has(dealId)) {
                    this.#cTraderTrades.set(dealId, plainDeal);
                }
            }

            if (this.#cTraderTrades.has(id)) {
                return this.#cTraderTrades.get(id);
            }

            toTimestamp = fromTimestamp;
            fromTimestamp -= W1;
            totalTimestamp += W1;
        }

        return undefined;
    }

    async #sendCommand (payloadType: string, parameters?: Record<string, any>, messageId?: string): Promise<Record<string, any>> {
        return this.#connection.sendCommand(payloadType, {
            ctidTraderAccountId: this.id,
            ...parameters ?? {},
        }, messageId);
    }
}
