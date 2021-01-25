import { MidaBroker } from "#brokers/MidaBroker";
import { MidaBrokerAccountParameters } from "#brokers/MidaBrokerAccountParameters";
import { MidaBrokerAccountType } from "#brokers/MidaBrokerAccountType";
import { MidaBrokerOrderDirectives } from "#orders/MidaBrokerOrderDirectives";
import { MidaSymbolQuotationPriceType } from "#quotations/MidaSymbolQuotationPriceType";
import { MidaSymbolTick } from "#ticks/MidaSymbolTick";
import { MidaSymbol } from "#symbols/MidaSymbol";
import { MidaSymbolPeriod } from "#periods/MidaSymbolPeriod";
import { MidaSymbolType } from "#symbols/MidaSymbolType";
import { MidaBrokerOrder } from "#orders/MidaBrokerOrder";
import { MidaListenable } from "#utilities/listenable/MidaListenable";
import { MidaListener } from "#utilities/listenable/MidaListener";

// Represents a broker account.
export abstract class MidaBrokerAccount {
    // Represents the account id.
    private readonly _id: string;

    // Represents the account full name.
    private readonly _fullName: string;

    // Represents the account type.
    private readonly _type: MidaBrokerAccountType;

    // Represents the account broker.
    private readonly _broker: MidaBroker;

    // Represents the account event system.
    private readonly _listenable: MidaListenable;

    protected constructor ({ id, fullName, type, broker, }: MidaBrokerAccountParameters) {
        this._id = id;
        this._fullName = fullName;
        this._type = type;
        this._broker = broker;
        this._listenable = new MidaListenable();
    }

    public get id (): string {
        return this._id;
    }

    public get fullName (): string {
        return this._fullName;
    }

    public get type (): MidaBrokerAccountType {
        return this._type;
    }

    public get broker (): MidaBroker {
        return this._broker;
    }

    public abstract getPing (): Promise<number>;

    public abstract getBalance (): Promise<number>;

    public abstract getEquity (): Promise<number>;

    public abstract getMargin (): Promise<number>;

    public abstract getFreeMargin (): Promise<number>;

    public abstract placeOrder (directives: MidaBrokerOrderDirectives): Promise<MidaBrokerOrder>;

    public abstract getOrders (from?: Date, to?: Date): Promise<MidaBrokerOrder[]>;

    public abstract getOrder (ticket: number): Promise<MidaBrokerOrder | undefined>;

    public abstract cancelOrder (ticket: number): Promise<void>;

    public abstract closeOrder (ticket: number): Promise<void>;

    public abstract getOrderProfit (ticket: number): Promise<number>;

    public abstract getOrderGrossProfit (ticket: number): Promise<number>;

    public abstract getOrderSwaps (ticket: number): Promise<number>;

    public abstract getOrderCommision (ticket: number): Promise<number>;

    public abstract getSymbols (): Promise<MidaSymbol[]>;

    public abstract getSymbol (symbol: string): Promise<MidaSymbol | undefined>;

    public abstract isSymbolMarketOpen (symbol: string): Promise<boolean>;

    public abstract getCurrency (): Promise<string>;
    
    public abstract getSymbolPeriods (symbol: string, timeframe: number, priceType?: MidaSymbolQuotationPriceType): Promise<MidaSymbolPeriod[]>;

    public abstract getSymbolLastTick (symbol: string): Promise<MidaSymbolTick>;

    public async getUsedMargin (): Promise<number> {
        return (await this.getMargin()) - (await this.getFreeMargin());
    }

    public async getMarginLevel (): Promise<number> {
        const usedMargin: number = await this.getUsedMargin();

        if (usedMargin === 0) {
            return NaN;
        }

        return (await this.getEquity()) / usedMargin * 100;
    }

    public async getSymbolsByType (type: MidaSymbolType): Promise<MidaSymbol[]> {
        return (await this.getSymbols()).filter((symbol: MidaSymbol): boolean => symbol.type === type);
    }

    public on (type: string, listener?: MidaListener): Promise<void> | string {
        return this._listenable.on(type, listener);
    }

    protected notifyListeners (type: string, ...parameters: any[]): void {
        this._listenable.notifyListeners(type, ...parameters);
    }
}
