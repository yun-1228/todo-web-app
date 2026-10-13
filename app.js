const STORAGE_KEY = "todo-web-app:v1";

const DEFAULT_LISTS = [
  { id: "list-todo", name: "待辦清單 (To-Do)", builtin: true },
  { id: "list-shopping", name: "購物清單 (Shopping)", builtin: true },
];

const seedState = () => ({
  lists: [...DEFAULT_LISTS],
  tasks: [
    {
      id: "task-1",
      listId: "list-todo",
      title: "整理本週行程",
      priority: "urgent",
      dueDate: todayOffset(1),
      completed: false,
      createdAt: Date.now() - 86400000,
    },
    {
      id: "task-2",
      listId: "list-todo",
      title: "回覆課堂作業問題",
      priority: "normal",
      dueDate: todayOffset(3),
      completed: false,
      createdAt: Date.now() - 43200000,
    },
    {
      id: "task-3",
      listId: "list-shopping",
      title: "補充牛奶與水果",
      priority: "normal",
      dueDate: todayOffset(0),
      completed: false,
      createdAt: Date.now() - 7200000,
    },
  ],
});

const store = {
  read() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return seedState();
      const parsed = JSON.parse(raw);
      if (!parsed.lists?.length || !Array.isArray(parsed.tasks)) return seedState();
      return parsed;
    } catch {
      return seedState();
    }
  },
  write(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },
  createList(name) {
    const state = this.read();
    const list = { id: uid("list"), name: name.trim(), builtin: false };
    state.lists.push(list);
    this.write(state);
    return list;
  },
  renameList(id, name) {
    const state = this.read();
    const list = state.lists.find((item) => item.id === id);
    if (!list || list.builtin) return;
    list.name = name.trim();
    this.write(state);
  },
  deleteList(id) {
    const state = this.read();
    const list = state.lists.find((item) => item.id === id);
    if (!list || list.builtin) return;
    state.lists = state.lists.filter((item) => item.id !== id);
    state.tasks = state.tasks.filter((task) => task.listId !== id);
    this.write(state);
  },
  createTask(payload) {
    const state = this.read();
    const task = { id: uid("task"), completed: false, createdAt: Date.now(), ...payload };
    state.tasks.unshift(task);
    this.write(state);
    return task;
  },
  updateTask(id, payload) {
    const state = this.read();
    const task = state.tasks.find((item) => item.id === id);
    if (!task) return;
    Object.assign(task, payload);
    this.write(state);
  },
  deleteTask(id) {
    const state = this.read();
    state.tasks = state.tasks.filter((item) => item.id !== id);
    this.write(state);
  },
};

