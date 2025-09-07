const path = require('path');

// Her servis için webpack config oluşturan fonksiyon
function createServiceConfig(serviceName, entryFile) {
  return {
    target: 'node',
    mode: 'production',
    entry: path.resolve(__dirname, `services/${serviceName}/src/${entryFile}`),
    output: {
      path: path.resolve(__dirname, `services/${serviceName}/dist`),
      filename: 'index.js',
      libraryTarget: 'commonjs2',
      clean: true
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@digital-banking/commands': path.resolve(__dirname, 'shared/commands/src'),
        '@digital-banking/constants': path.resolve(__dirname, 'shared/constants/src'),
        '@digital-banking/events': path.resolve(__dirname, 'shared/events/src'),
        '@digital-banking/middleware': path.resolve(__dirname, 'shared/middleware/src'),
        '@digital-banking/models': path.resolve(__dirname, 'shared/models/src'),
        '@digital-banking/utils': path.resolve(__dirname, 'shared/utils/src'),
        '@digital-banking/errors': path.resolve(__dirname, 'shared/errors/src')
      }
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true, // Type checking'i atla, hızlı compile
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
      // AWS SDK ve runtime'ı bundle'a dahil etme
      '@aws-sdk/client-dynamodb': 'commonjs2 @aws-sdk/client-dynamodb',
      '@aws-sdk/lib-dynamodb': 'commonjs2 @aws-sdk/lib-dynamodb',
      '@aws-sdk/client-sns': 'commonjs2 @aws-sdk/client-sns',
      '@aws-sdk/client-sqs': 'commonjs2 @aws-sdk/client-sqs',
      'aws-lambda': 'commonjs2 aws-lambda'
    },
    stats: 'minimal'
  };
}

// Her servis için config'ler
module.exports = [
  createServiceConfig('ledger', 'index.ts'),
  createServiceConfig('accounts', 'index.ts'),
  createServiceConfig('banking', 'index.ts'),
  createServiceConfig('query', 'index.ts')
];
