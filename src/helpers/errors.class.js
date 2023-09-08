export class VAExprError extends Error {
	constructor(...params) {
		super(...params);
		this.name = this.constructor.name;
	}
}

export class VAParseError extends Error {
	constructor(...params) {
		super(...params);
		this.name = this.constructor.name;
	}
}

export class VABuildError extends Error {
	constructor(...params) {
		super(...params);
		this.name = this.constructor.name;
	}
}
