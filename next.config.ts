const nextConfig = {
  // firebase-admin arrastra jwks-rsa -> jose (ESM puro); el bundler de
  // Next reescribe ese require() y provoca "ERR_REQUIRE_ESM" en runtime.
  // Al marcarlo externo, Next lo deja tal cual en node_modules y Node lo
  // resuelve solo, sin pasar por el bundler.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
