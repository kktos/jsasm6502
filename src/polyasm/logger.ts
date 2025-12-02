export class Logger {
	public enabled = true;
	private warnings: string[] = [];
	private errors: string[] = [];

	constructor(enabled = true) {
		this.enabled = enabled;
	}

	log(message: string): void {
		if (this.enabled) console.log(message);
	}

	warn(message: string): void {
		this.warnings.push(message);
		if (this.enabled) console.warn(message);
	}
	error(message: string): void {
		this.errors.push(message);
		console.error(message);
	}

	public getLogs() {
		return {
			warnings: this.warnings,
			errors: this.errors,
		};
	}
}
