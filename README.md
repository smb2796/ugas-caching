This is version 1 of a caching service to query for, store and make accessible different Ethereum gas related prices. These prices are intended to be used by the [ugas-station.io](https://ugas-station.io/) interface. ugas-station.io is used to support the uGAS-JAN21 synthetic token, which was built using the [UMA Protocol](https://github.com/UMAprotocol/protocol).

Accessible endpoints:
- GET the last 3 days of GASETH-1M prices with an hourly granularity [here](https://ugasdata.info/median-range).
- GET the most recent GASETH-1M price [here](https://ugasdata.info/current-median).
- GET the last 3 days of uGAS-JAN21 Uniswap 2-hour TWAP with a minute granularity [here](https://ugasdata.info/twap-range).
- GET the most recent uGAS-JAN21 Uniswap 2-hour TWAP [here](https://ugasdata.info/current-twap).

These prices are further described in UMA's [UMIP 22](https://github.com/UMAprotocol/UMIPs/blob/master/UMIPs/umip-22.md) for the GASETH-TWAP-1Mx1M price identifier.

Other useful resources:
- [uGAS-JAN21 Uniswap pool](https://app.uniswap.org/#/swap?outputCurrency=0x3d995510F8d82C2ea341845932b5DdDe0beAD9A3)
- [uGAS-JAN21 contract address](https://etherscan.io/address/0x516f595978D87B67401DaB7AfD8555c3d28a3Af4)
- UMA Protocol's protocol [repo](https://github.com/UMAprotocol/protocol)