var path = require("path");

module.exports = {
  entry: path.join(__dirname, "start.ts"),
  output: {
    path: __dirname,
    filename: "test-app.js",
    publicPath: "./dist/"
  },
  devtool: "source-map",
  resolve: {
    extensions: ["", ".webpack.js", ".web.js", ".d.ts", ".ts", ".js"]
  },
  resolveLoader: {
    fallback: "/path/to/lib/node_modules"
  },
  module: {
    loaders: [
      {
        test: /\.ts$/,
        loader: "ts",
        query: {
          "compilerOptions": {
            "noEmit": false
          }
        }
      },
      {test: /\.css$/, loader: "style!css"},
      {test: /\.jpg$/, loader: "file-loader"},
      {test: /\.png$/, loader: "url-loader?mimetype=image/png"},
      {test: /\.monk$/, loader: 'monkberry-loader'}
    ]
  },
  externals: {
    "jquery": "jQuery"
  }
};
