
export function getHexByte(val) {
	return val.toString(16).toUpperCase().padStart(2,"0");
}

export function getHexWord(val) {
	return val.toString(16).toUpperCase().padStart(4,"0");
}

export function high(val) {
	return (val>>8) & 0xFF;
}

export function low(val) {
	return val & 0xFF;
}
