import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Prohibir console.log en producción
      "no-console": ["warn", { allow: ["error", "warn"] }],
      // Tipos explícitos en funciones públicas
      "@typescript-eslint/explicit-function-return-type": "off",
      // No any
      "@typescript-eslint/no-explicit-any": "error",
      // No non-null assertion
      "@typescript-eslint/no-non-null-assertion": "warn",
    },
  },
];

export default eslintConfig;
