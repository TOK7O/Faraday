import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import globals from "globals";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["frontend/**/*.{ts,tsx}"],
    plugins: {
      react: reactPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off", // Not needed in React 17+ / React 19
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
);
