
module.exports = {
  env: {
    es6: true,
    node: true,
  },

  parserOptions: {
    ecmaVersion: 2022,
  },

  extends: [
    "eslint:recommended",
    "google",
  ],

  rules: {
    "require-jsdoc": "off",
    "max-len": ["error", {code: 100}],
    "no-constant-condition": ["error", {checkLoops: false}],

    // Match the existing double-quote style in your Functions code.
    "quotes": ["error", "double", {avoidEscape: true}],
  },

  overrides: [
    {
      files: ["**/*.spec.*"],
      env: {
        mocha: true,
      },
      rules: {},
    },
  ],

  globals: {},
};
