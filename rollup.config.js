// rollup.config.js
import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';

export default defineConfig([
	{
		output: {
			dir: 'dist',
			format: 'esm',
		},
		plugins: [typescript(), json(), terser()]
	}
]);
