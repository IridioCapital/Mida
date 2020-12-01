import { MidaError } from "#errors/MidaError";

export class MidaUndefinedBrokerError extends MidaError {
    private readonly _name: string;

    public constructor (name: string) {
        super(`Broker with name "${name}" is undefined.`);

        this._name = name;
    }

    public get name (): string {
        return this._name;
    }
}