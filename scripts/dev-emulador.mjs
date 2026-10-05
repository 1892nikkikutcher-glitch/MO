// Servidor de desarrollo de MO apuntando a los emuladores locales de Firebase
// (ver scripts/emuladores.mjs) en vez de al proyecto real. Solo desarrollo:
// la variable NEXT_PUBLIC_USAR_EMULADORES no existe en Vercel.
//
//   npm run emuladores      (otra terminal, antes)
//   npm run dev:emulador

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const puerto = process.env.PORT ?? "3000";

const hijo = spawn("npx", ["next", "dev", "--turbopack", "-p", puerto], {
  cwd: raiz,
  env: { ...process.env, NEXT_PUBLIC_USAR_EMULADORES: "1" },
  stdio: "inherit",
  shell: true,
});
hijo.on("exit", (codigo) => process.exit(codigo ?? 0));
