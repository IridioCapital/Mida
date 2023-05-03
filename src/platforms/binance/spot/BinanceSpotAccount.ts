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
    AssetBalance,
    AvgPriceResult,
    Binance,
    CandlesOptions,
    MyTrade as BinanceTrade,
    Symbol as BinanceSymbol,
} from "binance-api-node";

import { MidaTradingAccount, } from "#accounts/MidaTradingAccount";
import { MidaAsset, } from "#assets/MidaAsset";
import { MidaAssetStatement, } from "#assets/MidaAssetStatement";
import { date, MidaDate, } from "#dates/MidaDate";
import { decimal, MidaDecimal, } from "#decimals/MidaDecimal";
import { MidaEventListener, } from "#events/MidaEventListener";
import { MidaOrder, } from "#orders/MidaOrder";
import { MidaOrderDirection, } from "#orders/MidaOrderDirection";
import { MidaOrderDirectives, } from "#orders/MidaOrderDirectives";
import { MidaOrderPurpose, } from "#orders/MidaOrderPurpose";
import { MidaOrderStatus, } from "#orders/MidaOrderStatus";
import { MidaOrderTimeInForce, } from "#orders/MidaOrderTimeInForce";
import { MidaPeriod, } from "#periods/MidaPeriod";
import { MidaPosition, } from "#positions/MidaPosition";
import { MidaQuotationPrice, } from "#quotations/MidaQuotationPrice";
import { MidaSymbol, } from "#symbols/MidaSymbol";
import { MidaSymbolTradeStatus, } from "#symbols/MidaSymbolTradeStatus";
import { MidaTick, } from "#ticks/MidaTick";
import { MidaTickMovement, } from "#ticks/MidaTickMovement";
import { MidaTimeframe, } from "#timeframes/MidaTimeframe";
import { MidaTrade, } from "#trades/MidaTrade";
import { MidaTradeDirection, } from "#trades/MidaTradeDirection";
import { MidaTradePurpose, } from "#trades/MidaTradePurpose";
import { MidaTradeStatus, } from "#trades/MidaTradeStatus";
import { MidaEmitter, } from "#utilities/emitters/MidaEmitter";
import { createOrderResolver, } from "#utilities/MidaUtilities";
import { BinanceSpotAccountParameters, } from "!/src/platforms/binance/spot/BinanceSpotAccountParameters";
import { BinanceSpotOrder, } from "!/src/platforms/binance/spot/orders/BinanceSpotOrder";
import { BinanceSpotTrade, } from "!/src/platforms/binance/spot/trades/BinanceSpotTrade";
import { BinanceSpotUtilities, } from "!/src/platforms/binance/spot/utilities/BinanceSpotUtilities";

export class BinanceSpotAccount extends MidaTradingAccount {
    readonly #binanceConnection: Binance;
    readonly #binanceEmitter: MidaEmitter;
    readonly #assets: Map<string, MidaAsset>;
    readonly #symbols: Map<string, MidaSymbol>;
    readonly #tickListeners: Map<string, boolean>;
    readonly #periodListeners: Map<string, MidaTimeframe[]>;
    readonly #lastTicks: Map<string, MidaTick>;

    public constructor ({
        id,
        platform,
        creationDate,
        primaryAsset,
        operativity,
        positionAccounting,
        indicativeLeverage,
        binanceConnection,
    }: BinanceSpotAccountParameters) {
        super({
            id,
            platform,
            creationDate,
            primaryAsset,
            operativity,
            positionAccounting,
            indicativeLeverage,
        });

        this.#binanceConnection = binanceConnection;
        this.#binanceEmitter = new MidaEmitter();
        this.#assets = new Map();
        this.#symbols = new Map();
        this.#tickListeners = new Map();
        this.#periodListeners = new Map();
        this.#lastTicks = new Map();
    }

    public async preload (): Promise<void> {
        await this.#preloadSymbols();
        await this.#configureListeners();
    }