const ui = {
  currentListId: "all",
  confirmAction: null,

  init() {
    if (!localStorage.getItem(STORAGE_KEY)) store.write(store.read());
    this.bind();
    this.render();
  },

  bind() {
    qs("#open-sidebar").addEventListener("click", () => this.toggleSidebar(true));
    qs("#close-sidebar").addEventListener("click", () => this.toggleSidebar(false));
    qs("#sidebar-backdrop").addEventListener("click", () => this.toggleSidebar(false));
    qs("#new-list-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const input = qs("#new-list-name");
      const name = input.value.trim();
      if (!name) return;
      const list = store.createList(name);
      input.value = "";
      this.currentListId = list.id;
      this.render();
    });
    qs("#open-add-task").addEventListener("click", () => this.openTaskModal());
    qs("#close-modal").addEventListener("click", () => qs("#task-modal").close());
    qs("#cancel-modal").addEventListener("click", () => qs("#task-modal").close());
    qs("#task-form").addEventListener("submit", (event) => this.saveTask(event));
    qs("#cancel-confirm").addEventListener("click", () => qs("#confirm-modal").close());
    qs("#ok-confirm").addEventListener("click", () => {
      this.confirmAction?.();
      qs("#confirm-modal").close();
    });
  },

  toggleSidebar(open) {
    qs("#sidebar").classList.toggle("open", open);
    qs("#sidebar-backdrop").hidden = !open;
  },

  render() {
    const { lists, tasks } = store.read();
    this.renderNav(lists, tasks);
    this.renderHeader(lists, tasks);
    this.renderTasks(lists, tasks);
  },

  renderNav(lists, tasks) {
    const nav = qs("#list-nav");
    const allCount = tasks.filter((task) => !task.completed).length;
    const items = [
      { id: "all", name: "所有清單 (All Lists)", count: allCount },
      ...lists.map((list) => ({
        ...list,
        count: tasks.filter((task) => task.listId === list.id && !task.completed).length,
      })),
    ];

    nav.innerHTML = items
      .map((item) => {
        const active = item.id === this.currentListId ? "active" : "";
        const custom = item.builtin === false;
        return `<div class="mb-1">
          <button class="nav-item ${active}" data-select="${item.id}">
            <span class="truncate">${escapeHtml(item.name)}</span>
            <span class="nav-count">${item.count}</span>
          </button>
          ${
            custom
              ? `<div class="flex gap-2 px-3 pb-2">
                  <button class="text-[11px] text-white/50 hover:text-white" data-rename="${item.id}">重新命名</button>
                  <button class="text-[11px] text-white/50 hover:text-white" data-delete-list="${item.id}">刪除</button>
                </div>`
              : ""
          }
        </div>`;
      })
      .join("");

    nav.querySelectorAll("[data-select]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.currentListId = btn.dataset.select;
        this.toggleSidebar(false);
        this.render();
      });
    });
    nav.querySelectorAll("[data-rename]").forEach((btn) => {
      btn.addEventListener("click", () => this.renameList(btn.dataset.rename));
    });
    nav.querySelectorAll("[data-delete-list]").forEach((btn) => {
      btn.addEventListener("click", () => this.confirmDeleteList(btn.dataset.deleteList));
    });
  },

  renderHeader(lists, tasks) {
    const list = lists.find((item) => item.id === this.currentListId);
    const visible = this.visibleTasks(tasks);
    const remaining = visible.filter((task) => !task.completed).length;
    qs("#view-kicker").textContent = list ? "單一清單" : "集中檢視";
    qs("#view-title").textContent = list ? list.name : "所有清單 (All Lists)";
    qs("#view-meta").textContent = `${remaining} 項待辦 · 共 ${visible.length} 筆`;
  },

  renderTasks(lists, tasks) {
    const listEl = qs("#task-list");
    const visible = this.visibleTasks(tasks).sort(sortTasks);
    qs("#empty-state").hidden = visible.length > 0;
    listEl.innerHTML = visible
      .map((task) => {
        const list = lists.find((item) => item.id === task.listId);
        const showList = this.currentListId === "all";
        return `<article class="task-card ${task.completed ? "done" : ""}" data-id="${task.id}">
          <label class="cursor-pointer">
            <input type="checkbox" class="accent-ink w-5 h-5" ${task.completed ? "checked" : ""} data-toggle="${task.id}" />
          </label>
          <div>
            <p class="task-title">${escapeHtml(task.title)}</p>
            <div class="flex flex-wrap gap-2 mt-2">
              ${showList ? `<span class="badge badge-list">${escapeHtml(list?.name || "未分類")}</span>` : ""}
              <span class="badge ${task.priority === "urgent" ? "badge-urgent" : "badge-normal"}">
                ${task.priority === "urgent" ? "緊急 Urgent" : "普通 Normal"}
              </span>
              ${task.dueDate ? `<span class="badge badge-list">截止 ${task.dueDate}</span>` : ""}
            </div>
          </div>
          <div class="flex gap-2">
            <button class="ghost-btn !px-3 !py-2 text-sm" data-edit="${task.id}">編輯</button>
            <button class="danger-btn !px-3 !py-2 text-sm" data-delete="${task.id}">刪除</button>
          </div>
        </article>`;
      })
      .join("");

    listEl.querySelectorAll("[data-toggle]").forEach((input) => {
      input.addEventListener("change", () => {
        store.updateTask(input.dataset.toggle, { completed: input.checked });
        this.render();
      });
    });
    listEl.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => this.openTaskModal(btn.dataset.edit));
    });
    listEl.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", () => this.confirmDeleteTask(btn.dataset.delete));
    });
  },

  visibleTasks(tasks) {
    if (this.currentListId === "all") return tasks;
    return tasks.filter((task) => task.listId === this.currentListId);
  },

  openTaskModal(taskId) {
    const { lists, tasks } = store.read();
    const task = tasks.find((item) => item.id === taskId);
    qs("#task-id").value = task?.id || "";
    qs("#modal-title").textContent = task ? "編輯事項" : "新增事項";
    qs("#task-title").value = task?.title || "";
    qs("#task-priority").value = task?.priority || "normal";
    qs("#task-due").value = task?.dueDate || "";
    qs("#task-list").innerHTML = lists
      .map((list) => `<option value="${list.id}">${escapeHtml(list.name)}</option>`)
      .join("");
    const fallback = this.currentListId === "all" ? lists[0]?.id : this.currentListId;
    qs("#task-list").value = task?.listId || fallback;
    qs("#task-modal").showModal();
    qs("#task-title").focus();
  },

  saveTask(event) {
    event.preventDefault();
    const id = qs("#task-id").value;
    const payload = {
      title: qs("#task-title").value.trim(),
      priority: qs("#task-priority").value,
      dueDate: qs("#task-due").value || null,
      listId: qs("#task-list").value,
    };
    if (!payload.title) return;
    if (id) store.updateTask(id, payload);
    else store.createTask(payload);
    qs("#task-modal").close();
    this.render();
  },

  renameList(id) {
    const list = store.read().lists.find((item) => item.id === id);
    if (!list) return;
    const next = prompt("重新命名清單", list.name);
    if (!next?.trim()) return;
    store.renameList(id, next);
    this.render();
  },

  confirmDeleteList(id) {
    const list = store.read().lists.find((item) => item.id === id);
    this.askConfirm(`確定刪除「${list?.name}」及其所有事項？`, () => {
      store.deleteList(id);
      if (this.currentListId === id) this.currentListId = "all";
      this.render();
    });
  },

  confirmDeleteTask(id) {
    this.askConfirm("確定刪除這筆事項？", () => {
      const card = document.querySelector(`[data-id="${id}"]`);
      if (card) {
        card.classList.add("leaving");
        setTimeout(() => {
          store.deleteTask(id);
          this.render();
        }, 180);
      } else {
        store.deleteTask(id);
        this.render();
      }
    });
  },

  askConfirm(message, action) {
    qs("#confirm-message").textContent = message;
    this.confirmAction = action;
    qs("#confirm-modal").showModal();
  },
};

function qs(selector) {
  return document.querySelector(selector);
}

function uid(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function todayOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function sortTasks(a, b) {
  if (a.completed !== b.completed) return a.completed ? 1 : -1;
  if (a.priority !== b.priority) return a.priority === "urgent" ? -1 : 1;
  return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

ui.init();
