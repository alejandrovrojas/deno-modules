import { log } from './util.ts';
import { in_development_mode, config } from './internal.ts';
import { debounce } from './dependencies.ts';

const websocket_endpoint = '/__autoreload';
const websocket_trigger = 'trigger_refresh';
const websocket_reconnection_delay = 1000;

const websockets: Set<WebSocket> = new Set();

export function route_development_websocket_endpoint(router_instance: any) {
	if (in_development_mode) {
		router_instance.get(websocket_endpoint, async (context: any) => {
			const socket = await context.upgrade();

			websockets.add(socket);
			// log(`added socket: ${websockets.size}`);

			socket.onclose = () => {
				websockets.delete(socket);
				// log(`deleted socket: ${websockets.size}`);
			};
		});
	}
}

export async function connect_development_frontend_watcher() {
	if (in_development_mode) {
		const watcher = Deno.watchFs(config.watch);
		const trigger_websocket_response = debounce(() => {
			websockets.forEach(socket => {
				log(`reloaded page`, 'yellow');
				socket.send(websocket_trigger);
			});
		}, 80);

		for await (const event of watcher) {
			if (!['any', 'access'].includes(event.kind)) {
				trigger_websocket_response();
			}
		}
	}
}

export const browser_websocket_client = `<script>
	(() => {
		let socket = null;
		let reconnection_timer = null;

		const websocket_url = window.location.origin.replace('http', 'ws') + '${websocket_endpoint}';

		function refresh_client() {
			window.location.reload();
		}

		function connect_websocket(callback) {
			if (socket) {
				socket.close();
			}

			socket = new WebSocket(websocket_url);
			socket.addEventListener('open', callback);
			socket.addEventListener('message', event => {
				if (event.data === '${websocket_trigger}') {
					refresh_client();
				}
			});

			socket.addEventListener('close', () => {
				clearTimeout(reconnection_timer);
				reconnection_timer = setTimeout(() => {
					connect_websocket(refresh_client);
				}, ${websocket_reconnection_delay});
			});
		}

		connect_websocket();
	})();
</script>`;
