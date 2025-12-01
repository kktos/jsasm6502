export function getHex(val: number, length?: number) {
	let pad = 0;
	if (length === undefined) {
		if (val < 0x100) pad = 2;
		else if (val < 0x10000) pad = 4;
		else pad = 8;
	} else {
		pad = length;
	}
	return val.toString(16).toUpperCase().padStart(pad, "0");
}
