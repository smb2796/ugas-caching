const mongoose = require('mongoose');

const twapSchema = new mongoose.Schema({
    timestamp: { type: Date, require: true },
    price: { type: Number, require: true}
});

module.exports = mongoose.model('GasTwap', twapSchema);