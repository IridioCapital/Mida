import { connect, marketWatcher, } from "@reiryoku/mida";

/*
 * Listen real-time Bitcoin price updates
 */

// More account login examples at https://www.mida.org/documentation/essentials/login.html
const myAccount = await connect("cTrader", {
    clientId: "***",
    clientSecret: "***",
    accessToken: "***",
    accountId: "***",
});

const watcher = await marketWatcher({ tradingAccount: myAccount, });

watcher.on("tick", (e) => {
    const { tick, } = e.descriptor;

    console.log(`Bitcoin price is now ${tick.bid}$`);
});

await watcher.watch("BTCUSD", {
    watchTicks: true,
});
