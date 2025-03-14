import type { BaseDict } from "./basedict.class";
import type { TDict } from "./base.type";

export const MARKERS = Symbol("markers");

export class MarkerDict<T extends TDict> {
	constructor(private base: BaseDict<T>) {}

	add(mark: number) {
		let markers = this.base.get(MARKERS) as number[];
		if (!markers) {
			markers = [];
			this.base.set(MARKERS, markers as T);
		}
		markers.push(mark);
		// console.log("addMarker",{ns:this.currentName, markers});
	}

	findClosest(target: number, distance: number) {
		let markers = this.base.get(MARKERS) as number[];
		if (!markers) {
			markers = [];
			this.base.set(MARKERS, markers as T);
		}
		// log("findClosestMarker",{ns:this.currentName, markers, target, distance});

		let pos = markers.findIndex((marker) => marker > target);

		// log("findClosestMarker",{pos});

		if (pos < 0) {
			if (distance > 0) return null;
			pos = markers.length - 1;
		} else pos = distance < 0 ? pos + distance : pos - 1 + distance;

		// console.log("findClosestMarker",{pos});
		// console.log("findClosestMarker",{marker: markers[pos]});

		return markers[pos];
	}
}
