import { Context, Request, Response } from './dependencies.ts';

export { Request as ContextRequest, Response as ContextResponse };

export type Meta = {
	title?: string;
	description?: string;
	image?: string;
	url?: string;
	theme?: string;
	lang?: string;
	locale?: string;
}

export type RouteContext = Context & {
	params?: any;
};

export type RouteController = (context: Context) => Promise<{
	data?: any;
	meta?: Meta;
}>;

export type Route = {
	path: string;
	page: string;
	controller: RouteController;
};
