export class VAExprError extends Error {
	constructor(message?: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "VAExprError";
	}
}

export class VAParseError extends Error {
	constructor(message?: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "VAParseError";
	}
}

export class VABuildError extends Error {
	constructor(message?: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "VABuildError";
	}
}
