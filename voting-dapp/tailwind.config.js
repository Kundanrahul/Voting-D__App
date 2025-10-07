/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
  "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
  "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
],
  theme: {
    extend: {keyframes: {
      "pulse-glow": {
        "0%, 100%": { boxShadow: "0 0 20px 2px rgba(99,102,241,0.6)" },
        "50%": { boxShadow: "0 0 30px 4px rgba(99,102,241,0.9)" },
      },
    },
    animation: {
      "pulse-glow": "pulse-glow 2s ease-in-out infinite",
    },
  },},
  plugins: [],
};
