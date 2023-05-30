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

import { MidaDecimal, } from "#decimals/MidaDecimal";
import { MidaPeriod, } from "#periods/MidaPeriod";
import { MidaPeriodPriceKey, } from "#periods/MidaPeriodPriceKey";

export namespace MidaPeriodUtilities {
    export function toRenko (periods: MidaPeriod[], boxSize: number, priceKey: MidaPeriodPriceKey = "close"): MidaPeriod[] {
        const renkoPeriods: MidaPeriod[] = [];
        let renkoPivot: MidaPeriod = periods[0];

        for (let i = 1, ll = periods.length; i < ll; ++i) {
            const pivotClose: MidaDecimal = renkoPeriods.length === 0 ? renkoPivot[priceKey] : renkoPivot.close;
            const period: MidaPeriod = periods[i];
            const periodPrice: MidaDecimal = period[priceKey];
            let boxHigh: MidaDecimal;
            let boxLow: MidaDecimal;

            // Used to find the first brick
            if (renkoPeriods.length === 0) {
                boxHigh = pivotClose.add(boxSize);
                boxLow = pivotClose.sub(boxSize);
            }
            else {
                boxHigh = renkoPivot.high.add(boxSize);
                boxLow = renkoPivot.low.sub(boxSize);
            }

            let closedPrice: MidaDecimal | undefined;

            if (periodPrice.greaterThanOrEqual(boxHigh)) {
                closedPrice = boxHigh;
            }
            else if (periodPrice.lessThanOrEqual(boxLow)) {
                closedPrice = boxLow;
            }

            if (closedPrice) {
                renkoPeriods.push(new MidaPeriod({
                    symbol: period.symbol,
                    timeframe: period.timeframe,
                    open: pivotClose,
                    high: closedPrice.eq(boxHigh) ? boxHigh : pivotClose,
                    low: closedPrice.eq(boxLow) ? boxLow : pivotClose,
                    close: closedPrice,
                    volume: period.volume,
                    quotationPrice: period.quotationPrice,
                    startDate: renkoPivot.startDate,
                    endDate: period.endDate,
                }));

                renkoPivot = renkoPeriods[renkoPeriods.length - 1];
            }
        }

        return renkoPeriods;
    }
}
