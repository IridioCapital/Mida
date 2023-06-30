import { connect, marketWatcher, MidaTimeframe, } from "@reiryoku/mida";

/*
 * Listen real-time Bitcoin candles being closed
 */

// More account login examples at https://www.mida.org/documentation/essentials/login.html
const myAccount = await connect("cTrader", {
    clientId: "***",
    clientSecret: "***",
    accessToken: "***",
    accountId: "***",
});

const watcher = await marketWatcher({ tradingAccount: myAccount, });

watcher.on("period-close", (e) => {
    const { period, } = e.descriptor;

    console.log(`M1 candle closed at ${period.close}$`);
});

await watcher.watch("BTCUSD", {
    watchPeriods: true,
    timeframes: [ MidaTimeframe.M1, ],
});
