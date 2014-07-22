declare module Tree14 {
	/**
	 * A readable dataset
	 */
	interface RDataset {
		getPath(): string;
		getId(): string;
		reqId(): string;
		getIdAsInt(): number;
		reqIdAsInt(): number;
		getIndex(): number;
		reqIndex(): number;
		/**
		 * @param level Default value is 1
		 * @returns Tree14.RDataset|Tree14.Dataset A Dataset or NULL when level is upper than the root parent
		 */
		getParent(level?: number): any;
		/**
		 * @param relPath (optional) A relative path (string)
		 * @returns Array An ordered list of children. Always an array. An empty array is returned when relPath doesn't exists or doesn't contains an array
		 */
		toList(relPath?: string): any[];
		each(relPath: string, cb: Function): void;
		each(cb: Function): void;
		toPojo(relPath?: string): any;
		toJsonStr(): string;
		/**
		 * @param relPathOrIndex
		 * @returns any The value (a simple type or a Dataset), or undefined if not found
		 */
		get(relPathOrIndex: any): any;
		/**
		 * Same as get() but throws an error if undefined
		 */
		req(relPathOrIndex: any): any;
		isEmpty(relPath?: string): boolean;
		has(relPath: string): boolean;
		/**
		 * <pre>
		 * {
		 * 	'select': 'hotels[]',
		 * 	'where': [
		 * 		{
		 * 			'select': 'features[]',
		 * 			'whereListIs': {
		 * 				'supersetOf': fList
		 * 			}
		 * 		},
		 * 		{
		 * 			//'select': '{products}[]{helloWorld}{}',
		 * 			'whereDescendantExists': {
		 * 				'type': 'string',
		 * 				'contains': this.text
		 * 			}
		 * 		},
		 * 		{
		 * 			'select': '{products}[]{helloWorld}{}',
		 * 			'whereExists': [
		 * 				{
		 * 					'select': 'features[]',
		 * 					'where': [...]
		 * 				}
		 * 			]
		 * 		}
		 * 	]
		 * }
		 * </pre>
		*/
		query(query: {}): QueryResult;
		/**
		 * The callback receives a map that describes the changes, like this:
		 * <pre>
		 * {
		 * 	'the.relative.path1': 'U',
		 * 	'the.relative.path2': 'A'
		 * }</pre>
		 * The values associated to relative paths can be: 'I' insert, 'U' update, 'D' delete, 'A' any
		 * @param cb
		 */
		addChangeListener(cb: Function): Function;
		/**
		 * The callback receives a map that describes the changes, like this:
		 * <pre>
		 * {
		 * 	'the.relative.path1': 'U',
		 * 	'the.relative.path2': 'A'
		 * }</pre>
		 * The values associated to relative paths can be: 'I' insert, 'U' update, 'D' delete, 'A' any
		 * @param cb
		 */
		addTopChangeListener(cb: Function): Function;
		/**
		 * The callback receives a map that describes the changes, like this:
		 * <pre>
		 * {
		 * 	'the.relative.path1': 'U',
		 * 	'the.relative.path2': 'A'
		 * }</pre>
		 * The values associated to relative paths can be: 'I' insert, 'U' update, 'D' delete, 'A' any
		 * @param cb
		 */
		addDeepChangeListener(cb: Function): Function;
	}

	interface Dataset extends RDataset {
		disengageListeners(): void;
		fireListeners(): void;
		toReadOnly(): RDataset;
		inc(relPath: string): number;
		dec(relPath: string): number;
		rm(relPath?): boolean;
		detach(): void;
		put(relPath: string, data, recursCreate?): string;
		reset(data): void;
		orderedInsert(relPath: string, data, index?: number): void;
		setChildIndices(indices: number[]): void;
		/**
		 * Available only on map
		 * @param id
		 * @param cb The callback receives the parent RDataset as parameter
		 */
		putComputedProperty(id: string, cb: Function): void;
	}

	interface QueryResult {
		toList(): any[]
		each(cb: Function): void;
	}

	/**
	 *
	 * @param jsonObjOrArr Array|Object
	 * @param opt Object {'indexedMapProp': '_index'}
	 * @returns {Tree14.Dataset}
	 */
	function createDataset(jsonObjOrArr, opt?: {}): Dataset;
}
