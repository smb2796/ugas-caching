const mongoose = require("mongoose");
const { BigQuery } = require("@google-cloud/bigquery");
const highland = require("highland");
const moment = require("moment");

const GasMedian = require("../models/median");
const Twap = require("../models/twap");
const Index = require("../models/indexValue");
const TestingUniPriceFunctions = require("../price-feed/CreateNewUni");
const { GoogleSpreadsheet } = require('google-spreadsheet');

const client = new BigQuery();

const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.URI}/${process.env.DB_NAME}?retryWrites=true&w=majority`;

mongoose
  .connect(
    uri,
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() => {
    console.log("Connected to db");
  })
  .catch(err => {
    console.log(err);
  });

const createMedian = async (req, res, next) => {
  const medianValue = await runQuery();

  const createdMedian = new GasMedian({
    timestamp: medianValue[0],
    price: medianValue[1],
  });

  await createdMedian.save();
  // res.json(result);
};

const getIndexFromSpreadsheet = async (req, res, next) => {
  const indexValue = await fetchIndex();

  const fetchedIndex = new Index({
    timestamp: indexValue[0],
    price: indexValue[1],
  });

  await fetchedIndex.save();
  // res.json(result);
};

async function submitQuery(query) {
  // returns a node read stream
  const stream = await client.createQueryStream({ query });
  // highland wraps a stream and adds utilities simlar to lodash
  // https://caolan.github.io/highland/
  return (
    highland(stream)
      // from here you can map or reduce or whatever you need for down stream processing
      // we are just going to "collect" stream into an array for display
      .collect()
      // emit the stream as a promise when the stream ends
      // this is the start of a data pipeline so you can imagine
      // this could also "pipe" into some other processing pipeline or write to a file
      .toPromise(Promise)
  );
}

function buildQuery(formattedCurrentTime, formattedEarlierTimeBound) {
  let query;

  query = `
        DECLARE halfway int64;
        DECLARE block_count int64;
        DECLARE max_block int64;

        -- Querying for the amount of blocks in the preset time range. This will allow block_count to be compared against a given minimum block amount.
        SET (block_count, max_block) = (SELECT AS STRUCT (MAX(number) - MIN(number)), MAX(number) FROM \`bigquery-public-data.crypto_ethereum.blocks\` 
        WHERE timestamp BETWEEN TIMESTAMP('${formattedEarlierTimeBound}', 'UTC') AND TIMESTAMP('${formattedCurrentTime}', 'UTC'));

        CREATE TEMP TABLE cum_gas (
          gas_price int64,
          cum_sum int64
        );

        -- If the minimum threshold of blocks is met, query on a time range
        IF block_count >= 134400 THEN
        INSERT INTO cum_gas (
          SELECT
            gas_price,
            SUM(gas_used) OVER (ORDER BY gas_price) AS cum_sum
          FROM (
            SELECT
              gas_price,
              SUM(receipt_gas_used) AS gas_used
            FROM
              \`bigquery-public-data.crypto_ethereum.transactions\`
            WHERE block_timestamp 
            BETWEEN TIMESTAMP('${formattedEarlierTimeBound}', 'UTC')
            AND TIMESTAMP('${formattedCurrentTime}', 'UTC')  
            GROUP BY
              gas_price));
        ELSE -- If a minimum threshold of blocks is not met, query for the minimum amount of blocks
        INSERT INTO cum_gas (
          SELECT
            gas_price,
            SUM(gas_used) OVER (ORDER BY gas_price) AS cum_sum
          FROM (
            SELECT
              gas_price,
              SUM(receipt_gas_used) AS gas_used
            FROM
              \`bigquery-public-data.crypto_ethereum.transactions\`
            WHERE block_number 
            BETWEEN (max_block - 134400)
            AND max_block
            GROUP BY
              gas_price));
        END IF;

        SET halfway = (SELECT DIV(MAX(cum_sum),2) FROM cum_gas);

        SELECT cum_sum, gas_price FROM cum_gas WHERE cum_sum > halfway ORDER BY gas_price LIMIT 1;
        `;

  return query;
}

async function formatCurrentTime() {
  const currentTime = new Date();
  let formattedCurrentTime = moment(currentTime)
    .subtract(5, "minutes")
    .utc()
    .format(this.dateConversionString);

  let earlierTimeBound = new Date();
  let formattedEarlierTimeBound = moment(earlierTimeBound)
    .subtract(2592300, "seconds")
    .utc()
    .format(this.dateConversionString);

  formattedEarlierTimeBound = moment(formattedEarlierTimeBound)
    .utc()
    .format("YYYY-MM-DD HH:mm:ss");
  formattedCurrentTime = moment(formattedCurrentTime)
    .utc()
    .format("YYYY-MM-DD HH:mm:ss");

  return formattedCurrentTime;
}

