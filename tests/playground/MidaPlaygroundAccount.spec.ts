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
import { MidaOrderDirection, } from "#orders/MidaOrderDirection";
import { MidaOrderRejection, } from "#orders/MidaOrderRejection";
import { MidaOrderStatus, } from "#orders/MidaOrderStatus";
import { MidaPosition, } from "#positions/MidaPosition";
import { MidaPositionDirection, } from "#positions/MidaPositionDirection";
import { MidaPositionStatus, } from "#positions/MidaPositionStatus";
import { MidaTick, } from "#ticks/MidaTick";
import { readTicksFromFile, } from "#utilities/MidaFileSystem";
import { MidaPlaygroundEngine, } from "!/src/playground/MidaPlaygroundEngine";
import { MidaPlaygroundPosition, } from "!/src/playground/positions/MidaPlaygroundPosition";

// eslint-disable-next-line max-lines-per-function
describe("MidaPlaygroundAccount", () => {
    const symbolParameters = {
        symbol: "ETHUSD",
        baseAsset: "ETH",
        quoteAsset: "USD",
        description: "",
        leverage: decimal(0),
        minLots: decimal(0),
        maxLots: decimal(0),
        lotUnits: decimal(0),
        pipPosition: 2,
        digits: 2,
    };

    async function createEngine (): Promise<MidaPlaygroundEngine> {
        const engine = new MidaPlaygroundEngine({ localDate: "2022-01-01T00:00:00.000Z", });
        const ticksGenerator: AsyncGenerator<MidaTick | undefined> = readTicksFromFile("./series/ETHUSD.csv", "ETHUSD");

        engine.setTicksGenerator("ETHUSD", ticksGenerator);
        await engine.elapseTicks(1);

        return engine;
    }

    // eslint-disable-next-line max-lines-per-function
    describe(".placeOrder", () => {
        it("p/l is equal to spread when buying and selling at the same tick", async () => {
            const engine = await createEngine();
            const currentAsk: MidaDecimal = await engine.getSymbolAsk("ETHUSD");
            const account = await engine.createAccount({
                balanceSheet: {
                    "USD": currentAsk,
                },
            });

            await account.addSymbol(symbolParameters);
            await account.placeOrder({
                symbol: "ETHUSD",
                direction: MidaOrderDirection.BUY,
                volume: 1,
            });

            expect((await account.getBalance()).equals(0)).toBe(true);

            await account.placeOrder({
                symbol: "ETHUSD",
                direction: MidaOrderDirection.SELL,
                volume: 1,
            });

            const expectedBalance: MidaDecimal = currentAsk.subtract(currentAsk.subtract(await engine.getSymbolBid("ETHUSD")));

            // eslint-disable-next-line max-len
            expect((await account.getBalance()).equals(expectedBalance)).toBe(true);
        });

        it("p/l is equal to spread + commission when buying and selling at the same tick", async () => {
            const engine = await createEngine();
            const fixedCommission: MidaDecimal = decimal(10);
            const currentAsk: MidaDecimal = await engine.getSymbolAsk("ETHUSD");
            const account = await engine.createAccount({
                balanceSheet: {
                    "USD": currentAsk,
                },
            });

            engine.setCommissionCustomizer(async () => [ "USD", fixedCommission, ]);

            await account.addSymbol(symbolParameters);
            await account.placeOrder({
                symbol: "ETHUSD",
                direction: MidaOrderDirection.BUY,
                volume: 1,
            });

            expect((await account.getBalance()).equals(fixedCommission.multiply(-1))).toBe(true);

            await account.placeOrder({
                symbol: "ETHUSD",
                direction: MidaOrderDirection.SELL,
                volume: 1,
            });

            const expectedBalance: MidaDecimal = currentAsk.subtract(currentAsk.subtract(await engine.getSymbolBid("ETHUSD")));

            // eslint-disable-next-line max-len
            expect((await account.getBalance()).equals(expectedBalance.subtract(fixedCommission.mul(2)))).toBe(true);
        });

        it("position p/l is equal to spread when buying and selling at the same tick", async () => {
            const engine = await createEngine();
            const bid = await engine.getSymbolBid("ETHUSD");
            const ask = await engine.getSymbolAsk("ETHUSD");
            const spread = ask.sub(bid);
            const account = await engine.createAccount({
                balanceSheet: {
                    "USD": ask,
                },
            });

            await account.addSymbol(symbolParameters);

            const openOrder = await account.placeOrder({
                symbol: "ETHUSD",
                direction: MidaOrderDirection.BUY,
                volume: 1,
            });

            const position = await openOrder.getPosition() as MidaPlaygroundPosition;

            expect((await position.getUnrealizedGrossProfit()).eq(spread.mul(-1)));
            expect(position.realizedProfit.eq(0));

            await account.placeOrder({
                symbol: "ETHUSD",
                direction: MidaOrderDirection.SELL,
                volume: 1,
            });

            expect((await position.getUnrealizedGrossProfit()).eq(0));
            expect(position.realizedProfit.eq(spread.mul(-1)));
        });

        it("buy limit is executed at the expected price", async () => {
            const engine = await createEngine();
            const account = await engine.createAccount({
                balanceSheet: {
                    "USD": 100000,
                },
            });

            await account.addSymbol(symbolParameters);

            const limitPrice = 3713.9;
            const limitOrder = await account.placeOrder({
                symbol: "ETHUSD",
                direction: MidaOrderDirection.BUY,
                volume: 1,
                limit: limitPrice, // Tick #89
            });

            expect(limitOrder.status).toBe(MidaOrderStatus.PENDING);

            await engine.elapseTicks(20);
            await engine.elapseTicks(20);
            await engine.elapseTicks(20);
            await engine.elapseTicks(27);

            expect(limitOrder.status).toBe(MidaOrderStatus.PENDING);
            await engine.elapseTicks(1);

            expect(limitOrder.status).toBe(MidaOrderStatus.EXECUTED);
            expect(limitOrder.executionPrice?.equals(limitPrice)).toBe(true);
        });

        it("buy stop is executed at the expected price", async () => {
            const engine = await createEngine();
            const account = await engine.createAccount({
                balanceSheet: {
                    "USD": 100000,
                },
            });

            await account.addSymbol(symbolParameters);

            const stopPrice = 3716.1;
            const limitOrder = await account.placeOrder({
                symbol: "ETHUSD",
                direction: MidaOrderDirection.BUY,
                volume: 1,
                stop: stopPrice, // Tick #41
            });

            expect(limitOrder.status).toBe(MidaOrderStatus.PENDING);

            await engine.elapseTicks(10);
            await engine.elapseTicks(10);
            await engine.elapseTicks(19);

            expect(limitOrder.status).toBe(MidaOrderStatus.PENDING);
            await engine.elapseTicks(1);

            expect(limitOrder.status).toBe(MidaOrderStatus.EXECUTED);
            expect(limitOrder.executionPrice?.equals(stopPrice)).toBe(true);
        });

        it("position is closed with take profit at the expected price #1", async () => {
            const engine = await createEngine();
            const account = await engine.createAccount({
                balanceSheet: {
                    "USD": 100000,
                },
            });

            await account.addSymbol(symbolParameters);

            const takeProfit = 3707.6;
            const order = await account.placeOrder({
                symbol: "ETHUSD",
                direction: MidaOrderDirection.BUY,
                volume: 1,
                protection: {
                    takeProfit, // Tick #41
                },
            });

            expect(order.status).toBe(MidaOrderStatus.EXECUTED);

            const position: MidaPosition = await order.getPosition() as MidaPosition;

            expect(position.status).toBe(MidaPositionStatus.OPEN);
            expect(position.direction).toBe(MidaPositionDirection.LONG);
            expect(position.entryPrice?.eq(order.executionPrice as MidaDecimal)).toBe(true);
            expect(position.takeProfit?.eq(takeProfit)).toBe(true);

            await engine.elapseTicks(10);
            await engine.elapseTicks(10);
            await engine.elapseTicks(19);

            expect(position.status).toBe(MidaPositionStatus.OPEN);
            expect(position.direction).toBe(MidaPositionDirection.LONG);

            await engine.elapseTicks(1);

            expect(position.status).toBe(MidaPositionStatus.CLOSED);
            expect(position.direction).toBe(undefined);
        });

        it("buy is rejected when owned quote currency volume is not enough", async () => {
            const engine = await createEngine();
            const account = await engine.createAccount();

            await account.addSymbol(symbolParameters);

            const order = await account.placeOrder({
                symbol: "ETHUSD",
                direction: MidaOrderDirection.BUY,
                volume: 1,
            });

            expect(order.status).toBe(MidaOrderStatus.REJECTED);
            expect(order.rejection).toBe(MidaOrderRejection.NOT_ENOUGH_MONEY);
        });

        it("sell is rejected when owned base currency volume is not enough", async () => {
            const engine = await createEngine();
            const account = await engine.createAccount();

            await account.addSymbol(symbolParameters);

            const order = await account.placeOrder({
                symbol: "ETHUSD",
                direction: MidaOrderDirection.SELL,
                volume: 1,
            });

            expect(order.status).toBe(MidaOrderStatus.REJECTED);
            expect(order.rejection).toBe(MidaOrderRejection.NOT_ENOUGH_MONEY);
        });
    });
});
