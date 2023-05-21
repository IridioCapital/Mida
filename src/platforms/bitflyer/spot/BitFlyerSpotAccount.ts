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

import { WebSocket, } from "ws";

import { MidaTradingAccount, } from "#accounts/MidaTradingAccount";
import { MidaAsset, } from "#assets/MidaAsset";
import { MidaAssetStatement, } from "#assets/MidaAssetStatement";
import { date, MidaDate, } from "#dates/MidaDate";
import { decimal, MidaDecimal, } from "#decimals/MidaDecimal";
import { unsupportedOperationError, } from "#errors/MidaErrorUtilities";
import { MidaEventListener, } from "#events/MidaEventListener";
import { MidaOrderDirection, } from "#orders/MidaOrderDirection";
import { MidaOrderDirectives, } from "#orders/MidaOrderDirectives";
import { MidaOrderStatus, } from "#orders/MidaOrderStatus";
import { MidaOrderTimeInForce, } from "#orders/MidaOrderTimeInForce";
import { MidaPeriod, } from "#periods/MidaPeriod";
import { MidaPosition, } from "#positions/MidaPosition";
import { MidaSymbol, } from "#symbols/MidaSymbol";
import { MidaSymbolTradeStatus, } from "#symbols/MidaSymbolTradeStatus";
import { MidaTick, } from "#ticks/MidaTick";
import { MidaTickMovement, } from "#ticks/MidaTickMovement";
import { MidaTimeframe, } from "#timeframes/MidaTimeframe";
import { MidaTrade, } from "#trades/MidaTrade";
import { MidaTradeDirection, } from "#trades/MidaTradeDirection";
import { MidaTradePurpose, } from "#trades/MidaTradePurpose";
import { MidaTradeStatus, } from "#trades/MidaTradeStatus";
import { createOrderResolver, } from "#utilities/MidaUtilities";
import { BitFlyerAccountRegion, } from "!/src/platforms/bitflyer/BitFlyerAccountRegion";
import { BitFlyerHttpClient, } from "!/src/platforms/bitflyer/BitFlyerHttpClient";
import { BitFlyerSpotAccountParameters, } from "!/src/platforms/bitflyer/spot/BitFlyerSpotAccountParameters";
import { BitFlyerSpotOrder, } from "!/src/platforms/bitflyer/spot/orders/BitFlyerSpotOrder";
import { BitFlyerSpotTrade, } from "!/src/platforms/bitflyer/spot/trades/BitFlyerSpotTrade";
import { BitFlyerSpotUtilities, } from "!/src/platforms/bitflyer/spot/utilities/BitFlyerSpotUtilities";

export class BitFlyerSpotAccount extends MidaTradingAccount {
    readonly #httpClient: BitFlyerHttpClient;
    readonly #wsClient: WebSocket;
    readonly #region: BitFlyerAccountRegion;
    readonly #tickListeners: Map<string, boolean>;
    readonly #lastTicks: Map<string, MidaTick>;

    public constructor ({
        id,
        platform,
        creationDate,
        primaryAsset,
        operativity,
        positionAccounting,
        indicativeLeverage,
        httpClient,
        wsClient,
        region,
    }: BitFlyerSpotAccountParameters) {
        super({
            id,
            platform,
            creationDate,
            primaryAsset,
            operativity,
            positionAccounting,
            indicativeLeverage,
        });

        this.#httpClient = httpClient;
        this.#wsClient = wsClient;
        this.#region = region;
        this.#tickListeners = new Map();
        this.#lastTicks = new Map();

        this.#wsClient.on("message", (message: string) => this.#onUpdate(JSON.parse(message)));
    }

    public get httpClient (): BitFlyerHttpClient {
        return this.#httpClient;
    }

    public get wsClient (): WebSocket {
        return this.#wsClient;
    }

    public override async getAsset (asset: string): Promise<MidaAsset | undefined> {
        return Promise.resolve(undefined);
    }

    public override async getAssetBalance (asset: string): Promise<MidaAssetStatement> {
        // @ts-ignore
        return Promise.resolve(undefined);
    }

    public override async getAssets (): Promise<string[]> {
        throw unsupportedOperationError(this.platform);
    }

    public override async getBalance (): Promise<MidaDecimal> {
        return decimal(0);
    }

    public override async getBalanceSheet (): Promise<MidaAssetStatement[]> {
        return Promise.resolve([]);
    }

    public override async getDate (): Promise<MidaDate> {
        return date();
    }

    public override async getEquity (): Promise<MidaDecimal> {
        throw unsupportedOperationError(this.platform);
    }

