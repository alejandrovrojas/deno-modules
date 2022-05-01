import { log } from './util.ts';
import { oak_server, oak_router } from './dependencies.ts';
import { handle_get, handle_post, handle_static } from './handlers.ts';
import { routes, config } from './internal.ts';
import { route_development_websocket_endpoint, connect_development_frontend_watcher } from './watch.ts';

export const server = new oak_server();
export const router = new oak_router();

export function start_server() {
	route_development_websocket_endpoint(router);

	router.get('/style/(.*)', handle_static);
	router.get('/script/(.*)', handle_static);
	router.get('/assets/(.*)', handle_static);

	for (const route of routes) {
		router.get(route.path, context => handle_get(route, context));
		//router.post(route.path, context => handle_post(route, context));
	}

	server.use(router.routes());
	server.listen({ port: config.port });

	log(`port: ${config.port}`, 'blue');
	log(`origin: ${config.origin}`, 'blue');

	connect_development_frontend_watcher();
}