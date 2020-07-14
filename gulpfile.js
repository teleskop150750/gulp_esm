/* eslint-disable max-len */

// модули и т.д.
import gulp from 'gulp'; // gulp
import fs from 'fs';
// HTML
import htmlInclude from 'gulp-html-tag-include'; // объединение html
import htmlmin from 'gulp-htmlmin'; // min html
// CSS
import postcss from 'gulp-postcss'; // postcss
import scss from 'postcss-nested'; // позволяет использовать вложенность scss
import importcss from 'postcss-import'; // import css
import media from 'postcss-media-minmax'; // @media (width >= 320px) в @media (min-width: 320px)
import autoprefixer from 'autoprefixer'; // autoprefixer
import mqpacker from 'css-mqpacker'; // группирует @media
import prettier from 'gulp-prettier'; // prettier
import cssnano from 'cssnano'; // сжатие css
// JS
import fileInclude from 'gulp-file-include'; // подключение файлов (работает для всех)
import babel from 'gulp-babel'; // babel
import terser from 'gulp-terser'; // сжатие js
// IMG
import webp from 'gulp-webp'; // конвертация в webp
// FONTS
import ttf2woff2 from 'gulp-ttf2woff2'; // ttf2woff2
import fonter from 'gulp-fonter'; // otf2ttf
// работа с файлами
import del from 'del'; // удалить папки/файлы
import rename from 'gulp-rename'; // переименовать файл
import flatten from 'gulp-flatten'; // работа с путями к файлу
import browserSync from 'browser-sync'; // браузер

const {
  src, dest, parallel, series, watch,
} = gulp;

// папка проекта
const distFolder = 'dist';
// сжатый проект
const minFolder = 'min';
// папка исходников
const srcFolder = 'src';
// файловая система

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

// HTML

export const html = () => src(path.src.html)
  .pipe(htmlInclude()) // собироваем в один файл
  .pipe(dest(path.build.html))
  .pipe(browserSync.stream());

// CSS

export const css = () => src(path.src.css)
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

export const js = () => src(path.src.js)
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

// img

export const img = (cb) => {
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

export const ttf = () => src(`${path.src.fonts}*.ttf`)
  .on('data', (file) => {
    del(path.src.fonts + file.basename);
  })
  .pipe(ttf2woff2())
  .pipe(dest(path.src.fonts))

  .pipe(src(`${path.src.fonts}*.woff2`))
  .pipe(dest(path.build.fonts));

export const otf = () => src(`${path.src.fonts}*.otf`)
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

export const fontsStyle = (cb) => {
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

export const fonts = series(ttf, otf, fontsStyle);

// min HTML CSS JS

export const minHTML = () => src([`${path.build.html}*.html`]) // сжимаем css
  .pipe(
    htmlmin({
      removeComments: true,
      collapseWhitespace: true,
    }),
  )
  .pipe(dest(path.minBuild.html));

export const minCSS = () => src([`${path.build.css}*.css`]) // сжимаем css
  .pipe(postcss([cssnano()]))
  .pipe(dest(path.minBuild.css));

export const minJS = () => src([`${path.build.js}*.js`, `${path.build.js}*.es5.js`])
  .pipe(src([`${path.build.js}*.js`]))
  .pipe(terser())
  .pipe(dest(path.minBuild.js));

export const copy = () => src([`${distFolder}/fonts/**/*`, `${distFolder}/img/**/*`], {
  base: distFolder,
})
  .pipe(dest(minFolder))
  .pipe(browserSync.stream());

// clean dist

export const clean = () => del(distFolder);

// clean min

const cleanMin = () => del(minFolder);

// syns

export const browser = () => {
  browserSync.init({
    server: {
      baseDir: `./${distFolder}/`,
    },
    port: 3000,
    notify: false,
  });
};

// watch

export const watchFiles = () => {
  watch(path.watch.html, html);
  watch(path.watch.css, css);
  watch(path.watch.js, js);
  watch(`${path.src.img}*.{jpg,png,}`, img);
  watch(`${path.src.fonts}*.{otf,ttf,}`, series(otf, ttf));
};

export const build = series(
  clean,
  parallel(
    html,
    css,
    js,
    img,
    series(
      otf,
      ttf,
      fontsStyle,
    ),
  ),
);

export const watchBrowser = parallel(watchFiles, browser);
export const min = series(cleanMin, parallel(minHTML, minCSS, minJS, copy));

export default series(build, watchBrowser);
