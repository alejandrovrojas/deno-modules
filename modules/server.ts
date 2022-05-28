import type { Route, RouteContext } from '../types.ts';
import { Application, Router } from '../deps.ts';
import { log } from '../util.ts';
import { Setup } from './setup.ts';
import { Autoreload } from './autoreload.ts';
import { Routing } from './routing.ts';

export function Server(user_config: Record<any, any>, user_routes: Route[]) {
	const setup = Setup(user_config);
	const autoreload = Autoreload(setup);
	const routing = Routing(setup);

	function setup_server() {
		const server = new Application();

		return {
			instance: server,

			route: (router_instance: Router) => {
				for (const route of user_routes) {
					router_instance.get(route.path, (context: RouteContext) => routing.handle_get(route, context));
				}

				server.use(router_instance.routes());
			},

			start: () => {
				log(`port: ${setup.config.server_port}`, 'blue');
				log(`origin: ${setup.config.origin}`, 'blue');

				if (setup.config.sanity.id && setup.config.sanity.dataset) {
					log(`id: ${setup.config.sanity.id}`, 'blue');
					log(`dataset: ${setup.config.sanity.dataset}`, 'blue');
				}

				server.listen({ port: setup.config.server_port });
				autoreload.start();
			},
		};
	}

	function setup_router() {
		const router = new Router();

		autoreload.route(router);

		for (const route of setup.config.static) {
			router.get(route, routing.handle_static);
		}

		return router;
	}

	return {
		server: setup_server(),
		router: setup_router(),
	};
}
