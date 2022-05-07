// Based on https://stackoverflow.com/a/65015868/865331
type CamelCase<S> = S extends `${infer P1}_${infer P2}${infer P3}`
	? `${P1}${Uppercase<P2>}${CamelCase<P3>}`
	: S
export type KeysToCamelCase<T> = {
	[K in keyof T as CamelCase<K>]: T[K] extends {} ? KeysToCamelCase<T[K]> : T[K]
}

function camelCase<S extends string>(key: S): CamelCase<S> {
	const [lead, ...parts] = key.split('_')
	return lead + parts.map(part => part.substring(0, 1).toUpperCase() + part.substring(1)).join('_') as CamelCase<S>
}
export function keysToCamelCase<T>(object: T): KeysToCamelCase<T> {
	return Object.fromEntries(Object.entries(object).map(([k, v]) => [camelCase(k), v])) as KeysToCamelCase<T>
}

type SnakeCase<S> = S extends string ? SnakeCaseHelper<['', S]> : S
type SnakeCaseHelper<Arr> =
	Arr extends [infer Acc, infer S] ? (
		Acc extends string ? (
			S extends string ? (
				S extends Lowercase<S> ? `${Acc}${S}` : SnakeCaseHelper<
					  (S extends `${infer P1}A${infer P3}` ? P1 extends Lowercase<P1> ? [`${Acc}${P1}_a`, P3] : never : never)
					| (S extends `${infer P1}B${infer P3}` ? P1 extends Lowercase<P1> ? [`${Acc}${P1}_b`, P3] : never : never)
					| (S extends `${infer P1}C${infer P3}` ? P1 extends Lowercase<P1> ? [`${Acc}${P1}_c`, P3] : never : never)
					| (S extends `${infer P1}D${infer P3}` ? P1 extends Lowercase<P1> ? [`${Acc}${P1}_d`, P3] : never : never)
					| (S extends `${infer P1}E${infer P3}` ? P1 extends Lowercase<P1> ? [`${Acc}${P1}_e`, P3] : never : never)
					| (S extends `${infer P1}F${infer P3}` ? P1 extends Lowercase<P1> ? [`${Acc}${P1}_f`, P3] : never : never)
					| (S extends `${infer P1}G${infer P3}` ? P1 extends Lowercase<P1> ? [`${Acc}${P1}_g`, P3] : never : never)
					| (S extends `${infer P1}H${infer P3}` ? P1 extends Lowercase<P1> ? [`${Acc}${P1}_h`, P3] : never : never)
					| (S extends `${infer P1}I${infer P3}` ? P1 extends Lowercase<P1> ? [`${Acc}${P1}_i`, P3] : never : never)
					| (S extends `${infer P1}J${infer P3}` ? P1 extends Lowercase<P1> ? [`${Acc}${P1}_j`, P3] : never : never)
					| (S extends `${infer P1}K${infer P3}` ? P1 extends Lowercase<P1> ? [`${Acc}${P1}_k`, P3] : never : never)
					| (S extends `${infer P1}L${infer P3}` ? P1 extends Lowercase<P1> ? [`${Acc}${P1}_l`, P3] : never : never)
					| (S extends `${infer P1}M${infer P3}` ? P1 extends Lowercase<P1> ? [`${Acc}${P1}_m`, P3] : never : never)
					| (S extends `${infer P1}N${infer P3}` ? P1 extends Lowercase<P1> ? [`${Acc}${P1}_n`, P3] : never : never)
					| (S extends `${infer P1}O${infer P3}` ? P1 extends Lowercase<P1> ? [`${Acc}${P1}_o`, P3] : never : never)
					| (S extends `${infer P1}P${infer P3}` ? P1 extends Lowercase<P1> ? [`${Acc}${P1}_p`, P3] : never : never)
					| (S extends `${infer P1}Q${infer P3}` ? P1 extends Lowercase<P1> ? [`${Acc}${P1}_q`, P3] : never : never)
					| (S extends `${infer P1}R${infer P3}` ? P1 extends Lowercase<P1> ? [`${Acc}${P1}_r`, P3] : never : never)
					| (S extends `${infer P1}S${infer P3}` ? P1 extends Lowercase<P1> ? [`${Acc}${P1}_s`, P3] : never : never)
					| (S extends `${infer P1}T${infer P3}` ? P1 extends Lowercase<P1> ? [`${Acc}${P1}_t`, P3] : never : never)
					| (S extends `${infer P1}U${infer P3}` ? P1 extends Lowercase<P1> ? [`${Acc}${P1}_u`, P3] : never : never)
					| (S extends `${infer P1}V${infer P3}` ? P1 extends Lowercase<P1> ? [`${Acc}${P1}_v`, P3] : never : never)
					| (S extends `${infer P1}W${infer P3}` ? P1 extends Lowercase<P1> ? [`${Acc}${P1}_w`, P3] : never : never)
					| (S extends `${infer P1}X${infer P3}` ? P1 extends Lowercase<P1> ? [`${Acc}${P1}_x`, P3] : never : never)
					| (S extends `${infer P1}Y${infer P3}` ? P1 extends Lowercase<P1> ? [`${Acc}${P1}_y`, P3] : never : never)
					| (S extends `${infer P1}Z${infer P3}` ? P1 extends Lowercase<P1> ? [`${Acc}${P1}_z`, P3] : never : never)
				>
			) : never
		) : never
	) : never
export type KeysToSnakeCase<T> = { [K in keyof T as SnakeCase<K>]: T[K] extends {} ? KeysToSnakeCase<T[K]> : T[K] }
function snakeCase<S extends string>(key: S): SnakeCase<S> {
	return key.replace(/[A-Z]/g, m => '_' + m.toLowerCase()) as SnakeCase<S>
}
export function keysToSnakeCase<T>(object: T): KeysToSnakeCase<T> {
	return Object.fromEntries(Object.entries(object).map(([k, v]) => [snakeCase(k), v])) as KeysToSnakeCase<T>
}

export type MapToIndex<T, Keys extends (keyof T)[]> = { [K in keyof Keys]: T[Keys[K] & keyof T] }
export type MapToPromise<T> = { [K in keyof T]: Promise<T[K]> }

export type KeyType<T extends Map<any, any>> = T extends Map<infer K, any> ? K : never
export type ValueType<T extends Map<any, any>> = T extends Map<any, infer V> ? V : never

function pad(number: number) {
	return number < 10 ? '0' + number : number
}

function pad1000(number: number) {
	return ('' + (1000 + number)).substring(1)
}

export function now() {
	const date = new Date()
	return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad1000(date.getMilliseconds())}`
}

export function parseDate(string: string) {
	// Observed: / for -
	// Observed: single space for T
	// Observed: double space for T
	// Not observed, just a precaution: surrounding spaces
	// Not observed, just a precaution: spaces around plus sign
	string = string.trim().replace(/\//g, '-').replace(/ *\+ */, '+').replace(/ +/, 'T')
	if (!string.includes('+'))
		string += '+09:00'
	return new Date(string)
}

export function parseTime(string: string) {
	const [hours, minutes, seconds] = string.split(/:/)
	return +seconds! * 1000 + +minutes! * 60000 + +hours! * 3600000
}
