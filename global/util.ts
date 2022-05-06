import { flags_parse, path_join } from './dependencies.ts';

export const in_development = flags_parse(Deno.args).mode === 'development';

export function log(message: string, color: string = ''): void {
	console.log('%c' + `[${new Date().toISOString().replace('T', ' ').slice(0, 19)}] → ${message}`, `color:${color}`);
}

export function type_of(value: any): string {
	return Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
}

export function deep_merge(a: Record<string, any>, b: Record<string, any>) {
	const c: Record<string, any> = { ...a };

	for (const key in b) {
		const value_a = a[key];
		const value_b = b[key];
		const type_a = type_of(a[key]);
		const type_b = type_of(b[key]);

		if (type_a === 'array' && type_b === 'array') {
			c[key] = [...value_a, ...value_b]
		} else if (type_a === 'object' && type_b === 'object') {
			c[key] = deep_merge(value_a, value_b);
		} else {
			c[key] = value_b;
		}
	}

	return c;
}
