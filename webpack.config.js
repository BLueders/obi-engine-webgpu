const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  devtool: 'source-map',
  entry: './src/index.ts',
  mode: 'development',
  module: {
     rules: [
      {
        test: /\.(ts|tsx)$/,
        use: 'ts-loader',
        include: [path.resolve(__dirname, 'src')],
        exclude: /node_modules/,
      },
      {
        test: /\.wgsl$/i,
        loader: 'raw-loader',
     },
    ]
  },
  resolve: {
    extensions: ['.ts', '.js', 'tsx']
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  devServer:{
    static:{
      directory: path.resolve(__dirname, 'dist')
    },
    port: 3000,
    open: true,
    hot: true,
    compress: true,
    historyApiFallback: true,      
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Website',
      filename: 'index.html',
      template: 'src/template.html'
    }),
    new CopyPlugin({
      patterns: [
        { from: path.resolve(__dirname, 'src/shaders'), to: path.resolve(__dirname, 'dist/shaders'), noErrorOnMissing: true },
        { from: path.resolve(__dirname, 'src/assets'), to: path.resolve(__dirname, 'dist/assets'), noErrorOnMissing: true },
      ],
    }),
  ],
}