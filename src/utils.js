let hextab= ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F'];

export const hexPrefix= '$';
export const pcSymbol= '*';
export const commentChar=';';

export function getHexByte(v) {
	return ''+hextab[(v>>4)&0x0f]+hextab[v&0x0f];
}

export function getHexWord(v) {
	return ''+hextab[(v>>12)&0x0f]+hextab[(v>>8)&0x0f]+hextab[(v>>4)&0x0f]+hextab[v&0x0f];
}

export function compile(ctx, addr, b) {
	addr&= 0xffff;
	const segment= ctx.segments[ctx.currentSegment];
	const code= ctx.code[ctx.currentSegment];
	code[addr - segment.start]= b;
}

export function setSegmentOrigin(ctx, org) {
	if(!ctx.currentSegment)
		return "no segment defined";

	const segment= ctx.segments[ctx.currentSegment];
	if(org<segment.start || org>segment.end)
		return `ORG out of segment bounds [$${getHexWord(segment.start)} $${getHexWord(segment.end)}]`;

	ctx.codeStart= org;// - segment.start;
}
