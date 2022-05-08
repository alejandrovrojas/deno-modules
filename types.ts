import { Context } from './deps.ts';

export type Route = {
	path: string;
	page: string;
	controller?: RouteController;
};

export type RouteController = (context: Context) => Promise<{
	meta: Record<string, string>;
	data: any;
}>;

export type RouteContext = Context & {
	params?: any;
};
