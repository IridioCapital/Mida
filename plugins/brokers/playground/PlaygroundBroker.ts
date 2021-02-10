import { MidaBroker } from "#brokers/MidaBroker";
import { MidaBrokerAccount } from "#brokers/MidaBrokerAccount";

export class PlaygroundBroker extends MidaBroker {
    public constructor () {
        super({
            name: "PlaygroundBroker",
            websiteUri: "",
        });
    }

    public async login (...parameters: any[]): Promise<MidaBrokerAccount> {
        throw new Error();
    }
}
