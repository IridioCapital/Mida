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

import { BitFlyerSpot, } from "!/src/platforms/bitflyer/spot/BitFlyerSpot";
import { baseActions, } from "#plugins/MidaPluginActions";

baseActions.addPlatform("bitFlyer/Spot", BitFlyerSpot.instance);

// <public-api>
// <spot>
export { BitFlyerSpotOrder, } from "!/src/platforms/bitflyer/spot/orders/BitFlyerSpotOrder";
export { BitFlyerSpotOrderParameters, } from "!/src/platforms/bitflyer/spot/orders/BitFlyerSpotOrderParameters";

export { BitFlyerSpotTrade, } from "!/src/platforms/bitflyer/spot/trades/BitFlyerSpotTrade";
export { BitFlyerSpotTradeParameters, } from "!/src/platforms/bitflyer/spot/trades/BitFlyerSpotTradeParameters";

export { BitFlyerSpotUtilities, } from "!/src/platforms/bitflyer/spot/utilities/BitFlyerSpotUtilities";

export { BitFlyerSpot, } from "!/src/platforms/bitflyer/spot/BitFlyerSpot";
export { BitFlyerSpotAccount, } from "!/src/platforms/bitflyer/spot/BitFlyerSpotAccount";
export { BitFlyerSpotAccountParameters, } from "!/src/platforms/bitflyer/spot/BitFlyerSpotAccountParameters";
export { BitFlyerSpotLoginParameters, } from "!/src/platforms/bitflyer/spot/BitFlyerSpotLoginParameters";
// </spot>

export { BitFlyerAccountRegion, } from "!/src/platforms/bitflyer/BitFlyerAccountRegion";
export { BitFlyerHttpClient, } from "!/src/platforms/bitflyer/BitFlyerHttpClient";
export { createBitflyerPrivateWs, } from "!/src/platforms/bitflyer/BitFlyerWebSocket";
// </public-api>
