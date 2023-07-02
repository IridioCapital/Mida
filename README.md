<br><br>
<p align="center">
    <img src="images/logo-light.svg#gh-light-mode-only" alt="Mida" width="348px">
    <img src="images/logo-dark.svg#gh-dark-mode-only" alt="Mida" width="348px">
</p>
<br>
<p align="center">
    <b>The open-source and cross-platform trading engine :boom:</b>
    <br><br>
    <a href="https://www.mida.org">Home</a> &mdash;
    <a href="https://www.mida.org/documentation">Documentation</a> &mdash;
    <a href="https://www.mida.org/api">API</a>
</p>
<br>
<p align="center">
    <a href="https://www.npmjs.com/package/@reiryoku/mida">
        <img src="https://img.shields.io/npm/v/@reiryoku/mida" alt="">
    </a>
    <a href="./LICENSE">
        <img src="https://img.shields.io/npm/l/@reiryoku/mida" alt="">
    </a>
    <a href="https://discord.gg/cKyWTUsr3q">
        <img src="https://img.shields.io/discord/780532638846287904?label=community" alt="">
    </a>
</p>
<br><br>

## Table of Contents
* [Introduction](#introduction)
    * [Languages](#languages)
    * [Platforms](#platforms)
    * [Community](#community)
* [Installation](#installation)
* [Usage](#usage)
    * [Account connection](#account-connection)
    * [Balance, equity and margin](#balance-equity-and-margin)
    * [Orders, trades and positions](#orders-trades-and-positions)
    * [Decimals](#decimals)
    * [Symbols and assets](#symbols-and-assets)
    * [Ticks and candlesticks](#ticks-and-candlesticks)
    * [Market components](#market-components)
    * [Trading systems](#trading-systems)
    * [Paper trading and backtesting](#paper-trading-and-backtesting)
    * [Technical indicators](#technical-indicators)
* [Why JavaScript/TypeScript?](#why-javascripttypescript)
* [License and disclaimer](#license-and-disclaimer)
* [Contributors](#contributors)

## Introduction
Mida is an open-source and cross-platform trading engine developed by Reiryoku Technologies and its contributors.
Designed from the ground up to provide a solid, versatile and platform-neutral
environment for creating algorithmic trading systems, indicators, market analysis tools or just trading
applications depending on use cases.<br>

**Would you like to honor our efforts? If so, you can leave a star on GitHub ⭐. Thank you!**

### Languages
Mida is used with JavaScript/TypeScript on [Node.js](https://nodejs.org) and
can be additionally enhanced with C++.<br>
[Why JavaScript/TypeScript?](#why-javascripttypescript)

### Platforms
Mida is platform-neutral, this means that virtually any trading platform could
be easily integrated in the engine. Applications built with Mida can be
easily executed on different trading platforms.

<br><br>
<p align="center">
    <img src="images/platforms-light.svg#gh-light-mode-only" width="572px">
    <img src="images/platforms-dark.svg#gh-dark-mode-only" width="572px">
</p>
<br><br>

### Community
Join the community on [Discord](https://discord.gg/cKyWTUsr3q) and [Telegram](https://t.me/joinmida)
to get help you with your first steps.

## Installation
Mida is distributed on [npm](https://www.npmjs.com) and can be installed in just one step.
```console
npm install @reiryoku/mida
```

## Usage
### Account connection
How to connect to a Binance Spot account,<br>
read [how to use Mida with Binance](https://www.mida.org/posts/how-to-use-mida-with-binance/) to
get your `apiKey` and `apiSecret` credentials.
```javascript
import { connect, } from "@reiryoku/mida";

const myAccount = await connect("Binance/Spot", {
    apiKey: "***",
    apiSecret: "***",
});
```

How to connect to a cTrader account,<br>
read [how to use Mida with cTrader](https://www.mida.org/posts/how-to-use-mida-with-ctrader/) to
get your `clientId`, `clientSecret`, `accessToken` and `accountId` credentials.
```javascript
import { connect, } from "@reiryoku/mida";

const myAccount = await connect("cTrader", {
    clientId: "***",
    clientSecret: "***",
    accessToken: "***",
    accountId: "***",
});
```

How to connect to a Bybit Futures account,<br>
read [how to use Mida with Bybit](https://www.mida.org/posts/how-to-use-mida-with-bybit/) to
get your `apiKey` and `apiSecret` credentials.
```javascript
import { connect, } from "@reiryoku/mida";

const myAccount = await connect("Bybit/Futures", {
    apiKey: "***",
    apiSecret: "***",
});
```

How to connect to multiple accounts.
```javascript
import { connect, } from "@reiryoku/mida";

const myAccount1 = await connect("Binance/Spot", { /* ... */ });
const myAccount2 = await connect("Bybit/Futures", { /* ... */ });
const myAccount3 = await connect("cTrader", { /* ... */ });
```

### Balance, equity and margin
How to get the account balance, equity and margin.
```javascript
const balance = await myAccount.getBalance();
const equity = await myAccount.getEquity();
const freeMargin = await myAccount.getFreeMargin();
const usedMargin = await myAccount.getUsedMargin();
```

### Orders, trades and positions
How top open a long position for BTC/USDT.
```javascript
import { MidaOrderDirection, } from "@reiryoku/mida";

const myOrder = await myAccount.placeOrder({
    symbol: "BTCUSDT",
    direction: MidaOrderDirection.BUY,
    volume: 1,
});

const orderId = myOrder.id;
const executionPrice = myOrder.executionPrice;
const filledVolume = myOrder.filledVolume;
const trades = myOrder.trades;
const myPosition = await order.getPosition();
```

How to open a short position for EUR/USD.
```javascript
import { MidaOrderDirection, } from "@reiryoku/mida";

const myOrder = await myAccount.placeOrder({
    symbol: "EURUSD",
    direction: MidaOrderDirection.SELL,
    volume: 0.1,
});

const orderId = myOrder.id;
const executionPrice = myOrder.executionPrice;
const filledVolume = myOrder.filledVolume;
const trades = myOrder.trades;
const myPosition = await order.getPosition();
```

How to open a long position for ETH/USDT with error handler.
```javascript
import {
    MidaOrderDirection,
    MidaOrderRejection,
} from "@reiryoku/mida";

const myOrder = await myAccount.placeOrder({
    symbol: "ETHUSDT",
    direction: MidaOrderDirection.BUY,
    volume: 888,
});

if (myOrder.isRejected) {
    switch (myOrder.rejection) {
        case MidaOrderRejection.MARKET_CLOSED: {
            console.log("The market is closed!");

            break;
        }
        case MidaOrderRejection.NOT_ENOUGH_MONEY: {
            console.log("You don't have enough money in your account!");

            break;
        }
        case MidaOrderRejection.SYMBOL_NOT_FOUND: {
            console.log("Your account doesn't support trading Ethereum!");

            break;
        }
    }
}
```

<details>
<summary>More examples</summary>

How to open a long position for GBP/USD with stop loss and take profit.
```javascript
import { MidaOrderDirection, } from "@reiryoku/mida";

const symbol = "GBPUSD";
const lastBid = await myAccount.getSymbolBid(symbol);
const myOrder = await myAccount.placeOrder({
    symbol,
    direction: MidaOrderDirection.BUY,
    volume: 0.1,
    protection: {
        stopLoss: lastBid.sub(0.0010), // <= SL 10 pips
        takeProfit: lastBid.add(0.0030), // <= TP 30 pips
    },
});
```

How to close an open position.
```javascript
import {
    MidaOrderDirection,
    MidaPositionDirection,
} from "@reiryoku/mida";

await myPosition.close();
// or
await myPosition.subtractVolume(myPosition.volume);
// or
await myAccount.placeOrder({
    positionId: myPosition.id,
    direction: myPosition.direction === MidaPositionDirection.LONG ? MidaOrderDirection.SELL : MidaOrderDirection.BUY,
    volume: myPosition.volume,
});
```

How to retrieve all pending orders and open positions.
```javascript
const pendingOrders = await myAccount.getPendingOrders();
const openPositions = await myAccount.getOpenPositions();
```

How to set/change take profit and stop loss for an open position.
```javascript
await myPosition.changeProtection({
    takeProfit: 200,
    stopLoss: 100,
});
```

</details>

### Decimals
Computers can only natively store integers, so they need some way of representing
decimal numbers. This representation is not perfectly accurate. This is why, in
most programming languages `0.1 + 0.2 != 0.3`, for financial and monetary calculations
this can lead to unreversible losses.<br> In Mida, decimal numbers and calculations
are safe by design and accurately represented by the `MidaDecimal` API.

```javascript
import { decimal, } from "@reiryoku/mida";

// BAD (native behaviour)
0.1 + 0.2; // 0.30000000000000004

// GOOD (with Mida decimals)
decimal(0.1).add(0.2); // 0.3

// GOOD (with Mida decimals)
decimal("0.1").add("0.2"); // 0.3
```

In Mida, every calculation under the hood is made using decimals and every native number
passed to Mida is internally converted to decimal, input values in the Mida APIs
such as a limit price are usually expressed as a `MidaDecimalConvertible` which is an alias
for `MidaDecimal | string | number`, the input values are internally converted to `MidaDecimal`
and most Mida interfaces exposes decimal numbers unless otherwise stated.

Read more about the [Decimals API](https://www.mida.org/documentation/decimals/decimal.html).

### Symbols and assets
How to retrieve all symbols available for your trading account.
```javascript
const symbols = await myAccount.getSymbols();
```

How to retrieve a complete symbol.
```javascript
const symbol = await myAccount.getSymbol("#AAPL");

if (!symbol) {
    console.log("Apple stocks are not available for this account!");
}
else {
    console.log(symbol.baseAsset);
    console.log(symbol.quoteAsset);
    console.log(symbol.digits);
    console.log(symbol.minLots); // Min volume for an order
    console.log(symbol.maxLots); // Max volume for an order
    console.log(symbol.pipPosition);
    console.log(await symbol.isMarketOpen());
}
```

How to get the price of a symbol.
```javascript
const symbol = await myAccount.getSymbol("BTCUSDT");

const price = await symbol.getBid();
// or
const price = await myAccount.getSymbolBid("BTCUSDT");

console.log(`Bitcoin price is ${price} USDT`);
```

### Ticks and candlesticks
How to listen the real-time ticks of a symbol.
```javascript
import { marketWatcher, } from "@reiryoku/mida";

const watcher = await marketWatcher({ tradingAccount: myAccount, });

await watcher.watch("BTCUSDT", { watchTicks: true, });

watcher.on("tick", (event) => {
    const { tick, } = event.descriptor;

    console.log(`Bitcoin price is now ${tick.bid} USDT`);
});
```

How to listen the real-time candlesticks of a symbol (when the last live candlesticks are updated/closed).
```javascript
import {
    marketWatcher,
    MidaTimeframe,
} from "@reiryoku/mida";

const watcher = await marketWatcher({ tradingAccount: myAccount, });

await watcher.watch("BTCUSDT", {
    watchPeriods: true,
    timeframes: [
        MidaTimeframe.M5,
        MidaTimeframe.H1,
    ],
});

watcher.on("period-update", (event) => {
    const { period, } = event.descriptor;

    switch (period.timeframe) {
        case MidaTimeframe.M5: {
            console.log("Last live M5 candlestick updated");

            break;
        }
        case MidaTimeframe.H1: {
            console.log("Last live M5 candlestick updated");

            break;
        }
    }
});

watcher.on("period-close", (event) => {
    const { period, } = event.descriptor;

    switch (period.timeframe) {
        case MidaTimeframe.M5: {
            console.log(`M5 candlestick closed at ${period.close}`);

            break;
        }
        case MidaTimeframe.H1: {
            console.log(`H1 candlestick closed at ${period.close}`);

            break;
        }
    }
});
```

How to get the historical closed candlesticks of a symbol (in Mida, candlesticks and bars are generically called periods).
```javascript
import { MidaTimeframe, } from "@reiryoku/mida";

const periods = await myAccount.getSymbolPeriods("EURUSD", MidaTimeframe.M30);
const lastPeriod = periods.at(-1);

console.log("Last candlestick start time: " + lastPeriod.startTime);
console.log("Last candlestick OHLC: " + lastPeriod.ohlc);
console.log("Last candlestick close price: " + lastPeriod.close);
```

When listening events in Mida, the `on()` method returns an id which can be used later to unsubscribe from the event listener.
```javascript
const id = watcher.on("period-close", (event) => { /* ... */ });

watcher.removeEventListener(id);
```

### Market components
A market component is way to encapsulate logic and data reactively evolving
as the underlying market changes. Market components can be used to easily
create trading systems and independent market analysis logic.

Read more about [Reactive Programming in Financial Markets](https://www.mida.org/posts/reactive-programming-in-financial-markets/).

How to create a market component detecting overbought markets
```javascript
import { marketComponent, } from "@reiryoku/mida";

// A reactive component detecting overbought markets
const OverboughtDetector = marketComponent({
    indicators: {
        myIndicator: {
            type: "RSI",
            options: { length: 14, },
            input: {
                timeframe: MidaTimeframe.M30, // Use M30 candles
                type: "close", // Use close prices
            },
        },
    },
    computed: {
        // A variable calculated every market update
        isOverbought () {
            return this.myIndicator.lastValue.greaterThan(80);
        },
    },
    // A hook fired once in the component's lifetime, use as async constructor
    async created () {
        console.log("Hello World!");
    },
    // A hook fired every market update (market ticks, closed candles...)
    async update () {
        console.log(this.isOverbought);
    },
    // A targeted hook fired every candle close
    async periodClose$M15 (period) {
        console.log("Closed M15 candle");
    }
});
```

How to execute a market component
```javascript
const overboughtDetector = await OverboughtDetector(myAccount, "ETHUSD");
```

How to create a simple market ticker
```javascript
import { marketComponent, } from "@reiryoku/mida";

// A component logging the market prices
const Ticker = marketComponent({
    computed: {
        spread () {
            return this.$ask.sub(this.$bid);
        },
    },
    update () {
        console.log(`Market price has changed for symbol ${this.$symbol}`);

        console.log(`Bid price is ${this.$bid}`);
        console.log(`Ask price is ${this.$ask}`);

        console.log(`The spread is ${this.spread}`);
    },
});
```

The `this` of a market component assumes the state of the component which is composed by data such as computed variables,
indicators and methods, plus some builtin variables such as the current candles, bid and ask prices of the market,
which are self-updating in response to market updates.
```typescript
// The builtin market component variables
type MidaMarketComponentState = Record<string, any> & {
    $component: MidaMarketComponent;
    $dependencies: MidaMarketComponentState[];
    $tradingAccount: MidaTradingAccount;
    $watcher: MidaMarketWatcherDirectives;
    $symbol: string;
    $bid: MidaDecimal;
    $ask: MidaDecimal;
    $ticks: MidaTick[];
    $periods: Record<MidaTimeframe, MidaPeriod[]>;
    $livePeriods: Record<MidaTimeframe, MidaPeriod>;
    $indicators: Record<string, MidaIndicator>;
};
```

### Market component hooks
The `update()` hook is triggered by various market events, such as a market tick, the closing of a candle,
or the opening or closing of the market itself. Consequently, each market event corresponds to its own specific hook.
```javascript
import { marketComponent, } from "@reiryoku/mida";

const Component = marketComponent({
    async tick () {
        // Fired when there is a market tick
    },

    async periodUpdate (period) {
        // Fired when a last live candlestick is updated
    },

    async periodClose (period) {
        // Fired when a candlestick is closed
    },

    // Furthermore, specific timeframes can be targeted
    async periodClose$M15 (period) {
        // Fired when a M15 candlestick is closed
    },

    async marketOpen () {
        // Fired when the market opens
    },

    async update () {
        // Fired when there is any market update of the above
    },
});
```

Read more about [Reactive Programming in Financial Markets](https://www.mida.org/posts/reactive-programming-in-financial-markets/).

### Trading systems
How to create a trading system (expert advisor or trading bot).<br>
Trading systems are used under the hood to regulate and execute market components.
It's recommended to use the Market Components API over the Trading Systems API as it
allows to quickly develop and maintain an idea in a declarative way.

```javascript
import {
    MidaTradingSystem,
    MidaTimeframe,
} from "@reiryoku/mida";

class SuperTradingSystem extends MidaTradingSystem {
    watched () {
        return {
            "BTCUSDT": {
                watchTicks: true,
                watchPeriods: true,
                timeframes: [ MidaTimeframe.H1, ],
            },
        };
    }

    async configure () {
        // Called once per instance before the first startup
        // can be used as async constructor
    }

    async onStart () {
        console.log("The trading system has started...");
    }

    async onTick (tick) {
        // Implement your strategy
    }

    async onPeriodClose (period) {
        console.log(`H1 candlestick closed at ${period.open}`);
    }

    async onStop () {
        console.log("The trading system has been interrupted...");
    }
}
```

How to execute a trading system.
```javascript
import { connect, } from "@reiryoku/mida";
import { SuperTradingSystem, } from "./SuperTradingSystem";

const myAccount = await connect(/* ... */);
const mySystem = new SuperTradingSystem({ tradingAccount: myAccount, });

await mySystem.start();
```

### Paper trading and backtesting
Mida comes with an out of the box simulator of exchanges and spot trading accounts,
for paper trading and backtesting read [Paper Trading with Mida](https://www.mida.org/posts/paper-trading-with-mida/).

### Technical indicators
Mida comes with builtin indicators written in C for native performance.
Additionally, new indicators can be created.

How to calculate SMA (Simple Moving Average).
```javascript
import { Mida, MidaTimeframe, } from "@reiryoku/mida";

// Get latest candlesticks on H1 timeframe
const candlesticks = await myAccount.getSymbolPeriods("EURUSD", MidaTimeframe.H1);
const closePrices = candlesticks.map((candlestick) => candlestick.close);

// Calculate RSI on close prices, pass values from oldest to newest
const sma = await Mida.createIndicator("SMA").calculate(closePrices);

// Values are from oldest to newest
console.log(sma);
```

How to calculate RSI (Relative Strength Index).
```javascript
import { Mida, MidaTimeframe, } from "@reiryoku/mida";

// Get latest candlesticks on H1 timeframe
const candlesticks = await myAccount.getSymbolPeriods("BTCUSDT", MidaTimeframe.H1);
const closePrices = candlesticks.map((candlestick) => candlestick.close);

// Calculate RSI on close prices, pass values from oldest to newest
const rsi = await Mida.createIndicator("RSI", { period: 14, }).calculate(closePrices);

// Values are from oldest to newest
console.log(rsi);
```

## Why JavaScript/TypeScript?
At Reiryoku Technologies we hold the firm belief that JavaScript/TypeScript is the optimal choice for
algorithmic trading in financial markets, due to several key factors:

Firstly, the language's easy learning curve empowers traders to focus on developing effective strategies
without being encumbered by intricate technicalities such as memory management. This streamlined learning
experience accelerates the deployment of trading algorithms, enabling market participants to swiftly adapt
to dynamic market conditions.

Secondly, JavaScript/TypeScript excels in managing networking capabilities and handling asynchronous tasks,
making it a formidable choice for algorithmic trading. Its robust networking capabilities facilitate
real-time data processing and seamless communication, allowing traders to swiftly access and analyze market information.
The language's efficient handling of asynchronous tasks enables simultaneous management of multiple market feeds,
execution of trades, and response to market events, ensuring optimal performance and responsiveness.

Finally, we designed Mida offering the flexibility to use C++, this integration allows for enhanced performance
optimizations combined with the strengths of JavaScript/TypeScript for rapid development and strategy-focused programming.

## License and disclaimer
[LICENSE](./LICENSE)<br><br>
Trading in financial markets is highly speculative and carries a high level of risk.
It's possible to lose all your capital. This project may not be suitable for everyone,
you should ensure that you understand the risks involved. Mida, Reiryoku Technologies and
its contributors are not responsible for any technical inconvenience that
may lead to money loss, for example a stop loss not being set.

## Contributors
| Name or Username | Contribution           | GitHub                                                | Contact                   |
|------------------|------------------------|-------------------------------------------------------|---------------------------|
| Vasile Pește     | Founder and maintainer | [Vasile-Peste](https://github.com/Vasile-Peste)       | vasile.peste@reiryoku.com |
| dbvcode          | Collaborator           | [dbvcode](https://github.com/dbvcode)                 | /                         |
| Karsten Jakobsen | Collaborator           | [karstenjakobsen](https://github.com/karstenjakobsen) | /                         |
| JoeGuest         | Collaborator           | [JoeGuest](https://github.com/JoeGuest)               | /                         |
| Yannick Jemmely  | Collaborator           | [yannickjemmely](https://github.com/yannickjemmely)   | /                         |
| Lorenzo Iovino   | Collaborator           | [lokenxo](https://github.com/lokenxo)                 | /                         |

## Keywords
Algotrading Node.js, Binance Node.js API, cTrader Node.js API, Bybit Node.js API, bitFlyer Node.js API
