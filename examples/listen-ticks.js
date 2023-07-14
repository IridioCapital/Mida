import { connect, watchTicks, } from "@reiryoku/mida";

/*
 * Listen real-time Bitcoin price updates
 */

// More account login examples at https://www.mida.org/documentation/essentials/connect.html
const myAccount = await connect("cTrader", {
    clientId: "***",
    clientSecret: "***",
    accessToken: "***",
    accountId: "***",
});

watchTicks(myAccount, "BTCUSDT", (e) => {
    const { tick, } = e.descriptor;

    console.log(`Bitcoin price is now ${tick.bid}$`);
});
