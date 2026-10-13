# Lists · 待辦事項 Web App

純前端待辦應用：HTML、Tailwind CSS、原生 JavaScript。資料存在瀏覽器 Local Storage，重新整理後不會消失。

## 使用方式

用瀏覽器直接開啟 `index.html`，或在專案目錄啟動靜態伺服器：

```bash
npx --yes serve .
```

## 功能

- 預設清單：待辦清單、購物清單
- 自訂清單：新增、重新命名、刪除
- 所有清單／單一清單切換
- 事項：名稱、普通／緊急、截止日期、所屬清單
- 完成勾選、編輯 Modal、刪除確認與消失動畫

## 推到 GitHub

```bash
git add .
git commit -m "Add local-storage todo web app"
gh repo create todo-web-app --public --source=. --remote=origin --push
```
