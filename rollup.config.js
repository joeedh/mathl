import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'core/mathl.js',
  output: {
    file: 'bundle.js',
    format: 'iife',
    name : "JsGLSL"
  },
  plugins: [commonjs()]
};