    public override async getOpenPositions (): Promise<MidaPosition[]> {
        return [];
    }

    public override async getOrders (symbol: string): Promise<BitFlyerSpotOrder[]> {
        const bitFlyerOrders = await this.httpClient.get("/v1/me/getchildorders", {
            "product_code": symbol,
            "child_order_state": "COMPLETED",
        });

        const orders: BitFlyerSpotOrder[] = [];

        for (let i = 0, ll = bitFlyerOrders.length; i < ll; ++i) {
            orders.push(this.#normalizeOrder(bitFlyerOrders[i]));
        }

        return orders;
    }

    // bitFlyer requires a symbol to retrieve pending orders
    // Reference https://lightning.bitflyer.com/docs#list-orders
    public async getPendingOrders (...parameters: string[]): Promise<BitFlyerSpotOrder[]> {
        const symbol: string = parameters[0];

        if (!symbol) {
            throw new Error("bitFlyer requires a symbol to retrieve pending orders");
        }

        const bitFlyerOrders = await this.httpClient.get("/v1/me/getchildorders", {
            "product_code": symbol,
            "child_order_state": "ACTIVE",
        });

        const orders: BitFlyerSpotOrder[] = [];

        for (let i = 0, ll = bitFlyerOrders.length; i < ll; ++i) {
            orders.push(this.#normalizeOrder(bitFlyerOrders[i]));
        }

        return orders;
    }

    public override async getSymbol (symbol: string): Promise<MidaSymbol | undefined> {
        const symbols: string[] = await this.getSymbols();

        if (!symbols.includes(symbol)) {
            return undefined;
        }

        return new MidaSymbol({
            symbol,
            description: "",
            baseAsset: "",
            quoteAsset: "",
            tradingAccount: this,
            digits: -1,
            pipPosition: -1,
            minLots: decimal(-1),
            maxLots: decimal(-1),
            lotUnits: decimal(1),
            leverage: decimal(0),
        });
    }

    public override async getSymbolAverage (symbol: string): Promise<MidaDecimal> {
        const [ bid, ask, ] = await Promise.all([ this.getSymbolBid(symbol), this.getSymbolAsk(symbol), ]);

        return bid.add(ask).divide(2);
    }

    public override async getSymbolBid (symbol: string): Promise<MidaDecimal> {
        const { bid, } = await this.#getSymbolTick(symbol);

        return bid;
    }

    public override async getSymbolAsk (symbol: string): Promise<MidaDecimal> {
        const { ask, } = await this.#getSymbolTick(symbol);

        return ask;
    }

    public override async getSymbolPeriods (symbol: string, timeframe: MidaTimeframe): Promise<MidaPeriod[]> {
        return [];
    }

    public override async getSymbolTradeStatus (symbol: string): Promise<MidaSymbolTradeStatus> {
        throw unsupportedOperationError(this.platform);
    }

    public override async getSymbols (): Promise<string[]> {
        let requestUri: string;

        switch (this.#region) {
            case BitFlyerAccountRegion.JAPAN: {
                requestUri = "/v1/markets";

                break;
            }
            case BitFlyerAccountRegion.EUROPE: {
                requestUri = "/v1/markets/eu";

                break;
            }
            case BitFlyerAccountRegion.USA: {
                requestUri = "/v1/markets/usa";

                break;
            }
        }

        const bitFlyerSymbols = await this.#httpClient.get(requestUri);

        return bitFlyerSymbols
            .filter((symbol: Record<string, string>) => symbol["market_type"] === "Spot")
            .map((symbol: Record<string, string>) => symbol["product_code"]);
    }

    public override async getTrades (symbol: string): Promise<MidaTrade[]> {
        const bitFlyerTrades = await this.#httpClient.get("/v1/me/getexecutions", { symbol, });
        const trades: BitFlyerSpotTrade[] = [];

        for (let i = 0, ll = bitFlyerTrades.length; i < ll; ++i) {
            const bitFlyerTrade = bitFlyerTrades[i];

            trades.push(new BitFlyerSpotTrade({
                id: bitFlyerTrade.id,
                tradingAccount: this,
                symbol,
                orderId: bitFlyerTrade["child_order_id"],
                positionId: "",
                direction: bitFlyerTrade.side === "BUY" ? MidaTradeDirection.BUY : MidaTradeDirection.SELL,
                purpose: bitFlyerTrade.side === "BUY" ? MidaTradePurpose.OPEN : MidaTradePurpose.CLOSE,
                executionPrice: decimal(bitFlyerTrade.price),
                executionDate: date(bitFlyerTrade["exec_date"]),
                volume: decimal(bitFlyerTrade.size),
                commission: decimal(bitFlyerTrade.commission),
                status: MidaTradeStatus.EXECUTED,
            }));
        }

        return trades;
    }

    public override async getUsedMargin (): Promise<MidaDecimal> {
        return decimal(0);
    }

    public override async isSymbolMarketOpen (symbol: string): Promise<boolean> {
        throw unsupportedOperationError(this.platform);
    }

    public override async placeOrder (directives: MidaOrderDirectives): Promise<BitFlyerSpotOrder> {
        const order: BitFlyerSpotOrder = new BitFlyerSpotOrder({
            id: "",
            tradingAccount: this,
            symbol: directives.symbol as string,
            requestedVolume: decimal(directives.volume),
            direction: directives.direction,
            timeInForce: directives.timeInForce ?? MidaOrderTimeInForce.GOOD_TILL_CANCEL,
            purpose: undefined as any,
            limitPrice: decimal(directives.limit),
            trades: [],
            status: MidaOrderStatus.REQUESTED,
        });

        const listeners: { [eventType: string]: MidaEventListener } = directives.listeners ?? {};
        const resolver: Promise<BitFlyerSpotOrder> =
                createOrderResolver(order, directives.resolverEvents) as Promise<BitFlyerSpotOrder>;

        for (const eventType of Object.keys(listeners)) {
            order.on(eventType, listeners[eventType]);
        }

        this.notifyListeners("order", { order, });
        order.send();

        return resolver;
    }

    public override async watchSymbolTicks (symbol: string): Promise<void> {
        if (this.#tickListeners.has(symbol)) {
            return;
        }

        await new Promise((resolve) => {
            this.#wsClient.send(JSON.stringify({
                jsonrpc: "2.0",
                method: "subscribe",
                params: {
                    channel: `lightning_ticker_${symbol}`,
                },
            }), resolve);
        });

