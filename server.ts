import { log } from './util.ts';
import { oak_server, oak_router } from './dependencies.ts';
import { setup_config, setup_routes } from './setup.ts';
import { handle_get, handle_post, handle_static } from './handlers.ts';
import { route_development_websocket_endpoint, connect_development_frontend_watcher } from './watcher.ts';

export const server = new oak_server();
export const router = new oak_router();

export function start_server(api_config, api_meta, api_methods, api_routes) {
	globalThis.NANONETT = {
		config: setup_config(api_config),
		routes: setup_routes(api_routes),
		meta: api_meta,
		methods: api_methods,
	};

	route_development_websocket_endpoint(router);

	router.get('/style/(.*)', handle_static);
	router.get('/script/(.*)', handle_static);
	router.get('/assets/(.*)', handle_static);

	for (const route of NANONETT.routes) {
		router.get(route.path, context => handle_get(route, context));
		//router.post(route.path, context => handle_post(route, context));
	}

	server.use(router.routes());
	server.listen({ port: NANONETT.config.port });

	log(`port: ${NANONETT.config.port}`, 'blue');
	log(`origin: ${NANONETT.config.origin}`, 'blue');

	connect_development_frontend_watcher();
}
