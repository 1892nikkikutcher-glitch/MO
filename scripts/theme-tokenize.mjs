import { readFileSync, writeFileSync } from "fs";

const files = process.argv.slice(2);

const rules = [
  // inset "well" panels (must run before bare bg-black)
  [/\bbg-black\/(?:40|50|60)\b/g, "bg-inset"],
  // input/panel solid fields (must run after the opacity variants above, and skip /70 overlay)
  [/\bbg-black\b(?!\/)/g, "bg-field"],

  // card surfaces
  [/\bbg-white\/5\b/g, "bg-surface"],
  [/\bbg-white\/10\b/g, "bg-surface2"],
  [/\bbg-white\/50\b/g, "bg-ink/50"],

  // borders
  [/\bborder-white\/(\d+)\b/g, "border-edge/$1"],
  [/\bborder-white\b(?!\/)/g, "border-edge"],
  [/\bdivide-white\/(\d+)\b/g, "divide-edge/$1"],

  // text + placeholder
  [/\btext-white\/(\d+)\b/g, "text-ink/$1"],
  [/\btext-white\b(?!\/)/g, "text-ink"],
  [/\bplaceholder-white\/(\d+)\b/g, "placeholder-ink/$1"],
  [/\bplaceholder-white\b(?!\/)/g, "placeholder-ink"],

  // accent (amber)
  [/\bamber-400\b/g, "accent"],
  [/\bamber-300\b/g, "accent"],

  // semantic
  [/\bemerald-400\b/g, "success"],
  [/\bemerald-500\b/g, "success"],
  [/\bemerald-300\b/g, "success"],
  [/\bred-400\b/g, "danger"],
  [/\bblue-400\b/g, "info"],
];

for (const file of files) {
  const original = readFileSync(file, "utf8");
  let text = original;
  for (const [pattern, replacement] of rules) {
    text = text.replace(pattern, replacement);
  }
  if (text !== original) {
    writeFileSync(file, text, "utf8");
    console.log("updated:", file);
  } else {
    console.log("no change:", file);
  }
}
