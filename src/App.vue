<template>
  <div id="app">
    <RouterView />
  </div>
</template>

<script>
export default {
  name: 'App',
}
</script>

<style>
/* 這是一個全域 Style 區塊，不要加上 "scoped"
  它將成為您專案中所有顏色的「唯一真實來源」
*/

/* 預設 (淺色模式) 的變數 */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-tertiary: #ffffff;
  --bg-gradient-header: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --bg-filter-section: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);

  --text-primary: #212529;
  --text-secondary: #6c757d;
  --text-on-accent: #ffffff;

  --border-primary: #dee2e6;
  --border-accent: #007bff;

  --input-bg: #ffffff;
  --input-border: #ced4da;

  --shadow-primary: rgba(0, 0, 0, 0.1);
}

/* 深色模式下，我們僅覆寫需要的變數 */
body.dark-mode {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --bg-tertiary: #3a3a3a;
  --bg-gradient-header: linear-gradient(135deg, #4b5563 0%, #374151 100%);
  --bg-filter-section: linear-gradient(135deg, #374151 0%, #1f2937 100%);

  --text-primary: #f8f9fa;
  --text-secondary: #adb5bd;

  --border-primary: #495057;
  --border-accent: #666666;

  --input-bg: #343a40;
  --input-border: #495057;

  --shadow-primary: rgba(0, 0, 0, 0.3);
}

/* 您也可以在這裡放一些全域的基礎樣式 */
body {
  color: var(--text-primary);
  transition: color 0.3s ease;
}
</style>
