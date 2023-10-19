export class VAExprError extends Error {
	constructor(message?: string, options?: ErrorOptions) {
		super(message, options);
		this.name = this.constructor.name;
	}
}

export class VAParseError extends Error {
	constructor(message?: string, options?: ErrorOptions) {
		super(message, options);
		this.name = this.constructor.name;
	}
}

export class VABuildError extends Error {
	constructor(message?: string, options?: ErrorOptions) {
		super(message, options);
		this.name = this.constructor.name;
	}
}
