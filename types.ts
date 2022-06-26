import { Context } from './deps.ts';

export type DefaultConfig = {
	port: number;

	meta: {
		title: string;
		description: string;
		image: string;
		url: string;
		theme: string;
		language: string;
		locale: string;
	};

	static: string[];

	filters: Record<string, (...args: any[]) => any>;

	sanity: {
		id?: string;
		dataset?: string;
		version?: string;
		token?: string;
		cdn: boolean;
	};

	deploy: {
		base: string;
	};

	framework: {
		template: string;
		source: string;
		components: string;
		pages: string;
		controllers: string;
	};

	cache: {
		timeout: number;
		directory: string;
	};

	log: {
		level: 'info' | 'debug';
	};
};

export type DefaultConfigGetters = {
	origin: string;
	origins_allowed: string[];
};

export type Config = DefaultConfig & DefaultConfigGetters;

export type Route = {
	path: string;
	page: string;
	controller?: RouteController;
};

export type RouteController = (context: Context) => Promise<{
	data: any;
	meta?: Record<string, string>;
}>;

export type RouteContext = Context & {
	params?: any;
};