async function runQuery() {
  const formattedCurrentTime = await formatCurrentTime();

  let priceResponse;

  try {
    priceResponse = await submitQuery(
      buildQuery(formattedCurrentTime, formattedEarlierTimeBound)
    );
    priceResponse = priceResponse[0].gas_price;
  } catch (error) {
    console.error(error);
  }

  return [formattedCurrentTime, priceResponse];
}

async function fetchIndex() {
  const formattedCurrentTime = await formatCurrentTime();

  let priceResponse;

  try {
    const doc = new GoogleSpreadsheet(process.env.SHEET_ID);
    await doc.useApiKey(process.env.GAPI_KEY);
    await doc.loadInfo();

    const sheet = await doc.sheetsByIndex[0];
    await sheet.loadCells("M50");
    const targetCell = await sheet.getCellByA1("M50");
    priceResponse = targetCell.value;
  } catch (error) {
    console.error(error);
  }

  return [formattedCurrentTime, priceResponse];
}

const getMedians = async (req, res, next) => {
  const medians = await GasMedian.find().select("timestamp price").exec();
  let theResults = [];
  for (let i = 0; i < medians.length; i++) {
    // if (i % 2 == 0) {
      theResults.push(medians[i]);
    // }
  }
    console.log("theResults", theResults)
    res.json(theResults);
};

const getIndex = async (req, res, next) => {
  const index = await Index.find().select("timestamp price").exec();
  let theResults = [];
  for (let i = 0; i < index.length; i++) {
    // if (i % 2 == 0) {
      theResults.push(index[i]);
    // }
  }
    console.log("theResults", theResults)
    res.json(theResults);
};

const getLatestIndex = async (req, res, next) => {
  const index = await Index.find().select("timestamp price").exec();

  res.json(index[index.length - 1]);
};

const getMedianRange = async (req, res, next) => {
    let currentTime = new Date();
    let earlierTime = currentTime - 259200000;

    const medians = await GasMedian.find(
        { timestamp: { $gte: earlierTime, $lte: currentTime} }
    ).select("timestamp price").exec();

    let theResults = [];
    for (let i = 0; i < medians.length; i++) {
    //   if (i % 2 == 0) {
        theResults.push(medians[i]);
    //   }
    }
    res.json(theResults);

  };

const getLatestMedian = async (req, res, next) => {
  const medians = await GasMedian.find().select("timestamp price").exec();

  res.json(medians[medians.length - 1]);
};

const getTwaps = async (req, res, next) => {
  const twaps = await Twap.find().select("timestamp price").exec();
  let theResults = [];
  for (let i = 0; i < twaps.length; i++) {
    // if (i % 2 == 0) {
      theResults.push(twaps[i]);
    // }
  }
  res.json(theResults);
};

const getTwapRange = async (req, res, next) => {
    let currentTime = new Date();
    let earlierTime = currentTime - 259200000;

    const twaps = await Twap.find(
        { timestamp: { $gte: earlierTime, $lte: currentTime} }
    ).select("timestamp price").exec();
    
    
    let theResults = [];
    for (let i = 0; i < twaps.length; i++) {
    //   if (i % 2 == 0) {
        theResults.push(twaps[i]);
    //   }
    }
    res.json(theResults);
  };

const getLatestTwap = async (req, res, next) => {
    const twaps = await Twap.find().select("timestamp price").exec();
    res.json(twaps[twaps.length - 1]);
  };

const twapCreation = async (req, res, next) => {
    let priceFeed;
    try {
      priceFeed = await TestingUniPriceFunctions.usePriceFeed();
    } catch (err) {
      console.log(err);
    }
    let price = priceFeed.getCurrentPrice().toString();
    let time = priceFeed.lastUpdateTime;
    time = time * 1000;
  
    const createdTwap = new Twap({
      timestamp: time,
      price: price,
    });
    console.log(createdTwap);
  
    await createdTwap.save();
  };

exports.createMedian = createMedian;
exports.getIndexFromSpreadsheet = getIndexFromSpreadsheet;
exports.getMedians = getMedians;
exports.getIndex = getIndex;
exports.getLatestIndex = getLatestIndex;
exports.getTwaps = getTwaps;
exports.getLatestMedian = getLatestMedian;
exports.twapCreation = twapCreation;
exports.getLatestTwap = getLatestTwap;
exports.getTwapRange = getTwapRange;
exports.getMedianRange = getMedianRange;
