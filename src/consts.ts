// Site-wide settings. Change the blog name, author or sections here.

export const SITE = {
  title: '莱昂哈特庄园',
  titleLatin: 'Leonhart Manor',
  description: '何俊颉的博客：机器人、控制与代码的学习笔记，项目手记，以及路上的随笔。',
  author: '何俊颉',
  authorLatin: 'HE Junjie',
  glyph: '何',
  homepage: 'https://leonhart999.github.io/',
  github: 'https://github.com/Leonhart999',
  email: '1425109609@qq.com',
  lang: 'zh-Hans',
};

// Post categories. Each one is a building on the estate map.
export const CATEGORY_KEYS = ['tech', 'projects', 'essays'] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const CATEGORIES: Record<CategoryKey, { name: string; hall: string; latin: string; motto: string; icon: string; spot: string; numeral: string }> = {
  tech: { name: '技术', hall: '缮写室', latin: 'Scriptorium', motto: '代码、算法与机器人的抄本', icon: 'quill', spot: 'scriptorium', numeral: '二' },
  projects: { name: '项目', hall: '工坊', latin: 'Workshop', motto: '做过的东西，和路上踩过的坑', icon: 'anvil', spot: 'workshop', numeral: '三' },
  essays: { name: '随笔', hall: '旅店', latin: 'The Inn', motto: '炉火边的闲谈与见闻', icon: 'tavern', spot: 'inn', numeral: '四' },
};

// Buildings on the estate map and where they lead (paths are relative to the site base).
export const SPOTS = [
  { spot: 'keep', numeral: '一', hall: '城堡', name: '归档', href: '/archive/' },
  { spot: 'scriptorium', numeral: '二', hall: '缮写室', name: '技术', href: '/category/tech/' },
  { spot: 'workshop', numeral: '三', hall: '工坊', name: '项目', href: '/category/projects/' },
  { spot: 'inn', numeral: '四', hall: '旅店', name: '随笔', href: '/category/essays/' },
  { spot: 'market', numeral: '五', hall: '集市', name: '标签', href: '/tags/' },
  { spot: 'rookery', numeral: '六', hall: '信鸦塔', name: '关于', href: '/about/' },
];

export const NAV = [
  { name: '首页', href: '/' },
  { name: '技术', href: '/category/tech/' },
  { name: '项目', href: '/category/projects/' },
  { name: '随笔', href: '/category/essays/' },
  { name: '归档', href: '/archive/' },
  { name: '标签', href: '/tags/' },
  { name: '关于', href: '/about/' },
];