    public override async placeOrder (directives: MidaOrderDirectives): Promise<MidaOrder> {
        const symbol: string = directives.symbol as string;
        const direction: MidaOrderDirection = directives.direction;
        const requestedVolume: MidaDecimal = decimal(directives.volume);
        const order: BinanceSpotOrder = new BinanceSpotOrder({
            id: "",
            direction,
            limitPrice: directives.limit !== undefined ? decimal(directives.limit) : undefined,
            purpose: direction === MidaOrderDirection.BUY ? MidaOrderPurpose.OPEN : MidaOrderPurpose.CLOSE,
            requestedVolume,
            status: MidaOrderStatus.REQUESTED,
            symbol,
            timeInForce: directives.timeInForce ?? MidaOrderTimeInForce.GOOD_TILL_CANCEL,
            tradingAccount: this,
            binanceConnection: this.#binanceConnection,
            binanceEmitter: this.#binanceEmitter,
            directives,
            isStopOut: false,
            trades: [],
            clientOrderId: directives.clientOrderId,
        });

        const listeners: { [eventType: string]: MidaEventListener } = directives.listeners ?? {};
        const resolver: Promise<BinanceSpotOrder> =
            createOrderResolver(order, directives.resolverEvents) as Promise<BinanceSpotOrder>;

        for (const eventType of Object.keys(listeners)) {
            order.on(eventType, listeners[eventType]);
        }

        this.notifyListeners("order", { order, });
        order.send();

        return resolver;
    }

    public override async getBalance (): Promise<MidaDecimal> {
        const assetStatement: MidaAssetStatement = await this.#getAssetStatement(this.primaryAsset);

        return decimal(assetStatement.freeVolume).add(assetStatement.lockedVolume).add(assetStatement.borrowedVolume);
    }

    public override async getAssetBalance (asset: string): Promise<MidaAssetStatement> {
        return this.#getAssetStatement(asset);
    }

    public override async getBalanceSheet (): Promise<MidaAssetStatement[]> {
        const balanceSheet: MidaAssetStatement[] = [];
        const binanceAssets: AssetBalance[] = (await this.#binanceConnection.accountInfo()).balances;

        for (const binanceAsset of binanceAssets) {
            const totalVolume: MidaDecimal = decimal(binanceAsset.free).add(binanceAsset.locked);

            if (totalVolume.greaterThan(0)) {
                balanceSheet.push({
                    tradingAccount: this,
                    date: date(),
                    asset: binanceAsset.asset,
                    freeVolume: decimal(binanceAsset.free),
                    lockedVolume: decimal(binanceAsset.locked),
                    borrowedVolume: decimal(0),
                });
            }
        }

        return balanceSheet;
    }

    public override async getEquity (): Promise<MidaDecimal> {
        const balanceSheet: MidaAssetStatement[] = await this.getBalanceSheet();
        const lastQuotations: Record<string, any> = await this.#binanceConnection.allBookTickers();
        let totalPrimaryAssetBalance: MidaDecimal = decimal(0);

        for (const assetStatement of balanceSheet) {
            const asset: string = assetStatement.asset;
            const totalAssetBalance: MidaDecimal = assetStatement.freeVolume.add(assetStatement.lockedVolume);

            if (this.primaryAsset === asset) {
                totalPrimaryAssetBalance = totalPrimaryAssetBalance.add(totalAssetBalance);

                continue;
            }

            let exchangeRate: Record<string, any> = lastQuotations[asset + this.primaryAsset];

            if (exchangeRate) {
                totalPrimaryAssetBalance = totalPrimaryAssetBalance.add(totalAssetBalance.multiply(exchangeRate.bidPrice));

                continue;
            }

            exchangeRate = lastQuotations[this.primaryAsset + asset];

            if (!exchangeRate) {
                continue;
            }

            totalPrimaryAssetBalance = totalPrimaryAssetBalance.add(totalAssetBalance.divide(exchangeRate.bidPrice));
        }

        return totalPrimaryAssetBalance;
    }

    public override async getUsedMargin (): Promise<MidaDecimal> {
        // Binance Spot doesn't support margin trading
        return decimal(0);
    }

    public override async getFreeMargin (): Promise<MidaDecimal> {
        // Binance Spot doesn't support margin trading
        return decimal(0);
    }

    public override async getMarginLevel (): Promise<MidaDecimal | undefined> {
        // Binance Spot doesn't support margin trading
        return undefined;
    }

    public override async getTrades (symbol: string): Promise<MidaTrade[]> {
        const trades: MidaTrade[] = [];
        const binanceTrades: BinanceTrade[] = await this.#binanceConnection.myTrades({ symbol, });

        for (const binanceTrade of binanceTrades) {
            trades.push(new BinanceSpotTrade({
                orderId: binanceTrade.orderId.toString(),
                positionId: "",
                tradingAccount: this,
                symbol,
                commission: decimal(binanceTrade.commission),
                commissionAsset: binanceTrade.commissionAsset.toString(),
                direction: binanceTrade.isBuyer ? MidaTradeDirection.BUY : MidaTradeDirection.SELL,
                executionDate: date(binanceTrade.time),
                executionPrice: decimal(binanceTrade.price),
                id: binanceTrade.id.toString(),
                purpose: binanceTrade.isBuyer ? MidaTradePurpose.OPEN : MidaTradePurpose.CLOSE,
                status: MidaTradeStatus.EXECUTED,
                volume: decimal(binanceTrade.qty),
            }));
        }

        return trades;
    }

    #normalizeOrder (binanceOrder: Record<string, any>): MidaOrder {
        const creationDate: MidaDate | undefined = binanceOrder.time ? new MidaDate(binanceOrder.time) : undefined;
        let status: MidaOrderStatus = MidaOrderStatus.REQUESTED;

        switch (binanceOrder.status.toUpperCase()) {
            case "NEW": {
                if (binanceOrder.type.toUpperCase() !== "MARKET") {
                    status = MidaOrderStatus.PENDING;
                }

                break;
            }
            case "PARTIALLY_FILLED":
            case "FILLED": {
                status = MidaOrderStatus.EXECUTED;

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

                break;
            }
        }

        return new BinanceSpotOrder({
            tradingAccount: this,
            creationDate,
            trades: [],
            direction: binanceOrder.side === "BUY" ? MidaOrderDirection.BUY : MidaOrderDirection.SELL,
            id: binanceOrder.orderId.toString(),
            isStopOut: false,
            lastUpdateDate: binanceOrder.updateTime ? new MidaDate(Number(binanceOrder.updateTime)) : creationDate,
            limitPrice: binanceOrder.type === "LIMIT" ? decimal(binanceOrder.price) : undefined,
            purpose: binanceOrder.side === "BUY" ? MidaOrderPurpose.OPEN : MidaOrderPurpose.CLOSE,
            requestedVolume: decimal(binanceOrder.origQty),
            status,
            symbol: binanceOrder.symbol,
            timeInForce: BinanceSpotUtilities.normalizeTimeInForce(binanceOrder.timeInForce),
            binanceConnection: this.#binanceConnection,
            binanceEmitter: this.#binanceEmitter,
            clientOrderId: binanceOrder.clientOrderId,
        });
    }

