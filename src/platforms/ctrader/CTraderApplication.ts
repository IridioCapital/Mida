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

import { CTraderConnection, } from "@reiryoku/ctrader-layer";

import { MidaTradingAccountOperativity, } from "#accounts/MidaTradingAccountOperativity";
import { MidaTradingAccountPositionAccounting, } from "#accounts/MidaTradingAccountPositionAccounting";
import { date, } from "#dates/MidaDate";
import { decimal, } from "#decimals/MidaDecimal";
import { CTrader, } from "!/src/platforms/ctrader/CTrader";
import { CTraderAccount, } from "!/src/platforms/ctrader/CTraderAccount";
import { CTraderApplicationParameters, } from "!/src/platforms/ctrader/CTraderApplicationParameters";

export class CTraderApplication {
    readonly #clientId: string;
    readonly #clientSecret: string;
    readonly #demoConnection: CTraderConnection;
    readonly #liveConnection: CTraderConnection;
    #demoHeartbeatIntervalId: any;
    #liveHeartbeatIntervalId: any;
    #isConnected: boolean;
    #isAuthenticated: boolean;

    private constructor ({
        clientId,
        clientSecret,
        demoProxy,
        liveProxy,
    }: CTraderApplicationParameters) {
        this.#clientId = clientId;
        this.#clientSecret = clientSecret;
        this.#demoConnection = new CTraderConnection({ host: demoProxy, port: 5035, });
        this.#liveConnection = new CTraderConnection({ host: liveProxy, port: 5035, });
        this.#isConnected = false;
        this.#isAuthenticated = false;
    }

    public get isConnected (): boolean {
        return this.#isConnected;
    }

    public get isAuthenticated (): boolean {
        return this.#isAuthenticated;
    }

    public async openConnections (): Promise<void> {
        await Promise.all([ this.#demoConnection.open(), this.#liveConnection.open(), ]);

        this.#isConnected = true;
    }

    public async authenticate (): Promise<void> {
        // <demo>
        const demoConnection = this.#demoConnection;

        await demoConnection.sendCommand("ProtoOAApplicationAuthReq", {
            clientId: this.#clientId,
            clientSecret: this.#clientSecret,
        });

        this.#demoHeartbeatIntervalId = setInterval(() => demoConnection.sendHeartbeat(), 25000);
        // </demo>

        // <live>
        const liveConnection = this.#liveConnection;

        await liveConnection.sendCommand("ProtoOAApplicationAuthReq", {
            clientId: this.#clientId,
            clientSecret: this.#clientSecret,
        });

        this.#liveHeartbeatIntervalId = setInterval(() => liveConnection.sendHeartbeat(), 25000);
        // </live>

        this.#isAuthenticated = true;
    }

    public async loginTradingAccount (accessToken: string, accountId: string): Promise<CTraderAccount> {
        const accounts = (await this.#demoConnection.sendCommand("ProtoOAGetAccountListByAccessTokenReq", { accessToken, })).ctidTraderAccount;
        const account = accounts.find((account: any) => account.ctidTraderAccountId.toString() === accountId);

        if (!account) {
            throw new Error("Unknown account id");
        }

        const isLive = account.isLive === true;
        const connection: CTraderConnection = isLive ? this.#liveConnection : this.#demoConnection;

        await connection.sendCommand("ProtoOAAccountAuthReq", {
            accessToken,
            ctidTraderAccountId: accountId,
        });

        const accountDescriptor: any = (await connection.sendCommand("ProtoOATraderReq", {
            ctidTraderAccountId: accountId,
        })).trader;
        const positionAccounting: MidaTradingAccountPositionAccounting = ((): MidaTradingAccountPositionAccounting => {
            switch (accountDescriptor.accountType.toUpperCase()) {
                case "HEDGED": {
                    return MidaTradingAccountPositionAccounting.HEDGED;
                }
                case "NETTED": {
                    return MidaTradingAccountPositionAccounting.NETTED;
                }
                default: {
                    throw new Error("Unknown account type");
                }
            }
        })();
        const assets: any[] =
            (await connection.sendCommand("ProtoOAAssetListReq", { ctidTraderAccountId: accountId, })).asset;
        const depositAsset: any =
            assets.find((asset: any) => asset.assetId.toString() === accountDescriptor.depositAssetId.toString());

        return new CTraderAccount({
            id: accountId,
            platform: CTrader.instance,
            creationDate: date(accountDescriptor.registrationTimestamp),
            primaryAsset: depositAsset.displayName.toUpperCase(),
            operativity: isLive ? MidaTradingAccountOperativity.REAL : MidaTradingAccountOperativity.DEMO,
            positionAccounting,
            indicativeLeverage: decimal(accountDescriptor.leverageInCents).divide(100),
            connection,
            brokerName: accountDescriptor.brokerName,
        });
    }

    /* *** *** *** Reiryoku Technologies *** *** *** */

    static readonly #applications: Map<string, CTraderApplication> = new Map();

    public static async create ({
        clientId,
        clientSecret,
        demoProxy,
        liveProxy,
    }: CTraderApplicationParameters): Promise<CTraderApplication> {
        const application: CTraderApplication = CTraderApplication.#applications.get(clientId) ?? new CTraderApplication({
            clientId,
            clientSecret,
            demoProxy,
            liveProxy,
        });

        if (!application.isConnected) {
            await application.openConnections();
        }

        if (!application.isAuthenticated) {
            await application.authenticate();
        }

        CTraderApplication.#applications.set(clientId, application);

        return application;
    }
}
