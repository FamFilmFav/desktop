const path = require('path');
const webpack = require('webpack');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

const isDev = process.env.NODE_ENV !== 'production';

module.exports = {
  mode: isDev ? 'development' : 'production',
  entry: {
    'app-home': './src/index.js',
    'app-settings': './src/settings.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    publicPath: '/',
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
            plugins: isDev ? ['react-refresh/babel'] : []
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  devtool: 'source-map',
  plugins: [
    ...(isDev ? [new ReactRefreshWebpackPlugin(), new webpack.HotModuleReplacementPlugin()] : [])
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    port: 8080,
    hot: true,
    devMiddleware: {
      publicPath: '/',
    },
    compress: true,
    historyApiFallback: true,
  },
};
