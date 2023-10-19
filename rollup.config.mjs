// rollup.config.mjs
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

export default [
	{
		input: './dist/js/assembler.js',
		output:
			{
				file: 'dist/libasm6502.js',
				plugins:[
					typescript(),
					terser()
				]
			}
	}
];
