const Web3 = require("web3");
const { createPriceFeed } = require("./CreatePriceFeed");
const { Networker } = require("./Networker");
const { Logger } = require("./Logger");

// Constants
const UNISWAP_ADDRESS = "0x25fb29D865C1356F9e95D621F21366d3a5DB6BB0";
const INFURA_URL = `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`;
const INVERTED = false;
const TWAP_LENGTH = 7200;
// Setup
const web3 = new Web3(INFURA_URL);
const networker = new Networker();
const getTime = () => Math.floor(Date.now() / 1000);

async function createUniPriceFeed() {
  const pf = await createPriceFeed(Logger, web3, networker, getTime, {
    type: "uniswap",
    uniswapAddress: UNISWAP_ADDRESS,
    invertPrice: INVERTED,
    lookback: 0,
    twapLength: TWAP_LENGTH,
  });
  return pf;
}

async function usePriceFeed() {
  let priceFeed;

  try {
    priceFeed = await createUniPriceFeed();
  } catch (err) {
    console.log(err);
  }

  try {
    await priceFeed.update();
  } catch (err) {
    console.log(err);
  }
  return priceFeed;
}

exports.usePriceFeed = usePriceFeed;