        this.#tickListeners.set(symbol, true);
    }

    public override async stillConnected (): Promise<boolean> {
        throw unsupportedOperationError(this.platform);
    }

    #normalizeOrder (bitFlyerOrder: Record<string, string>): BitFlyerSpotOrder {
        let status: MidaOrderStatus = MidaOrderStatus.REQUESTED;

        switch (bitFlyerOrder["child_order_state"].toUpperCase()) {
            case "ACTIVE": {
                status = MidaOrderStatus.PENDING;

                break;
            }
            case "COMPLETED": {
                status = MidaOrderStatus.EXECUTED;

                break;
            }
        }

        return new BitFlyerSpotOrder({
            id: bitFlyerOrder["child_order_id"],
            symbol: bitFlyerOrder["product_code"],
            tradingAccount: this,
            purpose: undefined as any,
            creationDate: date(bitFlyerOrder["child_order_date"]),
            direction: bitFlyerOrder.side === "BUY" ? MidaOrderDirection.BUY : MidaOrderDirection.SELL,
            limitPrice: Number.isFinite(bitFlyerOrder.price) ? decimal(bitFlyerOrder.price) : undefined,
            requestedVolume: decimal(bitFlyerOrder.size),
            timeInForce: BitFlyerSpotUtilities.normalizeTimeInForce(bitFlyerOrder["time_in_force"]),
            status,
            trades: [],
        });
    }

    async #getSymbolTick (symbol: string): Promise<MidaTick> {
        const lastTick = this.#lastTicks.get(symbol);

        if (lastTick) {
            return lastTick;
        }

        const bitFlyerTicker = await this.#httpClient.get("/v1/ticker", {
            "product_code": symbol,
        });

        return new MidaTick({
            symbol,
            bid: decimal(bitFlyerTicker["best_bid"]),
            ask: decimal(bitFlyerTicker["best_ask"]),
            date: date(bitFlyerTicker.timestamp),
        });
    }

    #onTick (bitFlyerTick: Record<string, string>): void {
        const symbol: string = bitFlyerTick["product_code"];
        const bid: MidaDecimal = decimal(bitFlyerTick["best_bid"]);
        const ask: MidaDecimal = decimal(bitFlyerTick["best_ask"]);
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
            bid,
            ask,
            date: date(bitFlyerTick["timestamp"]),
            movement,
            symbol,
        });

        this.#lastTicks.set(symbol, tick);

        if (this.#tickListeners.has(symbol)) {
            this.notifyListeners("tick", { tick, });
        }
    }

    #onUpdate (descriptor: any): void {
        const message: Record<string, string> | undefined = descriptor?.params?.message;

        if (message?.["tick_id"]) {
            this.#onTick(message);
        }
    }
}
