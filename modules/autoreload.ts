import type { RouteContext, RouteHandler, ServerClientOptions } from '../types.js';
import { debounce } from '../dependencies.ts';
import * as Utilities from '../util.ts';
import * as Env from '../env.ts';

export function Autoreload(options: ServerClientOptions) {
	const websockets: Set<WebSocket> = new Set();
	const websocket_endpoint = '/__autoreload';
	const websocket_reload_event = 'emit_reload';
	const websocket_reconnection_delay = 1000;
	const websocket_debounce_delay = 80;
	const websocket_client = `
		<script>
			(() => {
				let active_socket = null;
				let reconnection_timer = null;
				const websocket_url = window.location.origin.replace('http', 'ws') + '${websocket_endpoint}';

				function refresh_client() {
					window.location.reload();
				}

				function connect_websocket(refresh_callback) {
					if (active_socket) {
						active_socket.close();
					}

					active_socket = new WebSocket(websocket_url);
					active_socket.addEventListener('open', refresh_callback);
					active_socket.addEventListener('message', event => {
						if (event.data === '${websocket_reload_event}') {
							refresh_client();
						}
					});

					active_socket.addEventListener('close', () => {
						clearTimeout(reconnection_timer);
						reconnection_timer = setTimeout(() => {
							connect_websocket(refresh_client);
						}, ${websocket_reconnection_delay});
					});
				}

				connect_websocket();
			})();
		</script>`;

	function init() {
		if (Env.development_mode) {
			watch();
		}
	}

	function matches_html(html_template: string) {
		return /^<(html|!doctype html)>/i.test(html_template);
	}

	function inject_client(html_template: string): string {
		return html_template.replace('<head>', '<head>\n' + websocket_client);
	}

	async function middleware(context: RouteContext, next: RouteHandler) {
		const url = new URL(context.request.url);

		if (url.pathname === websocket_endpoint) {
			const { socket, response } = Deno.upgradeWebSocket(context.request);

			socket.onclose = () => {
				websockets.delete(socket);
			};

			websockets.add(socket);

			// Utilities.log('connected', 'autoreload');

			return response;
		} else {
			const next_response = await next(context);
			const next_response_text = await next_response.clone().text();

			if (matches_html(next_response_text)) {
				// Utilities.log(`client injected to ${url.pathname}`, 'autoreload');

				return new Response(inject_client(next_response_text), {
					headers: next_response.headers,
				});
			}

			return next_response;
		}
	}

	async function watch() {
		const watcher = Deno.watchFs(options.autoreload.watch_directory);

		Utilities.log(`watching files in ./${options.autoreload.watch_directory}`, 'autoreload', 'green');

		const trigger_websocket_response = debounce(() => {
			websockets.forEach(socket => {
				socket.send(websocket_reload_event);
			});

			Utilities.log(`reloaded`, 'autoreload', 'green');
		}, websocket_debounce_delay);

		for await (const event of watcher) {
			if (!['any', 'access'].includes(event.kind)) {
				trigger_websocket_response();
			}
		}
	}

	return {
		init,
		watch,
		middleware,
	};
}
