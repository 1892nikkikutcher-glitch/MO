const nextConfig = {
  // firebase-admin arrastra jwks-rsa -> jose (ESM puro); el bundler de
  // Next reescribe ese require() y provoca "ERR_REQUIRE_ESM" en runtime.
  // Al marcarlo externo, Next lo deja tal cual en node_modules y Node lo
  // resuelve solo, sin pasar por el bundler.
  serverExternalPackages: ["firebase-admin"],
  async headers() {
    return [
      {
        // La página de invitación de MO Conecta lleva el token en la URL —
        // sin Referrer-Policy, reenviarlo a un recurso externo (o incluso a
        // otra página de MO) filtraría el token completo en el header
        // Referer de esa siguiente petición.
        source: "/conecta/invite/:token*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
};

export default nextConfig;
