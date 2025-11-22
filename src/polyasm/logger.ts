export class Logger {
	public enabled = true;

	constructor(enabled = true) {
		this.enabled = enabled;
	}

	log(message: string): void {
		if (this.enabled) console.log(message);
	}

	warn(message: string): void {
		if (this.enabled) console.warn(message);
	}
	error(message: string): void {
		console.error(message);
	}
}
