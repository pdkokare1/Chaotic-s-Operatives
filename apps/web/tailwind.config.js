const path = require("path");

/** @type {import('tailwindcss').Config} */
module.exports = {
  // We use path.join(__dirname, ...) to ensure Tailwind looks for files 
  // relative to THIS config file, not the root of the monorepo.
  content: [
    path.join(__dirname, "app/**/*.{js,ts,jsx,tsx,mdx}"),
    path.join(__dirname, "components/**/*.{js,ts,jsx,tsx,mdx}"),
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
