// Levanta los emuladores locales de Firebase (Auth, Firestore, Storage) para
// probar MO sin tocar producción:
//
//   npm run emuladores      (en una terminal)
//   npm run dev:emulador    (en otra) -> http://localhost:3000, con cuenta y datos de prueba
//
// El emulador de Firestore es Java y en Windows falla al abrir su socket
// interno de loopback si la carpeta temporal tiene espacios en la ruta (ej.
// "C:\Users\NOMBRE APELLIDO\...") — "Unable to establish loopback
// connection". Se arregla dándole a la JVM una carpeta temporal corta.

import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = { ...process.env };

if (process.platform === "win32") {
  const temporal = "C:\\jtmp";
  mkdirSync(temporal, { recursive: true });
  env.JAVA_TOOL_OPTIONS = `-Djava.io.tmpdir=${temporal} -Djdk.net.unixdomain.tmpdir=${temporal}`;
}

// Proyecto "demo-": los emuladores nunca intentan hablar con servicios reales.
const hijo = spawn(
  "npx",
  ["firebase", "emulators:start", "--only", "auth,firestore,storage", "--project", "demo-mo-local"],
  { cwd: raiz, env, stdio: "inherit", shell: true }
);
hijo.on("exit", (codigo) => process.exit(codigo ?? 0));
