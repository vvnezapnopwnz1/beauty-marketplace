const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const srcPath = path.resolve(__dirname, './src');

config.watchFolders = [srcPath];

config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, 'cjs'],
  alias: {
    '@app': path.resolve(__dirname, './src/app'),
    '@pages': path.resolve(__dirname, './src/pages'),
    '@features': path.resolve(__dirname, './src/features'),
    '@entities': path.resolve(__dirname, './src/entities'),
    '@shared': path.resolve(__dirname, './src/shared'),
    '@widgets': path.resolve(__dirname, './src/widgets'),
  },
};

module.exports = config;
