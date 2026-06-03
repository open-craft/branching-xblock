const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = function webpackConfig(_, argv) {
  const mode = argv.mode || "production";

  return {
    mode,
    target: ["web", "es5"],
    devtool: mode === "development" ? "source-map" : false,
    entry: {
      student: path.resolve(__dirname, "src/student/index.tsx"),
      studio: path.resolve(__dirname, "src/studio/index.tsx"),
    },
    output: {
      filename: "[name].js",
      path: path.resolve(__dirname, "../branching_xblock/static/bundles"),
      clean: true,
    },
    optimization: {
      minimizer: [
        new TerserPlugin({
          extractComments: false,
          terserOptions: { format: { comments: /@license|@preserve|^!/i } },
        }),
      ],
    },
    module: {
      rules: [
        {
          test: /\.[jt]sx?$/i,
          exclude: /node_modules/,
          use: {
            loader: "ts-loader",
            options: {
              compilerOptions: { noEmit: false },
              onlyCompileBundledFiles: true,
            },
          },
        },
        {
          test: /\.css$/i,
          use: [MiniCssExtractPlugin.loader, "css-loader"],
          sideEffects: true,
        },
        { test: /\.svg$/i, type: "asset/inline" },
      ],
    },
    resolve: { extensions: [".tsx", ".ts", ".jsx", ".js"] },
    plugins: [new MiniCssExtractPlugin({ filename: "[name].css" })],
    performance: false,
    stats: "minimal",
  };
};
