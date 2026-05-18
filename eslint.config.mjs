import next from "eslint-config-next";

const eslintConfig = [
  { ignores: ["postcss.config.mjs"] },
  ...next,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/incompatible-library": "off",
      "import/no-anonymous-default-export": "off",
    },
  },
];

export default eslintConfig;
