module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-typescript', { 
      allowDeclareFields: true,
      onlyRemoveTypeImports: true,
      allowNamespaces: true
    }],
  ],
  plugins: [
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    ['@babel/plugin-proposal-class-properties', { loose: true }],
    '@babel/plugin-transform-runtime',
  ],
};