    public override async getOrders (symbol: string): Promise<MidaOrder[]> {
        const binanceOrders: Record<string, any>[] = await this.#binanceConnection.allOrders({ symbol, });
        const executedOrders: MidaOrder[] = [];

        for (const binanceOrder of binanceOrders) {
            const order = this.#normalizeOrder(binanceOrder);

            if (order.isExecuted) {
                executedOrders.push(order);
            }
        }

        return executedOrders;
    }

    public override async getPendingOrders (): Promise<MidaOrder[]> {
        const binanceOrders: Record<string, any>[] = await this.#binanceConnection.openOrders({});
        const pendingOrders: MidaOrder[] = [];

        for (const binanceOrder of binanceOrders) {
            const order = this.#normalizeOrder(binanceOrder);

            if (order.status === MidaOrderStatus.PENDING) {
                pendingOrders.push(order);
            }
        }

        return pendingOrders;
    }

    public async getAssets (): Promise<string[]> {
        const assets: Set<string> = new Set();

        for (const symbol of [ ...this.#symbols.values(), ]) {
            assets.add(symbol.baseAsset);
            assets.add(symbol.quoteAsset);
        }

        return [ ...assets, ];
    }

    public override async getAsset (asset: string): Promise<MidaAsset | undefined> {
        const assets: string[] = await this.getAssets();

        if (assets.includes(asset)) {
            return new MidaAsset({ asset, tradingAccount: this, });
        }

        return undefined;
    }

    async #getAssetStatement (asset: string): Promise<MidaAssetStatement> {
        const balanceSheet: AssetBalance[] = (await this.#binanceConnection.accountInfo()).balances;
        const statement: MidaAssetStatement = {
            tradingAccount: this,
            date: date(),
            asset,
            freeVolume: decimal(0),
            lockedVolume: decimal(0),
            borrowedVolume: decimal(0),
        };

        for (const binanceAsset of balanceSheet) {
            if (binanceAsset.asset === asset) {
                statement.freeVolume = decimal(binanceAsset.free);
                statement.lockedVolume = decimal(binanceAsset.locked);

                break;
            }
        }

        return statement;
    }

    async #getSymbolLastTick (symbol: string): Promise<MidaTick> {
        const lastTick: MidaTick | undefined = this.#lastTicks.get(symbol);

        if (lastTick) {
            return lastTick;
        }

        const lastPlainTick: Record<string, any> = (await this.#binanceConnection.allBookTickers())[symbol];

        return new MidaTick({
            ask: decimal(lastPlainTick.askPrice),
            bid: decimal(lastPlainTick.bidPrice),
            date: date(),
            symbol,
        });
    }

    public override async getSymbolBid (symbol: string): Promise<MidaDecimal> {
        return (await this.#getSymbolLastTick(symbol)).bid;
    }

    public override async getSymbolAsk (symbol: string): Promise<MidaDecimal> {
        return (await this.#getSymbolLastTick(symbol)).ask;
    }

    public override async getSymbolAverage (symbol: string): Promise<MidaDecimal> {
        const response: AvgPriceResult = await this.#binanceConnection.avgPrice({ symbol, }) as AvgPriceResult;

        return decimal(response.price);
    }

    public override async getSymbolPeriods (symbol: string, timeframe: MidaTimeframe): Promise<MidaPeriod[]> {
        const periods: MidaPeriod[] = [];
        const plainPeriods: Record<string, any>[] = await this.#binanceConnection.candles(<CandlesOptions> {
            symbol,
            interval: BinanceSpotUtilities.toBinanceTimeframe(timeframe),
        });

        for (const plainPeriod of plainPeriods) {
            periods.push(new MidaPeriod({
                endDate: date(plainPeriod.openTime), // TODO: TODO
                symbol,
                close: decimal(plainPeriod.close),
                high: decimal(plainPeriod.high),
                low: decimal(plainPeriod.low),
                open: decimal(plainPeriod.open),
                quotationPrice: MidaQuotationPrice.BID,
                startDate: date(plainPeriod.openTime),
                timeframe,
                isClosed: true,
                volume: decimal(plainPeriod.volume),
            }));
        }

        // Order from oldest to newest
        periods.sort((left, right): number => left.startDate.timestamp - right.startDate.timestamp);

        return periods;
    }

    public override async getSymbols (): Promise<string[]> {
        return [ ...this.#symbols.keys(), ];
    }

    public override async getSymbol (symbol: string): Promise<MidaSymbol | undefined> {
        return this.#symbols.get(symbol);
    }

    public override async watchSymbolTicks (symbol: string): Promise<void> {
        if (this.#tickListeners.has(symbol)) {
            return;
        }

        this.#binanceConnection.ws.customSubStream(`${symbol.toLowerCase()}@bookTicker`, (plainTick: Record<string, any>) => this.#onTick(plainTick));
        this.#tickListeners.set(symbol, true);
    }

    public override async watchSymbolPeriods (symbol: string, timeframe: MidaTimeframe): Promise<void> {
        const listenedTimeframes: MidaTimeframe[] = this.#periodListeners.get(symbol) ?? [];

        if (listenedTimeframes.includes(timeframe)) {
            return;
        }

        // eslint-disable-next-line max-len
        this.#binanceConnection.ws.candles(symbol, BinanceSpotUtilities.toBinanceTimeframe(timeframe), (plainPeriod: Record<string, any>) => this.#onPeriodUpdate(plainPeriod));
        listenedTimeframes.push(timeframe);
        this.#periodListeners.set(symbol, listenedTimeframes);
    }

    public override async getOpenPositions (): Promise<MidaPosition[]> {
        return [];
    }

    public override async isSymbolMarketOpen (symbol: string): Promise<boolean> {
        return true;
    }

    public override async getCryptoAssetDepositAddress (asset: string, net: string): Promise<string> {
        return (await this.#binanceConnection.depositAddress({ coin: asset, network: net, })).address;
    }

    // https://github.com/binance/binance-spot-api-docs/blob/master/web-socket-streams.md#individual-symbol-book-ticker-streams
    #onTick (plainTick: Record<string, any>): void {
        const symbol: string = plainTick.s;
        const bid: MidaDecimal = decimal(plainTick.b);
        const ask: MidaDecimal = decimal(plainTick.a);
        const previousTick: MidaTick | undefined = this.#lastTicks.get(symbol);
        const movement: MidaTickMovement | undefined = ((): MidaTickMovement | undefined => {
            const currentBidIsEqualToPrevious: boolean = previousTick?.bid.equals(bid) ?? false;
            const currentAskIsEqualToPrevious: boolean = previousTick?.ask.equals(ask) ?? false;

            if (currentBidIsEqualToPrevious && currentAskIsEqualToPrevious) {
                return undefined;
            }

            if (currentAskIsEqualToPrevious) {
                return MidaTickMovement.BID;
            }

            if (currentBidIsEqualToPrevious) {
                return MidaTickMovement.ASK;
            }

            return MidaTickMovement.BID_ASK;
        })();

        if (!movement) {
            return;
        }

        const tick: MidaTick = new MidaTick({
            bid: decimal(plainTick.b),
            ask: decimal(plainTick.a),
            date: date(),
            movement,
            symbol,
        });

        this.#lastTicks.set(symbol, tick);

        if (this.#tickListeners.has(symbol)) {
            this.notifyListeners("tick", { tick, });
        }
    }

    #onPeriodUpdate (plainPeriod: Record<string, any>): void {
        const symbol: string = plainPeriod.symbol;
        const timeframe: MidaTimeframe = BinanceSpotUtilities.normalizeTimeframe(plainPeriod.interval);

        if (!(this.#periodListeners.get(symbol) ?? []).includes(timeframe)) {
            return;
        }

        const period: MidaPeriod = new MidaPeriod({
            symbol,
            close: decimal(plainPeriod.close),
            high: decimal(plainPeriod.high),
            low: decimal(plainPeriod.low),
            open: decimal(plainPeriod.open),
            quotationPrice: MidaQuotationPrice.BID,
            startDate: date(plainPeriod.openTime),
            endDate: date(plainPeriod.openTime), // TODO: TODO
            timeframe,
            isClosed: plainPeriod.isFinal === true,
            volume: decimal(plainPeriod.volume),
        });

        this.notifyListeners("period-update", { period, });
    }

    async #preloadSymbols (): Promise<void> {
        const binanceSymbols: BinanceSymbol[] = (await this.#binanceConnection.exchangeInfo()).symbols;

        this.#symbols.clear();

        for (const binanceSymbol of binanceSymbols) {
            const volumeFilter: Record<string, any> | undefined
                    = BinanceSpotUtilities.getBinanceSymbolFilterByType(binanceSymbol, "LOT_SIZE");

            this.#symbols.set(binanceSymbol.symbol, new MidaSymbol({
                baseAsset: binanceSymbol.baseAsset,
                tradingAccount: this,
                description: "",
                leverage: decimal(0),
                lotUnits: decimal(1),
                maxLots: decimal(volumeFilter?.maxQty ?? -1),
                minLots: decimal(volumeFilter?.minQty ?? -1),
                pipPosition: -1,
                quoteAsset: binanceSymbol.quoteAsset,
                symbol: binanceSymbol.symbol,
                digits: 2, // TODO: TODO
            }));
        }
    }

    #onNewOrder (descriptor: Record<string, any>): void {
        // Silence is golden
    }

    public override async getSymbolTradeStatus (symbol: string): Promise<MidaSymbolTradeStatus> {
        return MidaSymbolTradeStatus.ENABLED;
    }

    public override async getDate (): Promise<MidaDate> {
        return date();
    }

    async #configureListeners (): Promise<void> {
        await this.#binanceConnection.ws.user((update: Record<string, any>): void => {
            if (update.eventType === "executionReport" && update.orderId && update.orderStatus.toUpperCase() === "NEW") {
                this.#onNewOrder(update);
            }

            this.#binanceEmitter.notifyListeners("update", { update, });
        });
    }
}
