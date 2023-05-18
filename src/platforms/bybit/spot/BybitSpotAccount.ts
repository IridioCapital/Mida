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
    KlineInterval,
    SpotClientV3,
    WebsocketClient,
} from "bybit-api";

import { MidaTradingAccount, } from "#accounts/MidaTradingAccount";
import { MidaAsset, } from "#assets/MidaAsset";
import { MidaAssetStatement, } from "#assets/MidaAssetStatement";
import { date, MidaDate, } from "#dates/MidaDate";
import { decimal, MidaDecimal, } from "#decimals/MidaDecimal";
import { unsupportedOperationError, } from "#errors/MidaErrorUtilities";
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
import { MidaSymbolFundingDescriptor, } from "#symbols/MidaSymbolFundingDescriptor";
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
import { BybitSpotAccountParameters, } from "!/src/platforms/bybit/spot/BybitSpotAccountParameters";
import { BybitSpotOrder, } from "!/src/platforms/bybit/spot/orders/BybitSpotOrder";
import { BybitSpotTrade, } from "!/src/platforms/bybit/spot/trades/BybitSpotTrade";
import { BybitSpotUtilities, } from "!/src/platforms/bybit/spot/utilities/BybitSpotUtilities";

export class BybitSpotAccount extends MidaTradingAccount {
    readonly #bybitConnection: SpotClientV3;
    readonly #bybitWsConnection: WebsocketClient;
    readonly #bybitEmitter: MidaEmitter;
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
        bybitConnection,
        bybitWsConnection,
    }: BybitSpotAccountParameters) {
        super({
            id,
            platform,
            creationDate,
            primaryAsset,
            operativity,
            positionAccounting,
            indicativeLeverage,
        });

        this.#bybitConnection = bybitConnection;
        this.#bybitWsConnection = bybitWsConnection;
        this.#bybitEmitter = new MidaEmitter();
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

    public override async placeOrder (directives: MidaOrderDirectives): Promise<BybitSpotOrder> {
        const symbol: string = directives.symbol as string;
        const direction: MidaOrderDirection = directives.direction;
        const requestedVolume: MidaDecimal = decimal(directives.volume);
        const order: BybitSpotOrder = new BybitSpotOrder({
            id: "",
            direction,
            limitPrice: directives.limit !== undefined ? decimal(directives.limit) : undefined,
            purpose: direction === MidaOrderDirection.BUY ? MidaOrderPurpose.OPEN : MidaOrderPurpose.CLOSE,
            requestedVolume,
            status: MidaOrderStatus.REQUESTED,
            symbol,
            timeInForce: directives.timeInForce ?? MidaOrderTimeInForce.GOOD_TILL_CANCEL,
            tradingAccount: this,
            bybitConnection: this.#bybitConnection,
            bybitEmitter: this.#bybitEmitter,
            directives,
            isStopOut: false,
            clientOrderId: directives.clientOrderId,
            trades: [],
        });

        const listeners: Record<string, MidaEventListener> = directives.listeners ?? {};
        const resolver: Promise<BybitSpotOrder> =
            createOrderResolver(order, directives.resolverEvents) as Promise<BybitSpotOrder>;

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
        const bybitAssets: Record<string, any>[] = (await this.#bybitConnection.getBalances()).result.balances;

        for (const bybitAsset of bybitAssets) {
            const totalVolume: MidaDecimal = decimal(bybitAsset.total);

            if (totalVolume.greaterThan(0)) {
                balanceSheet.push({
                    tradingAccount: this,
                    date: date(),
                    asset: bybitAsset.coin,
                    freeVolume: decimal(bybitAsset.free),
                    lockedVolume: decimal(bybitAsset.locked),
                    borrowedVolume: decimal(0),
                });
            }
        }

        return balanceSheet;
    }

    public override async stillConnected (): Promise<boolean> {
        throw unsupportedOperationError(this.platform);
    }

    public override async getEquity (): Promise<MidaDecimal> {
        return decimal(0);
    }

    public override async getUsedMargin (): Promise<MidaDecimal> {
        return decimal(0);
    }

    public override async getFreeMargin (): Promise<MidaDecimal> {
        return decimal(0);
    }

    public override async getMarginLevel (): Promise<MidaDecimal | undefined> {
        return undefined;
    }

    public override async getTrades (symbol: string): Promise<MidaTrade[]> {
        const trades: MidaTrade[] = [];
        const bybitTrades: Record<string, any>[] = (await this.#bybitConnection.getTrades(symbol)).result.list;

        for (const bybitTrade of bybitTrades) {
            trades.push(this.normalizeTrade(bybitTrade));
        }

        return trades;
    }

    public normalizeTrade (bybitTrade: Record<string, any>): BybitSpotTrade {
        return new BybitSpotTrade({
            id: bybitTrade.tradeId,
            orderId: bybitTrade.orderId,
            positionId: "",
            tradingAccount: this,
            symbol: bybitTrade.symbol,
            commission: decimal(bybitTrade.execFee),
            commissionAsset: "",
            direction: bybitTrade.isBuyer === "0" ? MidaTradeDirection.BUY : MidaTradeDirection.SELL,
            executionDate: date(bybitTrade.executionTime),
            executionPrice: decimal(bybitTrade.orderPrice),
            purpose: MidaTradePurpose.UNKNOWN,
            status: MidaTradeStatus.EXECUTED,
            volume: decimal(bybitTrade.orderQty),
        });
    }

    public normalizeOrder (bybitOrder: Record<string, any>): BybitSpotOrder {
        const creationDate: MidaDate | undefined = bybitOrder.createTime ? date(bybitOrder.createTime) : undefined;
        let status: MidaOrderStatus = MidaOrderStatus.REQUESTED;

        switch (bybitOrder.orderStatus) {
            case "NEW": {
                if (bybitOrder.orderType !== "MARKET") {
                    status = MidaOrderStatus.PENDING;
                }

                break;
            }
            case "PARTIALLY_FILLED":
            case "FILLED": {
                status = MidaOrderStatus.EXECUTED;

                break;
            }
            case "CANCELED": {
                status = MidaOrderStatus.CANCELLED;

                break;
            }
            case "REJECTED": {
                status = MidaOrderStatus.REJECTED;

                break;
            }
        }

        return new BybitSpotOrder({
            id: bybitOrder.orderId,
            tradingAccount: this,
            creationDate,
            trades: [],
            direction: bybitOrder.side === "BUY" ? MidaOrderDirection.BUY : MidaOrderDirection.SELL,
            isStopOut: false,
            clientOrderId: bybitOrder.orderLinkId,
            lastUpdateDate: bybitOrder.updateTime ? date(bybitOrder.updateTime) : creationDate,
            limitPrice: bybitOrder.orderType === "LIMIT" ? decimal(bybitOrder.avgPrice) : undefined,
            purpose: bybitOrder.side === "BUY" ? MidaOrderPurpose.OPEN : MidaOrderPurpose.CLOSE,
            requestedVolume: decimal(bybitOrder.orderQty),
            status,
            symbol: bybitOrder.symbol,
            timeInForce: BybitSpotUtilities.normalizeTimeInForce(bybitOrder.timeInForce),
            bybitConnection: this.#bybitConnection,
            bybitEmitter: this.#bybitEmitter,
        });
    }

    public override async getOrders (symbol: string): Promise<MidaOrder[]> {
        const executedOrders: MidaOrder[] = [];
        const bybitOrders: Record<string, any>[] = (await this.#bybitConnection.getPastOrders(symbol)).result.list;

        for (const bybitOrder of bybitOrders) {
            const order = this.normalizeOrder(bybitOrder);

            if (order.isExecuted) {
                executedOrders.push(order);
            }
        }

        return executedOrders;
    }

    public override async getPendingOrders (): Promise<MidaOrder[]> {
        const bybitOrders: Record<string, any>[] = (await this.#bybitConnection.getOpenOrders()).result;
        const pendingOrders: MidaOrder[] = [];

        for (const bybitOrder of bybitOrders) {
            const order = this.normalizeOrder(bybitOrder);

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
        const balanceSheet: MidaAssetStatement[] = await this.getBalanceSheet();

        for (const statement of balanceSheet) {
            if (statement.asset === asset) {
                return statement;
            }
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

    public override async getSymbolFundingDescriptor (symbol: string): Promise<MidaSymbolFundingDescriptor> {
        throw unsupportedOperationError(this.platform);
    }

    async #getSymbolLastTick (symbol: string): Promise<MidaTick> {
        const lastTick: MidaTick | undefined = this.#lastTicks.get(symbol);

        if (lastTick) {
            return lastTick;
        }

        const lastBybitTick: Record<string, any> = (await this.#bybitConnection.getBestBidAskPrice(symbol)).result;

        return new MidaTick({
            date: date(),
            symbol,
            bid: decimal(lastBybitTick.bidPrice),
            ask: decimal(lastBybitTick.askPrice),
            movement: MidaTickMovement.UNKNOWN,
        });
    }

    public override async getSymbolBid (symbol: string): Promise<MidaDecimal> {
        return (await this.#getSymbolLastTick(symbol)).bid;
    }

    public override async getSymbolAsk (symbol: string): Promise<MidaDecimal> {
        return (await this.#getSymbolLastTick(symbol)).ask;
    }

    public override async getSymbolAverage (symbol: string): Promise<MidaDecimal> {
        const [ bid, ask, ] = await Promise.all([ this.getSymbolBid(symbol), this.getSymbolAsk(symbol), ]);

        return bid.add(ask).divide(2);
    }

    public override async getSymbolPeriods (symbol: string, timeframe: MidaTimeframe): Promise<MidaPeriod[]> {
        const periods: MidaPeriod[] = [];
        const bybitPeriods: any[] =
                (await this.#bybitConnection.getCandles(symbol, BybitSpotUtilities.toBybitTimeframe(timeframe) as KlineInterval)).result.list;

        // Order from oldest to newest
        bybitPeriods.sort((left, right): number => Number(left.t) - Number(right.t));

        for (let i = 0; i < bybitPeriods.length - 1; ++i) {
            const bybitPeriod: Record<string, any> = bybitPeriods[i];

            periods.push(new MidaPeriod({
                symbol,
                close: decimal(bybitPeriod.c),
                high: decimal(bybitPeriod.h),
                low: decimal(bybitPeriod.l),
                open: decimal(bybitPeriod.o),
                quotationPrice: MidaQuotationPrice.BID,
                startDate: date(bybitPeriod.t),
                endDate: date(bybitPeriods[i + 1].t),
                timeframe,
                isClosed: true,
                volume: decimal(bybitPeriod.v),
            }));
        }

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

        this.#bybitWsConnection.subscribe(`bookticker.${symbol}`);
        this.#tickListeners.set(symbol, true);
    }

    public override async watchSymbolPeriods (symbol: string, timeframe: MidaTimeframe): Promise<void> {
        const listenedTimeframes: MidaTimeframe[] = this.#periodListeners.get(symbol) ?? [];

        if (listenedTimeframes.includes(timeframe)) {
            return;
        }

        this.#bybitWsConnection.subscribe(`kline.${BybitSpotUtilities.toBybitTimeframe(timeframe)}.${symbol}`);
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
        // return (await this.#bybitConnection.depositAddress({ coin: asset, network: net, })).address;
        return "";
    }

    #onTick (descriptor: Record<string, any>): void {
        const symbol: string = descriptor.s;
        const bid: MidaDecimal = decimal(descriptor.bp);
        const ask: MidaDecimal = decimal(descriptor.ap);
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
            symbol,
            bid,
            ask,
            date: date(),
            movement,
        });

        this.#lastTicks.set(symbol, tick);

        if (this.#tickListeners.has(symbol)) {
            this.notifyListeners("tick", { tick, });
        }
    }

    #onPeriodUpdate (descriptor: Record<string, any>): void {
        const symbol: string = descriptor.symbol;
        const timeframe: MidaTimeframe = descriptor.timeframe;

        if (!(this.#periodListeners.get(symbol) ?? []).includes(timeframe)) {
            return;
        }

        const period: MidaPeriod = new MidaPeriod({
            symbol,
            close: decimal(descriptor.c),
            high: decimal(descriptor.h),
            low: decimal(descriptor.l),
            open: decimal(descriptor.o),
            quotationPrice: MidaQuotationPrice.BID,
            startDate: date(descriptor.t),
            endDate: date(descriptor.t),
            timeframe,
            isClosed: false,
            volume: decimal(descriptor.v),
        });

        this.notifyListeners("period-update", { period, });
    }

    async #preloadSymbols (): Promise<void> {
        const bybitSymbols: Record<string, any>[] = (await this.#bybitConnection.getSymbols()).result.list;

        this.#symbols.clear();

        for (const bybitSymbol of bybitSymbols) {
            const symbol: string = bybitSymbol.name;

            this.#symbols.set(symbol, new MidaSymbol({
                symbol,
                baseAsset: bybitSymbol.baseCoin,
                quoteAsset: bybitSymbol.quoteCoin,
                tradingAccount: this,
                description: "",
                leverage: decimal(-1),
                lotUnits: decimal(1),
                maxLots: decimal(bybitSymbol.minTradeQty ?? -1),
                minLots: decimal(bybitSymbol.maxTradeQty ?? -1),
                pipPosition: -1,
                digits: Number(bybitSymbol.quotePrecision),
            }));
        }
    }

    public override async getSymbolTradeStatus (symbol: string): Promise<MidaSymbolTradeStatus> {
        return MidaSymbolTradeStatus.ENABLED; // TODO: TODO
    }

    public override async getDate (): Promise<MidaDate> {
        return date(await this.#bybitConnection.fetchServerTime() * 1000);
    }

    async #configureListeners (): Promise<void> {
        this.#bybitWsConnection.on("update", (descriptor: Record<string, any>): void => {
            if (descriptor.topic.indexOf("bookticker") === 0) {
                this.#onTick(descriptor.data);
            }

            if (descriptor.topic.indexOf("kline") === 0) {
                descriptor.data.symbol = descriptor.data.s;
                descriptor.data.timeframe = BybitSpotUtilities.normalizeTimeframe(descriptor.topic.split(".").at(1));

                this.#onPeriodUpdate(descriptor.data);
            }

            this.#bybitEmitter.notifyListeners("update", { descriptor, });
        });

        this.#bybitWsConnection.subscribe([
            "order",
            "execution",
            "position",
        ]);
    }
}
