declare global {
  interface Window {
    cookieStore: CookieStore; // Or the specific type of cookieStore if known
  }
}
