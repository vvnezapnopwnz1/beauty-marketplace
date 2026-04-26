# Спецификация переноса ESLint и TypeScript type-check

Этот документ нужен для другого агента в другом проекте, чтобы перенести проверки линтинга и типизации с поведением, максимально близким к текущему проекту `plant-ui`.

## 1) Базовые версии и зависимости

Перенести (или подобрать максимально близкие) dev-зависимости:

- `eslint@^8.34.0`
- `@typescript-eslint/parser@^5.52.0`
- `@typescript-eslint/eslint-plugin@^5.52.0`
- `eslint-plugin-react-hooks@^4.6.0`
- `eslint-plugin-react-refresh@^0.4.4`
- `typescript@^4.9.5`

## 2) NPM/Yarn scripts (обязательно)

Добавить в `package.json`:

- `"typecheck": "tsc"`
- `"lint": "eslint --ext .ts,.tsx ."`
- `"lint:fix": "eslint --fix --ext .ts,.tsx ."`

Примечания:

- `typecheck` запускает только проверку типов (без генерации файлов), это контролируется `noEmit: true` в `tsconfig.json`.
- `lint` и `lint:fix` работают по всему репозиторию, но фактический скоуп ограничивается `--ext` и ignore-настройками.

## 3) ESLint конфиг

Создать файл `.eslintrc.cjs`:

```js
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'off',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-explicit-any': 'off',
  },
}
```

Ключевые моменты поведения:

- База правил: `eslint:recommended` + TS рекомендации + React Hooks.
- `any` разрешен (`@typescript-eslint/no-explicit-any: off`).
- Правило `react-refresh/only-export-components` выключено.
- Конфиг root-level (`root: true`) и не должен наследовать внешние родительские ESLint-конфиги.

## 4) ESLint ignore

Создать `.eslintignore`:

```text
build/*
public/*
src/react-app-env.d.ts
src/reportWebVitals.ts
src/service-worker.ts
src/serviceWorkerRegistration.ts
src/setupTests.ts
```

Также в самом `.eslintrc.cjs` есть `ignorePatterns: ['dist', '.eslintrc.cjs']`.

## 5) TypeScript конфиг (`tsconfig.json`)

Перенести/адаптировать:

```json
{
  "compilerOptions": {
    "ignoreDeprecations": "5.0",
    "rootDir": ".",
    "baseUrl": "./src/",
    "paths": {
      "@app/*": ["app/*"],
      "@shared/*": ["shared/*"],
      "@features/*": ["features/*"],
      "@entities/*": ["entities/*"],
      "@widgets/*": ["widgets/*"],
      "@pages/*": ["pages/*"]
    },
    "target": "ESNext",
    "lib": ["ES2020", "dom", "dom.iterable"],
    "strict": true,
    "noEmit": true,
    "allowJs": true,
    "module": "esnext",
    "jsx": "react-jsx",
    "skipLibCheck": true,
    "noImplicitAny": true,
    "noImplicitThis": false,
    "esModuleInterop": true,
    "isolatedModules": true,
    "strictNullChecks": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "noFallthroughCasesInSwitch": true,
    "useUnknownInCatchVariables": false,
    "allowSyntheticDefaultImports": true,
    "types": ["vite/client", "./src/global.d.ts"],
    "forceConsistentCasingInFileNames": false
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.tsx",
    "src",
    "src/global.d.ts",
    "craco.config.ts"
  ],
  "exclude": ["node_modules"]
}
```

## 6) Что адаптировать под новый проект

Обязательно проверить и скорректировать:

1. `compilerOptions.paths` под структуру нового проекта.
2. `types` (особенно `vite/client`, `global.d.ts`) под используемый стек.
3. `include` (например, если нет `craco.config.ts`).
4. `.eslintignore` под реальные служебные файлы нового проекта.

## 7) Проверка после переноса

После переноса в целевом проекте агент должен запустить:

1. `yarn lint`
2. `yarn typecheck`

Критерии успеха:

- Команды существуют и запускаются без ошибок конфигурации.
- Линтер и `tsc` анализируют ожидаемые файлы (нет случайного пропуска критичных директорий).
- Поведение правил соответствует этому проекту (в т.ч. разрешенный `any` и отключенный `react-refresh/only-export-components`).

## 8) Важное замечание по `package.json > eslintConfig`

В текущем проекте есть поле:

```json
"eslintConfig": { "extends": ["react-app"] }
```

Но основной рабочий конфиг задается через `.eslintrc.cjs` с `root: true`.  
При переносе рекомендуется использовать единый источник правды (обычно `.eslintrc.cjs`) и избегать дублирования настроек в `eslintConfig`, если в этом нет отдельной необходимости.
