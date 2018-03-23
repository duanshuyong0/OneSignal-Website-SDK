import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import amd from 'rollup-plugin-amd';
import sourcemaps from 'rollup-plugin-sourcemaps';
import nodent from 'rollup-plugin-nodent';
import babel from 'rollup-plugin-babel';
import uglify from 'rollup-plugin-uglify';
import replace from 'rollup-plugin-replace';
import analyze from 'rollup-analyzer-plugin'

setBuildEnvironment();

function setBuildEnvironment() {
  switch (process.env.ENV) {
    case "development":
    case "staging":
    case "production":
      break;
    default:
      process.env.ENV = "development";
  }

  console.log("Build Environment:", process.env.ENV);
}

const ROLLUP_ANALYZE_OPTIONS = {
  limit: 1000,
  filter: [],
  root: __dirname
}

const PRODUCTION_JS_PLUGINS = [
  nodent({
    promises: true,
    noRuntime: true
  }),
  uglify({
    sourceMap: true,
    compress: {
      drop_console: true,
      drop_debugger: true,
    },
    mangle: {
      reserved: [
        'AlreadySubscribedError',
        'InvalidArgumentError',
        'InvalidStateError',
        'NotSubscribedError',
        'PermissionMessageDismissedError',
        'PushNotSupportedError',
        'PushPermissionNotGrantedError',
        'SdkInitError',
        'TimeoutError'
      ]
    },
    output: {
      comments: false
    }
  }),
  analyze(ROLLUP_ANALYZE_OPTIONS),
];

const JS_PLUGINS = [
  replace({
    __DEV__: process.env.ENV === 'development',
    __TEST__: !!process.env.TESTS,
    __STAGING__: process.env.ENV === 'staging',
    __VERSION__: process.env.npm_package_config_sdkVersion,
    __PROCESSED_WITH_ROLLUP__: true,
    __SRC_STYLESHEETS_MD5_HASH__: "x",
  }),
  resolve(),
  commonjs(),
  amd(),
  sourcemaps(),
  babel({
    exclude: 'node_modules/**',
    presets: [
      [
        "es2015",
        {
          "modules": false
        }
      ]
    ],
    plugins: [
      // "external-helpers",
      "transform-object-rest-spread",
    ],
    babelrc: false,
  }),
].concat(
  process.env.ENV === "production" ?
    PRODUCTION_JS_PLUGINS :
    []
);

const SHARED_JS_BUILD_OPTIONS = {
  output: {
    format: 'iife',
    sourceMap: true,
  },
  sourceMap: true,
  plugins: JS_PLUGINS,
  treeshake: {
    pureExternalModules: true,
    propertyReadSideEffects: false,
  }
};

const BUILD_TARGETS = [
  /* Page SDK */
  {
    ...SHARED_JS_BUILD_OPTIONS,
    input: `build/ts-to-es6/src/entries/sdk.js`,
    output: {
      ...SHARED_JS_BUILD_OPTIONS.output,
      file: 'build/bundles/sdk.js',
      name: 'OneSignal',
    },
  },
  /* Service Worker */
  {
    ...SHARED_JS_BUILD_OPTIONS,
    input: `build/ts-to-es6/src/entries/worker.js`,
    output: {
      ...SHARED_JS_BUILD_OPTIONS.output,
      file: 'build/bundles/worker.js',
      name: 'OneSignalWorker',
    },
  },
];

export default BUILD_TARGETS;
