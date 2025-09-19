const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable error overlay and warnings in production
if (process.env.NODE_ENV === 'production') {
  config.resolver.platforms = ['ios', 'android', 'native'];
  
  // Remove web platform to avoid web-related errors
  config.resolver.platforms = config.resolver.platforms.filter(p => p !== 'web');
  
  // Minimize and remove debugging info
  config.transformer.minifierConfig = {
    keep_fnames: false,
    mangle: {
      keep_fnames: false,
    },
    compress: {
      drop_console: true,
      drop_debugger: true,
    }
  };
}

module.exports = config;