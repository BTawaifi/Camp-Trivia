// webpack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  // Mode: 'development' or 'production'. Production enables optimizations.
  mode: process.env.NODE_ENV || 'development',

  // Entry point for the renderer process code
  entry: './src/renderer.js', // Your main renderer script

  // Output configuration
  output: {
    path: path.resolve(__dirname, 'dist'), // Output directory for the bundle
    filename: 'bundle.js', // The name of the bundled file
    publicPath: './', // Important for relative paths in Electron build
  },

  // Target: Important! Tells Webpack it's bundling for Electron's renderer process
  target: 'electron-renderer',

  // Devtool: Generate source maps for easier debugging
  devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'inline-source-map',

  // Module resolution rules (optional, defaults are usually fine)
  resolve: {
    extensions: ['.js'], // Files Webpack will look for
  },

  // Module rules (for handling different file types - not strictly needed for JS-only bundling)
  // module: {
  //   rules: [
  //     // Add loaders here if you need to handle CSS, images, etc., directly within JS
  //     // e.g., { test: /\.css$/, use: ['style-loader', 'css-loader'] },
  //   ],
  // },

  // Plugins
  plugins: [
    // Cleans the 'dist' folder before each build
    new CleanWebpackPlugin(),
    // Generates an index.html file from a template and injects the bundle
    new HtmlWebpackPlugin({
      template: './src/index.html', // Path to your source HTML template
      filename: 'index.html',      // Output HTML filename in the 'dist' folder
    }),
  ],

  // Optional: Configure a development server (less common for basic Electron)
  // devServer: { ... }
};