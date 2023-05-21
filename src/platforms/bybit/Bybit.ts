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

import { baseActions, } from "#plugins/MidaPluginActions";
import { BybitFutures, } from "!/src/platforms/bybit/futures/BybitFutures";
import { BybitSpot, } from "!/src/platforms/bybit/spot/BybitSpot";

baseActions.addPlatform("Bybit/Futures", BybitFutures.instance);
baseActions.addPlatform("Bybit/Spot", BybitSpot.instance);

// <public-api>
// <futures>
export { BybitFuturesOrder, } from "!/src/platforms/bybit/futures/orders/BybitFuturesOrder";
export { BybitFuturesOrderParameters, } from "!/src/platforms/bybit/futures/orders/BybitFuturesOrderParameters";

export { BybitFuturesPosition, } from "!/src/platforms/bybit/futures/positions/BybitFuturesPosition";
export { BybitFuturesPositionParameters, } from "!/src/platforms/bybit/futures/positions/BybitFuturesPositionParameters";

export { BybitFuturesTrade, } from "!/src/platforms/bybit/futures/trades/BybitFuturesTrade";
export { BybitFuturesTradeParameters, } from "!/src/platforms/bybit/futures/trades/BybitFuturesTradeParameters";

export { BybitFuturesUtilities, } from "!/src/platforms/bybit/futures/utilities/BybitFuturesUtilities";

export { BybitFutures, } from "!/src/platforms/bybit/futures/BybitFutures";
export { BybitFuturesAccount, } from "!/src/platforms/bybit/futures/BybitFuturesAccount";
export { BybitFuturesAccountParameters, } from "!/src/platforms/bybit/futures/BybitFuturesAccountParameters";
export { BybitFuturesLoginParameters, } from "!/src/platforms/bybit/futures/BybitFuturesLoginParameters";
// </futures>

// <spot>
export { BybitSpotOrder, } from "!/src/platforms/bybit/spot/orders/BybitSpotOrder";
export { BybitSpotOrderParameters, } from "!/src/platforms/bybit/spot/orders/BybitSpotOrderParameters";

export { BybitSpotTrade, } from "!/src/platforms/bybit/spot/trades/BybitSpotTrade";
export { BybitSpotTradeParameters, } from "!/src/platforms/bybit/spot/trades/BybitSpotTradeParameters";

export { BybitSpotUtilities, } from "!/src/platforms/bybit/spot/utilities/BybitSpotUtilities";

export { BybitSpot, } from "!/src/platforms/bybit/spot/BybitSpot";
export { BybitSpotAccount, } from "!/src/platforms/bybit/spot/BybitSpotAccount";
export { BybitSpotAccountParameters, } from "!/src/platforms/bybit/spot/BybitSpotAccountParameters";
export { BybitSpotLoginParameters, } from "!/src/platforms/bybit/spot/BybitSpotLoginParameters";
// </spot>
// </public-api>
