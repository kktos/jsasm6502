// rollup.config.mjs
import terser from '@rollup/plugin-terser';

export default {
	input: 'src/assembler.js',
	output: [
		{
			file: 'dist/libasm6502.js',
			plugins: [terser()]
		}
	]
};
