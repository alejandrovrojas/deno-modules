import {
	Application,
	Router,
	Context,
	Request,
	Response,
	render,
	path_join,
	path_parse,
} from '../global/dependencies.ts';

import { log, deep_merge, in_development } from '../global/util.ts';
import { default_setup } from '../config/defaults.ts';
import { start_file_watcher, route_file_watcher, inject_file_watcher_client } from './watch.ts';

type RouteContext = Context & {
	params?: any;
};

type RouteController = (context: Context) => Promise<{
	meta: Record<string, string>;
	data: any;
}>;

type Route = {
	path: string;
	page: string;
	controller?: RouteController;
};

let server_setup: Record<string, any> = default_setup;

async function handle_get_request(route: Route, context: RouteContext): Promise<void> {
	/**
	 *
	 * 	read main template and page files, then render using Nano.
	 * 	this step will also merge the default meta object with the
	 * 	user defined object.
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
		log(`${route_page} is undefined`);
	}

	if (route_controller !== undefined) {
		const controller_result = await route_controller(context);

		route_meta = controller_result.meta || {};
		route_data = controller_result.data || {};
	}

	const route_render_data = {
		$request: request,
		$meta: merge_meta_object(route_meta, request.url),
		$data: route_data,
		...route_data,
	};

	try {
		const rendered_page = await render_template(template_pages[route.page], route_render_data);
		const rendered_app = await render_template(
			template_main.replace('<!--CURRENT_PAGE-->', rendered_page),
			route_render_data
		);

		if (in_development) {
			response.body = inject_file_watcher_client(rendered_app);
		} else {
			response.body = rendered_app;
		}
	} catch (error) {
		log('rendering error: ' + error.message, 'red');
		response.body = error.message;
		return;
	}

	function merge_meta_object(route_meta: object, route_url: URL) {
		const computed_meta = {
			url: server_setup.origin + route_url.pathname,
		};

		return {
			...server_setup.meta,
			...route_meta,
			...computed_meta,
		};
	}

	function render_template(template: string, data: any) {
		const filters = server_setup.filters;
		const options = {
			show_comments: server_setup.show_comments,
			import_path: server_setup.framework.components,
		};

		return render(template, data, filters, options);
	}

	async function load_templates() {
		async function load_main_template() {
			return Deno.readTextFile(server_setup.framework.template);
		}

		async function load_page_templates() {
			const pages: Record<string, string> = {};

			for await (const page of Deno.readDir(server_setup.framework.pages)) {
				pages[page.name] = await Deno.readTextFile(`${server_setup.framework.pages}${page.name}`);
			}

			return pages;
		}

		return {
			template_main: await load_main_template(),
			template_pages: await load_page_templates(),
		};
	}
}

async function handle_post_request(route: Route, context: RouteContext): Promise<void> {
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

async function handle_static_files(context: RouteContext): Promise<void> {
	/**
	 *
	 * 	serve static files
	 *
	 * */

	try {
		await context.send({
			root: path_join(Deno.cwd(), server_setup.framework.source),
		});
	} catch (error) {
		log('router error: ' + error.message, 'red');
	}
}

function new_server(setup: object, routes: Route[]) {
	server_setup = deep_merge(default_setup, setup);

	function setup_server() {
		const server = new Application();

		return {
			instance: server,

			route: (router_instance: Router) => {
				for (const route of routes) {
					router_instance.get(route.path, (context: RouteContext) => handle_get_request(route, context));
				}

				server.use(router_instance.routes());
			},

			start: () => {
				log(`port: ${server_setup.port}`, 'blue');
				log(`origin: ${server_setup.origin}`, 'blue');

				if (server_setup.sanity) {
					log(`id: ${server_setup.sanity.id}`, 'blue');
					log(`dataset: ${server_setup.sanity.dataset}`, 'blue');
				}

				server.listen({ port: server_setup.port });

				start_file_watcher();
			},
		};
	}

	function setup_router() {
		const router = new Router();

		route_file_watcher(router);

		for (const route of server_setup.static) {
			router.get(route, handle_static_files);
		}

		return router;
	}

	return {
		server: setup_server(),
		router: setup_router(),
	};
}

export { log, new_server, in_development };
