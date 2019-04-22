import { addGeneratedMetadata } from './metadata.generated'
import { TypeInfo } from './type-info';

export class Metadata {
	public static get(o: any): TypeInfo {
		const key: any = o === null ? null : o === undefined ? undefined : Object.getPrototypeOf(o);
		const typeInfo = Metadata.table.get(key);
		if (typeInfo === undefined)
			throw new Error('Metadata not found.');
		return typeInfo;
	}

	private static _table: Map<any, TypeInfo>;
	public static get table(): ReadonlyMap<any, TypeInfo> {
		return Metadata._table || (Metadata._table = Metadata.createMetadataMap());
	}

	private static createMetadataMap(): Map<any, TypeInfo> {
		const table = new Map<any, TypeInfo>();

		// add primitives, object, and array (primitive types listed in first sentence at https://www.typescriptlang.org/docs/handbook/basic-types.html#Object)
		table.set(null, new TypeInfo("null"/*, true*/));
		table.set(undefined, new TypeInfo("undefined"/*, true*/));
		for (let type of [ Number, String, Boolean, Symbol, Object, Array ])
			table.set(type.prototype, new TypeInfo(type.prototype.constructor.name));

		addGeneratedMetadata(table);
		
		return table;
	}
}