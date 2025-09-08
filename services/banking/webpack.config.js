const path = require('path');

module.exports = {
  target: 'node',
  mode: 'production',
  entry: path.resolve(__dirname, 'src/index.ts'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    libraryTarget: 'commonjs2',
    clean: true
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@digital-banking/commands': path.resolve(__dirname, '../../shared/commands/src'),
      '@digital-banking/config': path.resolve(__dirname, '../../shared/config/src'),
      '@digital-banking/constants': path.resolve(__dirname, '../../shared/constants/src'),
      '@digital-banking/events': path.resolve(__dirname, '../../shared/events/src'),
      '@digital-banking/middleware': path.resolve(__dirname, '../../shared/middleware/src'),
      '@digital-banking/models': path.resolve(__dirname, '../../shared/models/src'),
      '@digital-banking/utils': path.resolve(__dirname, '../../shared/utils/src'),
      '@digital-banking/errors': path.resolve(__dirname, '../../shared/errors/src')
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            compilerOptions: {
              target: 'ES2020',
              module: 'commonjs',
              moduleResolution: 'node',
              esModuleInterop: true,
              allowSyntheticDefaultImports: true,
              resolveJsonModule: true,
              noEmit: false
            }
          }
        },
        exclude: /node_modules/
      }
    ]
  },
  externals: {
    '@aws-sdk/client-dynamodb': 'commonjs2 @aws-sdk/client-dynamodb',
    '@aws-sdk/lib-dynamodb': 'commonjs2 @aws-sdk/lib-dynamodb',
    '@aws-sdk/client-sns': 'commonjs2 @aws-sdk/client-sns',
    '@aws-sdk/client-sqs': 'commonjs2 @aws-sdk/client-sqs',
    'aws-lambda': 'commonjs2 aws-lambda'
  },
  stats: 'minimal'
};
