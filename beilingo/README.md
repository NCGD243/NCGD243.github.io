# 龟虽寿 · 古诗背诵练习

原生 HTML、CSS 和 ES modules 实现的四阶段背诗练习，不依赖框架或构建工具。

## 启动

在仓库根目录运行：

```sh
python -m http.server 8000
```

然后打开 <http://localhost:8000/beilingo/>。也可以在 WebStorm 使用内置服务器，或在 VS Code 使用 Live Server。不要直接双击 `index.html`，浏览器会限制本地 ES modules。

## 学习流程

主页通过 `js/data/poems.json` 按年级显示诗篇目录。每个目录项的 `level` 和 `poem[].name` 对应 `js/data/{年级}/{诗名}/` 下的 `poem.json` 与 `exercise.json`；运行 `python beilingo/scripts/generate_poem_index.py` 可重新生成目录清单。鼠标悬停或键盘聚焦诗篇卡片时，应用读取对应的 `poem.json` 并显示诗歌信息；选中后读取同一目录的 `exercise.json`。各阶段、课程、题目数量和题目顺序均由题库 JSON 配置。题目类型包括跟读（`read`）、选项（`option`）、排序（`order`）和拼写（`spell`），每课所有题目都会出题；由课程的 `shuffle` 字段控制题目是否乱序，错题会在本课队尾最多重考 3 次。完成一个阶段的全部课程后，下一阶段立即解锁。答题状态和阶段进度按诗篇分别保存在浏览器 `localStorage` 中。

## 学习进度

若需重新从头验收，可在浏览器开发者工具的 Application/Storage 面板删除 `poem_app_state_gsz`。
