declare module '@hapi/bourne' {
	export function parse(text: string, reviver?: (this: any, key: string, value: any) => any, options?: {
		protoAction?: 'error' | 'remove' | 'ignore'
	}): any
	export function parse(text: string, options: {
		protoAction?: 'error' | 'remove' | 'ignore'
	}): any
	export function scan<T extends object>(obj: T, options?: {
		protoAction?: 'error' | 'remove'
	}): T
}
