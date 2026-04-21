// routes
import { ROUTES } from './routes';

export const HOST_API_KEY_MIDDLEWARE = import.meta.env.VITE_BACKEND_APP_LINK_MIDDLEWARE;

export const IS_DEV = import.meta.env.MODE === 'development';

/** ST stand: when true, certain menu items (QC backlog, RFI, Job card, etc.) are hidden */
export const IS_ST = import.meta.env.VITE_IS_ST === 'true';
export const LAST_VERSION = '1748416819969';


export const AUTH_API = {
  url: import.meta.env.VITE_KEYCLOAK_URL,
  realm: import.meta.env.VITE_REALM_NAME,
  body: {
    grant_type: import.meta.env.VITE_KEYCLOAK_AUTH_TYPE,
    client_id: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
    client_secret: import.meta.env.VITE_KEYCLOAK_CLIENT_SECRET,
  },
};

export const MAP_API = import.meta.env.VITE_MAPBOX_API;

export const ICONIFY_API_URL =
  import.meta.env.VITE_ICONIFY_API_URL || 'https://iconify-plant-dev.ctr-hub.com';
// APP

export const RELEASE_VERSION = import.meta.env.VITE_VERSION || '1.2.1';
export const PATH_AFTER_LOGIN = ROUTES.DASHBOARD;

// LAYOUT

export const HEADER = {
  H_MOBILE: 64,
  H_MAIN_DESKTOP: 88,
  H_DASHBOARD_DESKTOP: 40,
  H_DASHBOARD_DESKTOP_OFFSET: 92 - 32,
};

export const NAV = {
  W_BASE: 260,
  W_LARGE: 320,
  W_DASHBOARD: 280,
  W_DASHBOARD_MINI: 88,
  //
  H_DASHBOARD_ITEM: 48,
  H_DASHBOARD_ITEM_SUB: 36,
  //
  H_DASHBOARD_ITEM_HORIZONTAL: 32,
};

export const ICON = {
  NAV_ITEM: 24,
  NAV_ITEM_HORIZONTAL: 22,
  NAV_ITEM_MINI: 22,
};
