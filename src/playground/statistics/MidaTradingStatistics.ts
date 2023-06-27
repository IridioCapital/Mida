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
import { MidaTrade, } from "#trades/MidaTrade";
import { MidaTradePurpose, } from "#trades/MidaTradePurpose";

export type MidaTradingStatistics = {
    winningTrades: number;
    losingTrades: number;
    winningProbability: number;
    losingProbability: number;
    maxConsecutiveWins: number;
    maxConsecutiveLosses: number;
    totalNetProfit: MidaDecimal;
    totalGrossProfit: MidaDecimal;
    totalGrossLoss: MidaDecimal;
    totalCommission: MidaDecimal;
    commissionPerLot: MidaDecimal;
    profitFactor: number;
    totalTrades: number;
    totalPositions: number;
};

// eslint-disable-next-line max-lines-per-function
export function getTradesStatistics (trades: MidaTrade[]): MidaTradingStatistics {
    const totalTrades: number = trades.length;
    const closingTrades: MidaTrade[] = [];
    let totalCommission: MidaDecimal = decimal(0);
    let totalLots: number = 0;

    for (let i = 0; i < totalTrades; ++i) {
        const trade: MidaTrade = trades[i];

        totalCommission = totalCommission.add(trade.commission);
        totalLots += trade.volume.toNumber();

        if (trade.purpose === MidaTradePurpose.CLOSE) {
            closingTrades.push(trade);
        }
    }

    totalCommission = totalCommission.mul(-1);

    const totalClosingTrades: number = closingTrades.length;
    let winningTrades: number = 0;
    let losingTrades: number = 0;
    let maxConsecutiveWins: number = 0;
    let maxConsecutiveLosses: number = 0;
    let totalGrossProfit: MidaDecimal = decimal(0);
    let totalGrossLoss: MidaDecimal = decimal(0);
    let pivotWinningTrades: number = 0;
    let pivotLosingTrades: number = 0;

    for (let i = 0; i < totalClosingTrades; ++i) {
        const closingTrade: MidaTrade = closingTrades[i];
        const realizedProfit: MidaDecimal = closingTrade.grossProfit;

        if (realizedProfit.greaterThanOrEqual(0)) {
            totalGrossProfit = totalGrossProfit.add(realizedProfit);

            if (pivotLosingTrades > maxConsecutiveLosses) {
                maxConsecutiveLosses = pivotLosingTrades;
                pivotLosingTrades = 0;
            }

            ++pivotWinningTrades;
            ++winningTrades;
        }
        else {
            totalGrossLoss = totalGrossLoss.add(realizedProfit);

            if (pivotWinningTrades > maxConsecutiveWins) {
                maxConsecutiveWins = pivotWinningTrades;
                pivotWinningTrades = 0;
            }

            ++pivotLosingTrades;
            ++losingTrades;
        }
    }

    const positionsIds: Set<string> = new Set();

    for (let i = 0; i < totalTrades; ++i) {
        positionsIds.add(trades[i].positionId);
    }

    return {
        winningTrades,
        losingTrades,
        maxConsecutiveWins,
        maxConsecutiveLosses,
        totalNetProfit: totalGrossProfit.add(totalGrossLoss).add(totalCommission),
        totalGrossProfit,
        totalGrossLoss,
        profitFactor: totalGrossProfit.div(totalGrossLoss).toFixed(2).mul(-1).toNumber(),
        winningProbability: Number((winningTrades / totalClosingTrades * 100).toFixed(2)),
        losingProbability: Number((losingTrades / totalClosingTrades * 100).toFixed(2)),
        totalTrades,
        totalPositions: positionsIds.size,
        totalCommission,
        commissionPerLot: totalCommission.div(totalLots),
    };
}
