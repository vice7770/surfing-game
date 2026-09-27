declare const __BUILD_ID__: string | undefined;

/** The build this page came from (the Vite config stamps it; 'dev' elsewhere). A room only takes players on its own build. */
export const BUILD_ID: string = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';
