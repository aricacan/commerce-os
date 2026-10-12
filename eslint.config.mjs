import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Alt çizgiyle başlayan isimler "bilerek kullanılmıyor" demektir: imzası sabit
      // olan callback'lerde atlanan parametreler, yakalanmayan hatalar vb. Kod tabanı
      // bu kuralı zaten uyguluyordu (_args, _c), ama lint bunu bilmediği için gürültü
      // yapıyor ve gerçek kullanılmayan değişkenleri gölgeliyordu.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      // React 19 compiler kuralları effect içinde ilk değer yükleme ve event handler'da
      // ref kullanan geçerli desenleri de hatalı pozitif olarak işaretliyor. Bu iki
      // danışman kural mimari dönüşüm adımlarında profiler eşliğinde ele alınacak.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      // Türkçe kullanıcı metinlerindeki apostrof ve tırnaklar HTML açısından güvenlidir;
      // entity zorlamak okunabilirliği düşürüyor ve çalışma zamanı faydası sağlamıyor.
      "react/no-unescaped-entities": "off",
    },
  },
]);

export default eslintConfig;
