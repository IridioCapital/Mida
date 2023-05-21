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

import { unknownTimeInForceError, unsupportedTimeInForceError, } from "#errors/MidaErrorUtilities";
import { MidaOrderTimeInForce, } from "#orders/MidaOrderTimeInForce";
import { BitFlyerSpot, } from "!/src/platforms/bitflyer/spot/BitFlyerSpot";

export namespace BitFlyerSpotUtilities {
    export const normalizeTimeInForce = (timeInForce: string): MidaOrderTimeInForce => {
        switch (timeInForce.toUpperCase()) {
            case "GTC": {
                return MidaOrderTimeInForce.GOOD_TILL_CANCEL;
            }
            case "FOK": {
                return MidaOrderTimeInForce.FILL_OR_KILL;
            }
            case "IOC": {
                return MidaOrderTimeInForce.IMMEDIATE_OR_CANCEL;
            }
            default: {
                throw unknownTimeInForceError(BitFlyerSpot.instance, timeInForce);
            }
        }
    };

    export const toBitFlyerTimeInForce = (timeInForce: MidaOrderTimeInForce): string => {
        switch (timeInForce) {
            case MidaOrderTimeInForce.GOOD_TILL_CANCEL: {
                return "GTC";
            }
            case MidaOrderTimeInForce.FILL_OR_KILL: {
                return "FOK";
            }
            case MidaOrderTimeInForce.IMMEDIATE_OR_CANCEL: {
                return "IOC";
            }
            default: {
                throw unsupportedTimeInForceError(BitFlyerSpot.instance, timeInForce);
            }
        }
    };
}
