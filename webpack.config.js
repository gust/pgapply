const nodeModules = require('webpack-node-externals');

module.exports = {
    resolve: {
        extensions: ['.ts', '.js']
    },
    entry: './src/main.ts',
    externals: [nodeModules()],
    target: 'node',
    output: {
        filename: 'main.js',
        path: __dirname + '/build'
    },
    module: {
        loaders: [
            {
                test: /\.ts$/,
                loader: 'awesome-typescript-loader'
            },
            {
                test: /\.sql$/,
                loader: 'raw-loader'
            }
        ]
    }
}
