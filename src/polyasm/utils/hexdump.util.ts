export function hexDump(address: number, bytes: number[]): string {
	const lines: string[] = [];
	const bytesPerLine = 16;

	for (let offset = 0; offset < bytes.length; offset += bytesPerLine) {
		const currentAddr = address + offset;
		const lineBytes = bytes.slice(offset, offset + bytesPerLine);

		// Address part
		const addrHex = currentAddr.toString(16).toUpperCase().padStart(4, "0");

		// Hex bytes part
		const hexParts: string[] = [];
		const asciiParts: string[] = [];

		for (let i = 0; i < bytesPerLine; i++) {
			if (i < lineBytes.length) {
				const byte = lineBytes[i];
				hexParts.push(byte.toString(16).toUpperCase().padStart(2, "0"));
				asciiParts.push(byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".");
			} else {
				// Padding for incomplete lines
				hexParts.push("  ");
				asciiParts.push(" ");
			}
		}

		const hexStr = hexParts.join(" ");
		const asciiStr = asciiParts.join("");

		lines.push(`${addrHex}:  ${hexStr}   ${asciiStr}`);
	}

	return lines.join("\n");
}
