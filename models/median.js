const mongoose = require('mongoose');

const medianSchema = new mongoose.Schema({
    timestamp: { type: Date, require: true },
    price: { type: Number, require: true}
});

module.exports = mongoose.model('GasMedian', medianSchema);