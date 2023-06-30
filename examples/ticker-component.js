import { connect, marketComponent, } from "@reiryoku/mida";

/*
 * A simple real-time market component logging the Gold price and spread
 */

// More account login examples at https://www.mida.org/documentation/essentials/login.html
const myAccount = await connect("cTrader", {
    clientId: "***",
    clientSecret: "***",
    accessToken: "***",
    accountId: "***",
});

// A market component is a way to encapsulate logic and data evolving as the underlying market changes
const Ticker = marketComponent({
    name: "Ticker",
    computed: {
        spread () {
            return this.$ask.subtract(this.$bid);
        },
    },
    async tick () {
        console.log(`Gold price is now ${this.$bid}$`);
        console.log(`Gold spread is now ${this.spread}`);
    },
});

const myTicker = await Ticker(myAccount, "XAUUSD");
