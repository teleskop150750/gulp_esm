/* eslint-disable max-len */
// папка проекта
const distFolder = 'dist';
// сжатый проект
const minFolder = 'min';
// папка исходников
const srcFolder = 'src';
// файловая система
const fs = require('fs');

const {
  src, dest, parallel, series, watch,
} = require('gulp');

// пути
const path = {
  // проект
  build: {
    html: `${distFolder}/`,
    css: `${distFolder}/`,
    js: `${distFolder}/`,
    img: `${distFolder}/img/`,
    fonts: `${distFolder}/fonts/`,
  },
  // минифицированная версия
  minBuild: {
    html: `${minFolder}/`,
    css: `${minFolder}/`,
    js: `${minFolder}/`,
    img: `${minFolder}/img/`,
    fonts: `${minFolder}/fonts/`,
  },
  // исходники
  src: {
    html: `${srcFolder}/index.html`,
    css: `${srcFolder}/css/index.css`,
    js: `${srcFolder}/js/index.js`,
    img: `${srcFolder}/**/`,
    fonts: `${srcFolder}/fonts/`,
  },
  // отслеживание
  watch: {
    html: `${srcFolder}/**/*.html`,
    css: `${srcFolder}/**/*.scss`,
    js: `${srcFolder}/**/*.js`,
    img: `${srcFolder}/**/`,
  },
};

// модули и т.д.
// HTML
const htmlInclude = require('gulp-html-tag-include'); // объединение html
const htmlmin = require('gulp-htmlmin'); // min html
// CSS
const postcss = require('gulp-postcss'); // postcss
const scss = require('postcss-nested'); // позволяет использовать вложенность scss
const importcss = require('postcss-import'); // import css
const media = require('postcss-media-minmax'); // @media (width >= 320px) в @media (min-width: 320px)
const autoprefixer = require('autoprefixer'); // autoprefixer
const mqpacker = require('css-mqpacker'); // группирует @media
const prettier = require('gulp-prettier'); // prettier
const cssnano = require('cssnano'); // сжатие css
// JS
const fileInclude = require('gulp-file-include'); // подключение файлов (работает для всех)
const babel = require('gulp-babel'); // babel
const terser = require('gulp-terser'); // сжатие js
// IMG
const webp = require('gulp-webp'); // конвертация в webp
// FONTS
const ttf2woff2 = require('gulp-ttf2woff2'); // ttf2woff2
const fonter = require('gulp-fonter'); // otf2ttf
// работа с файлами
const del = require('del'); // удалить папки/файлы
const rename = require('gulp-rename'); // переименовать файл
const flatten = require('gulp-flatten'); // работа с путями к файлу
const browserSync = require('browser-sync'); // браузер

// HTML

const html = () => src(path.src.html)
  .pipe(htmlInclude()) // собироваем в один файл
  .pipe(dest(path.build.html))
  .pipe(browserSync.stream());

// CSS

const css = () => src(path.src.css)
  .pipe(
    postcss([
      importcss(), // собироваем в один файл
      scss(), // scss в css
      media(), // media  в старый формат
      mqpacker({
        sort: true,
      }), // группируем media
      autoprefixer(), // autoprefixer
    ]),
  )
  .pipe(prettier()) // форматирование кода
  .pipe(dest(path.build.css))
  .pipe(browserSync.stream());

// JS

const js = () => src(path.src.js)
  .pipe(fileInclude()) // собироваем в один файл
  .pipe(dest(path.build.js))

  .pipe(
    babel({
      presets: ['@babel/preset-env'],
    }),
  ) // babel
  .pipe(
    rename({
      extname: '.es5.js',
    }),
  )
  .pipe(dest(path.build.js))
  .pipe(browserSync.stream());

// min HTML CSS JS

const minHTML = () => src([`${path.build.html}*.html`]) // сжимаем css
  .pipe(
    htmlmin({
      removeComments: true,
      collapseWhitespace: true,
    }),
  )
  .pipe(dest(path.minBuild.html));

const minCSS = () => src([`${path.build.css}*.css`]) // сжимаем css
  .pipe(postcss([cssnano()]))
  .pipe(dest(path.minBuild.css));

