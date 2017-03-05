var config = require('./webpack.config.js');

config.entry = './spec/all-tests.js';
config.output = {
    filename: 'testBundle.js',
    path: __dirname + '/spec/output'
};

module.exports = config;
