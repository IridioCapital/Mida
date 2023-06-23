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
import { date, MidaDate, } from "#dates/MidaDate";
import { MidaDateConvertible, } from "#dates/MidaDateConvertible";
import { decimal, MidaDecimal, } from "#decimals/MidaDecimal";
import { logger, } from "#loggers/MidaLogger";
import { MidaPeriod, } from "#periods/MidaPeriod";
import { MidaPosition, } from "#positions/MidaPosition";
import { MidaTick, } from "#ticks/MidaTick";
import { MidaTimeframe, } from "#timeframes/MidaTimeframe";
import { MidaMarketWatcherDirectives, } from "#watchers/MidaMarketWatcherDirectives";
import { MidaPlaygroundAccount, } from "!/src/playground/accounts/MidaPlaygroundAccount";
import { MidaBacktest, } from "!/src/playground/backtests/MidaBacktest";
import { MidaBacktestDirectives, } from "!/src/playground/backtests/MidaBacktestDirectives";
import { MidaBacktestPresetParameters, } from "!/src/playground/backtests/MidaBacktestPresetParameters";
import { MidaBacktestPresetTarget, } from "!/src/playground/backtests/MidaBacktestPresetTarget";
import { MidaPlaygroundEngine, } from "!/src/playground/MidaPlaygroundEngine";
import { MidaPlaygroundPosition, } from "!/src/playground/positions/MidaPlaygroundPosition";

export const backtestPreset =
    (directives: MidaBacktestDirectives): MidaBacktestPreset => new MidaBacktestPreset({ directives, });

export class MidaBacktestPreset {
    readonly #directives: MidaBacktestDirectives;
    #timeframes: MidaTimeframe[];

    public constructor ({ directives, }: MidaBacktestPresetParameters) {
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

        await engine.elapseTime((date(from ?? this.#directives.from).timestamp - engine.localDate.timestamp) / 1000);

        return engine;
    }

    // eslint-disable-next-line max-lines-per-function
    public async backtest (target: MidaBacktestPresetTarget): Promise<MidaBacktest> {
        const engine: MidaPlaygroundEngine = await this.createEngine(this.#directives.from);
        const equityCurve: Record<string, MidaDecimal> = {};
        const timeframes: MidaTimeframe[] = this.#timeframes;
        const account: MidaPlaygroundAccount =
            await engine.createAccount({ balanceSheet: this.#directives.balanceSheet, });
        const positions: Map<string, MidaPlaygroundPosition> = new Map();

        for (const [ symbol, symbolDirectives, ] of Object.entries(this.#directives.symbols)) {
            await account.addSymbol({
                symbol,
                ...symbolDirectives.params,
            });
        }

        engine.waitFeedConfirmation = true;

        await marketComponent({
            dependencies: {
                target: {
                    type: target.type,
                    params: target.params,
                },
            },

            state (): Record<string, any> {
                return {
                    currentDay: undefined,
                };
            },

            watcher (): MidaMarketWatcherDirectives {
                return {
                    watchTicks: true,
                    watchPeriods: true,
                    timeframes,
                };
            },

            async tick (tick: MidaTick): Promise<void> {
                const date = tick.date;

                if (this.currentDay !== date.weekDay) {
                    let day: MidaDate = date;

                    day = day.setHours(0);
                    day = day.setMinutes(0);
                    day = day.setSeconds(0);
                    day = day.setMilliseconds(0);

                    this.currentDay = date.weekDay;

                    equityCurve[day.iso.split("T")[0]] = await this.$tradingAccount.getEquity();

                    logger.info("Backtester | Processed one day");
                }

                const openPositions: MidaPosition[] = await this.$tradingAccount.getOpenPositions();

                for (let i = 0, length = openPositions.length; i < length; ++i) {
                    positions.set(openPositions[i].id, openPositions[i] as MidaPlaygroundPosition);
                }
            },

            async lateUpdate (): Promise<void> {
                engine.nextFeed();
            },
        })(account, target.symbol);

        await engine.elapseTime((date(target.to ?? this.#directives.to).timestamp - engine.localDate.timestamp) / 1000);

        let realizedProfit: MidaDecimal = decimal(0);

        for (const position of positions.values()) {
            realizedProfit = realizedProfit.add(position.realizedProfit);
        }

        return {
            tradingAccount: account,
            equityCurve,
            positions: [ ...positions.values(), ],
            realizedProfit,
        };
    }
}