const minJS = () => src([`${path.build.js}*.js`, `${path.build.js}*.es5.js`])
  .pipe(src([`${path.build.js}*.js`]))
  .pipe(terser())
  .pipe(dest(path.minBuild.js));

const copy = () => src([`${distFolder}/fonts/**/*`, `${distFolder}/img/**/*`], {
  base: distFolder,
})
  .pipe(dest(minFolder))
  .pipe(browserSync.stream());

// img

const img = (cb) => {
  fs.readdirSync(`${srcFolder}/blocks/`).forEach((block) => {
    src(`src/blocks/${block}/img/*.{jpg,png,}`)
      .on('data', (file) => {
        del(`${srcFolder}/blocks/${block}/img/${file.basename}`);
      })
      .pipe(
        webp({
          quality: 75, // Установите коэффициент качества между 0 и 100
          method: 4, // Укажите метод сжатия, который будет использоваться между 0(самым быстрым) и 6(самым медленным).
        }),
      )
      .pipe(dest(`${srcFolder}/blocks/${block}/img`))

      .pipe(src(`${path.src.img}*.webp`))
      .pipe(flatten()) // удалить относительный путь к картинке
      .pipe(dest(path.build.img));
  });
  cb();
};

// fonts

const ttf = () => src(`${path.src.fonts}*.ttf`)
  .on('data', (file) => {
    del(path.src.fonts + file.basename);
  })
  .pipe(ttf2woff2())
  .pipe(dest(path.src.fonts))

  .pipe(src(`${path.src.fonts}*.woff2`))
  .pipe(dest(path.build.fonts));

const otf = () => src(`${path.src.fonts}*.otf`)
  .on('data', (file) => {
    del(path.src.fonts + file.basename);
  })
  .pipe(
    fonter({
      formats: ['ttf'],
    }),
  )
  .pipe(dest(path.src.fonts));

// запись шрифтов в fonts.css
// файл должен быть изначально пустой
// в конце требуется откорректировать названиие шрифтов и их начертание

const fontsStyle = (cb) => {
  const fileContent = fs.readFileSync(`${srcFolder}/css/global/fonts.css`).toString(); // получаем содержимое файла
  // проверяем пустой ли файл
  if (fileContent === '') {
    fs.writeFileSync(`${srcFolder}/css/global/fonts.css`, '/* Fonts */\r\n\r\n'); // записываем заглавный комментарий
    let cFontName = ''; // копия названия файла (шрифта)
    // читаем содержимое папки
    fs.readdirSync(path.build.fonts).forEach((item) => {
      const fontName = item.split('.')[0]; // получаем имя файла (шрифта)
      // сравниваем с копияей, чтобы исключить повторы
      if (cFontName !== fontName) {
        fs.appendFileSync(
          `${srcFolder}/css/global/fonts.css`, // завписываем структуру подключения в файл
          `@font-face {
	font-family: '${fontName}';
	font-display: swap;
	src: url('../fonts/${fontName}.woff2') format('woff2');
	font-style: normal;
	font-weight: 400;
}\r\n\r\n`,
        );
      }
      cFontName = fontName;
    });
  }
  cb();
};

// clean dist

const clean = () => del(distFolder);

// clean min

const cleanMin = () => del(minFolder);

// syns

const browser = () => {
  browserSync.init({
    server: {
      baseDir: `./${distFolder}/`,
    },
    port: 3000,
    notify: false,
  });
};

// watch

const watchFiles = () => {
  watch(path.watch.html, html);
  watch(path.watch.css, css);
  watch(path.watch.js, js);
  watch(`${path.src.img}*.{jpg,png,}`, img);
  watch(`${path.src.fonts}*.{otf,ttf,}`, series(otf, ttf));
};

// cобрать проект
const build = series(clean, parallel(html, css, js, img, series(series(otf, ttf), fontsStyle)));
// запустить watcher и браузер
const watchBrowser = parallel(watchFiles, browser);

exports.default = series(build, watchBrowser);

exports.build = build;
exports.watchFiles = watchFiles;
exports.browser = browser;

exports.html = html;
exports.css = css;
exports.js = js;

exports.img = img;
exports.fonts = parallel(ttf, otf);
exports.fontsStyle = fontsStyle;

exports.clean = clean;
exports.cleanMin = cleanMin;

exports.min = series(cleanMin, parallel(minHTML, minCSS, minJS, copy));
