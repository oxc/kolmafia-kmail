import typescript from '@rollup/plugin-typescript';
import commonjs from "@rollup/plugin-commonjs";
import pkg from './package.json' assert { type: 'json' };

export default {
  input: 'src/kmail.ts',
  external: [
    ...Object.keys(pkg.dependencies)
  ],
  output: [
    {
      dir: 'types'
    },
    {
      file: pkg.main,
      format: 'cjs'
    },
    {
      file: pkg.module,
      format: 'es' // the preferred format
    },
  ],
  plugins: [
    typescript(), commonjs()
  ]
}
