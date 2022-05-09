import type { Route, RouteContext } from '../types.ts';
import { render } from '../deps.ts';
import { log, in_development } from '../util.ts';
import { Autoreload } from './autoreload.ts';

export function Routing(setup: Record<string, any>) {
	const autoreload = Autoreload(setup);
	const { fullpath } = setup.methods;

	async function handle_get(route: Route, context: RouteContext) {
		/**
		 *
		 * 	read main template and page files, then render using Nano.
		 *
		 * */

		// just ignore automatic favicon.ico requests (!)
		if (context.request.url.pathname === '/favicon.ico') {
			context.response.status = 200;
		}

		const { request, response } = context;
		const { template_main, template_pages } = await load_templates();

		let route_meta = {};
		let route_data = {};

		const route_page = template_pages[route.page];
		const route_controller = route.controller;

		if (route_page === undefined) {
			log(`routing error: ${route_page} is undefined`, 'red');
		}

		if (route_controller !== undefined) {
			const controller_result = await route_controller(context);

			if (controller_result !== undefined) {
				route_meta = controller_result.meta || {};
				route_data = controller_result.data || {};
			}
		}

		const route_render_data = {
			$dev: in_development,
			$request: request,
			$meta: merge_meta_object(route_meta, request.url),
			$data: route_data,
			...route_data,
		};

		let rendered_page = template_pages[route.page];
		let rendered_app = template_main;

		try {
			rendered_page = await render_template(template_pages[route.page], route_render_data);
			rendered_app = await render_template(
				template_main.replace('<!--PAGE-->', rendered_page),
				route_render_data
			);
		} catch (error) {
			rendered_app = template_main.replace('<body>', `<body><pre>${error.message}</pre>`);
			response.status = 500;
			log('rendering error: ' + error.message, 'red');
		}

		if (in_development) {
			response.body = autoreload.inject(rendered_app);
		} else {
			response.body = rendered_app;
		}

		function merge_meta_object(route_meta: object, route_url: URL) {
			const computed_meta = {
				url: setup.config.origin + route_url.pathname,
			};

			return {
				...setup.config.meta,
				...route_meta,
				...computed_meta,
			};
		}

		function render_template(template: string, data: any) {
			const filters = setup.config.filters;
			const options = {
				import_path: setup.config.framework.components,
			};

			return render(template, data, filters, options);
		}

		async function load_templates() {
			async function load_main_template() {
				return Deno.readTextFile(fullpath([setup.config.framework.template]));
			}

			async function load_page_templates() {
				const pages: Record<string, string> = {};

				for await (const page of Deno.readDir(fullpath([setup.config.framework.pages]))) {
					pages[page.name] = await Deno.readTextFile(fullpath([setup.config.framework.pages, page.name]));
				}

				return pages;
			}

			return {
				template_main: await load_main_template(),
				template_pages: await load_page_templates(),
			};
		}
	}

	async function handle_post(route: Route, context: RouteContext): Promise<void> {
		/**
		 *
		 * 	return the same data from the controller as json.
		 * 	this essentially turns each page's content into an API.
		 *
		 * */

		const { response } = context;

		let route_data = {};

		if (route.controller !== undefined) {
			const controller_result = await route.controller(context);
			route_data = controller_result.data || {};
		}

		response.headers = new Headers({ 'content-type': 'application/json' });
		response.body = JSON.stringify(route_data);
	}

	async function handle_static(context: RouteContext): Promise<void> {
		/**
		 *
		 * 	serve static files
		 *
		 * */

		try {
			await context.send({
				root: fullpath([setup.config.framework.source]),
			});
		} catch (error) {
			log('routing error: ' + error.message, 'red');
		}
	}

	return {
		handle_get,
		handle_post,
		handle_static,
	};
}
