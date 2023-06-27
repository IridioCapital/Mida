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

import { marketComponent, } from "#components/MidaMarketComponent";
import { date, } from "#dates/MidaDate";
import { MidaDateConvertible, } from "#dates/MidaDateConvertible";
import { MidaPeriod, } from "#periods/MidaPeriod";
import { MidaTick, } from "#ticks/MidaTick";
import { MidaTimeframe, } from "#timeframes/MidaTimeframe";
import { MidaMarketWatcherDirectives, } from "#watchers/MidaMarketWatcherDirectives";
import { MidaPlaygroundAccount, } from "!/src/playground/accounts/MidaPlaygroundAccount";
import { MidaBacktestDirectives, } from "!/src/playground/backtests/MidaBacktestDirectives";
import { MidaBacktestStatistics, } from "!/src/playground/backtests/MidaBacktestStatistics";
import { MidaPlaygroundPresetParameters, } from "!/src/playground/backtests/MidaPlaygroundPresetParameters";
import { MidaPlaygroundPresetTarget, } from "!/src/playground/backtests/MidaPlaygroundPresetTarget";
import { MidaPlaygroundEngine, } from "!/src/playground/MidaPlaygroundEngine";
import { getTradesStatistics, } from "!/src/playground/statistics/MidaTradingStatistics";
import { MidaPlaygroundTrade, } from "!/src/playground/trades/MidaPlaygroundTrade";

export const playgroundPreset =
    (directives: MidaBacktestDirectives): MidaPlaygroundPreset => new MidaPlaygroundPreset({ directives, });

export class MidaPlaygroundPreset {
    readonly #directives: MidaBacktestDirectives;
    #timeframes: MidaTimeframe[];

    public constructor ({ directives, }: MidaPlaygroundPresetParameters) {
        this.#directives = directives;
        this.#timeframes = [];
    }

    public get directives (): MidaBacktestDirectives {
        return { ...this.#directives, };
    }

    public async createEngine (from?: MidaDateConvertible): Promise<MidaPlaygroundEngine> {
        const engine: MidaPlaygroundEngine = new MidaPlaygroundEngine({ localDate: new Date(0), });
        const timeframes: MidaTimeframe[] = [];

        for (const [ symbol, symbolDirectives, ] of Object.entries(this.#directives.symbols)) {
            // <ticks>
            const ticksGenerator: AsyncGenerator<MidaTick | undefined> | undefined = symbolDirectives.ticks;

            if (ticksGenerator) {
                await engine.setTicksGenerator(symbol, ticksGenerator);
            }
            // </ticks>

            // <periods>
            const periodsByTimeframe: Record<MidaTimeframe, AsyncGenerator<MidaPeriod | undefined>> | undefined = symbolDirectives.periods;

            if (periodsByTimeframe) {
                for (const [ timeframe, generator, ] of Object.entries(periodsByTimeframe)) {
                    await engine.setPeriodsGenerator(symbol, timeframe as MidaTimeframe, generator);
                    timeframes.push(timeframe as MidaTimeframe);
                }
            }
            // </periods>
        }

        this.#timeframes = timeframes;

        engine.setLocalDate(date(from ?? this.#directives.from).timestamp - 86400 * 1000 * 4);

        await engine.elapseTime((date(from ?? this.#directives.from).timestamp - engine.localDate.timestamp) / 1000);

        return engine;
    }

    // eslint-disable-next-line max-lines-per-function
    public async backtest (target: MidaPlaygroundPresetTarget): Promise<MidaBacktestStatistics> {
        const engine: MidaPlaygroundEngine = await this.createEngine(target.from ?? this.#directives.from);
        const timeframes: MidaTimeframe[] = this.#timeframes;
        const account: MidaPlaygroundAccount =
            await engine.createAccount({ balanceSheet: this.#directives.balanceSheet, });
        const {
            commissionCustomizer,
        } = this.#directives;

        if (commissionCustomizer) {
            engine.setCommissionCustomizer(commissionCustomizer);
        }

        for (const [ symbol, symbolDirectives, ] of Object.entries(this.#directives.symbols)) {
            await account.addSymbol({
                symbol,
                ...symbolDirectives.params,
            });
        }

        engine.waitFeedConfirmation = true;

        const trades: MidaPlaygroundTrade[] = [];

        engine.on("trade", (e) => {
            trades.push(e.descriptor.trade);
        });

        await marketComponent({
            dependencies: {
                target: {
                    type: target.type,
                    params: target.params,
                },
            },

            watcher (): MidaMarketWatcherDirectives {
                return {
                    watchTicks: true,
                    watchPeriods: true,
                    timeframes,
                };
            },

            async lateUpdate (): Promise<void> {
                engine.nextFeed();
            },
        })(account, target.symbol);

        const toTimestamp: number = date(target.to ?? this.#directives.to).timestamp;

        while (engine.localDate.timestamp < toTimestamp) {
            const remainingSeconds: number = (toTimestamp - engine.localDate.timestamp) * 1000;

            await engine.elapseTime(remainingSeconds > 86400 ? 86400 : remainingSeconds);
        }

        return {
            from: date(target.from ?? this.#directives.from).iso,
            to: date(target.to ?? this.#directives.to).iso,
            tradingAccount: account,
            tradingStatistics: getTradesStatistics(trades),
        };
    }
}
