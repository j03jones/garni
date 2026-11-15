// The address that links sent to other people (invites, shared recipes, sign-in and password-reset emails)
// point at. On the web that is wherever this page is served from. Inside the iOS / Android app (Capacitor)
// the page's own address is a private one on the phone (capacitor://localhost, https://localhost) that
// nobody else can open, so links point at the public web app instead.
export const PUBLIC_APP_URL = 'https://garni.page/';

const isNativeApp = () => !!globalThis.Capacitor?.isNativePlatform?.();

/** The base for links that leave this device, always ending in "/" or a page path (no "#"). */
export const appBase = () => (isNativeApp() ? PUBLIC_APP_URL : `${location.origin}${location.pathname}`);
