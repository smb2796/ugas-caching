// This module generates transport objects for the winston logger to push messages to. Primarily this module separates
// the logic for reading in state environment variables from the logger itself. All Winston transport objects and their
// associated formatting are created within this module.

// Transport objects
const ConsoleTransport = require("./ConsoleTransport");

// Transports array to store all winston transports.
let transports = [];

  // Add a console transport to log to the console.
transports.push(ConsoleTransport.createConsoleTransport());

module.exports = { transports };