export type Route =
  | { name: 'map' }
  | { name: 'world'; worldId: string }
  | { name: 'journal' }
  | { name: 'notFound'; path: string };

/** Parse a location hash into a route. An unknown path yields `notFound`. */
export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, '');
  const path = raw.replace(/^\/+/, '').replace(/\/+$/, '');
  if (path === '') return { name: 'map' };
  const segments = path.split('/');
  switch (segments[0]) {
    case 'thread':
      return { name: 'map' };
    case 'journal':
      return { name: 'journal' };
    case 'world':
      return segments[1] ? { name: 'world', worldId: segments[1] } : { name: 'notFound', path };
    default:
      return { name: 'notFound', path };
  }
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'map':
      return '#/';
    case 'journal':
      return '#/journal';
    case 'world':
      return `#/world/${route.worldId}`;
    case 'notFound':
      return `#/${route.path}`;
  }
}
