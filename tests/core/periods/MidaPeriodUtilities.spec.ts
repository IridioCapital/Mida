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

import { date, MidaDate, } from "#dates/MidaDate";
import { decimal, } from "#decimals/MidaDecimal";
import { MidaPeriod, } from "#periods/MidaPeriod";
import { MidaPeriodUtilities, } from "#periods/MidaPeriodUtilities";
import { MidaQuotationPrice, } from "#quotations/MidaQuotationPrice";
import { MidaTimeframe, } from "#timeframes/MidaTimeframe";
import toRenko = MidaPeriodUtilities.toRenko;

// eslint-disable-next-line max-lines-per-function
describe("MidaPeriodUtilities", () => {
    // eslint-disable-next-line max-lines-per-function
    describe(".toRenko", () => {
        it("returns only bullish renkos", () => {
            const length: number = 50;
            const boxSize: number = 1.5;
            const startDate: MidaDate = date("2023-01-06T00:00:00.000Z");
            const h1Periods: MidaPeriod[] = [];

            for (let i = 0; i < length + 1; ++i) {
                h1Periods.push(new MidaPeriod({
                    symbol: "TEST",
                    startDate,
                    endDate: startDate.add(1000 * 60 * 60 * (i + 1)),
                    quotationPrice: MidaQuotationPrice.BID,
                    open: decimal(1),
                    high: decimal(1),
                    low: decimal(1),
                    close: decimal(25 + i * 1.5),
                    volume: decimal(1),
                    timeframe: MidaTimeframe.H1,
                }));
            }

            const h1Renko: MidaPeriod[] = toRenko(h1Periods, boxSize);
            let upBricksCounter: number = 0;
            let downBricksCounter: number = 0;

            for (const renko of h1Renko) {
                if (renko.isBullish) {
                    ++upBricksCounter;
                }
                else if (renko.isBearish) {
                    ++downBricksCounter;
                }
            }

            expect(upBricksCounter).toBe(length);
            expect(downBricksCounter).toBe(0);
        });

        it("returns only bearish renkos", () => {
            const length: number = 50;
            const boxSize: number = 1.5;
            const startDate: MidaDate = date("2023-01-06T00:00:00.000Z");
            const h1Periods: MidaPeriod[] = [];

            for (let i = 0; i < length + 1; ++i) {
                h1Periods.push(new MidaPeriod({
                    symbol: "TEST",
                    startDate,
                    endDate: startDate.add(1000 * 60 * 60 * (i + 1)),
                    quotationPrice: MidaQuotationPrice.BID,
                    open: decimal(1),
                    high: decimal(1),
                    low: decimal(1),
                    close: decimal(5000 - 1.5 * i),
                    volume: decimal(1),
                    timeframe: MidaTimeframe.H1,
                }));
            }

            const h1Renko: MidaPeriod[] = toRenko(h1Periods, boxSize);
            let upBricksCounter: number = 0;
            let downBricksCounter: number = 0;

            for (const renko of h1Renko) {
                if (renko.isBullish) {
                    ++upBricksCounter;
                }
                else if (renko.isBearish) {
                    ++downBricksCounter;
                }
            }

            expect(upBricksCounter).toBe(0);
            expect(downBricksCounter).toBe(length);
        });

        // eslint-disable-next-line max-lines-per-function
        it("returns correct renkos", () => {
            const boxSize: number = 1;
            const startDate: MidaDate = date("2023-01-06T00:00:00.000Z");
            const h1Periods: MidaPeriod[] = [
                new MidaPeriod({
                    symbol: "TEST",
                    startDate,
                    endDate: startDate.add(1000 * 60 * 60),
                    quotationPrice: MidaQuotationPrice.BID,
                    open: decimal(1),
                    high: decimal(1),
                    low: decimal(1),
                    close: decimal(10),
                    volume: decimal(1),
                    timeframe: MidaTimeframe.H1,
                }),
                new MidaPeriod({
                    symbol: "TEST",
                    startDate,
                    endDate: startDate.add(1000 * 60 * 60 * 2),
                    quotationPrice: MidaQuotationPrice.BID,
                    open: decimal(1),
                    high: decimal(1),
                    low: decimal(1),
                    close: decimal(12.5),
                    volume: decimal(1),
                    timeframe: MidaTimeframe.H1,
                }),
                new MidaPeriod({
                    symbol: "TEST",
                    startDate,
                    endDate: startDate.add(1000 * 60 * 60 * 3),
                    quotationPrice: MidaQuotationPrice.BID,
                    open: decimal(1),
                    high: decimal(1),
                    low: decimal(1),
                    close: decimal(15),
                    volume: decimal(1),
                    timeframe: MidaTimeframe.H1,
                }),
                new MidaPeriod({
                    symbol: "TEST",
                    startDate,
                    endDate: startDate.add(1000 * 60 * 60 * 4),
                    quotationPrice: MidaQuotationPrice.BID,
                    open: decimal(1),
                    high: decimal(1),
                    low: decimal(1),
                    close: decimal(10),
                    volume: decimal(1),
                    timeframe: MidaTimeframe.H1,
                }),
                new MidaPeriod({
                    symbol: "TEST",
                    startDate,
                    endDate: startDate.add(1000 * 60 * 60 * 4),
                    quotationPrice: MidaQuotationPrice.BID,
                    open: decimal(1),
                    high: decimal(1),
                    low: decimal(1),
                    close: decimal(9.8),
                    volume: decimal(1),
                    timeframe: MidaTimeframe.H1,
                }),
                new MidaPeriod({
                    symbol: "TEST",
                    startDate,
                    endDate: startDate.add(1000 * 60 * 60 * 4),
                    quotationPrice: MidaQuotationPrice.BID,
                    open: decimal(1),
                    high: decimal(1),
                    low: decimal(1),
                    close: decimal(8),
                    volume: decimal(1),
                    timeframe: MidaTimeframe.H1,
                }),
                new MidaPeriod({
                    symbol: "TEST",
                    startDate,
                    endDate: startDate.add(1000 * 60 * 60 * 4),
                    quotationPrice: MidaQuotationPrice.BID,
                    open: decimal(1),
                    high: decimal(1),
                    low: decimal(1),
                    close: decimal(7),
                    volume: decimal(1),
                    timeframe: MidaTimeframe.H1,
                }),
                new MidaPeriod({
                    symbol: "TEST",
                    startDate,
                    endDate: startDate.add(1000 * 60 * 60 * 4),
                    quotationPrice: MidaQuotationPrice.BID,
                    open: decimal(1),
                    high: decimal(1),
                    low: decimal(1),
                    close: decimal(10),
                    volume: decimal(1),
                    timeframe: MidaTimeframe.H1,
                }),
            ];

            const h1Renko: MidaPeriod[] = toRenko(h1Periods, boxSize);
            let upBricksCounter: number = 0;
            let downBricksCounter: number = 0;

            for (const renko of h1Renko) {
                if (renko.isBullish) {
                    ++upBricksCounter;
                }
                else if (renko.isBearish) {
                    ++downBricksCounter;
                }
            }

            expect(upBricksCounter).toBe(3);
            expect(downBricksCounter).toBe(3);
        });
    });
});
