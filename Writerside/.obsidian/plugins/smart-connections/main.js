var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// ../vec_lite/vec_lite.js
var require_vec_lite = __commonJS({
  "../vec_lite/vec_lite.js"(exports2, module2) {
    var VecLite2 = class {
      constructor(config) {
        this.config = {
          file_name: "embeddings-3.json",
          folder_path: ".vec_lite",
          exists_adapter: null,
          mkdir_adapter: null,
          read_adapter: null,
          rename_adapter: null,
          stat_adapter: null,
          write_adapter: null,
          ...config
        };
        this.file_name = this.config.file_name;
        this.folder_path = config.folder_path;
        this.file_path = this.folder_path + "/" + this.file_name;
        this.embeddings = false;
      }
      async file_exists(path) {
        if (this.config.exists_adapter) {
          return await this.config.exists_adapter(path);
        } else {
          throw new Error("exists_adapter not set");
        }
      }
      async mkdir(path) {
        if (this.config.mkdir_adapter) {
          return await this.config.mkdir_adapter(path);
        } else {
          throw new Error("mkdir_adapter not set");
        }
      }
      async read_file(path) {
        if (this.config.read_adapter) {
          return await this.config.read_adapter(path);
        } else {
          throw new Error("read_adapter not set");
        }
      }
      async rename(old_path, new_path) {
        if (this.config.rename_adapter) {
          return await this.config.rename_adapter(old_path, new_path);
        } else {
          throw new Error("rename_adapter not set");
        }
      }
      async stat(path) {
        if (this.config.stat_adapter) {
          return await this.config.stat_adapter(path);
        } else {
          throw new Error("stat_adapter not set");
        }
      }
      async write_file(path, data) {
        if (this.config.write_adapter) {
          return await this.config.write_adapter(path, data);
        } else {
          throw new Error("write_adapter not set");
        }
      }
      async load(retries = 0) {
        try {
          const embeddings_file = await this.read_file(this.file_path);
          this.embeddings = JSON.parse(embeddings_file);
          console.log("loaded embeddings file: " + this.file_path);
          return true;
        } catch (error) {
          if (retries < 3) {
            console.log("retrying load()");
            await new Promise((r) => setTimeout(r, 1e3 + 1e3 * retries));
            return await this.load(retries + 1);
          }
          console.log("failed to load embeddings file, prompt user to initiate bulk embed");
          return false;
        }
      }
      async init_embeddings_file() {
        if (!await this.file_exists(this.folder_path)) {
          await this.mkdir(this.folder_path);
          console.log("created folder: " + this.folder_path);
        } else {
          console.log("folder already exists: " + this.folder_path);
        }
        if (!await this.file_exists(this.file_path)) {
          await this.write_file(this.file_path, "{}");
          console.log("created embeddings file: " + this.file_path);
        } else {
          console.log("embeddings file already exists: " + this.file_path);
        }
      }
      async save() {
        const embeddings = JSON.stringify(this.embeddings);
        const embeddings_file_exists = await this.file_exists(this.file_path);
        if (embeddings_file_exists) {
          const new_file_size = embeddings.length;
          const existing_file_size = await this.stat(this.file_path).then((stat) => stat.size);
          if (new_file_size > existing_file_size * 0.5) {
            await this.write_file(this.file_path, embeddings);
            console.log("embeddings file size: " + new_file_size + " bytes");
          } else {
            const warning_message = [
              "Warning: New embeddings file size is significantly smaller than existing embeddings file size.",
              "Aborting to prevent possible loss of embeddings data.",
              "New file size: " + new_file_size + " bytes.",
              "Existing file size: " + existing_file_size + " bytes.",
              "Restarting Obsidian may fix this."
            ];
            console.log(warning_message.join(" "));
            await this.write_file(this.folder_path + "/unsaved-embeddings.json", embeddings);
            throw new Error("Error: New embeddings file size is significantly smaller than existing embeddings file size. Aborting to prevent possible loss of embeddings data.");
          }
        } else {
          await this.init_embeddings_file();
          return await this.save();
        }
        return true;
      }
      cos_sim(vector1, vector2) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vector1.length; i++) {
          dotProduct += vector1[i] * vector2[i];
          normA += vector1[i] * vector1[i];
          normB += vector2[i] * vector2[i];
        }
        if (normA === 0 || normB === 0) {
          return 0;
        } else {
          return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
        }
      }
      nearest(to_vec, filter = {}) {
        filter = {
          results_count: 30,
          ...filter
        };
        let nearest = [];
        const from_keys = Object.keys(this.embeddings);
        for (let i = 0; i < from_keys.length; i++) {
          if (filter.skip_sections) {
            const from_path = this.embeddings[from_keys[i]].meta.path;
            if (from_path.indexOf("#") > -1)
              continue;
          }
          if (filter.skip_key) {
            if (filter.skip_key === from_keys[i])
              continue;
            if (filter.skip_key === this.embeddings[from_keys[i]].meta.parent)
              continue;
          }
          if (filter.path_begins_with) {
            if (typeof filter.path_begins_with === "string" && !this.embeddings[from_keys[i]].meta.path.startsWith(filter.path_begins_with))
              continue;
            if (Array.isArray(filter.path_begins_with) && !filter.path_begins_with.some((path) => this.embeddings[from_keys[i]].meta.path.startsWith(path)))
              continue;
          }
          nearest.push({
            link: this.embeddings[from_keys[i]].meta.path,
            similarity: this.cos_sim(to_vec, this.embeddings[from_keys[i]].vec),
            size: this.embeddings[from_keys[i]].meta.size
          });
        }
        nearest.sort(function(a, b) {
          return b.similarity - a.similarity;
        });
        nearest = nearest.slice(0, filter.results_count);
        return nearest;
      }
      find_nearest_embeddings(to_vec, filter = {}) {
        const default_filter = {
          max: this.max_sources
        };
        filter = { ...default_filter, ...filter };
        if (Array.isArray(to_vec) && to_vec.length !== this.vec_len) {
          this.nearest = {};
          for (let i = 0; i < to_vec.length; i++) {
            this.find_nearest_embeddings(to_vec[i], {
              max: Math.floor(filter.max / to_vec.length)
            });
          }
        } else {
          const from_keys = Object.keys(this.embeddings);
          for (let i = 0; i < from_keys.length; i++) {
            if (this.validate_type(this.embeddings[from_keys[i]]))
              continue;
            const sim = this.computeCosineSimilarity(to_vec, this.embeddings[from_keys[i]].vec);
            if (this.nearest[from_keys[i]]) {
              this.nearest[from_keys[i]] += sim;
            } else {
              this.nearest[from_keys[i]] = sim;
            }
          }
        }
        let nearest = Object.keys(this.nearest).map((key) => {
          return {
            key,
            similarity: this.nearest[key]
          };
        });
        nearest = this.sort_by_similarity(nearest);
        nearest = nearest.slice(0, filter.max);
        nearest = nearest.map((item) => {
          return {
            link: this.embeddings[item.key].meta.path,
            similarity: item.similarity,
            len: this.embeddings[item.key].meta.len || this.embeddings[item.key].meta.size
          };
        });
        return nearest;
      }
      sort_by_similarity(nearest) {
        return nearest.sort(function(a, b) {
          const a_score = a.similarity;
          const b_score = b.similarity;
          if (a_score > b_score)
            return -1;
          if (a_score < b_score)
            return 1;
          return 0;
        });
      }
      // check if key from embeddings exists in files
      clean_up_embeddings(files) {
        console.log("cleaning up embeddings");
        const keys = Object.keys(this.embeddings);
        let deleted_embeddings = 0;
        for (const key of keys) {
          const path = this.embeddings[key].meta.path;
          if (!files.find((file) => path.startsWith(file.path))) {
            delete this.embeddings[key];
            deleted_embeddings++;
            continue;
          }
          if (path.indexOf("#") > -1) {
            const parent_key = this.embeddings[key].meta.parent;
            if (!this.embeddings[parent_key]) {
              delete this.embeddings[key];
              deleted_embeddings++;
              continue;
            }
            if (!this.embeddings[parent_key].meta) {
              delete this.embeddings[key];
              deleted_embeddings++;
              continue;
            }
            if (this.embeddings[parent_key].meta.children && this.embeddings[parent_key].meta.children.indexOf(key) < 0) {
              delete this.embeddings[key];
              deleted_embeddings++;
              continue;
            }
          }
        }
        return { deleted_embeddings, total_embeddings: keys.length };
      }
      get(key) {
        return this.embeddings[key] || null;
      }
      get_meta(key) {
        const embedding = this.get(key);
        if (embedding && embedding.meta) {
          return embedding.meta;
        }
        return null;
      }
      get_mtime(key) {
        const meta = this.get_meta(key);
        if (meta && meta.mtime) {
          return meta.mtime;
        }
        return null;
      }
      get_hash(key) {
        const meta = this.get_meta(key);
        if (meta && meta.hash) {
          return meta.hash;
        }
        return null;
      }
      get_size(key) {
        const meta = this.get_meta(key);
        if (meta && meta.size) {
          return meta.size;
        }
        return null;
      }
      get_children(key) {
        const meta = this.get_meta(key);
        if (meta && meta.children) {
          return meta.children;
        }
        return null;
      }
      get_vec(key) {
        const embedding = this.get(key);
        if (embedding && embedding.vec) {
          return embedding.vec;
        }
        return null;
      }
      save_embedding(key, vec, meta) {
        this.embeddings[key] = {
          vec,
          meta
        };
      }
      mtime_is_current(key, source_mtime) {
        const mtime = this.get_mtime(key);
        if (mtime && mtime >= source_mtime) {
          return true;
        }
        return false;
      }
      async force_refresh() {
        this.embeddings = null;
        this.embeddings = {};
        let current_datetime = Math.floor(Date.now() / 1e3);
        await this.rename(this.file_path, this.folder_path + "/embeddings-" + current_datetime + ".json");
        await this.init_embeddings_file();
      }
    };
    module2.exports = VecLite2;
  }
});

// src/index.js
var Obsidian = require("obsidian");
var VecLite = require_vec_lite();
var DEFAULT_SETTINGS = {
  api_key: "",
  chat_open: true,
  file_exclusions: "",
  folder_exclusions: "",
  header_exclusions: "",
  path_only: "",
  show_full_path: false,
  expanded_view: true,
  group_nearest_by_file: false,
  language: "en",
  log_render: false,
  log_render_files: false,
  recently_sent_retry_notice: false,
  skip_sections: false,
  smart_chat_model: "gpt-3.5-turbo-16k",
  view_open: true,
  version: ""
};
var MAX_EMBED_STRING_LENGTH = 25e3;
var VERSION;
var SUPPORTED_FILE_TYPES = ["md", "canvas"];
var SMART_TRANSLATION = {
  "en": {
    "pronous": ["my", "I", "me", "mine", "our", "ours", "us", "we"],
    "prompt": "Based on your notes",
    "initial_message": "Hi, I'm ChatGPT with access to your notes via Smart Connections. Ask me a question about your notes and I'll try to answer it."
  },
  "es": {
    "pronous": ["mi", "yo", "m\xED", "t\xFA"],
    "prompt": "Bas\xE1ndose en sus notas",
    "initial_message": "Hola, soy ChatGPT con acceso a tus apuntes a trav\xE9s de Smart Connections. Hazme una pregunta sobre tus apuntes e intentar\xE9 responderte."
  },
  "fr": {
    "pronous": ["me", "mon", "ma", "mes", "moi", "nous", "notre", "nos", "je", "j'", "m'"],
    "prompt": "D'apr\xE8s vos notes",
    "initial_message": "Bonjour, je suis ChatGPT et j'ai acc\xE8s \xE0 vos notes via Smart Connections. Posez-moi une question sur vos notes et j'essaierai d'y r\xE9pondre."
  },
  "de": {
    "pronous": ["mein", "meine", "meinen", "meiner", "meines", "mir", "uns", "unser", "unseren", "unserer", "unseres"],
    "prompt": "Basierend auf Ihren Notizen",
    "initial_message": "Hallo, ich bin ChatGPT und habe \xFCber Smart Connections Zugang zu Ihren Notizen. Stellen Sie mir eine Frage zu Ihren Notizen und ich werde versuchen, sie zu beantworten."
  },
  "it": {
    "pronous": ["mio", "mia", "miei", "mie", "noi", "nostro", "nostri", "nostra", "nostre"],
    "prompt": "Sulla base degli appunti",
    "initial_message": "Ciao, sono ChatGPT e ho accesso ai tuoi appunti tramite Smart Connections. Fatemi una domanda sui vostri appunti e cercher\xF2 di rispondervi."
  }
};
var crypto = require("crypto");
function md5(str) {
  return crypto.createHash("md5").update(str).digest("hex");
}
var SmartConnectionsPlugin = class extends Obsidian.Plugin {
  // constructor
  constructor() {
    super(...arguments);
    this.api = null;
    this.embeddings_loaded = false;
    this.file_exclusions = [];
    this.folders = [];
    this.has_new_embeddings = false;
    this.header_exclusions = [];
    this.nearest_cache = {};
    this.path_only = [];
    this.render_log = {};
    this.render_log.deleted_embeddings = 0;
    this.render_log.exclusions_logs = {};
    this.render_log.failed_embeddings = [];
    this.render_log.files = [];
    this.render_log.new_embeddings = 0;
    this.render_log.skipped_low_delta = {};
    this.render_log.token_usage = 0;
    this.render_log.tokens_saved_by_cache = 0;
    this.retry_notice_timeout = null;
    this.save_timeout = null;
    this.sc_branding = {};
    this.self_ref_kw_regex = null;
    this.update_available = false;
  }
  async onload() {
    this.app.workspace.onLayoutReady(this.initialize.bind(this));
  }
  onunload() {
    this.output_render_log();
    console.log("unloading plugin");
    this.app.workspace.detachLeavesOfType(SMART_CONNECTIONS_VIEW_TYPE);
    this.app.workspace.detachLeavesOfType(SMART_CONNECTIONS_CHAT_VIEW_TYPE);
  }
  async initialize() {
    console.log("Loading Smart Connections plugin");
    VERSION = this.manifest.version;
    await this.loadSettings();
    setTimeout(this.check_for_update.bind(this), 3e3);
    setInterval(this.check_for_update.bind(this), 108e5);
    this.addIcon();
    this.addCommand({
      id: "sc-find-notes",
      name: "Find: Make Smart Connections",
      icon: "pencil_icon",
      hotkeys: [],
      // editorCallback: async (editor) => {
      editorCallback: async (editor) => {
        if (editor.somethingSelected()) {
          let selected_text = editor.getSelection();
          await this.make_connections(selected_text);
        } else {
          this.nearest_cache = {};
          await this.make_connections();
        }
      }
    });
    this.addCommand({
      id: "smart-connections-view",
      name: "Open: View Smart Connections",
      callback: () => {
        this.open_view();
      }
    });
    this.addCommand({
      id: "smart-connections-chat",
      name: "Open: Smart Chat Conversation",
      callback: () => {
        this.open_chat();
      }
    });
    this.addCommand({
      id: "smart-connections-random",
      name: "Open: Random Note from Smart Connections",
      callback: () => {
        this.open_random_note();
      }
    });
    this.addSettingTab(new SmartConnectionsSettingsTab(this.app, this));
    this.registerView(SMART_CONNECTIONS_VIEW_TYPE, (leaf) => new SmartConnectionsView(leaf, this));
    this.registerView(SMART_CONNECTIONS_CHAT_VIEW_TYPE, (leaf) => new SmartConnectionsChatView(leaf, this));
    this.registerMarkdownCodeBlockProcessor("smart-connections", this.render_code_block.bind(this));
    if (this.settings.view_open) {
      this.open_view();
    }
    if (this.settings.chat_open) {
      this.open_chat();
    }
    if (this.settings.version !== VERSION) {
      this.settings.version = VERSION;
      await this.saveSettings();
      this.open_view();
    }
    this.add_to_gitignore();
    this.api = new ScSearchApi(this.app, this);
    (window["SmartSearchApi"] = this.api) && this.register(() => delete window["SmartSearchApi"]);
  }
  async init_vecs() {
    this.smart_vec_lite = new VecLite({
      folder_path: ".smart-connections",
      exists_adapter: this.app.vault.adapter.exists.bind(this.app.vault.adapter),
      mkdir_adapter: this.app.vault.adapter.mkdir.bind(this.app.vault.adapter),
      read_adapter: this.app.vault.adapter.read.bind(this.app.vault.adapter),
      rename_adapter: this.app.vault.adapter.rename.bind(this.app.vault.adapter),
      stat_adapter: this.app.vault.adapter.stat.bind(this.app.vault.adapter),
      write_adapter: this.app.vault.adapter.write.bind(this.app.vault.adapter)
    });
    this.embeddings_loaded = await this.smart_vec_lite.load();
    return this.embeddings_loaded;
  }
  async update_to_v2() {
    if (!this.settings.license_key)
      return new Obsidian.Notice("[Smart Connections] Supporter license key required for early access to V2");
    const v2 = await (0, Obsidian.requestUrl)({
      url: "https://sync.smartconnections.app/download_v2",
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        license_key: this.settings.license_key
      })
    });
    if (v2.status !== 200)
      return console.error("Error downloading version 2", v2);
    console.log(v2);
    await this.app.vault.adapter.write(".obsidian/plugins/smart-connections/main.js", v2.json.main);
    await this.app.vault.adapter.write(".obsidian/plugins/smart-connections/manifest.json", v2.json.manifest);
    await this.app.vault.adapter.write(".obsidian/plugins/smart-connections/styles.css", v2.json.styles);
    window.restart_plugin = async (id) => {
      console.log("restarting plugin", id);
      await window.app.plugins.disablePlugin(id);
      await window.app.plugins.enablePlugin(id);
      console.log("plugin restarted", id);
    };
    window.restart_plugin(this.manifest.id);
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    if (this.settings.file_exclusions && this.settings.file_exclusions.length > 0) {
      this.file_exclusions = this.settings.file_exclusions.split(",").map((file) => {
        return file.trim();
      });
    }
    if (this.settings.folder_exclusions && this.settings.folder_exclusions.length > 0) {
      const folder_exclusions = this.settings.folder_exclusions.split(",").map((folder) => {
        folder = folder.trim();
        if (folder.slice(-1) !== "/") {
          return folder + "/";
        } else {
          return folder;
        }
      });
      this.file_exclusions = this.file_exclusions.concat(folder_exclusions);
    }
    if (this.settings.header_exclusions && this.settings.header_exclusions.length > 0) {
      this.header_exclusions = this.settings.header_exclusions.split(",").map((header) => {
        return header.trim();
      });
    }
    if (this.settings.path_only && this.settings.path_only.length > 0) {
      this.path_only = this.settings.path_only.split(",").map((path) => {
        return path.trim();
      });
    }
    this.self_ref_kw_regex = new RegExp(`\\b(${SMART_TRANSLATION[this.settings.language].pronous.join("|")})\\b`, "gi");
    await this.load_failed_files();
  }
  async saveSettings(rerender = false) {
    await this.saveData(this.settings);
    await this.loadSettings();
    if (rerender) {
      this.nearest_cache = {};
      await this.make_connections();
    }
  }
  // check for update
  async check_for_update() {
    try {
      const response = await (0, Obsidian.requestUrl)({
        url: "https://api.github.com/repos/brianpetro/obsidian-smart-connections/releases/latest",
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        },
        contentType: "application/json"
      });
      const latest_release = JSON.parse(response.text).tag_name;
      if (latest_release !== VERSION) {
        new Obsidian.Notice(`[Smart Connections] A new version is available! (v${latest_release})`);
        this.update_available = true;
        this.render_brand("all");
      }
    } catch (error) {
      console.log(error);
    }
  }
  async render_code_block(contents, container, ctx) {
    let nearest;
    if (contents.trim().length > 0) {
      nearest = await this.api.search(contents);
    } else {
      console.log(ctx);
      const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
      nearest = await this.find_note_connections(file);
    }
    if (nearest.length) {
      this.update_results(container, nearest);
    }
  }
  async make_connections(selected_text = null) {
    let view = this.get_view();
    if (!view) {
      await this.open_view();
      view = this.get_view();
    }
    await view.render_connections(selected_text);
  }
  addIcon() {
    Obsidian.addIcon("smart-connections", `<path d="M50,20 L80,40 L80,60 L50,100" stroke="currentColor" stroke-width="4" fill="none"/>
    <path d="M30,50 L55,70" stroke="currentColor" stroke-width="5" fill="none"/>
    <circle cx="50" cy="20" r="9" fill="currentColor"/>
    <circle cx="80" cy="40" r="9" fill="currentColor"/>
    <circle cx="80" cy="70" r="9" fill="currentColor"/>
    <circle cx="50" cy="100" r="9" fill="currentColor"/>
    <circle cx="30" cy="50" r="9" fill="currentColor"/>`);
  }
  // open random note
  async open_random_note() {
    const curr_file = this.app.workspace.getActiveFile();
    const curr_key = md5(curr_file.path);
    if (typeof this.nearest_cache[curr_key] === "undefined") {
      new Obsidian.Notice("[Smart Connections] No Smart Connections found. Open a note to get Smart Connections.");
      return;
    }
    const rand = Math.floor(Math.random() * this.nearest_cache[curr_key].length / 2);
    const random_file = this.nearest_cache[curr_key][rand];
    this.open_note(random_file);
  }
  async open_view() {
    if (this.get_view()) {
      console.log("Smart Connections view already open");
      return;
    }
    this.app.workspace.detachLeavesOfType(SMART_CONNECTIONS_VIEW_TYPE);
    await this.app.workspace.getRightLeaf(false).setViewState({
      type: SMART_CONNECTIONS_VIEW_TYPE,
      active: true
    });
    this.app.workspace.revealLeaf(
      this.app.workspace.getLeavesOfType(SMART_CONNECTIONS_VIEW_TYPE)[0]
    );
  }
  // source: https://github.com/obsidianmd/obsidian-releases/blob/master/plugin-review.md#avoid-managing-references-to-custom-views
  get_view() {
    for (let leaf of this.app.workspace.getLeavesOfType(SMART_CONNECTIONS_VIEW_TYPE)) {
      if (leaf.view instanceof SmartConnectionsView) {
        return leaf.view;
      }
    }
  }
  // open chat view
  async open_chat(retries = 0) {
    if (!this.embeddings_loaded) {
      console.log("embeddings not loaded yet");
      if (retries < 3) {
        setTimeout(() => {
          this.open_chat(retries + 1);
        }, 1e3 * (retries + 1));
        return;
      }
      console.log("embeddings still not loaded, opening smart view");
      this.open_view();
      return;
    }
    this.app.workspace.detachLeavesOfType(SMART_CONNECTIONS_CHAT_VIEW_TYPE);
    await this.app.workspace.getRightLeaf(false).setViewState({
      type: SMART_CONNECTIONS_CHAT_VIEW_TYPE,
      active: true
    });
    this.app.workspace.revealLeaf(
      this.app.workspace.getLeavesOfType(SMART_CONNECTIONS_CHAT_VIEW_TYPE)[0]
    );
  }
  // get embeddings for all files
  async get_all_embeddings() {
    const files = (await this.app.vault.getFiles()).filter((file) => file instanceof Obsidian.TFile && (file.extension === "md" || file.extension === "canvas"));
    const open_files = this.app.workspace.getLeavesOfType("markdown").map((leaf) => leaf.view.file);
    const clean_up_log = this.smart_vec_lite.clean_up_embeddings(files);
    if (this.settings.log_render) {
      this.render_log.total_files = files.length;
      this.render_log.deleted_embeddings = clean_up_log.deleted_embeddings;
      this.render_log.total_embeddings = clean_up_log.total_embeddings;
    }
    let batch_promises = [];
    for (let i = 0; i < files.length; i++) {
      if (files[i].path.indexOf("#") > -1) {
        this.log_exclusion("path contains #");
        continue;
      }
      if (this.smart_vec_lite.mtime_is_current(md5(files[i].path), files[i].stat.mtime)) {
        continue;
      }
      if (this.settings.failed_files.indexOf(files[i].path) > -1) {
        if (this.retry_notice_timeout) {
          clearTimeout(this.retry_notice_timeout);
          this.retry_notice_timeout = null;
        }
        if (!this.recently_sent_retry_notice) {
          new Obsidian.Notice("Smart Connections: Skipping previously failed file, use button in settings to retry");
          this.recently_sent_retry_notice = true;
          setTimeout(() => {
            this.recently_sent_retry_notice = false;
          }, 6e5);
        }
        continue;
      }
      let skip = false;
      for (let j = 0; j < this.file_exclusions.length; j++) {
        if (files[i].path.indexOf(this.file_exclusions[j]) > -1) {
          skip = true;
          this.log_exclusion(this.file_exclusions[j]);
          break;
        }
      }
      if (skip) {
        continue;
      }
      if (open_files.indexOf(files[i]) > -1) {
        continue;
      }
      try {
        batch_promises.push(this.get_file_embeddings(files[i], false));
      } catch (error) {
        console.log(error);
      }
      if (batch_promises.length > 3) {
        await Promise.all(batch_promises);
        batch_promises = [];
      }
      if (i > 0 && i % 100 === 0) {
        await this.save_embeddings_to_file();
      }
    }
    await Promise.all(batch_promises);
    await this.save_embeddings_to_file();
    if (this.render_log.failed_embeddings.length > 0) {
      await this.save_failed_embeddings();
    }
  }
  async save_embeddings_to_file(force = false) {
    if (!this.has_new_embeddings) {
      return;
    }
    if (!force) {
      if (this.save_timeout) {
        clearTimeout(this.save_timeout);
        this.save_timeout = null;
      }
      this.save_timeout = setTimeout(() => {
        this.save_embeddings_to_file(true);
        if (this.save_timeout) {
          clearTimeout(this.save_timeout);
          this.save_timeout = null;
        }
      }, 3e4);
      console.log("scheduled save");
      return;
    }
    try {
      await this.smart_vec_lite.save();
      this.has_new_embeddings = false;
    } catch (error) {
      console.log(error);
      new Obsidian.Notice("Smart Connections: " + error.message);
    }
  }
  // save failed embeddings to file from render_log.failed_embeddings
  async save_failed_embeddings() {
    let failed_embeddings = [];
    const failed_embeddings_file_exists = await this.app.vault.adapter.exists(".smart-connections/failed-embeddings.txt");
    if (failed_embeddings_file_exists) {
      failed_embeddings = await this.app.vault.adapter.read(".smart-connections/failed-embeddings.txt");
      failed_embeddings = failed_embeddings.split("\r\n");
    }
    failed_embeddings = failed_embeddings.concat(this.render_log.failed_embeddings);
    failed_embeddings = [...new Set(failed_embeddings)];
    failed_embeddings.sort();
    failed_embeddings = failed_embeddings.join("\r\n");
    await this.app.vault.adapter.write(".smart-connections/failed-embeddings.txt", failed_embeddings);
    await this.load_failed_files();
  }
  // load failed files from failed-embeddings.txt
  async load_failed_files() {
    const failed_embeddings_file_exists = await this.app.vault.adapter.exists(".smart-connections/failed-embeddings.txt");
    if (!failed_embeddings_file_exists) {
      this.settings.failed_files = [];
      console.log("No failed files.");
      return;
    }
    const failed_embeddings = await this.app.vault.adapter.read(".smart-connections/failed-embeddings.txt");
    const failed_embeddings_array = failed_embeddings.split("\r\n");
    const failed_files = failed_embeddings_array.map((embedding) => embedding.split("#")[0]).reduce((unique, item) => unique.includes(item) ? unique : [...unique, item], []);
    this.settings.failed_files = failed_files;
  }
  // retry failed embeddings
  async retry_failed_files() {
    this.settings.failed_files = [];
    const failed_embeddings_file_exists = await this.app.vault.adapter.exists(".smart-connections/failed-embeddings.txt");
    if (failed_embeddings_file_exists) {
      await this.app.vault.adapter.remove(".smart-connections/failed-embeddings.txt");
    }
    await this.get_all_embeddings();
  }
  // add .smart-connections to .gitignore to prevent issues with large, frequently updated embeddings file(s)
  async add_to_gitignore() {
    if (!await this.app.vault.adapter.exists(".gitignore")) {
      return;
    }
    let gitignore_file = await this.app.vault.adapter.read(".gitignore");
    if (gitignore_file.indexOf(".smart-connections") < 0) {
      let add_to_gitignore = "\n\n# Ignore Smart Connections folder because embeddings file is large and updated frequently";
      add_to_gitignore += "\n.smart-connections";
      await this.app.vault.adapter.write(".gitignore", gitignore_file + add_to_gitignore);
      console.log("added .smart-connections to .gitignore");
    }
  }
  // force refresh embeddings file but first rename existing embeddings file to .smart-connections/embeddings-YYYY-MM-DD.json
  async force_refresh_embeddings_file() {
    new Obsidian.Notice("Smart Connections: embeddings file Force Refreshed, making new connections...");
    await this.smart_vec_lite.force_refresh();
    await this.get_all_embeddings();
    this.output_render_log();
    new Obsidian.Notice("Smart Connections: embeddings file Force Refreshed, new connections made.");
  }
  // get embeddings for embed_input
  async get_file_embeddings(curr_file, save = true) {
    let req_batch = [];
    let blocks = [];
    const curr_file_key = md5(curr_file.path);
    let file_embed_input = curr_file.path.replace(".md", "");
    file_embed_input = file_embed_input.replace(/\//g, " > ");
    let path_only = false;
    for (let j = 0; j < this.path_only.length; j++) {
      if (curr_file.path.indexOf(this.path_only[j]) > -1) {
        path_only = true;
        console.log("title only file with matcher: " + this.path_only[j]);
        break;
      }
    }
    if (path_only) {
      req_batch.push([curr_file_key, file_embed_input, {
        mtime: curr_file.stat.mtime,
        path: curr_file.path
      }]);
      await this.get_embeddings_batch(req_batch);
      return;
    }
    if (curr_file.extension === "canvas") {
      const canvas_contents = await this.app.vault.cachedRead(curr_file);
      if (typeof canvas_contents === "string" && canvas_contents.indexOf("nodes") > -1) {
        const canvas_json = JSON.parse(canvas_contents);
        for (let j = 0; j < canvas_json.nodes.length; j++) {
          if (canvas_json.nodes[j].text) {
            file_embed_input += "\n" + canvas_json.nodes[j].text;
          }
          if (canvas_json.nodes[j].file) {
            file_embed_input += "\nLink: " + canvas_json.nodes[j].file;
          }
        }
      }
      req_batch.push([curr_file_key, file_embed_input, {
        mtime: curr_file.stat.mtime,
        path: curr_file.path
      }]);
      await this.get_embeddings_batch(req_batch);
      return;
    }
    const note_contents = await this.app.vault.cachedRead(curr_file);
    let processed_since_last_save = 0;
    const note_sections = this.block_parser(note_contents, curr_file.path);
    if (note_sections.length > 1) {
      for (let j = 0; j < note_sections.length; j++) {
        const block_embed_input = note_sections[j].text;
        const block_key = md5(note_sections[j].path);
        blocks.push(block_key);
        if (this.smart_vec_lite.get_size(block_key) === block_embed_input.length) {
          continue;
        }
        if (this.smart_vec_lite.mtime_is_current(block_key, curr_file.stat.mtime)) {
          continue;
        }
        const block_hash = md5(block_embed_input.trim());
        if (this.smart_vec_lite.get_hash(block_key) === block_hash) {
          continue;
        }
        req_batch.push([block_key, block_embed_input, {
          // oldmtime: curr_file.stat.mtime, 
          // get current datetime as unix timestamp
          mtime: Date.now(),
          hash: block_hash,
          parent: curr_file_key,
          path: note_sections[j].path,
          size: block_embed_input.length
        }]);
        if (req_batch.length > 9) {
          await this.get_embeddings_batch(req_batch);
          processed_since_last_save += req_batch.length;
          if (processed_since_last_save >= 30) {
            await this.save_embeddings_to_file();
            processed_since_last_save = 0;
          }
          req_batch = [];
        }
      }
    }
    if (req_batch.length > 0) {
      await this.get_embeddings_batch(req_batch);
      req_batch = [];
      processed_since_last_save += req_batch.length;
    }
    file_embed_input += `:
`;
    if (note_contents.length < MAX_EMBED_STRING_LENGTH) {
      file_embed_input += note_contents;
    } else {
      const note_meta_cache = this.app.metadataCache.getFileCache(curr_file);
      if (typeof note_meta_cache.headings === "undefined") {
        file_embed_input += note_contents.substring(0, MAX_EMBED_STRING_LENGTH);
      } else {
        let note_headings = "";
        for (let j = 0; j < note_meta_cache.headings.length; j++) {
          const heading_level = note_meta_cache.headings[j].level;
          const heading_text = note_meta_cache.headings[j].heading;
          let md_heading = "";
          for (let k = 0; k < heading_level; k++) {
            md_heading += "#";
          }
          note_headings += `${md_heading} ${heading_text}
`;
        }
        file_embed_input += note_headings;
        if (file_embed_input.length > MAX_EMBED_STRING_LENGTH) {
          file_embed_input = file_embed_input.substring(0, MAX_EMBED_STRING_LENGTH);
        }
      }
    }
    const file_hash = md5(file_embed_input.trim());
    const existing_hash = this.smart_vec_lite.get_hash(curr_file_key);
    if (existing_hash && file_hash === existing_hash) {
      this.update_render_log(blocks, file_embed_input);
      return;
    }
    ;
    const existing_blocks = this.smart_vec_lite.get_children(curr_file_key);
    let existing_has_all_blocks = true;
    if (existing_blocks && Array.isArray(existing_blocks) && blocks.length > 0) {
      for (let j = 0; j < blocks.length; j++) {
        if (existing_blocks.indexOf(blocks[j]) === -1) {
          existing_has_all_blocks = false;
          break;
        }
      }
    }
    if (existing_has_all_blocks) {
      const curr_file_size = curr_file.stat.size;
      const prev_file_size = this.smart_vec_lite.get_size(curr_file_key);
      if (prev_file_size) {
        const file_delta_pct = Math.round(Math.abs(curr_file_size - prev_file_size) / curr_file_size * 100);
        if (file_delta_pct < 10) {
          this.render_log.skipped_low_delta[curr_file.name] = file_delta_pct + "%";
          this.update_render_log(blocks, file_embed_input);
          return;
        }
      }
    }
    let meta = {
      mtime: curr_file.stat.mtime,
      hash: file_hash,
      path: curr_file.path,
      size: curr_file.stat.size,
      children: blocks
    };
    req_batch.push([curr_file_key, file_embed_input, meta]);
    await this.get_embeddings_batch(req_batch);
    if (save) {
      await this.save_embeddings_to_file();
    }
  }
  update_render_log(blocks, file_embed_input) {
    if (blocks.length > 0) {
      this.render_log.tokens_saved_by_cache += file_embed_input.length / 2;
    } else {
      this.render_log.tokens_saved_by_cache += file_embed_input.length / 4;
    }
  }
  async get_embeddings_batch(req_batch) {
    console.log("get_embeddings_batch");
    if (req_batch.length === 0)
      return;
    const embed_inputs = req_batch.map((req) => req[1]);
    const requestResults = await this.request_embedding_from_input(embed_inputs);
    if (!requestResults) {
      console.log("failed embedding batch");
      this.render_log.failed_embeddings = [...this.render_log.failed_embeddings, ...req_batch.map((req) => req[2].path)];
      return;
    }
    if (requestResults) {
      this.has_new_embeddings = true;
      if (this.settings.log_render) {
        if (this.settings.log_render_files) {
          this.render_log.files = [...this.render_log.files, ...req_batch.map((req) => req[2].path)];
        }
        this.render_log.new_embeddings += req_batch.length;
        this.render_log.token_usage += requestResults.usage.total_tokens;
      }
      for (let i = 0; i < requestResults.data.length; i++) {
        const vec = requestResults.data[i].embedding;
        const index = requestResults.data[i].index;
        if (vec) {
          const key = req_batch[index][0];
          const meta = req_batch[index][2];
          this.smart_vec_lite.save_embedding(key, vec, meta);
        }
      }
    }
  }
  async request_embedding_from_input(embed_input, retries = 0) {
    if (embed_input.length === 0) {
      console.log("embed_input is empty");
      return null;
    }
    const usedParams = {
      model: "text-embedding-ada-002",
      input: embed_input
    };
    const reqParams = {
      url: `https://api.openai.com/v1/embeddings`,
      method: "POST",
      body: JSON.stringify(usedParams),
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.settings.api_key}`
      }
    };
    let resp;
    try {
      resp = await (0, Obsidian.request)(reqParams);
      return JSON.parse(resp);
    } catch (error) {
      if (error.status === 429 && retries < 3) {
        retries++;
        const backoff = Math.pow(retries, 2);
        console.log(`retrying request (429) in ${backoff} seconds...`);
        await new Promise((r) => setTimeout(r, 1e3 * backoff));
        return await this.request_embedding_from_input(embed_input, retries);
      }
      console.log(resp);
      console.log(error);
      return null;
    }
  }
  async test_api_key() {
    const embed_input = "This is a test of the OpenAI API.";
    const resp = await this.request_embedding_from_input(embed_input);
    if (resp && resp.usage) {
      console.log("API key is valid");
      return true;
    } else {
      console.log("API key is invalid");
      return false;
    }
  }
  output_render_log() {
    if (this.settings.log_render) {
      if (this.render_log.new_embeddings === 0) {
        return;
      } else {
        console.log(JSON.stringify(this.render_log, null, 2));
      }
    }
    this.render_log = {};
    this.render_log.deleted_embeddings = 0;
    this.render_log.exclusions_logs = {};
    this.render_log.failed_embeddings = [];
    this.render_log.files = [];
    this.render_log.new_embeddings = 0;
    this.render_log.skipped_low_delta = {};
    this.render_log.token_usage = 0;
    this.render_log.tokens_saved_by_cache = 0;
  }
  // find connections by most similar to current note by cosine similarity
  async find_note_connections(current_note = null) {
    const curr_key = md5(current_note.path);
    let nearest = [];
    if (this.nearest_cache[curr_key]) {
      nearest = this.nearest_cache[curr_key];
    } else {
      for (let j = 0; j < this.file_exclusions.length; j++) {
        if (current_note.path.indexOf(this.file_exclusions[j]) > -1) {
          this.log_exclusion(this.file_exclusions[j]);
          return "excluded";
        }
      }
      setTimeout(() => {
        this.get_all_embeddings();
      }, 3e3);
      if (this.smart_vec_lite.mtime_is_current(curr_key, current_note.stat.mtime)) {
      } else {
        await this.get_file_embeddings(current_note);
      }
      const vec = this.smart_vec_lite.get_vec(curr_key);
      if (!vec) {
        return "Error getting embeddings for: " + current_note.path;
      }
      nearest = this.smart_vec_lite.nearest(vec, {
        skip_key: curr_key,
        skip_sections: this.settings.skip_sections
      });
      this.nearest_cache[curr_key] = nearest;
    }
    return nearest;
  }
  // create render_log object of exlusions with number of times skipped as value
  log_exclusion(exclusion) {
    this.render_log.exclusions_logs[exclusion] = (this.render_log.exclusions_logs[exclusion] || 0) + 1;
  }
  block_parser(markdown, file_path) {
    if (this.settings.skip_sections) {
      return [];
    }
    const lines = markdown.split("\n");
    let blocks = [];
    let currentHeaders = [];
    const file_breadcrumbs = file_path.replace(".md", "").replace(/\//g, " > ");
    let block = "";
    let block_headings = "";
    let block_path = file_path;
    let last_heading_line = 0;
    let i = 0;
    let block_headings_list = [];
    for (i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.startsWith("#") || ["#", " "].indexOf(line[1]) < 0) {
        if (line === "")
          continue;
        if (["- ", "- [ ] "].indexOf(line) > -1)
          continue;
        if (currentHeaders.length === 0)
          continue;
        block += "\n" + line;
        continue;
      }
      last_heading_line = i;
      if (i > 0 && last_heading_line !== i - 1 && block.indexOf("\n") > -1 && this.validate_headings(block_headings)) {
        output_block();
      }
      const level = line.split("#").length - 1;
      currentHeaders = currentHeaders.filter((header) => header.level < level);
      currentHeaders.push({ header: line.replace(/#/g, "").trim(), level });
      block = file_breadcrumbs;
      block += ": " + currentHeaders.map((header) => header.header).join(" > ");
      block_headings = "#" + currentHeaders.map((header) => header.header).join("#");
      if (block_headings_list.indexOf(block_headings) > -1) {
        let count = 1;
        while (block_headings_list.indexOf(`${block_headings}{${count}}`) > -1) {
          count++;
        }
        block_headings = `${block_headings}{${count}}`;
      }
      block_headings_list.push(block_headings);
      block_path = file_path + block_headings;
    }
    if (last_heading_line !== i - 1 && block.indexOf("\n") > -1 && this.validate_headings(block_headings))
      output_block();
    blocks = blocks.filter((b) => b.length > 50);
    return blocks;
    function output_block() {
      const breadcrumbs_length = block.indexOf("\n") + 1;
      const block_length = block.length - breadcrumbs_length;
      if (block.length > MAX_EMBED_STRING_LENGTH) {
        block = block.substring(0, MAX_EMBED_STRING_LENGTH);
      }
      blocks.push({ text: block.trim(), path: block_path, length: block_length });
    }
  }
  // reverse-retrieve block given path
  async block_retriever(path, limits = {}) {
    limits = {
      lines: null,
      chars_per_line: null,
      max_chars: null,
      ...limits
    };
    if (path.indexOf("#") < 0) {
      console.log("not a block path: " + path);
      return false;
    }
    let block = [];
    let block_headings = path.split("#").slice(1);
    let heading_occurrence = 0;
    if (block_headings[block_headings.length - 1].indexOf("{") > -1) {
      heading_occurrence = parseInt(block_headings[block_headings.length - 1].split("{")[1].replace("}", ""));
      block_headings[block_headings.length - 1] = block_headings[block_headings.length - 1].split("{")[0];
    }
    let currentHeaders = [];
    let occurrence_count = 0;
    let begin_line = 0;
    let i = 0;
    const file_path = path.split("#")[0];
    const file = this.app.vault.getAbstractFileByPath(file_path);
    if (!(file instanceof Obsidian.TFile)) {
      console.log("not a file: " + file_path);
      return false;
    }
    const file_contents = await this.app.vault.cachedRead(file);
    const lines = file_contents.split("\n");
    let is_code = false;
    for (i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.indexOf("```") === 0) {
        is_code = !is_code;
      }
      if (is_code) {
        continue;
      }
      if (["- ", "- [ ] "].indexOf(line) > -1)
        continue;
      if (!line.startsWith("#") || ["#", " "].indexOf(line[1]) < 0) {
        continue;
      }
      const heading_text = line.replace(/#/g, "").trim();
      const heading_index = block_headings.indexOf(heading_text);
      if (heading_index < 0)
        continue;
      if (currentHeaders.length !== heading_index)
        continue;
      currentHeaders.push(heading_text);
      if (currentHeaders.length === block_headings.length) {
        if (heading_occurrence === 0) {
          begin_line = i + 1;
          break;
        }
        if (occurrence_count === heading_occurrence) {
          begin_line = i + 1;
          break;
        }
        occurrence_count++;
        currentHeaders.pop();
        continue;
      }
    }
    if (begin_line === 0)
      return false;
    is_code = false;
    let char_count = 0;
    for (i = begin_line; i < lines.length; i++) {
      if (typeof line_limit === "number" && block.length > line_limit) {
        block.push("...");
        break;
      }
      let line = lines[i];
      if (line.indexOf("#") === 0 && ["#", " "].indexOf(line[1]) !== -1) {
        break;
      }
      if (limits.max_chars && char_count > limits.max_chars) {
        block.push("...");
        break;
      }
      if (limits.max_chars && line.length + char_count > limits.max_chars) {
        const max_new_chars = limits.max_chars - char_count;
        line = line.slice(0, max_new_chars) + "...";
        break;
      }
      if (line.length === 0)
        continue;
      if (limits.chars_per_line && line.length > limits.chars_per_line) {
        line = line.slice(0, limits.chars_per_line) + "...";
      }
      if (line.startsWith("```")) {
        is_code = !is_code;
        continue;
      }
      if (is_code) {
        line = "	" + line;
      }
      block.push(line);
      char_count += line.length;
    }
    if (is_code) {
      block.push("```");
    }
    return block.join("\n").trim();
  }
  // retrieve a file from the vault
  async file_retriever(link, limits = {}) {
    limits = {
      lines: null,
      max_chars: null,
      chars_per_line: null,
      ...limits
    };
    const this_file = this.app.vault.getAbstractFileByPath(link);
    if (!(this_file instanceof Obsidian.TAbstractFile))
      return false;
    const file_content = await this.app.vault.cachedRead(this_file);
    const file_lines = file_content.split("\n");
    let first_ten_lines = [];
    let is_code = false;
    let char_accum = 0;
    const line_limit2 = limits.lines || file_lines.length;
    for (let i = 0; first_ten_lines.length < line_limit2; i++) {
      let line = file_lines[i];
      if (typeof line === "undefined")
        break;
      if (line.length === 0)
        continue;
      if (limits.chars_per_line && line.length > limits.chars_per_line) {
        line = line.slice(0, limits.chars_per_line) + "...";
      }
      if (line === "---")
        continue;
      if (["- ", "- [ ] "].indexOf(line) > -1)
        continue;
      if (line.indexOf("```") === 0) {
        is_code = !is_code;
        continue;
      }
      if (limits.max_chars && char_accum > limits.max_chars) {
        first_ten_lines.push("...");
        break;
      }
      if (is_code) {
        line = "	" + line;
      }
      if (line_is_heading(line)) {
        if (first_ten_lines.length > 0 && line_is_heading(first_ten_lines[first_ten_lines.length - 1])) {
          first_ten_lines.pop();
        }
      }
      first_ten_lines.push(line);
      char_accum += line.length;
    }
    for (let i = 0; i < first_ten_lines.length; i++) {
      if (line_is_heading(first_ten_lines[i])) {
        if (i === first_ten_lines.length - 1) {
          first_ten_lines.pop();
          break;
        }
        first_ten_lines[i] = first_ten_lines[i].replace(/#+/, "");
        first_ten_lines[i] = `
${first_ten_lines[i]}:`;
      }
    }
    first_ten_lines = first_ten_lines.join("\n");
    return first_ten_lines;
  }
  // iterate through blocks and skip if block_headings contains this.header_exclusions
  validate_headings(block_headings) {
    let valid = true;
    if (this.header_exclusions.length > 0) {
      for (let k = 0; k < this.header_exclusions.length; k++) {
        if (block_headings.indexOf(this.header_exclusions[k]) > -1) {
          valid = false;
          this.log_exclusion("heading: " + this.header_exclusions[k]);
          break;
        }
      }
    }
    return valid;
  }
  // render "Smart Connections" text fixed in the bottom right corner
  render_brand(container, location = "default") {
    if (container === "all") {
      const locations = Object.keys(this.sc_branding);
      for (let i = 0; i < locations.length; i++) {
        this.render_brand(this.sc_branding[locations[i]], locations[i]);
      }
      return;
    }
    this.sc_branding[location] = container;
    if (this.sc_branding[location].querySelector(".sc-brand")) {
      this.sc_branding[location].querySelector(".sc-brand").remove();
    }
    const brand_container = this.sc_branding[location].createEl("div", { cls: "sc-brand" });
    Obsidian.setIcon(brand_container, "smart-connections");
    const brand_p = brand_container.createEl("p");
    let text = "Smart Connections";
    let attr = {};
    if (this.update_available) {
      text = "Update Available";
      attr = {
        style: "font-weight: 700;"
      };
    }
    brand_p.createEl("a", {
      cls: "",
      text,
      href: "https://github.com/brianpetro/obsidian-smart-connections/discussions",
      target: "_blank",
      attr
    });
  }
  // create list of nearest notes
  async update_results(container, nearest) {
    let list;
    if (container.children.length > 1 && container.children[1].classList.contains("sc-list")) {
      list = container.children[1];
    }
    if (list) {
      list.empty();
    } else {
      list = container.createEl("div", { cls: "sc-list" });
    }
    let search_result_class = "search-result";
    if (!this.settings.expanded_view)
      search_result_class += " sc-collapsed";
    if (!this.settings.group_nearest_by_file) {
      for (let i = 0; i < nearest.length; i++) {
        if (typeof nearest[i].link === "object") {
          const item2 = list.createEl("div", { cls: "search-result" });
          const link2 = item2.createEl("a", {
            cls: "search-result-file-title is-clickable",
            href: nearest[i].link.path,
            title: nearest[i].link.title
          });
          link2.innerHTML = this.render_external_link_elm(nearest[i].link);
          item2.setAttr("draggable", "true");
          continue;
        }
        let file_link_text;
        const file_similarity_pct = Math.round(nearest[i].similarity * 100) + "%";
        if (this.settings.show_full_path) {
          const pcs = nearest[i].link.split("/");
          file_link_text = pcs[pcs.length - 1];
          const path = pcs.slice(0, pcs.length - 1).join("/");
          file_link_text = `<small>${file_similarity_pct} | ${path} | ${file_link_text}</small>`;
        } else {
          file_link_text = "<small>" + file_similarity_pct + " | " + nearest[i].link.split("/").pop() + "</small>";
        }
        if (!this.renderable_file_type(nearest[i].link)) {
          const item2 = list.createEl("div", { cls: "search-result" });
          const link2 = item2.createEl("a", {
            cls: "search-result-file-title is-clickable",
            href: nearest[i].link
          });
          link2.innerHTML = file_link_text;
          item2.setAttr("draggable", "true");
          this.add_link_listeners(link2, nearest[i], item2);
          continue;
        }
        file_link_text = file_link_text.replace(".md", "").replace(/#/g, " > ");
        const item = list.createEl("div", { cls: search_result_class });
        const toggle = item.createEl("span", { cls: "is-clickable" });
        Obsidian.setIcon(toggle, "right-triangle");
        const link = toggle.createEl("a", {
          cls: "search-result-file-title",
          title: nearest[i].link
        });
        link.innerHTML = file_link_text;
        this.add_link_listeners(link, nearest[i], item);
        toggle.addEventListener("click", (event) => {
          let parent = event.target.parentElement;
          while (!parent.classList.contains("search-result")) {
            parent = parent.parentElement;
          }
          parent.classList.toggle("sc-collapsed");
        });
        const contents = item.createEl("ul", { cls: "" });
        const contents_container = contents.createEl("li", {
          cls: "search-result-file-title is-clickable",
          title: nearest[i].link
        });
        if (nearest[i].link.indexOf("#") > -1) {
          Obsidian.MarkdownRenderer.renderMarkdown(await this.block_retriever(nearest[i].link, { lines: 10, max_chars: 1e3 }), contents_container, nearest[i].link, new Obsidian.Component());
        } else {
          const first_ten_lines = await this.file_retriever(nearest[i].link, { lines: 10, max_chars: 1e3 });
          if (!first_ten_lines)
            continue;
          Obsidian.MarkdownRenderer.renderMarkdown(first_ten_lines, contents_container, nearest[i].link, new Obsidian.Component());
        }
        this.add_link_listeners(contents, nearest[i], item);
      }
      this.render_brand(container, "block");
      return;
    }
    const nearest_by_file = {};
    for (let i = 0; i < nearest.length; i++) {
      const curr = nearest[i];
      const link = curr.link;
      if (typeof link === "object") {
        nearest_by_file[link.path] = [curr];
        continue;
      }
      if (link.indexOf("#") > -1) {
        const file_path = link.split("#")[0];
        if (!nearest_by_file[file_path]) {
          nearest_by_file[file_path] = [];
        }
        nearest_by_file[file_path].push(nearest[i]);
      } else {
        if (!nearest_by_file[link]) {
          nearest_by_file[link] = [];
        }
        nearest_by_file[link].unshift(nearest[i]);
      }
    }
    const keys = Object.keys(nearest_by_file);
    for (let i = 0; i < keys.length; i++) {
      const file = nearest_by_file[keys[i]];
      if (typeof file[0].link === "object") {
        const curr = file[0];
        const meta = curr.link;
        if (meta.path.startsWith("http")) {
          const item2 = list.createEl("div", { cls: "search-result" });
          const link = item2.createEl("a", {
            cls: "search-result-file-title is-clickable",
            href: meta.path,
            title: meta.title
          });
          link.innerHTML = this.render_external_link_elm(meta);
          item2.setAttr("draggable", "true");
          continue;
        }
      }
      let file_link_text;
      const file_similarity_pct = Math.round(file[0].similarity * 100) + "%";
      if (this.settings.show_full_path) {
        const pcs = file[0].link.split("/");
        file_link_text = pcs[pcs.length - 1];
        const path = pcs.slice(0, pcs.length - 1).join("/");
        file_link_text = `<small>${path} | ${file_similarity_pct}</small><br>${file_link_text}`;
      } else {
        file_link_text = file[0].link.split("/").pop();
        file_link_text += " | " + file_similarity_pct;
      }
      if (!this.renderable_file_type(file[0].link)) {
        const item2 = list.createEl("div", { cls: "search-result" });
        const file_link2 = item2.createEl("a", {
          cls: "search-result-file-title is-clickable",
          title: file[0].link
        });
        file_link2.innerHTML = file_link_text;
        this.add_link_listeners(file_link2, file[0], item2);
        continue;
      }
      file_link_text = file_link_text.replace(".md", "").replace(/#/g, " > ");
      const item = list.createEl("div", { cls: search_result_class });
      const toggle = item.createEl("span", { cls: "is-clickable" });
      Obsidian.setIcon(toggle, "right-triangle");
      const file_link = toggle.createEl("a", {
        cls: "search-result-file-title",
        title: file[0].link
      });
      file_link.innerHTML = file_link_text;
      this.add_link_listeners(file_link, file[0], toggle);
      toggle.addEventListener("click", (event) => {
        let parent = event.target;
        while (!parent.classList.contains("search-result")) {
          parent = parent.parentElement;
        }
        parent.classList.toggle("sc-collapsed");
      });
      const file_link_list = item.createEl("ul");
      for (let j = 0; j < file.length; j++) {
        if (file[j].link.indexOf("#") > -1) {
          const block = file[j];
          const block_link = file_link_list.createEl("li", {
            cls: "search-result-file-title is-clickable",
            title: block.link
          });
          if (file.length > 1) {
            const block_context = this.render_block_context(block);
            const block_similarity_pct = Math.round(block.similarity * 100) + "%";
            block_link.innerHTML = `<small>${block_context} | ${block_similarity_pct}</small>`;
          }
          const block_container = block_link.createEl("div");
          Obsidian.MarkdownRenderer.renderMarkdown(await this.block_retriever(block.link, { lines: 10, max_chars: 1e3 }), block_container, block.link, new Obsidian.Component());
          this.add_link_listeners(block_link, block, file_link_list);
        } else {
          const file_link_list2 = item.createEl("ul");
          const block_link = file_link_list2.createEl("li", {
            cls: "search-result-file-title is-clickable",
            title: file[0].link
          });
          const block_container = block_link.createEl("div");
          let first_ten_lines = await this.file_retriever(file[0].link, { lines: 10, max_chars: 1e3 });
          if (!first_ten_lines)
            continue;
          Obsidian.MarkdownRenderer.renderMarkdown(first_ten_lines, block_container, file[0].link, new Obsidian.Component());
          this.add_link_listeners(block_link, file[0], file_link_list2);
        }
      }
    }
    this.render_brand(container, "file");
  }
  add_link_listeners(item, curr, list) {
    item.addEventListener("click", async (event) => {
      await this.open_note(curr, event);
    });
    item.setAttr("draggable", "true");
    item.addEventListener("dragstart", (event) => {
      const dragManager = this.app.dragManager;
      const file_path = curr.link.split("#")[0];
      const file = this.app.metadataCache.getFirstLinkpathDest(file_path, "");
      const dragData = dragManager.dragFile(event, file);
      dragManager.onDragStart(event, dragData);
    });
    if (curr.link.indexOf("{") > -1)
      return;
    item.addEventListener("mouseover", (event) => {
      this.app.workspace.trigger("hover-link", {
        event,
        source: SMART_CONNECTIONS_VIEW_TYPE,
        hoverParent: list,
        targetEl: item,
        linktext: curr.link
      });
    });
  }
  // get target file from link path
  // if sub-section is linked, open file and scroll to sub-section
  async open_note(curr, event = null) {
    let targetFile;
    let heading;
    if (curr.link.indexOf("#") > -1) {
      targetFile = this.app.metadataCache.getFirstLinkpathDest(curr.link.split("#")[0], "");
      const target_file_cache = this.app.metadataCache.getFileCache(targetFile);
      let heading_text = curr.link.split("#").pop();
      let occurence = 0;
      if (heading_text.indexOf("{") > -1) {
        occurence = parseInt(heading_text.split("{")[1].split("}")[0]);
        heading_text = heading_text.split("{")[0];
      }
      const headings = target_file_cache.headings;
      for (let i = 0; i < headings.length; i++) {
        if (headings[i].heading === heading_text) {
          if (occurence === 0) {
            heading = headings[i];
            break;
          }
          occurence--;
        }
      }
    } else {
      targetFile = this.app.metadataCache.getFirstLinkpathDest(curr.link, "");
    }
    let leaf;
    if (event) {
      const mod = Obsidian.Keymap.isModEvent(event);
      leaf = this.app.workspace.getLeaf(mod);
    } else {
      leaf = this.app.workspace.getMostRecentLeaf();
    }
    await leaf.openFile(targetFile);
    if (heading) {
      let { editor } = leaf.view;
      const pos = { line: heading.position.start.line, ch: 0 };
      editor.setCursor(pos);
      editor.scrollIntoView({ to: pos, from: pos }, true);
    }
  }
  render_block_context(block) {
    const block_headings = block.link.split(".md")[1].split("#");
    let block_context = "";
    for (let i = block_headings.length - 1; i >= 0; i--) {
      if (block_context.length > 0) {
        block_context = ` > ${block_context}`;
      }
      block_context = block_headings[i] + block_context;
      if (block_context.length > 100) {
        break;
      }
    }
    if (block_context.startsWith(" > ")) {
      block_context = block_context.slice(3);
    }
    return block_context;
  }
  renderable_file_type(link) {
    return link.indexOf(".md") !== -1 && link.indexOf(".excalidraw") === -1;
  }
  render_external_link_elm(meta) {
    if (meta.source) {
      if (meta.source === "Gmail")
        meta.source = "\u{1F4E7} Gmail";
      return `<small>${meta.source}</small><br>${meta.title}`;
    }
    let domain = meta.path.replace(/(^\w+:|^)\/\//, "");
    domain = domain.split("/")[0];
    return `<small>\u{1F310} ${domain}</small><br>${meta.title}`;
  }
  // get all folders
  async get_all_folders() {
    if (!this.folders || this.folders.length === 0) {
      this.folders = await this.get_folders();
    }
    return this.folders;
  }
  // get folders, traverse non-hidden sub-folders
  async get_folders(path = "/") {
    let folders = (await this.app.vault.adapter.list(path)).folders;
    let folder_list = [];
    for (let i = 0; i < folders.length; i++) {
      if (folders[i].startsWith("."))
        continue;
      folder_list.push(folders[i]);
      folder_list = folder_list.concat(await this.get_folders(folders[i] + "/"));
    }
    return folder_list;
  }
  async sync_notes() {
    if (!this.settings.license_key) {
      new Obsidian.Notice("Smart Connections: Supporter license key is required to sync notes to the ChatGPT Plugin server.");
      return;
    }
    console.log("syncing notes");
    const files = this.app.vault.getMarkdownFiles().filter((file) => {
      for (let i = 0; i < this.file_exclusions.length; i++) {
        if (file.path.indexOf(this.file_exclusions[i]) > -1) {
          return false;
        }
      }
      return true;
    });
    const notes = await this.build_notes_object(files);
    console.log("object built");
    await this.app.vault.adapter.write(".smart-connections/notes.json", JSON.stringify(notes, null, 2));
    console.log("notes saved");
    console.log(this.settings.license_key);
    const response = await (0, Obsidian.requestUrl)({
      url: "https://sync.smartconnections.app/sync",
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      contentType: "application/json",
      body: JSON.stringify({
        license_key: this.settings.license_key,
        notes
      })
    });
    console.log(response);
  }
  async build_notes_object(files) {
    let output = {};
    for (let i = 0; i < files.length; i++) {
      let file = files[i];
      let parts = file.path.split("/");
      let current = output;
      for (let ii = 0; ii < parts.length; ii++) {
        let part = parts[ii];
        if (ii === parts.length - 1) {
          current[part] = await this.app.vault.cachedRead(file);
        } else {
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }
      }
    }
    return output;
  }
};
var SMART_CONNECTIONS_VIEW_TYPE = "smart-connections-view";
var SmartConnectionsView = class extends Obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.nearest = null;
    this.load_wait = null;
  }
  getViewType() {
    return SMART_CONNECTIONS_VIEW_TYPE;
  }
  getDisplayText() {
    return "Smart Connections Files";
  }
  getIcon() {
    return "smart-connections";
  }
  set_message(message) {
    const container = this.containerEl.children[1];
    container.empty();
    this.initiate_top_bar(container);
    if (Array.isArray(message)) {
      for (let i = 0; i < message.length; i++) {
        container.createEl("p", { cls: "sc_message", text: message[i] });
      }
    } else {
      container.createEl("p", { cls: "sc_message", text: message });
    }
  }
  render_link_text(link, show_full_path = false) {
    if (!show_full_path) {
      link = link.split("/").pop();
    }
    if (link.indexOf("#") > -1) {
      link = link.split(".md");
      link[0] = `<small>${link[0]}</small><br>`;
      link = link.join("");
      link = link.replace(/\#/g, " \xBB ");
    } else {
      link = link.replace(".md", "");
    }
    return link;
  }
  set_nearest(nearest, nearest_context = null, results_only = false) {
    const container = this.containerEl.children[1];
    if (!results_only) {
      container.empty();
      this.initiate_top_bar(container, nearest_context);
    }
    this.plugin.update_results(container, nearest);
  }
  initiate_top_bar(container, nearest_context = null) {
    let top_bar;
    if (container.children.length > 0 && container.children[0].classList.contains("sc-top-bar")) {
      top_bar = container.children[0];
      top_bar.empty();
    } else {
      top_bar = container.createEl("div", { cls: "sc-top-bar" });
    }
    if (nearest_context) {
      top_bar.createEl("p", { cls: "sc-context", text: nearest_context });
    }
    const chat_button = top_bar.createEl("button", { cls: "sc-chat-button" });
    Obsidian.setIcon(chat_button, "message-square");
    chat_button.addEventListener("click", () => {
      this.plugin.open_chat();
    });
    const search_button = top_bar.createEl("button", { cls: "sc-search-button" });
    Obsidian.setIcon(search_button, "search");
    search_button.addEventListener("click", () => {
      top_bar.empty();
      const search_container = top_bar.createEl("div", { cls: "search-input-container" });
      const input = search_container.createEl("input", {
        cls: "sc-search-input",
        type: "search",
        placeholder: "Type to start search..."
      });
      input.focus();
      input.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          this.clear_auto_searcher();
          this.initiate_top_bar(container, nearest_context);
        }
      });
      input.addEventListener("keyup", (event) => {
        this.clear_auto_searcher();
        const search_term = input.value;
        if (event.key === "Enter" && search_term !== "") {
          this.search(search_term);
        } else if (search_term !== "") {
          clearTimeout(this.search_timeout);
          this.search_timeout = setTimeout(() => {
            this.search(search_term, true);
          }, 700);
        }
      });
    });
  }
  // render buttons: "create" and "retry" for loading embeddings.json file
  render_embeddings_buttons() {
    const container = this.containerEl.children[1];
    container.empty();
    container.createEl("h2", { cls: "scHeading", text: "Embeddings file not found" });
    const button_div = container.createEl("div", { cls: "scButtonDiv" });
    const create_button = button_div.createEl("button", { cls: "scButton", text: "Create embeddings.json" });
    button_div.createEl("p", { cls: "scButtonNote", text: "Warning: Creating embeddings.json file will trigger bulk embedding and may take a while" });
    const retry_button = button_div.createEl("button", { cls: "scButton", text: "Retry" });
    button_div.createEl("p", { cls: "scButtonNote", text: "If embeddings.json file already exists, click 'Retry' to load it" });
    create_button.addEventListener("click", async (event) => {
      await this.plugin.smart_vec_lite.init_embeddings_file();
      await this.render_connections();
    });
    retry_button.addEventListener("click", async (event) => {
      console.log("retrying to load embeddings.json file");
      await this.plugin.init_vecs();
      await this.render_connections();
    });
  }
  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.createEl("p", { cls: "scPlaceholder", text: "Open a note to find connections." });
    this.plugin.registerEvent(this.app.workspace.on("file-open", (file) => {
      if (!file) {
        return;
      }
      if (SUPPORTED_FILE_TYPES.indexOf(file.extension) === -1) {
        return this.set_message([
          "File: " + file.name,
          "Unsupported file type (Supported: " + SUPPORTED_FILE_TYPES.join(", ") + ")"
        ]);
      }
      if (this.load_wait) {
        clearTimeout(this.load_wait);
      }
      this.load_wait = setTimeout(() => {
        this.render_connections(file);
        this.load_wait = null;
      }, 1e3);
    }));
    this.app.workspace.registerHoverLinkSource(SMART_CONNECTIONS_VIEW_TYPE, {
      display: "Smart Connections Files",
      defaultMod: true
    });
    this.app.workspace.registerHoverLinkSource(SMART_CONNECTIONS_CHAT_VIEW_TYPE, {
      display: "Smart Chat Links",
      defaultMod: true
    });
    this.app.workspace.onLayoutReady(this.initialize.bind(this));
  }
  async initialize() {
    this.set_message("Loading embeddings file...");
    const vecs_intiated = await this.plugin.init_vecs();
    if (vecs_intiated) {
      this.set_message("Embeddings file loaded.");
      await this.render_connections();
    } else {
      this.render_embeddings_buttons();
    }
    this.api = new SmartConnectionsViewApi(this.app, this.plugin, this);
    (window["SmartConnectionsViewApi"] = this.api) && this.register(() => delete window["SmartConnectionsViewApi"]);
  }
  async onClose() {
    console.log("closing smart connections view");
    this.app.workspace.unregisterHoverLinkSource(SMART_CONNECTIONS_VIEW_TYPE);
    this.plugin.view = null;
  }
  async render_connections(context = null) {
    console.log("rendering connections");
    if (!this.plugin.settings.api_key) {
      this.set_message("An OpenAI API key is required to make Smart Connections");
      return;
    }
    if (!this.plugin.embeddings_loaded) {
      await this.plugin.init_vecs();
    }
    if (!this.plugin.embeddings_loaded) {
      console.log("embeddings files still not loaded or yet to be created");
      this.render_embeddings_buttons();
      return;
    }
    this.set_message("Making Smart Connections...");
    if (typeof context === "string") {
      const highlighted_text = context;
      await this.search(highlighted_text);
      return;
    }
    this.nearest = null;
    this.interval_count = 0;
    this.rendering = false;
    this.file = context;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.interval = setInterval(() => {
      if (!this.rendering) {
        if (this.file instanceof Obsidian.TFile) {
          this.rendering = true;
          this.render_note_connections(this.file);
        } else {
          this.file = this.app.workspace.getActiveFile();
          if (!this.file && this.count > 1) {
            clearInterval(this.interval);
            this.set_message("No active file");
            return;
          }
        }
      } else {
        if (this.nearest) {
          clearInterval(this.interval);
          if (typeof this.nearest === "string") {
            this.set_message(this.nearest);
          } else {
            this.set_nearest(this.nearest, "File: " + this.file.name);
          }
          if (this.plugin.render_log.failed_embeddings.length > 0) {
            this.plugin.save_failed_embeddings();
          }
          this.plugin.output_render_log();
          return;
        } else {
          this.interval_count++;
          this.set_message("Making Smart Connections..." + this.interval_count);
        }
      }
    }, 10);
  }
  async render_note_connections(file) {
    this.nearest = await this.plugin.find_note_connections(file);
  }
  clear_auto_searcher() {
    if (this.search_timeout) {
      clearTimeout(this.search_timeout);
      this.search_timeout = null;
    }
  }
  async search(search_text, results_only = false) {
    const nearest = await this.plugin.api.search(search_text);
    const nearest_context = `Selection: "${search_text.length > 100 ? search_text.substring(0, 100) + "..." : search_text}"`;
    this.set_nearest(nearest, nearest_context, results_only);
  }
};
var SmartConnectionsViewApi = class {
  constructor(app, plugin, view) {
    this.app = app;
    this.plugin = plugin;
    this.view = view;
  }
  async search(search_text) {
    return await this.plugin.api.search(search_text);
  }
  // trigger reload of embeddings file
  async reload_embeddings_file() {
    await this.plugin.init_vecs();
    await this.view.render_connections();
  }
};
var ScSearchApi = class {
  constructor(app, plugin) {
    this.app = app;
    this.plugin = plugin;
  }
  async search(search_text, filter = {}) {
    filter = {
      skip_sections: this.plugin.settings.skip_sections,
      ...filter
    };
    let nearest = [];
    const resp = await this.plugin.request_embedding_from_input(search_text);
    if (resp && resp.data && resp.data[0] && resp.data[0].embedding) {
      nearest = this.plugin.smart_vec_lite.nearest(resp.data[0].embedding, filter);
    } else {
      new Obsidian.Notice("Smart Connections: Error getting embedding");
    }
    return nearest;
  }
};
var SmartConnectionsSettingsTab = class extends Obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const {
      containerEl
    } = this;
    containerEl.empty();
    containerEl.createEl("h2", {
      text: "Supporter Settings"
    });
    containerEl.createEl("p", {
      text: 'As a Smart Connections "Supporter", fast-track your PKM journey with priority perks and pioneering innovations.'
    });
    const supporter_benefits_list = containerEl.createEl("ul");
    supporter_benefits_list.createEl("li", {
      text: "Enjoy swift, top-priority support."
    });
    supporter_benefits_list.createEl("li", {
      text: "Gain early access to version 2 (includes local embedding model)."
    });
    supporter_benefits_list.createEl("li", {
      text: "Stay informed and engaged with exclusive supporter-only communications."
    });
    new Obsidian.Setting(containerEl).setName("Supporter License Key").setDesc("Note: this is not required to use Smart Connections.").addText((text) => text.setPlaceholder("Enter your license_key").setValue(this.plugin.settings.license_key).onChange(async (value) => {
      this.plugin.settings.license_key = value.trim();
      await this.plugin.saveSettings(true);
    }));
    new Obsidian.Setting(containerEl).setName("Get v2").setDesc("Get v2 (warning: very early beta release, likely to crash, please send issues directly to the supporter email for quick response)").addButton((button) => button.setButtonText("Get v2 (unstable)").onClick(async () => {
      await this.plugin.update_to_v2();
    }));
    new Obsidian.Setting(containerEl).setName("Sync Notes").setDesc("Make notes available via the Smart Connections ChatGPT Plugin. Respects exclusion settings configured below.").addButton((button) => button.setButtonText("Sync Notes").onClick(async () => {
      await this.plugin.sync_notes();
    }));
    new Obsidian.Setting(containerEl).setName("Become a Supporter").setDesc("Become a Supporter").addButton((button) => button.setButtonText("Become a Supporter").onClick(async () => {
      const payment_pages = [
        "https://buy.stripe.com/9AQ5kO5QnbAWgGAbIY",
        "https://buy.stripe.com/9AQ7sWemT48u1LGcN4"
      ];
      if (!this.plugin.payment_page_index) {
        this.plugin.payment_page_index = Math.round(Math.random());
      }
      window.open(payment_pages[this.plugin.payment_page_index]);
    }));
    containerEl.createEl("h2", {
      text: "OpenAI Settings"
    });
    new Obsidian.Setting(containerEl).setName("OpenAI API Key").setDesc("Required: an OpenAI API key is currently required to use Smart Connections.").addText((text) => text.setPlaceholder("Enter your api_key").setValue(this.plugin.settings.api_key).onChange(async (value) => {
      this.plugin.settings.api_key = value.trim();
      await this.plugin.saveSettings(true);
    }));
    new Obsidian.Setting(containerEl).setName("Test API Key").setDesc("Test API Key").addButton((button) => button.setButtonText("Test API Key").onClick(async () => {
      const resp = await this.plugin.test_api_key();
      if (resp) {
        new Obsidian.Notice("Smart Connections: API key is valid");
      } else {
        new Obsidian.Notice("Smart Connections: API key is not working as expected!");
      }
    }));
    new Obsidian.Setting(containerEl).setName("Smart Chat Model").setDesc("Select a model to use with Smart Chat.").addDropdown((dropdown) => {
      dropdown.addOption("gpt-3.5-turbo-16k", "gpt-3.5-turbo-16k");
      dropdown.addOption("gpt-4", "gpt-4 (limited access, 8k)");
      dropdown.addOption("gpt-3.5-turbo", "gpt-3.5-turbo (4k)");
      dropdown.addOption("gpt-4-1106-preview", "gpt-4-turbo (128k)");
      dropdown.onChange(async (value) => {
        this.plugin.settings.smart_chat_model = value;
        await this.plugin.saveSettings();
      });
      dropdown.setValue(this.plugin.settings.smart_chat_model);
    });
    new Obsidian.Setting(containerEl).setName("Default Language").setDesc("Default language to use for Smart Chat. Changes which self-referential pronouns will trigger lookup of your notes.").addDropdown((dropdown) => {
      const languages = Object.keys(SMART_TRANSLATION);
      for (let i = 0; i < languages.length; i++) {
        dropdown.addOption(languages[i], languages[i]);
      }
      dropdown.onChange(async (value) => {
        this.plugin.settings.language = value;
        await this.plugin.saveSettings();
        self_ref_pronouns_list.setText(this.get_self_ref_list());
        const chat_view = this.app.workspace.getLeavesOfType(SMART_CONNECTIONS_CHAT_VIEW_TYPE).length > 0 ? this.app.workspace.getLeavesOfType(SMART_CONNECTIONS_CHAT_VIEW_TYPE)[0].view : null;
        if (chat_view) {
          chat_view.new_chat();
        }
      });
      dropdown.setValue(this.plugin.settings.language);
    });
    const self_ref_pronouns_list = containerEl.createEl("span", {
      text: this.get_self_ref_list()
    });
    containerEl.createEl("h2", {
      text: "Exclusions"
    });
    new Obsidian.Setting(containerEl).setName("file_exclusions").setDesc("'Excluded file' matchers separated by a comma.").addText((text) => text.setPlaceholder("drawings,prompts/logs").setValue(this.plugin.settings.file_exclusions).onChange(async (value) => {
      this.plugin.settings.file_exclusions = value;
      await this.plugin.saveSettings();
    }));
    new Obsidian.Setting(containerEl).setName("folder_exclusions").setDesc("'Excluded folder' matchers separated by a comma.").addText((text) => text.setPlaceholder("drawings,prompts/logs").setValue(this.plugin.settings.folder_exclusions).onChange(async (value) => {
      this.plugin.settings.folder_exclusions = value;
      await this.plugin.saveSettings();
    }));
    new Obsidian.Setting(containerEl).setName("path_only").setDesc("'Path only' matchers separated by a comma.").addText((text) => text.setPlaceholder("drawings,prompts/logs").setValue(this.plugin.settings.path_only).onChange(async (value) => {
      this.plugin.settings.path_only = value;
      await this.plugin.saveSettings();
    }));
    new Obsidian.Setting(containerEl).setName("header_exclusions").setDesc("'Excluded header' matchers separated by a comma. Works for 'blocks' only.").addText((text) => text.setPlaceholder("drawings,prompts/logs").setValue(this.plugin.settings.header_exclusions).onChange(async (value) => {
      this.plugin.settings.header_exclusions = value;
      await this.plugin.saveSettings();
    }));
    containerEl.createEl("h2", {
      text: "Display"
    });
    new Obsidian.Setting(containerEl).setName("show_full_path").setDesc("Show full path in view.").addToggle((toggle) => toggle.setValue(this.plugin.settings.show_full_path).onChange(async (value) => {
      this.plugin.settings.show_full_path = value;
      await this.plugin.saveSettings(true);
    }));
    new Obsidian.Setting(containerEl).setName("expanded_view").setDesc("Expanded view by default.").addToggle((toggle) => toggle.setValue(this.plugin.settings.expanded_view).onChange(async (value) => {
      this.plugin.settings.expanded_view = value;
      await this.plugin.saveSettings(true);
    }));
    new Obsidian.Setting(containerEl).setName("group_nearest_by_file").setDesc("Group nearest by file.").addToggle((toggle) => toggle.setValue(this.plugin.settings.group_nearest_by_file).onChange(async (value) => {
      this.plugin.settings.group_nearest_by_file = value;
      await this.plugin.saveSettings(true);
    }));
    new Obsidian.Setting(containerEl).setName("view_open").setDesc("Open view on Obsidian startup.").addToggle((toggle) => toggle.setValue(this.plugin.settings.view_open).onChange(async (value) => {
      this.plugin.settings.view_open = value;
      await this.plugin.saveSettings(true);
    }));
    new Obsidian.Setting(containerEl).setName("chat_open").setDesc("Open view on Obsidian startup.").addToggle((toggle) => toggle.setValue(this.plugin.settings.chat_open).onChange(async (value) => {
      this.plugin.settings.chat_open = value;
      await this.plugin.saveSettings(true);
    }));
    containerEl.createEl("h2", {
      text: "Advanced"
    });
    new Obsidian.Setting(containerEl).setName("log_render").setDesc("Log render details to console (includes token_usage).").addToggle((toggle) => toggle.setValue(this.plugin.settings.log_render).onChange(async (value) => {
      this.plugin.settings.log_render = value;
      await this.plugin.saveSettings(true);
    }));
    new Obsidian.Setting(containerEl).setName("log_render_files").setDesc("Log embedded objects paths with log render (for debugging).").addToggle((toggle) => toggle.setValue(this.plugin.settings.log_render_files).onChange(async (value) => {
      this.plugin.settings.log_render_files = value;
      await this.plugin.saveSettings(true);
    }));
    new Obsidian.Setting(containerEl).setName("skip_sections").setDesc("Skips making connections to specific sections within notes. Warning: reduces usefulness for large files and requires 'Force Refresh' for sections to work in the future.").addToggle((toggle) => toggle.setValue(this.plugin.settings.skip_sections).onChange(async (value) => {
      this.plugin.settings.skip_sections = value;
      await this.plugin.saveSettings(true);
    }));
    containerEl.createEl("h3", {
      text: "Test File Writing"
    });
    containerEl.createEl("h3", {
      text: "Manual Save"
    });
    let manual_save_results = containerEl.createEl("div");
    new Obsidian.Setting(containerEl).setName("manual_save").setDesc("Save current embeddings").addButton((button) => button.setButtonText("Manual Save").onClick(async () => {
      if (confirm("Are you sure you want to save your current embeddings?")) {
        try {
          await this.plugin.save_embeddings_to_file(true);
          manual_save_results.innerHTML = "Embeddings saved successfully.";
        } catch (e) {
          manual_save_results.innerHTML = "Embeddings failed to save. Error: " + e;
        }
      }
    }));
    containerEl.createEl("h3", {
      text: "Previously failed files"
    });
    let failed_list = containerEl.createEl("div");
    this.draw_failed_files_list(failed_list);
    containerEl.createEl("h3", {
      text: "Force Refresh"
    });
    new Obsidian.Setting(containerEl).setName("force_refresh").setDesc("WARNING: DO NOT use unless you know what you are doing! This will delete all of your current embeddings from OpenAI and trigger reprocessing of your entire vault!").addButton((button) => button.setButtonText("Force Refresh").onClick(async () => {
      if (confirm("Are you sure you want to Force Refresh? By clicking yes you confirm that you understand the consequences of this action.")) {
        await this.plugin.force_refresh_embeddings_file();
      }
    }));
  }
  get_self_ref_list() {
    return "Current: " + SMART_TRANSLATION[this.plugin.settings.language].pronous.join(", ");
  }
  draw_failed_files_list(failed_list) {
    failed_list.empty();
    if (this.plugin.settings.failed_files.length > 0) {
      failed_list.createEl("p", {
        text: "The following files failed to process and will be skipped until manually retried."
      });
      let list = failed_list.createEl("ul");
      for (let failed_file of this.plugin.settings.failed_files) {
        list.createEl("li", {
          text: failed_file
        });
      }
      new Obsidian.Setting(failed_list).setName("retry_failed_files").setDesc("Retry failed files only").addButton((button) => button.setButtonText("Retry failed files only").onClick(async () => {
        failed_list.empty();
        failed_list.createEl("p", {
          text: "Retrying failed files..."
        });
        await this.plugin.retry_failed_files();
        this.draw_failed_files_list(failed_list);
      }));
    } else {
      failed_list.createEl("p", {
        text: "No failed files"
      });
    }
  }
};
function line_is_heading(line) {
  return line.indexOf("#") === 0 && ["#", " "].indexOf(line[1]) !== -1;
}
var SMART_CONNECTIONS_CHAT_VIEW_TYPE = "smart-connections-chat-view";
var SmartConnectionsChatView = class extends Obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.active_elm = null;
    this.active_stream = null;
    this.brackets_ct = 0;
    this.chat = null;
    this.chat_box = null;
    this.chat_container = null;
    this.current_chat_ml = [];
    this.files = [];
    this.last_from = null;
    this.message_container = null;
    this.prevent_input = false;
  }
  getDisplayText() {
    return "Smart Connections Chat";
  }
  getIcon() {
    return "message-square";
  }
  getViewType() {
    return SMART_CONNECTIONS_CHAT_VIEW_TYPE;
  }
  onOpen() {
    this.new_chat();
    this.plugin.get_all_folders();
  }
  onClose() {
    this.chat.save_chat();
    this.app.workspace.unregisterHoverLinkSource(SMART_CONNECTIONS_CHAT_VIEW_TYPE);
  }
  render_chat() {
    this.containerEl.empty();
    this.chat_container = this.containerEl.createDiv("sc-chat-container");
    this.render_top_bar();
    this.render_chat_box();
    this.render_chat_input();
    this.plugin.render_brand(this.containerEl, "chat");
  }
  // render plus sign for clear button
  render_top_bar() {
    let top_bar_container = this.chat_container.createDiv("sc-top-bar-container");
    let chat_name = this.chat.name();
    let chat_name_input = top_bar_container.createEl("input", {
      attr: {
        type: "text",
        value: chat_name
      },
      cls: "sc-chat-name-input"
    });
    chat_name_input.addEventListener("change", this.rename_chat.bind(this));
    let smart_view_btn = this.create_top_bar_button(top_bar_container, "Smart View", "smart-connections");
    smart_view_btn.addEventListener("click", this.open_smart_view.bind(this));
    let save_btn = this.create_top_bar_button(top_bar_container, "Save Chat", "save");
    save_btn.addEventListener("click", this.save_chat.bind(this));
    let history_btn = this.create_top_bar_button(top_bar_container, "Chat History", "history");
    history_btn.addEventListener("click", this.open_chat_history.bind(this));
    const new_chat_btn = this.create_top_bar_button(top_bar_container, "New Chat", "plus");
    new_chat_btn.addEventListener("click", this.new_chat.bind(this));
  }
  async open_chat_history() {
    const folder = await this.app.vault.adapter.list(".smart-connections/chats");
    this.files = folder.files.map((file) => {
      return file.replace(".smart-connections/chats/", "").replace(".json", "");
    });
    if (!this.modal)
      this.modal = new SmartConnectionsChatHistoryModal(this.app, this);
    this.modal.open();
  }
  create_top_bar_button(top_bar_container, title, icon = null) {
    let btn = top_bar_container.createEl("button", {
      attr: {
        title
      }
    });
    if (icon) {
      Obsidian.setIcon(btn, icon);
    } else {
      btn.innerHTML = title;
    }
    return btn;
  }
  // render new chat
  new_chat() {
    this.clear_chat();
    this.render_chat();
    this.new_messsage_bubble("assistant");
    this.active_elm.innerHTML = "<p>" + SMART_TRANSLATION[this.plugin.settings.language].initial_message + "</p>";
  }
  // open a chat from the chat history modal
  async open_chat(chat_id) {
    this.clear_chat();
    await this.chat.load_chat(chat_id);
    this.render_chat();
    for (let i = 0; i < this.chat.chat_ml.length; i++) {
      await this.render_message(this.chat.chat_ml[i].content, this.chat.chat_ml[i].role);
    }
  }
  // clear current chat state
  clear_chat() {
    if (this.chat) {
      this.chat.save_chat();
    }
    this.chat = new SmartConnectionsChatModel(this.plugin);
    if (this.dotdotdot_interval) {
      clearInterval(this.dotdotdot_interval);
    }
    this.current_chat_ml = [];
    this.end_stream();
  }
  rename_chat(event) {
    let new_chat_name = event.target.value;
    this.chat.rename_chat(new_chat_name);
  }
  // save current chat
  save_chat() {
    this.chat.save_chat();
    new Obsidian.Notice("[Smart Connections] Chat saved");
  }
  open_smart_view() {
    this.plugin.open_view();
  }
  // render chat messages container
  render_chat_box() {
    this.chat_box = this.chat_container.createDiv("sc-chat-box");
    this.message_container = this.chat_box.createDiv("sc-message-container");
  }
  // open file suggestion modal
  open_file_suggestion_modal() {
    if (!this.file_selector)
      this.file_selector = new SmartConnectionsFileSelectModal(this.app, this);
    this.file_selector.open();
  }
  // open folder suggestion modal
  async open_folder_suggestion_modal() {
    if (!this.folder_selector) {
      this.folder_selector = new SmartConnectionsFolderSelectModal(this.app, this);
    }
    this.folder_selector.open();
  }
  // insert_selection from file suggestion modal
  insert_selection(insert_text) {
    let caret_pos = this.textarea.selectionStart;
    let text_before = this.textarea.value.substring(0, caret_pos);
    let text_after = this.textarea.value.substring(caret_pos, this.textarea.value.length);
    this.textarea.value = text_before + insert_text + text_after;
    this.textarea.selectionStart = caret_pos + insert_text.length;
    this.textarea.selectionEnd = caret_pos + insert_text.length;
    this.textarea.focus();
  }
  // render chat textarea and button
  render_chat_input() {
    let chat_input = this.chat_container.createDiv("sc-chat-form");
    this.textarea = chat_input.createEl("textarea", {
      cls: "sc-chat-input",
      attr: {
        placeholder: `Try "Based on my notes" or "Summarize [[this note]]" or "Important tasks in /folder/"`
      }
    });
    chat_input.addEventListener("keyup", (e) => {
      if (["[", "/"].indexOf(e.key) === -1)
        return;
      const caret_pos = this.textarea.selectionStart;
      if (e.key === "[") {
        if (this.textarea.value[caret_pos - 2] === "[") {
          this.open_file_suggestion_modal();
          return;
        }
      } else {
        this.brackets_ct = 0;
      }
      if (e.key === "/") {
        if (this.textarea.value.length === 1 || this.textarea.value[caret_pos - 2] === " ") {
          this.open_folder_suggestion_modal();
          return;
        }
      }
    });
    chat_input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        if (this.prevent_input) {
          console.log("wait until current response is finished");
          new Obsidian.Notice("[Smart Connections] Wait until current response is finished");
          return;
        }
        let user_input = this.textarea.value;
        this.textarea.value = "";
        this.initialize_response(user_input);
      }
      this.textarea.style.height = "auto";
      this.textarea.style.height = this.textarea.scrollHeight + "px";
    });
    let button_container = chat_input.createDiv("sc-button-container");
    let abort_button = button_container.createEl("span", { attr: { id: "sc-abort-button", style: "display: none;" } });
    Obsidian.setIcon(abort_button, "square");
    abort_button.addEventListener("click", () => {
      this.end_stream();
    });
    let button = button_container.createEl("button", { attr: { id: "sc-send-button" }, cls: "send-button" });
    button.innerHTML = "Send";
    button.addEventListener("click", () => {
      if (this.prevent_input) {
        console.log("wait until current response is finished");
        new Obsidian.Notice("Wait until current response is finished");
        return;
      }
      let user_input = this.textarea.value;
      this.textarea.value = "";
      this.initialize_response(user_input);
    });
  }
  async initialize_response(user_input) {
    this.set_streaming_ux();
    await this.render_message(user_input, "user");
    this.chat.new_message_in_thread({
      role: "user",
      content: user_input
    });
    await this.render_dotdotdot();
    if (this.chat.contains_internal_link(user_input)) {
      this.chat.get_response_with_note_context(user_input, this);
      return;
    }
    if (this.contains_self_referential_keywords(user_input) || this.chat.contains_folder_reference(user_input)) {
      const context = await this.get_context_hyde(user_input);
      const chatml = [
        {
          role: "system",
          // content: context_input
          content: context
        },
        {
          role: "user",
          content: user_input
        }
      ];
      this.request_chatgpt_completion({ messages: chatml, temperature: 0 });
      return;
    }
    this.request_chatgpt_completion();
  }
  async render_dotdotdot() {
    if (this.dotdotdot_interval)
      clearInterval(this.dotdotdot_interval);
    await this.render_message("...", "assistant");
    let dots = 0;
    this.active_elm.innerHTML = "...";
    this.dotdotdot_interval = setInterval(() => {
      dots++;
      if (dots > 3)
        dots = 1;
      this.active_elm.innerHTML = ".".repeat(dots);
    }, 500);
  }
  set_streaming_ux() {
    this.prevent_input = true;
    if (document.getElementById("sc-send-button"))
      document.getElementById("sc-send-button").style.display = "none";
    if (document.getElementById("sc-abort-button"))
      document.getElementById("sc-abort-button").style.display = "block";
  }
  unset_streaming_ux() {
    this.prevent_input = false;
    if (document.getElementById("sc-send-button"))
      document.getElementById("sc-send-button").style.display = "";
    if (document.getElementById("sc-abort-button"))
      document.getElementById("sc-abort-button").style.display = "none";
  }
  // check if includes keywords referring to one's own notes
  contains_self_referential_keywords(user_input) {
    const matches = user_input.match(this.plugin.self_ref_kw_regex);
    if (matches)
      return true;
    return false;
  }
  // render message
  async render_message(message, from = "assistant", append_last = false) {
    if (this.dotdotdot_interval) {
      clearInterval(this.dotdotdot_interval);
      this.dotdotdot_interval = null;
      this.active_elm.innerHTML = "";
    }
    if (append_last) {
      this.current_message_raw += message;
      if (message.indexOf("\n") === -1) {
        this.active_elm.innerHTML += message;
      } else {
        this.active_elm.innerHTML = "";
        await Obsidian.MarkdownRenderer.renderMarkdown(this.current_message_raw, this.active_elm, "?no-dataview", new Obsidian.Component());
      }
    } else {
      this.current_message_raw = "";
      if (this.chat.thread.length === 0 || this.last_from !== from) {
        this.new_messsage_bubble(from);
      }
      this.active_elm.innerHTML = "";
      await Obsidian.MarkdownRenderer.renderMarkdown(message, this.active_elm, "?no-dataview", new Obsidian.Component());
      this.handle_links_in_message();
      this.render_message_action_buttons(message);
    }
    this.message_container.scrollTop = this.message_container.scrollHeight;
  }
  render_message_action_buttons(message) {
    if (this.chat.context && this.chat.hyd) {
      const context_view = this.active_elm.createEl("span", {
        cls: "sc-msg-button",
        attr: {
          title: "Copy context to clipboard"
          /* tooltip */
        }
      });
      const this_hyd = this.chat.hyd;
      Obsidian.setIcon(context_view, "eye");
      context_view.addEventListener("click", () => {
        navigator.clipboard.writeText("```smart-connections\n" + this_hyd + "\n```\n");
        new Obsidian.Notice("[Smart Connections] Context code block copied to clipboard");
      });
    }
    if (this.chat.context) {
      const copy_prompt_button = this.active_elm.createEl("span", {
        cls: "sc-msg-button",
        attr: {
          title: "Copy prompt to clipboard"
          /* tooltip */
        }
      });
      const this_context = this.chat.context.replace(/\`\`\`/g, "	```").trimLeft();
      Obsidian.setIcon(copy_prompt_button, "files");
      copy_prompt_button.addEventListener("click", () => {
        navigator.clipboard.writeText("```prompt-context\n" + this_context + "\n```\n");
        new Obsidian.Notice("[Smart Connections] Context copied to clipboard");
      });
    }
    const copy_button = this.active_elm.createEl("span", {
      cls: "sc-msg-button",
      attr: {
        title: "Copy message to clipboard"
        /* tooltip */
      }
    });
    Obsidian.setIcon(copy_button, "copy");
    copy_button.addEventListener("click", () => {
      navigator.clipboard.writeText(message.trimLeft());
      new Obsidian.Notice("[Smart Connections] Message copied to clipboard");
    });
  }
  handle_links_in_message() {
    const links = this.active_elm.querySelectorAll("a");
    if (links.length > 0) {
      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        const link_text = link.getAttribute("data-href");
        link.addEventListener("mouseover", (event) => {
          this.app.workspace.trigger("hover-link", {
            event,
            source: SMART_CONNECTIONS_CHAT_VIEW_TYPE,
            hoverParent: link.parentElement,
            targetEl: link,
            // extract link text from a.data-href
            linktext: link_text
          });
        });
        link.addEventListener("click", (event) => {
          const link_tfile = this.app.metadataCache.getFirstLinkpathDest(link_text, "/");
          const mod = Obsidian.Keymap.isModEvent(event);
          let leaf = this.app.workspace.getLeaf(mod);
          leaf.openFile(link_tfile);
        });
      }
    }
  }
  new_messsage_bubble(from) {
    let message_el = this.message_container.createDiv(`sc-message ${from}`);
    this.active_elm = message_el.createDiv("sc-message-content");
    this.last_from = from;
  }
  async request_chatgpt_completion(opts = {}) {
    const chat_ml = opts.messages || opts.chat_ml || this.chat.prepare_chat_ml();
    console.log("chat_ml", chat_ml);
    const max_total_tokens = Math.round(get_max_chars(this.plugin.settings.smart_chat_model) / 4);
    console.log("max_total_tokens", max_total_tokens);
    const curr_token_est = Math.round(JSON.stringify(chat_ml).length / 3);
    console.log("curr_token_est", curr_token_est);
    let max_available_tokens = max_total_tokens - curr_token_est;
    if (max_available_tokens < 0)
      max_available_tokens = 200;
    else if (max_available_tokens > 4096)
      max_available_tokens = 4096;
    console.log("max_available_tokens", max_available_tokens);
    opts = {
      model: this.plugin.settings.smart_chat_model,
      messages: chat_ml,
      // max_tokens: 250,
      max_tokens: max_available_tokens,
      temperature: 0.3,
      top_p: 1,
      presence_penalty: 0,
      frequency_penalty: 0,
      stream: true,
      stop: null,
      n: 1,
      // logit_bias: logit_bias,
      ...opts
    };
    if (opts.stream) {
      const full_str = await new Promise((resolve, reject) => {
        try {
          const url = "https://api.openai.com/v1/chat/completions";
          this.active_stream = new ScStreamer(url, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.plugin.settings.api_key}`
            },
            method: "POST",
            payload: JSON.stringify(opts)
          });
          let txt = "";
          this.active_stream.addEventListener("message", (e) => {
            if (e.data != "[DONE]") {
              const payload = JSON.parse(e.data);
              const text = payload.choices[0].delta.content;
              if (!text) {
                return;
              }
              txt += text;
              this.render_message(text, "assistant", true);
            } else {
              this.end_stream();
              resolve(txt);
            }
          });
          this.active_stream.addEventListener("readystatechange", (e) => {
            if (e.readyState >= 2) {
              console.log("ReadyState: " + e.readyState);
            }
          });
          this.active_stream.addEventListener("error", (e) => {
            console.error(e);
            new Obsidian.Notice("Smart Connections Error Streaming Response. See console for details.");
            this.render_message("*API Error. See console logs for details.*", "assistant");
            this.end_stream();
            reject(e);
          });
          this.active_stream.stream();
        } catch (err) {
          console.error(err);
          new Obsidian.Notice("Smart Connections Error Streaming Response. See console for details.");
          this.end_stream();
          reject(err);
        }
      });
      await this.render_message(full_str, "assistant");
      this.chat.new_message_in_thread({
        role: "assistant",
        content: full_str
      });
      return;
    } else {
      try {
        const response = await (0, Obsidian.requestUrl)({
          url: `https://api.openai.com/v1/chat/completions`,
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.plugin.settings.api_key}`,
            "Content-Type": "application/json"
          },
          contentType: "application/json",
          body: JSON.stringify(opts),
          throw: false
        });
        return JSON.parse(response.text).choices[0].message.content;
      } catch (err) {
        new Obsidian.Notice(`Smart Connections API Error :: ${err}`);
      }
    }
  }
  end_stream() {
    if (this.active_stream) {
      this.active_stream.close();
      this.active_stream = null;
    }
    this.unset_streaming_ux();
    if (this.dotdotdot_interval) {
      clearInterval(this.dotdotdot_interval);
      this.dotdotdot_interval = null;
      this.active_elm.parentElement.remove();
      this.active_elm = null;
    }
  }
  async get_context_hyde(user_input) {
    this.chat.reset_context();
    const hyd_input = `Anticipate what the user is seeking. Respond in the form of a hypothetical note written by the user. The note may contain statements as paragraphs, lists, or checklists in markdown format with no headings. Please respond with one hypothetical note and abstain from any other commentary. Use the format: PARENT FOLDER NAME > CHILD FOLDER NAME > FILE NAME > HEADING 1 > HEADING 2 > HEADING 3: HYPOTHETICAL NOTE CONTENTS.`;
    const chatml = [
      {
        role: "system",
        content: hyd_input
      },
      {
        role: "user",
        content: user_input
      }
    ];
    const hyd = await this.request_chatgpt_completion({
      messages: chatml,
      stream: false,
      temperature: 0,
      max_tokens: 137
    });
    this.chat.hyd = hyd;
    let filter = {};
    if (this.chat.contains_folder_reference(user_input)) {
      const folder_refs = this.chat.get_folder_references(user_input);
      if (folder_refs) {
        filter = {
          path_begins_with: folder_refs
        };
      }
    }
    let nearest = await this.plugin.api.search(hyd, filter);
    console.log("nearest", nearest.length);
    nearest = this.get_nearest_until_next_dev_exceeds_std_dev(nearest);
    console.log("nearest after std dev slice", nearest.length);
    nearest = this.sort_by_len_adjusted_similarity(nearest);
    return await this.get_context_for_prompt(nearest);
  }
  sort_by_len_adjusted_similarity(nearest) {
    nearest = nearest.sort((a, b) => {
      const a_score = a.similarity / a.len;
      const b_score = b.similarity / b.len;
      if (a_score > b_score)
        return -1;
      if (a_score < b_score)
        return 1;
      return 0;
    });
    return nearest;
  }
  get_nearest_until_next_dev_exceeds_std_dev(nearest) {
    const sim = nearest.map((n) => n.similarity);
    const mean = sim.reduce((a, b) => a + b) / sim.length;
    let std_dev = Math.sqrt(sim.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / sim.length);
    let slice_i = 0;
    while (slice_i < nearest.length) {
      const next = nearest[slice_i + 1];
      if (next) {
        const next_dev = Math.abs(next.similarity - nearest[slice_i].similarity);
        if (next_dev > std_dev) {
          if (slice_i < 3)
            std_dev = std_dev * 1.5;
          else
            break;
        }
      }
      slice_i++;
    }
    nearest = nearest.slice(0, slice_i + 1);
    return nearest;
  }
  // this.test_get_nearest_until_next_dev_exceeds_std_dev();
  // // test get_nearest_until_next_dev_exceeds_std_dev
  // test_get_nearest_until_next_dev_exceeds_std_dev() {
  //   const nearest = [{similarity: 0.99}, {similarity: 0.98}, {similarity: 0.97}, {similarity: 0.96}, {similarity: 0.95}, {similarity: 0.94}, {similarity: 0.93}, {similarity: 0.92}, {similarity: 0.91}, {similarity: 0.9}, {similarity: 0.79}, {similarity: 0.78}, {similarity: 0.77}, {similarity: 0.76}, {similarity: 0.75}, {similarity: 0.74}, {similarity: 0.73}, {similarity: 0.72}];
  //   const result = this.get_nearest_until_next_dev_exceeds_std_dev(nearest);
  //   if(result.length !== 10){
  //     console.error("get_nearest_until_next_dev_exceeds_std_dev failed", result);
  //   }
  // }
  async get_context_for_prompt(nearest) {
    let context = [];
    const MAX_SOURCES = this.plugin.settings.smart_chat_model === "gpt-4-1106-preview" ? 42 : 20;
    const MAX_CHARS = get_max_chars(this.plugin.settings.smart_chat_model) / 2;
    let char_accum = 0;
    for (let i = 0; i < nearest.length; i++) {
      if (context.length >= MAX_SOURCES)
        break;
      if (char_accum >= MAX_CHARS)
        break;
      if (typeof nearest[i].link !== "string")
        continue;
      const breadcrumbs = nearest[i].link.replace(/#/g, " > ").replace(".md", "").replace(/\//g, " > ");
      let new_context = `${breadcrumbs}:
`;
      const max_available_chars = MAX_CHARS - char_accum - new_context.length;
      if (nearest[i].link.indexOf("#") !== -1) {
        new_context += await this.plugin.block_retriever(nearest[i].link, { max_chars: max_available_chars });
      } else {
        new_context += await this.plugin.file_retriever(nearest[i].link, { max_chars: max_available_chars });
      }
      char_accum += new_context.length;
      context.push({
        link: nearest[i].link,
        text: new_context
      });
    }
    console.log("context sources: " + context.length);
    console.log("total context tokens: ~" + Math.round(char_accum / 3.5));
    this.chat.context = `Anticipate the type of answer desired by the user. Imagine the following ${context.length} notes were written by the user and contain all the necessary information to answer the user's question. Begin responses with "${SMART_TRANSLATION[this.plugin.settings.language].prompt}..."`;
    for (let i = 0; i < context.length; i++) {
      this.chat.context += `
---BEGIN #${i + 1}---
${context[i].text}
---END #${i + 1}---`;
    }
    return this.chat.context;
  }
};
function get_max_chars(model = "gpt-3.5-turbo") {
  const MAX_CHAR_MAP = {
    "gpt-3.5-turbo-16k": 48e3,
    "gpt-4": 24e3,
    "gpt-3.5-turbo": 12e3,
    "gpt-4-1106-preview": 2e5
  };
  return MAX_CHAR_MAP[model];
}
var SmartConnectionsChatModel = class {
  constructor(plugin) {
    this.app = plugin.app;
    this.plugin = plugin;
    this.chat_id = null;
    this.chat_ml = [];
    this.context = null;
    this.hyd = null;
    this.thread = [];
  }
  async save_chat() {
    if (this.thread.length === 0)
      return;
    if (!await this.app.vault.adapter.exists(".smart-connections/chats")) {
      await this.app.vault.adapter.mkdir(".smart-connections/chats");
    }
    if (!this.chat_id) {
      this.chat_id = this.name() + "\u2014" + this.get_file_date_string();
    }
    if (!this.chat_id.match(/^[a-zA-Z0-9_—\- ]+$/)) {
      console.log("Invalid chat_id: " + this.chat_id);
      new Obsidian.Notice("[Smart Connections] Failed to save chat. Invalid chat_id: '" + this.chat_id + "'");
    }
    const chat_file = this.chat_id + ".json";
    this.app.vault.adapter.write(
      ".smart-connections/chats/" + chat_file,
      JSON.stringify(this.thread, null, 2)
    );
  }
  async load_chat(chat_id) {
    this.chat_id = chat_id;
    const chat_file = this.chat_id + ".json";
    let chat_json = await this.app.vault.adapter.read(
      ".smart-connections/chats/" + chat_file
    );
    this.thread = JSON.parse(chat_json);
    this.chat_ml = this.prepare_chat_ml();
  }
  // prepare chat_ml from chat
  // gets the last message of each turn unless turn_variation_offsets=[[turn_index,variation_index]] is specified in offset
  prepare_chat_ml(turn_variation_offsets = []) {
    if (turn_variation_offsets.length === 0) {
      this.chat_ml = this.thread.map((turn) => {
        return turn[turn.length - 1];
      });
    } else {
      let turn_variation_index = [];
      for (let i = 0; i < turn_variation_offsets.length; i++) {
        turn_variation_index[turn_variation_offsets[i][0]] = turn_variation_offsets[i][1];
      }
      this.chat_ml = this.thread.map((turn, turn_index) => {
        if (turn_variation_index[turn_index] !== void 0) {
          return turn[turn_variation_index[turn_index]];
        }
        return turn[turn.length - 1];
      });
    }
    this.chat_ml = this.chat_ml.map((message) => {
      return {
        role: message.role,
        content: message.content
      };
    });
    return this.chat_ml;
  }
  last() {
    return this.thread[this.thread.length - 1][this.thread[this.thread.length - 1].length - 1];
  }
  last_from() {
    return this.last().role;
  }
  // returns user_input or completion
  last_message() {
    return this.last().content;
  }
  // message={}
  // add new message to thread
  new_message_in_thread(message, turn = -1) {
    if (this.context) {
      message.context = this.context;
      this.context = null;
    }
    if (this.hyd) {
      message.hyd = this.hyd;
      this.hyd = null;
    }
    if (turn === -1) {
      this.thread.push([message]);
    } else {
      this.thread[turn].push(message);
    }
  }
  reset_context() {
    this.context = null;
    this.hyd = null;
  }
  async rename_chat(new_name) {
    if (this.chat_id && await this.app.vault.adapter.exists(".smart-connections/chats/" + this.chat_id + ".json")) {
      new_name = this.chat_id.replace(this.name(), new_name);
      await this.app.vault.adapter.rename(
        ".smart-connections/chats/" + this.chat_id + ".json",
        ".smart-connections/chats/" + new_name + ".json"
      );
      this.chat_id = new_name;
    } else {
      this.chat_id = new_name + "\u2014" + this.get_file_date_string();
      await this.save_chat();
    }
  }
  name() {
    if (this.chat_id) {
      return this.chat_id.replace(/—[^—]*$/, "");
    }
    return "UNTITLED";
  }
  get_file_date_string() {
    return (/* @__PURE__ */ new Date()).toISOString().replace(/(T|:|\..*)/g, " ").trim();
  }
  // get response from with note context
  async get_response_with_note_context(user_input, chat_view) {
    let system_input = "Imagine the following notes were written by the user and contain the necessary information to synthesize a useful answer the user's query:\n";
    const notes = this.extract_internal_links(user_input);
    let max_chars = get_max_chars(this.plugin.settings.smart_chat_model);
    for (let i = 0; i < notes.length; i++) {
      const this_max_chars = notes.length - i > 1 ? Math.floor(max_chars / (notes.length - i)) : max_chars;
      const note_content = await this.get_note_contents(notes[i], { char_limit: this_max_chars });
      system_input += `---BEGIN NOTE: [[${notes[i].basename}]]---
`;
      system_input += note_content;
      system_input += `---END NOTE---
`;
      max_chars -= note_content.length;
      if (max_chars <= 0)
        break;
    }
    this.context = system_input;
    const chatml = [
      {
        role: "system",
        content: system_input
      },
      {
        role: "user",
        content: user_input
      }
    ];
    chat_view.request_chatgpt_completion({ messages: chatml, temperature: 0 });
  }
  // check if contains internal link
  contains_internal_link(user_input) {
    if (user_input.indexOf("[[") === -1)
      return false;
    if (user_input.indexOf("]]") === -1)
      return false;
    return true;
  }
  // check if contains folder reference (ex. /folder/, or /folder/subfolder/)
  contains_folder_reference(user_input) {
    if (user_input.indexOf("/") === -1)
      return false;
    if (user_input.indexOf("/") === user_input.lastIndexOf("/"))
      return false;
    return true;
  }
  // get folder references from user input
  get_folder_references(user_input) {
    const folders = this.plugin.folders.slice();
    const matches = folders.sort((a, b) => b.length - a.length).map((folder) => {
      if (user_input.indexOf(folder) !== -1) {
        user_input = user_input.replace(folder, "");
        return folder;
      }
      return false;
    }).filter((folder) => folder);
    console.log(matches);
    if (matches)
      return matches;
    return false;
  }
  // extract internal links
  extract_internal_links(user_input) {
    const matches = user_input.match(/\[\[(.*?)\]\]/g);
    console.log(matches);
    if (matches)
      return matches.map((match) => {
        return this.app.metadataCache.getFirstLinkpathDest(match.replace("[[", "").replace("]]", ""), "/");
      });
    return [];
  }
  // get context from internal links
  async get_note_contents(note, opts = {}) {
    opts = {
      char_limit: 1e4,
      ...opts
    };
    if (!(note instanceof Obsidian.TFile))
      return "";
    let file_content = await this.app.vault.cachedRead(note);
    if (file_content.indexOf("```dataview") > -1) {
      file_content = await this.render_dataview_queries(file_content, note.path, opts);
    }
    file_content = file_content.substring(0, opts.char_limit);
    return file_content;
  }
  async render_dataview_queries(file_content, note_path, opts = {}) {
    opts = {
      char_limit: null,
      ...opts
    };
    const dataview_api = window["DataviewAPI"];
    if (!dataview_api)
      return file_content;
    const dataview_code_blocks = file_content.match(/```dataview(.*?)```/gs);
    for (let i = 0; i < dataview_code_blocks.length; i++) {
      if (opts.char_limit && opts.char_limit < file_content.indexOf(dataview_code_blocks[i]))
        break;
      const dataview_code_block = dataview_code_blocks[i];
      const dataview_code_block_content = dataview_code_block.replace("```dataview", "").replace("```", "");
      const dataview_query_result = await dataview_api.queryMarkdown(dataview_code_block_content, note_path, null);
      if (dataview_query_result.successful) {
        file_content = file_content.replace(dataview_code_block, dataview_query_result.value);
      }
    }
    return file_content;
  }
};
var SmartConnectionsChatHistoryModal = class extends Obsidian.FuzzySuggestModal {
  constructor(app, view, files) {
    super(app);
    this.app = app;
    this.view = view;
    this.setPlaceholder("Type the name of a chat session...");
  }
  getItems() {
    if (!this.view.files) {
      return [];
    }
    return this.view.files;
  }
  getItemText(item) {
    if (item.indexOf("UNTITLED") === -1) {
      item.replace(/—[^—]*$/, "");
    }
    return item;
  }
  onChooseItem(session) {
    this.view.open_chat(session);
  }
};
var SmartConnectionsFileSelectModal = class extends Obsidian.FuzzySuggestModal {
  constructor(app, view) {
    super(app);
    this.app = app;
    this.view = view;
    this.setPlaceholder("Type the name of a file...");
  }
  getItems() {
    return this.app.vault.getMarkdownFiles().sort((a, b) => a.basename.localeCompare(b.basename));
  }
  getItemText(item) {
    return item.basename;
  }
  onChooseItem(file) {
    this.view.insert_selection(file.basename + "]] ");
  }
};
var SmartConnectionsFolderSelectModal = class extends Obsidian.FuzzySuggestModal {
  constructor(app, view) {
    super(app);
    this.app = app;
    this.view = view;
    this.setPlaceholder("Type the name of a folder...");
  }
  getItems() {
    return this.view.plugin.folders;
  }
  getItemText(item) {
    return item;
  }
  onChooseItem(folder) {
    this.view.insert_selection(folder + "/ ");
  }
};
var ScStreamer = class {
  // constructor
  constructor(url, options) {
    options = options || {};
    this.url = url;
    this.method = options.method || "GET";
    this.headers = options.headers || {};
    this.payload = options.payload || null;
    this.withCredentials = options.withCredentials || false;
    this.listeners = {};
    this.readyState = this.CONNECTING;
    this.progress = 0;
    this.chunk = "";
    this.xhr = null;
    this.FIELD_SEPARATOR = ":";
    this.INITIALIZING = -1;
    this.CONNECTING = 0;
    this.OPEN = 1;
    this.CLOSED = 2;
  }
  // addEventListener
  addEventListener(type, listener) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    if (this.listeners[type].indexOf(listener) === -1) {
      this.listeners[type].push(listener);
    }
  }
  // removeEventListener
  removeEventListener(type, listener) {
    if (!this.listeners[type]) {
      return;
    }
    let filtered = [];
    for (let i = 0; i < this.listeners[type].length; i++) {
      if (this.listeners[type][i] !== listener) {
        filtered.push(this.listeners[type][i]);
      }
    }
    if (this.listeners[type].length === 0) {
      delete this.listeners[type];
    } else {
      this.listeners[type] = filtered;
    }
  }
  // dispatchEvent
  dispatchEvent(event) {
    if (!event) {
      return true;
    }
    event.source = this;
    let onHandler = "on" + event.type;
    if (this.hasOwnProperty(onHandler)) {
      this[onHandler].call(this, event);
      if (event.defaultPrevented) {
        return false;
      }
    }
    if (this.listeners[event.type]) {
      return this.listeners[event.type].every(function(callback) {
        callback(event);
        return !event.defaultPrevented;
      });
    }
    return true;
  }
  // _setReadyState
  _setReadyState(state) {
    let event = new CustomEvent("readyStateChange");
    event.readyState = state;
    this.readyState = state;
    this.dispatchEvent(event);
  }
  // _onStreamFailure
  _onStreamFailure(e) {
    let event = new CustomEvent("error");
    event.data = e.currentTarget.response;
    this.dispatchEvent(event);
    this.close();
  }
  // _onStreamAbort
  _onStreamAbort(e) {
    let event = new CustomEvent("abort");
    this.close();
  }
  // _onStreamProgress
  _onStreamProgress(e) {
    if (!this.xhr) {
      return;
    }
    if (this.xhr.status !== 200) {
      this._onStreamFailure(e);
      return;
    }
    if (this.readyState === this.CONNECTING) {
      this.dispatchEvent(new CustomEvent("open"));
      this._setReadyState(this.OPEN);
    }
    let data = this.xhr.responseText.substring(this.progress);
    this.progress += data.length;
    data.split(/(\r\n|\r|\n){2}/g).forEach(function(part) {
      if (part.trim().length === 0) {
        this.dispatchEvent(this._parseEventChunk(this.chunk.trim()));
        this.chunk = "";
      } else {
        this.chunk += part;
      }
    }.bind(this));
  }
  // _onStreamLoaded
  _onStreamLoaded(e) {
    this._onStreamProgress(e);
    this.dispatchEvent(this._parseEventChunk(this.chunk));
    this.chunk = "";
  }
  // _parseEventChunk
  _parseEventChunk(chunk) {
    if (!chunk || chunk.length === 0) {
      return null;
    }
    let e = { id: null, retry: null, data: "", event: "message" };
    chunk.split(/(\r\n|\r|\n)/).forEach(function(line) {
      line = line.trimRight();
      let index = line.indexOf(this.FIELD_SEPARATOR);
      if (index <= 0) {
        return;
      }
      let field = line.substring(0, index);
      if (!(field in e)) {
        return;
      }
      let value = line.substring(index + 1).trimLeft();
      if (field === "data") {
        e[field] += value;
      } else {
        e[field] = value;
      }
    }.bind(this));
    let event = new CustomEvent(e.event);
    event.data = e.data;
    event.id = e.id;
    return event;
  }
  // _checkStreamClosed
  _checkStreamClosed() {
    if (!this.xhr) {
      return;
    }
    if (this.xhr.readyState === XMLHttpRequest.DONE) {
      this._setReadyState(this.CLOSED);
    }
  }
  // stream
  stream() {
    this._setReadyState(this.CONNECTING);
    this.xhr = new XMLHttpRequest();
    this.xhr.addEventListener("progress", this._onStreamProgress.bind(this));
    this.xhr.addEventListener("load", this._onStreamLoaded.bind(this));
    this.xhr.addEventListener("readystatechange", this._checkStreamClosed.bind(this));
    this.xhr.addEventListener("error", this._onStreamFailure.bind(this));
    this.xhr.addEventListener("abort", this._onStreamAbort.bind(this));
    this.xhr.open(this.method, this.url);
    for (let header in this.headers) {
      this.xhr.setRequestHeader(header, this.headers[header]);
    }
    this.xhr.withCredentials = this.withCredentials;
    this.xhr.send(this.payload);
  }
  // close
  close() {
    if (this.readyState === this.CLOSED) {
      return;
    }
    this.xhr.abort();
    this.xhr = null;
    this._setReadyState(this.CLOSED);
  }
};
module.exports = SmartConnectionsPlugin;
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vdmVjX2xpdGUvdmVjX2xpdGUuanMiLCAiLi4vc3JjL2luZGV4LmpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjbGFzcyBWZWNMaXRlIHtcbiAgY29uc3RydWN0b3IoY29uZmlnKSB7XG4gICAgLy8gc2V0IGRlZmF1bHQgY29uZmlnXG4gICAgdGhpcy5jb25maWcgPSB7XG4gICAgICBmaWxlX25hbWU6IFwiZW1iZWRkaW5ncy0zLmpzb25cIixcbiAgICAgIGZvbGRlcl9wYXRoOiBcIi52ZWNfbGl0ZVwiLFxuICAgICAgZXhpc3RzX2FkYXB0ZXI6IG51bGwsXG4gICAgICBta2Rpcl9hZGFwdGVyOiBudWxsLFxuICAgICAgcmVhZF9hZGFwdGVyOiBudWxsLFxuICAgICAgcmVuYW1lX2FkYXB0ZXI6IG51bGwsXG4gICAgICBzdGF0X2FkYXB0ZXI6IG51bGwsXG4gICAgICB3cml0ZV9hZGFwdGVyOiBudWxsLFxuICAgICAgLi4uY29uZmlnXG4gICAgfTtcbiAgICB0aGlzLmZpbGVfbmFtZSA9IHRoaXMuY29uZmlnLmZpbGVfbmFtZTtcbiAgICB0aGlzLmZvbGRlcl9wYXRoID0gY29uZmlnLmZvbGRlcl9wYXRoO1xuICAgIHRoaXMuZmlsZV9wYXRoID0gdGhpcy5mb2xkZXJfcGF0aCArIFwiL1wiICsgdGhpcy5maWxlX25hbWU7XG4gICAgLy8gZ2V0IGZvbGRlciBwYXRoXG4gICAgdGhpcy5lbWJlZGRpbmdzID0gZmFsc2U7XG4gIH1cbiAgYXN5bmMgZmlsZV9leGlzdHMocGF0aCkge1xuICAgIGlmICh0aGlzLmNvbmZpZy5leGlzdHNfYWRhcHRlcikge1xuICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY29uZmlnLmV4aXN0c19hZGFwdGVyKHBhdGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyB0b2RvIGhhbmRsZSB3aXRoIGZzXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJleGlzdHNfYWRhcHRlciBub3Qgc2V0XCIpO1xuICAgIH1cbiAgfVxuICBhc3luYyBta2RpcihwYXRoKSB7XG4gICAgaWYgKHRoaXMuY29uZmlnLm1rZGlyX2FkYXB0ZXIpIHtcbiAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNvbmZpZy5ta2Rpcl9hZGFwdGVyKHBhdGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyB0b2RvIGhhbmRsZSB3aXRoIGZzXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJta2Rpcl9hZGFwdGVyIG5vdCBzZXRcIik7XG4gICAgfVxuICB9XG4gIGFzeW5jIHJlYWRfZmlsZShwYXRoKSB7XG4gICAgaWYgKHRoaXMuY29uZmlnLnJlYWRfYWRhcHRlcikge1xuICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY29uZmlnLnJlYWRfYWRhcHRlcihwYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gdG9kbyBoYW5kbGUgd2l0aCBmc1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwicmVhZF9hZGFwdGVyIG5vdCBzZXRcIik7XG4gICAgfVxuICB9XG4gIGFzeW5jIHJlbmFtZShvbGRfcGF0aCwgbmV3X3BhdGgpIHtcbiAgICBpZiAodGhpcy5jb25maWcucmVuYW1lX2FkYXB0ZXIpIHtcbiAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNvbmZpZy5yZW5hbWVfYWRhcHRlcihvbGRfcGF0aCwgbmV3X3BhdGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyB0b2RvIGhhbmRsZSB3aXRoIGZzXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJyZW5hbWVfYWRhcHRlciBub3Qgc2V0XCIpO1xuICAgIH1cbiAgfVxuICBhc3luYyBzdGF0KHBhdGgpIHtcbiAgICBpZiAodGhpcy5jb25maWcuc3RhdF9hZGFwdGVyKSB7XG4gICAgICByZXR1cm4gYXdhaXQgdGhpcy5jb25maWcuc3RhdF9hZGFwdGVyKHBhdGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyB0b2RvIGhhbmRsZSB3aXRoIGZzXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJzdGF0X2FkYXB0ZXIgbm90IHNldFwiKTtcbiAgICB9XG4gIH1cbiAgYXN5bmMgd3JpdGVfZmlsZShwYXRoLCBkYXRhKSB7XG4gICAgaWYgKHRoaXMuY29uZmlnLndyaXRlX2FkYXB0ZXIpIHtcbiAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNvbmZpZy53cml0ZV9hZGFwdGVyKHBhdGgsIGRhdGEpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyB0b2RvIGhhbmRsZSB3aXRoIGZzXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ3cml0ZV9hZGFwdGVyIG5vdCBzZXRcIik7XG4gICAgfVxuICB9XG4gIGFzeW5jIGxvYWQocmV0cmllcyA9IDApIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgZW1iZWRkaW5nc19maWxlID0gYXdhaXQgdGhpcy5yZWFkX2ZpbGUodGhpcy5maWxlX3BhdGgpO1xuICAgICAgLy8gbG9hZGVkIGVtYmVkZGluZ3MgZnJvbSBmaWxlXG4gICAgICB0aGlzLmVtYmVkZGluZ3MgPSBKU09OLnBhcnNlKGVtYmVkZGluZ3NfZmlsZSk7XG4gICAgICBjb25zb2xlLmxvZyhcImxvYWRlZCBlbWJlZGRpbmdzIGZpbGU6IFwiK3RoaXMuZmlsZV9wYXRoKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAvLyByZXRyeSBpZiBlcnJvciB1cCB0byAzIHRpbWVzXG4gICAgICBpZiAocmV0cmllcyA8IDMpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJyZXRyeWluZyBsb2FkKClcIik7XG4gICAgICAgIC8vIGluY3JlYXNlIHdhaXQgdGltZSBiZXR3ZWVuIHJldHJpZXNcbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIDEwMDAgKyAoMTAwMCAqIHJldHJpZXMpKSk7XG4gICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmxvYWQocmV0cmllcyArIDEpO1xuICAgICAgLy8gfSBlbHNlIGlmIChyZXRyaWVzID09PSAzKSB7XG4gICAgICAvLyAgIC8vIGNoZWNrIGZvciBlbWJlZGRpbmdzLTIuanNvbiBmaWxlXG4gICAgICAvLyAgIGNvbnN0IGVtYmVkZGluZ3NfMl9maWxlX3BhdGggPSB0aGlzLmZvbGRlcl9wYXRoICsgXCIvZW1iZWRkaW5ncy0yLmpzb25cIjtcbiAgICAgIC8vICAgY29uc3QgZW1iZWRkaW5nc18yX2ZpbGVfZXhpc3RzID0gYXdhaXQgdGhpcy5maWxlX2V4aXN0cyhlbWJlZGRpbmdzXzJfZmlsZV9wYXRoKTtcbiAgICAgIC8vICAgaWYgKGVtYmVkZGluZ3NfMl9maWxlX2V4aXN0cykge1xuICAgICAgLy8gICAgIGF3YWl0IHRoaXMubWlncmF0ZV9lbWJlZGRpbmdzX3YyX3RvX3YzKCk7XG4gICAgICAvLyAgICAgcmV0dXJuIGF3YWl0IHRoaXMubG9hZChyZXRyaWVzICsgMSk7XG4gICAgICAvLyAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnNvbGUubG9nKFwiZmFpbGVkIHRvIGxvYWQgZW1iZWRkaW5ncyBmaWxlLCBwcm9tcHQgdXNlciB0byBpbml0aWF0ZSBidWxrIGVtYmVkXCIpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGluaXRfZW1iZWRkaW5nc19maWxlKCkge1xuICAgIC8vIGNoZWNrIGlmIGZvbGRlciBleGlzdHNcbiAgICBpZiAoIShhd2FpdCB0aGlzLmZpbGVfZXhpc3RzKHRoaXMuZm9sZGVyX3BhdGgpKSkge1xuICAgICAgLy8gY3JlYXRlIGZvbGRlclxuICAgICAgYXdhaXQgdGhpcy5ta2Rpcih0aGlzLmZvbGRlcl9wYXRoKTtcbiAgICAgIGNvbnNvbGUubG9nKFwiY3JlYXRlZCBmb2xkZXI6IFwiK3RoaXMuZm9sZGVyX3BhdGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmxvZyhcImZvbGRlciBhbHJlYWR5IGV4aXN0czogXCIrdGhpcy5mb2xkZXJfcGF0aCk7XG4gICAgfVxuICAgIC8vIGNoZWNrIGlmIGVtYmVkZGluZ3MgZmlsZSBleGlzdHNcbiAgICBpZiAoIShhd2FpdCB0aGlzLmZpbGVfZXhpc3RzKHRoaXMuZmlsZV9wYXRoKSkpIHtcbiAgICAgIC8vIGNyZWF0ZSBlbWJlZGRpbmdzIGZpbGVcbiAgICAgIGF3YWl0IHRoaXMud3JpdGVfZmlsZSh0aGlzLmZpbGVfcGF0aCwgXCJ7fVwiKTtcbiAgICAgIGNvbnNvbGUubG9nKFwiY3JlYXRlZCBlbWJlZGRpbmdzIGZpbGU6IFwiK3RoaXMuZmlsZV9wYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5sb2coXCJlbWJlZGRpbmdzIGZpbGUgYWxyZWFkeSBleGlzdHM6IFwiK3RoaXMuZmlsZV9wYXRoKTtcbiAgICB9XG4gIH1cblxuICBhc3luYyBzYXZlKCkge1xuICAgIGNvbnN0IGVtYmVkZGluZ3MgPSBKU09OLnN0cmluZ2lmeSh0aGlzLmVtYmVkZGluZ3MpO1xuICAgIC8vIGNoZWNrIGlmIGVtYmVkZGluZ3MgZmlsZSBleGlzdHNcbiAgICBjb25zdCBlbWJlZGRpbmdzX2ZpbGVfZXhpc3RzID0gYXdhaXQgdGhpcy5maWxlX2V4aXN0cyh0aGlzLmZpbGVfcGF0aCk7XG4gICAgLy8gaWYgZW1iZWRkaW5ncyBmaWxlIGV4aXN0cyB0aGVuIGNoZWNrIGlmIG5ldyBlbWJlZGRpbmdzIGZpbGUgc2l6ZSBpcyBzaWduaWZpY2FudGx5IHNtYWxsZXIgdGhhbiBleGlzdGluZyBlbWJlZGRpbmdzIGZpbGUgc2l6ZVxuICAgIGlmIChlbWJlZGRpbmdzX2ZpbGVfZXhpc3RzKSB7XG4gICAgICAvLyBlc2l0bWF0ZSBmaWxlIHNpemUgb2YgZW1iZWRkaW5nc1xuICAgICAgY29uc3QgbmV3X2ZpbGVfc2l6ZSA9IGVtYmVkZGluZ3MubGVuZ3RoO1xuICAgICAgLy8gZ2V0IGV4aXN0aW5nIGZpbGUgc2l6ZVxuICAgICAgY29uc3QgZXhpc3RpbmdfZmlsZV9zaXplID0gYXdhaXQgdGhpcy5zdGF0KHRoaXMuZmlsZV9wYXRoKS50aGVuKChzdGF0KSA9PiBzdGF0LnNpemUpO1xuICAgICAgLy8gY29uc29sZS5sb2coXCJuZXcgZmlsZSBzaXplOiBcIituZXdfZmlsZV9zaXplKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKFwiZXhpc3RpbmcgZmlsZSBzaXplOiBcIitleGlzdGluZ19maWxlX3NpemUpO1xuICAgICAgLy8gaWYgbmV3IGZpbGUgc2l6ZSBpcyBhdCBsZWFzdCA1MCUgb2YgZXhpc3RpbmcgZmlsZSBzaXplIHRoZW4gd3JpdGUgZW1iZWRkaW5ncyB0byBmaWxlXG4gICAgICBpZiAobmV3X2ZpbGVfc2l6ZSA+IChleGlzdGluZ19maWxlX3NpemUgKiAwLjUpKSB7XG4gICAgICAgIC8vIHdyaXRlIGVtYmVkZGluZ3MgdG8gZmlsZVxuICAgICAgICBhd2FpdCB0aGlzLndyaXRlX2ZpbGUodGhpcy5maWxlX3BhdGgsIGVtYmVkZGluZ3MpO1xuICAgICAgICBjb25zb2xlLmxvZyhcImVtYmVkZGluZ3MgZmlsZSBzaXplOiBcIiArIG5ld19maWxlX3NpemUgKyBcIiBieXRlc1wiKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGlmIG5ldyBmaWxlIHNpemUgaXMgc2lnbmlmaWNhbnRseSBzbWFsbGVyIHRoYW4gZXhpc3RpbmcgZmlsZSBzaXplIHRoZW4gdGhyb3cgZXJyb3JcbiAgICAgICAgLy8gc2hvdyB3YXJuaW5nIG1lc3NhZ2UgaW5jbHVkaW5nIGZpbGUgc2l6ZXNcbiAgICAgICAgY29uc3Qgd2FybmluZ19tZXNzYWdlID0gW1xuICAgICAgICAgIFwiV2FybmluZzogTmV3IGVtYmVkZGluZ3MgZmlsZSBzaXplIGlzIHNpZ25pZmljYW50bHkgc21hbGxlciB0aGFuIGV4aXN0aW5nIGVtYmVkZGluZ3MgZmlsZSBzaXplLlwiLFxuICAgICAgICAgIFwiQWJvcnRpbmcgdG8gcHJldmVudCBwb3NzaWJsZSBsb3NzIG9mIGVtYmVkZGluZ3MgZGF0YS5cIixcbiAgICAgICAgICBcIk5ldyBmaWxlIHNpemU6IFwiICsgbmV3X2ZpbGVfc2l6ZSArIFwiIGJ5dGVzLlwiLFxuICAgICAgICAgIFwiRXhpc3RpbmcgZmlsZSBzaXplOiBcIiArIGV4aXN0aW5nX2ZpbGVfc2l6ZSArIFwiIGJ5dGVzLlwiLFxuICAgICAgICAgIFwiUmVzdGFydGluZyBPYnNpZGlhbiBtYXkgZml4IHRoaXMuXCJcbiAgICAgICAgXTtcbiAgICAgICAgY29uc29sZS5sb2cod2FybmluZ19tZXNzYWdlLmpvaW4oXCIgXCIpKTtcbiAgICAgICAgLy8gc2F2ZSBlbWJlZGRpbmdzIHRvIGZpbGUgbmFtZWQgdW5zYXZlZC1lbWJlZGRpbmdzLmpzb25cbiAgICAgICAgYXdhaXQgdGhpcy53cml0ZV9maWxlKHRoaXMuZm9sZGVyX3BhdGgrXCIvdW5zYXZlZC1lbWJlZGRpbmdzLmpzb25cIiwgZW1iZWRkaW5ncyk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkVycm9yOiBOZXcgZW1iZWRkaW5ncyBmaWxlIHNpemUgaXMgc2lnbmlmaWNhbnRseSBzbWFsbGVyIHRoYW4gZXhpc3RpbmcgZW1iZWRkaW5ncyBmaWxlIHNpemUuIEFib3J0aW5nIHRvIHByZXZlbnQgcG9zc2libGUgbG9zcyBvZiBlbWJlZGRpbmdzIGRhdGEuXCIpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBhd2FpdCB0aGlzLmluaXRfZW1iZWRkaW5nc19maWxlKCk7XG4gICAgICByZXR1cm4gYXdhaXQgdGhpcy5zYXZlKCk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIGNvc19zaW0odmVjdG9yMSwgdmVjdG9yMikge1xuICAgIGxldCBkb3RQcm9kdWN0ID0gMDtcbiAgICBsZXQgbm9ybUEgPSAwO1xuICAgIGxldCBub3JtQiA9IDA7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2ZWN0b3IxLmxlbmd0aDsgaSsrKSB7XG4gICAgICBkb3RQcm9kdWN0ICs9IHZlY3RvcjFbaV0gKiB2ZWN0b3IyW2ldO1xuICAgICAgbm9ybUEgKz0gdmVjdG9yMVtpXSAqIHZlY3RvcjFbaV07XG4gICAgICBub3JtQiArPSB2ZWN0b3IyW2ldICogdmVjdG9yMltpXTtcbiAgICB9XG4gICAgaWYgKG5vcm1BID09PSAwIHx8IG5vcm1CID09PSAwKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGRvdFByb2R1Y3QgLyAoTWF0aC5zcXJ0KG5vcm1BKSAqIE1hdGguc3FydChub3JtQikpO1xuICAgIH1cbiAgfVxuICBuZWFyZXN0KHRvX3ZlYywgZmlsdGVyID0ge30pIHtcbiAgICBmaWx0ZXIgPSB7XG4gICAgICByZXN1bHRzX2NvdW50OiAzMCxcbiAgICAgIC4uLmZpbHRlclxuICAgIH07XG4gICAgbGV0IG5lYXJlc3QgPSBbXTtcbiAgICBjb25zdCBmcm9tX2tleXMgPSBPYmplY3Qua2V5cyh0aGlzLmVtYmVkZGluZ3MpO1xuICAgIC8vIHRoaXMucmVuZGVyX2xvZy50b3RhbF9lbWJlZGRpbmdzID0gZnJvbV9rZXlzLmxlbmd0aDtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZyb21fa2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgLy8gaWYgdGhpcy5zZXR0aW5ncy5za2lwX3NlY3Rpb25zIGlzIHRydWVcbiAgICAgIGlmIChmaWx0ZXIuc2tpcF9zZWN0aW9ucykge1xuICAgICAgICBjb25zdCBmcm9tX3BhdGggPSB0aGlzLmVtYmVkZGluZ3NbZnJvbV9rZXlzW2ldXS5tZXRhLnBhdGg7XG4gICAgICAgIGlmIChmcm9tX3BhdGguaW5kZXhPZihcIiNcIikgPiAtMSkgY29udGludWU7IC8vIHNraXAgaWYgY29udGFpbnMgIyBpbmRpY2F0aW5nIGJsb2NrIChzZWN0aW9uKVxuXG4gICAgICAgIC8vIFRPRE86IGNvbnNpZGVyIHVzaW5nIHByZXNlbmNlIG9mIG1ldGEucGFyZW50IHRvIHNraXAgZmlsZXMgKGZhc3RlciBjaGVja2luZz8pXG4gICAgICB9XG4gICAgICBpZiAoZmlsdGVyLnNraXBfa2V5KSB7XG4gICAgICAgIGlmIChmaWx0ZXIuc2tpcF9rZXkgPT09IGZyb21fa2V5c1tpXSkgY29udGludWU7IC8vIHNraXAgbWF0Y2hpbmcgdG8gY3VycmVudCBub3RlXG4gICAgICAgIGlmIChmaWx0ZXIuc2tpcF9rZXkgPT09IHRoaXMuZW1iZWRkaW5nc1tmcm9tX2tleXNbaV1dLm1ldGEucGFyZW50KSBjb250aW51ZTsgLy8gc2tpcCBpZiBmaWx0ZXIuc2tpcF9rZXkgbWF0Y2hlcyBtZXRhLnBhcmVudFxuICAgICAgfVxuICAgICAgLy8gaWYgZmlsdGVyLnBhdGhfYmVnaW5zX3dpdGggaXMgc2V0IChmb2xkZXIgZmlsdGVyKVxuICAgICAgaWYgKGZpbHRlci5wYXRoX2JlZ2luc193aXRoKSB7XG4gICAgICAgIC8vIGlmIHR5cGUgaXMgc3RyaW5nICYgbWV0YS5wYXRoIGRvZXMgbm90IGJlZ2luIHdpdGggZmlsdGVyLnBhdGhfYmVnaW5zX3dpdGgsIHNraXBcbiAgICAgICAgaWYgKHR5cGVvZiBmaWx0ZXIucGF0aF9iZWdpbnNfd2l0aCA9PT0gXCJzdHJpbmdcIiAmJiAhdGhpcy5lbWJlZGRpbmdzW2Zyb21fa2V5c1tpXV0ubWV0YS5wYXRoLnN0YXJ0c1dpdGgoZmlsdGVyLnBhdGhfYmVnaW5zX3dpdGgpKSBjb250aW51ZTtcbiAgICAgICAgLy8gaWYgdHlwZSBpcyBhcnJheSAmIG1ldGEucGF0aCBkb2VzIG5vdCBiZWdpbiB3aXRoIGFueSBvZiB0aGUgZmlsdGVyLnBhdGhfYmVnaW5zX3dpdGgsIHNraXBcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoZmlsdGVyLnBhdGhfYmVnaW5zX3dpdGgpICYmICFmaWx0ZXIucGF0aF9iZWdpbnNfd2l0aC5zb21lKChwYXRoKSA9PiB0aGlzLmVtYmVkZGluZ3NbZnJvbV9rZXlzW2ldXS5tZXRhLnBhdGguc3RhcnRzV2l0aChwYXRoKSkpIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBuZWFyZXN0LnB1c2goe1xuICAgICAgICBsaW5rOiB0aGlzLmVtYmVkZGluZ3NbZnJvbV9rZXlzW2ldXS5tZXRhLnBhdGgsXG4gICAgICAgIHNpbWlsYXJpdHk6IHRoaXMuY29zX3NpbSh0b192ZWMsIHRoaXMuZW1iZWRkaW5nc1tmcm9tX2tleXNbaV1dLnZlYyksXG4gICAgICAgIHNpemU6IHRoaXMuZW1iZWRkaW5nc1tmcm9tX2tleXNbaV1dLm1ldGEuc2l6ZSxcbiAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBzb3J0IGFycmF5IGJ5IGNvc2luZSBzaW1pbGFyaXR5XG4gICAgbmVhcmVzdC5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICByZXR1cm4gYi5zaW1pbGFyaXR5IC0gYS5zaW1pbGFyaXR5O1xuICAgIH0pO1xuICAgIC8vIGNvbnNvbGUubG9nKG5lYXJlc3QpO1xuICAgIC8vIGxpbWl0IHRvIE4gbmVhcmVzdCBjb25uZWN0aW9uc1xuICAgIG5lYXJlc3QgPSBuZWFyZXN0LnNsaWNlKDAsIGZpbHRlci5yZXN1bHRzX2NvdW50KTtcbiAgICByZXR1cm4gbmVhcmVzdDtcbiAgfVxuICBmaW5kX25lYXJlc3RfZW1iZWRkaW5ncyh0b192ZWMsIGZpbHRlcj17fSkge1xuICAgIGNvbnN0IGRlZmF1bHRfZmlsdGVyID0ge1xuICAgICAgbWF4OiB0aGlzLm1heF9zb3VyY2VzLFxuICAgIH07XG4gICAgZmlsdGVyID0gey4uLmRlZmF1bHRfZmlsdGVyLCAuLi5maWx0ZXJ9O1xuICAgIC8vIGhhbmRsZSBpZiB0b192ZWMgaXMgYW4gYXJyYXkgb2YgdmVjdG9yc1xuICAgIC8vIGxldCBuZWFyZXN0ID0gW107XG4gICAgaWYoQXJyYXkuaXNBcnJheSh0b192ZWMpICYmIHRvX3ZlYy5sZW5ndGggIT09IHRoaXMudmVjX2xlbil7XG4gICAgICB0aGlzLm5lYXJlc3QgPSB7fTtcbiAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCB0b192ZWMubGVuZ3RoOyBpKyspe1xuICAgICAgICAvLyBuZWFyZXN0ID0gbmVhcmVzdC5jb25jYXQodGhpcy5maW5kX25lYXJlc3RfZW1iZWRkaW5ncyh0b192ZWNbaV0sIHtcbiAgICAgICAgLy8gICBtYXg6IE1hdGguZmxvb3IoZmlsdGVyLm1heCAvIHRvX3ZlYy5sZW5ndGgpXG4gICAgICAgIC8vIH0pKTtcbiAgICAgICAgdGhpcy5maW5kX25lYXJlc3RfZW1iZWRkaW5ncyh0b192ZWNbaV0sIHtcbiAgICAgICAgICBtYXg6IE1hdGguZmxvb3IoZmlsdGVyLm1heCAvIHRvX3ZlYy5sZW5ndGgpXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1lbHNle1xuICAgICAgY29uc3QgZnJvbV9rZXlzID0gT2JqZWN0LmtleXModGhpcy5lbWJlZGRpbmdzKTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZnJvbV9rZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmKHRoaXMudmFsaWRhdGVfdHlwZSh0aGlzLmVtYmVkZGluZ3NbZnJvbV9rZXlzW2ldXSkpIGNvbnRpbnVlO1xuICAgICAgICBjb25zdCBzaW0gPSB0aGlzLmNvbXB1dGVDb3NpbmVTaW1pbGFyaXR5KHRvX3ZlYywgdGhpcy5lbWJlZGRpbmdzW2Zyb21fa2V5c1tpXV0udmVjKTtcbiAgICAgICAgaWYodGhpcy5uZWFyZXN0W2Zyb21fa2V5c1tpXV0peyAvLyBpZiBhbHJlYWR5IGNvbXB1dGVkLCB1c2UgY2FjaGVkIHZhbHVlXG4gICAgICAgICAgdGhpcy5uZWFyZXN0W2Zyb21fa2V5c1tpXV0gKz0gc2ltO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICB0aGlzLm5lYXJlc3RbZnJvbV9rZXlzW2ldXSA9IHNpbTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBpbml0aWF0ZSBuZWFyZXN0IGFycmF5XG4gICAgbGV0IG5lYXJlc3QgPSBPYmplY3Qua2V5cyh0aGlzLm5lYXJlc3QpLm1hcChrZXkgPT4ge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAga2V5OiBrZXksXG4gICAgICAgIHNpbWlsYXJpdHk6IHRoaXMubmVhcmVzdFtrZXldLFxuICAgICAgfVxuICAgIH0pO1xuICAgIC8vIHNvcnQgYXJyYXkgYnkgY29zaW5lIHNpbWlsYXJpdHlcbiAgICBuZWFyZXN0ID0gdGhpcy5zb3J0X2J5X3NpbWlsYXJpdHkobmVhcmVzdCk7XG4gICAgbmVhcmVzdCA9IG5lYXJlc3Quc2xpY2UoMCwgZmlsdGVyLm1heCk7XG4gICAgLy8gYWRkIGxpbmsgYW5kIGxlbmd0aCB0byByZW1haW5pbmcgbmVhcmVzdFxuICAgIG5lYXJlc3QgPSBuZWFyZXN0Lm1hcChpdGVtID0+IHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxpbms6IHRoaXMuZW1iZWRkaW5nc1tpdGVtLmtleV0ubWV0YS5wYXRoLFxuICAgICAgICBzaW1pbGFyaXR5OiBpdGVtLnNpbWlsYXJpdHksXG4gICAgICAgIGxlbjogdGhpcy5lbWJlZGRpbmdzW2l0ZW0ua2V5XS5tZXRhLmxlbiB8fCB0aGlzLmVtYmVkZGluZ3NbaXRlbS5rZXldLm1ldGEuc2l6ZSxcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gbmVhcmVzdDtcbiAgfVxuICBzb3J0X2J5X3NpbWlsYXJpdHkobmVhcmVzdCkge1xuICAgIHJldHVybiBuZWFyZXN0LnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgIGNvbnN0IGFfc2NvcmUgPSBhLnNpbWlsYXJpdHk7XG4gICAgICBjb25zdCBiX3Njb3JlID0gYi5zaW1pbGFyaXR5O1xuICAgICAgLy8gaWYgYSBpcyBncmVhdGVyIHRoYW4gYiwgcmV0dXJuIC0xXG4gICAgICBpZiAoYV9zY29yZSA+IGJfc2NvcmUpXG4gICAgICAgIHJldHVybiAtMTtcbiAgICAgIC8vIGlmIGEgaXMgbGVzcyB0aGFuIGIsIHJldHVybiAxXG4gICAgICBpZiAoYV9zY29yZSA8IGJfc2NvcmUpXG4gICAgICAgIHJldHVybiAxO1xuICAgICAgLy8gaWYgYSBpcyBlcXVhbCB0byBiLCByZXR1cm4gMFxuICAgICAgcmV0dXJuIDA7XG4gICAgfSk7XG4gIH1cbiAgLy8gY2hlY2sgaWYga2V5IGZyb20gZW1iZWRkaW5ncyBleGlzdHMgaW4gZmlsZXNcbiAgY2xlYW5fdXBfZW1iZWRkaW5ncyhmaWxlcykge1xuICAgIGNvbnNvbGUubG9nKFwiY2xlYW5pbmcgdXAgZW1iZWRkaW5nc1wiKTtcbiAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXModGhpcy5lbWJlZGRpbmdzKTtcbiAgICBsZXQgZGVsZXRlZF9lbWJlZGRpbmdzID0gMDtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBrZXlzKSB7XG4gICAgICAvLyBjb25zb2xlLmxvZyhcImtleTogXCIra2V5KTtcbiAgICAgIGNvbnN0IHBhdGggPSB0aGlzLmVtYmVkZGluZ3Nba2V5XS5tZXRhLnBhdGg7XG4gICAgICAvLyBpZiBubyBrZXkgc3RhcnRzIHdpdGggZmlsZSBwYXRoXG4gICAgICBpZighZmlsZXMuZmluZChmaWxlID0+IHBhdGguc3RhcnRzV2l0aChmaWxlLnBhdGgpKSkge1xuICAgICAgICAvLyBkZWxldGUga2V5IGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICAgICAgZGVsZXRlIHRoaXMuZW1iZWRkaW5nc1trZXldO1xuICAgICAgICBkZWxldGVkX2VtYmVkZGluZ3MrKztcbiAgICAgICAgLy8gY29uc29sZS5sb2coXCJkZWxldGluZyAoZGVsZXRlZCBmaWxlKTogXCIgKyBrZXkpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIC8vIGlmIGtleSBjb250YWlucyAnIydcbiAgICAgIGlmKHBhdGguaW5kZXhPZihcIiNcIikgPiAtMSkge1xuICAgICAgICBjb25zdCBwYXJlbnRfa2V5ID0gdGhpcy5lbWJlZGRpbmdzW2tleV0ubWV0YS5wYXJlbnQ7XG4gICAgICAgIC8vIGlmIHBhcmVudF9rZXkgbWlzc2luZyBmcm9tIGVtYmVkZGluZ3MgdGhlbiBkZWxldGUga2V5XG4gICAgICAgIGlmKCF0aGlzLmVtYmVkZGluZ3NbcGFyZW50X2tleV0pe1xuICAgICAgICAgIC8vIGRlbGV0ZSBrZXlcbiAgICAgICAgICBkZWxldGUgdGhpcy5lbWJlZGRpbmdzW2tleV07XG4gICAgICAgICAgZGVsZXRlZF9lbWJlZGRpbmdzKys7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2coXCJkZWxldGluZyAobWlzc2luZyBwYXJlbnQpXCIpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIC8vIGlmIHBhcmVudF9rZXkgbWlzc2luZyBtZXRhIHRoZW4gZGVsZXRlIGtleVxuICAgICAgICBpZighdGhpcy5lbWJlZGRpbmdzW3BhcmVudF9rZXldLm1ldGEpe1xuICAgICAgICAgIC8vIGRlbGV0ZSBrZXlcbiAgICAgICAgICBkZWxldGUgdGhpcy5lbWJlZGRpbmdzW2tleV07XG4gICAgICAgICAgZGVsZXRlZF9lbWJlZGRpbmdzKys7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2coXCJkZWxldGluZyAocGFyZW50IG1pc3NpbmcgbWV0YSlcIik7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgLy8gaWYgcGFyZW50X2tleSBtaXNzaW5nIGNoaWxkcmVuIHRoZW4gZGVsZXRlIGtleVxuICAgICAgICAvLyBpZiBwYXJlbnRfa2V5IGNoaWxkcmVuIGRvZXNuJ3QgaW5jbHVkZSBrZXkgdGhlbiBkZWxldGUga2V5XG4gICAgICAgIGlmKHRoaXMuZW1iZWRkaW5nc1twYXJlbnRfa2V5XS5tZXRhLmNoaWxkcmVuICYmICh0aGlzLmVtYmVkZGluZ3NbcGFyZW50X2tleV0ubWV0YS5jaGlsZHJlbi5pbmRleE9mKGtleSkgPCAwKSkge1xuICAgICAgICAgIC8vIGRlbGV0ZSBrZXlcbiAgICAgICAgICBkZWxldGUgdGhpcy5lbWJlZGRpbmdzW2tleV07XG4gICAgICAgICAgZGVsZXRlZF9lbWJlZGRpbmdzKys7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2coXCJkZWxldGluZyAobm90IHByZXNlbnQgaW4gcGFyZW50J3MgY2hpbGRyZW4pXCIpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB7ZGVsZXRlZF9lbWJlZGRpbmdzOiBkZWxldGVkX2VtYmVkZGluZ3MsIHRvdGFsX2VtYmVkZGluZ3M6IGtleXMubGVuZ3RofTtcbiAgfVxuXG4gIGdldChrZXkpIHtcbiAgICByZXR1cm4gdGhpcy5lbWJlZGRpbmdzW2tleV0gfHwgbnVsbDtcbiAgfVxuICBnZXRfbWV0YShrZXkpIHtcbiAgICBjb25zdCBlbWJlZGRpbmcgPSB0aGlzLmdldChrZXkpO1xuICAgIGlmKGVtYmVkZGluZyAmJiBlbWJlZGRpbmcubWV0YSkge1xuICAgICAgcmV0dXJuIGVtYmVkZGluZy5tZXRhO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBnZXRfbXRpbWUoa2V5KSB7XG4gICAgY29uc3QgbWV0YSA9IHRoaXMuZ2V0X21ldGEoa2V5KTtcbiAgICBpZihtZXRhICYmIG1ldGEubXRpbWUpIHtcbiAgICAgIHJldHVybiBtZXRhLm10aW1lO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBnZXRfaGFzaChrZXkpIHtcbiAgICBjb25zdCBtZXRhID0gdGhpcy5nZXRfbWV0YShrZXkpO1xuICAgIGlmKG1ldGEgJiYgbWV0YS5oYXNoKSB7XG4gICAgICByZXR1cm4gbWV0YS5oYXNoO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBnZXRfc2l6ZShrZXkpIHtcbiAgICBjb25zdCBtZXRhID0gdGhpcy5nZXRfbWV0YShrZXkpO1xuICAgIGlmKG1ldGEgJiYgbWV0YS5zaXplKSB7XG4gICAgICByZXR1cm4gbWV0YS5zaXplO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBnZXRfY2hpbGRyZW4oa2V5KSB7XG4gICAgY29uc3QgbWV0YSA9IHRoaXMuZ2V0X21ldGEoa2V5KTtcbiAgICBpZihtZXRhICYmIG1ldGEuY2hpbGRyZW4pIHtcbiAgICAgIHJldHVybiBtZXRhLmNoaWxkcmVuO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBnZXRfdmVjKGtleSkge1xuICAgIGNvbnN0IGVtYmVkZGluZyA9IHRoaXMuZ2V0KGtleSk7XG4gICAgaWYoZW1iZWRkaW5nICYmIGVtYmVkZGluZy52ZWMpIHtcbiAgICAgIHJldHVybiBlbWJlZGRpbmcudmVjO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBzYXZlX2VtYmVkZGluZyhrZXksIHZlYywgbWV0YSkge1xuICAgIHRoaXMuZW1iZWRkaW5nc1trZXldID0ge1xuICAgICAgdmVjOiB2ZWMsXG4gICAgICBtZXRhOiBtZXRhLFxuICAgIH07XG4gIH1cbiAgbXRpbWVfaXNfY3VycmVudChrZXksIHNvdXJjZV9tdGltZSkge1xuICAgIGNvbnN0IG10aW1lID0gdGhpcy5nZXRfbXRpbWUoa2V5KTtcbiAgICBpZihtdGltZSAmJiBtdGltZSA+PSBzb3VyY2VfbXRpbWUpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBhc3luYyBmb3JjZV9yZWZyZXNoKCkge1xuICAgIHRoaXMuZW1iZWRkaW5ncyA9IG51bGw7XG4gICAgdGhpcy5lbWJlZGRpbmdzID0ge307XG4gICAgLy8gZ2V0IGN1cnJlbnQgZGF0ZXRpbWUgYXMgdW5peCB0aW1lc3RhbXBcbiAgICBsZXQgY3VycmVudF9kYXRldGltZSA9IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApO1xuICAgIC8vIHJlbmFtZSBleGlzdGluZyBlbWJlZGRpbmdzIGZpbGUgdG8gdGhpcy5mb2xkZXJfcGF0aC9lbWJlZGRpbmdzLVlZWVktTU0tREQuanNvblxuICAgIGF3YWl0IHRoaXMucmVuYW1lKHRoaXMuZmlsZV9wYXRoLCB0aGlzLmZvbGRlcl9wYXRoICsgXCIvZW1iZWRkaW5ncy1cIiArIGN1cnJlbnRfZGF0ZXRpbWUgKyBcIi5qc29uXCIpO1xuICAgIC8vIGNyZWF0ZSBuZXcgZW1iZWRkaW5ncyBmaWxlXG4gICAgYXdhaXQgdGhpcy5pbml0X2VtYmVkZGluZ3NfZmlsZSgpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVmVjTGl0ZTsiLCAiY29uc3QgT2JzaWRpYW4gPSByZXF1aXJlKFwib2JzaWRpYW5cIik7XG5jb25zdCBWZWNMaXRlID0gcmVxdWlyZShcInZlYy1saXRlXCIpO1xuXG5jb25zdCBERUZBVUxUX1NFVFRJTkdTID0ge1xuICBhcGlfa2V5OiBcIlwiLFxuICBjaGF0X29wZW46IHRydWUsXG4gIGZpbGVfZXhjbHVzaW9uczogXCJcIixcbiAgZm9sZGVyX2V4Y2x1c2lvbnM6IFwiXCIsXG4gIGhlYWRlcl9leGNsdXNpb25zOiBcIlwiLFxuICBwYXRoX29ubHk6IFwiXCIsXG4gIHNob3dfZnVsbF9wYXRoOiBmYWxzZSxcbiAgZXhwYW5kZWRfdmlldzogdHJ1ZSxcbiAgZ3JvdXBfbmVhcmVzdF9ieV9maWxlOiBmYWxzZSxcbiAgbGFuZ3VhZ2U6IFwiZW5cIixcbiAgbG9nX3JlbmRlcjogZmFsc2UsXG4gIGxvZ19yZW5kZXJfZmlsZXM6IGZhbHNlLFxuICByZWNlbnRseV9zZW50X3JldHJ5X25vdGljZTogZmFsc2UsXG4gIHNraXBfc2VjdGlvbnM6IGZhbHNlLFxuICBzbWFydF9jaGF0X21vZGVsOiBcImdwdC0zLjUtdHVyYm8tMTZrXCIsXG4gIHZpZXdfb3BlbjogdHJ1ZSxcbiAgdmVyc2lvbjogXCJcIixcbn07XG5jb25zdCBNQVhfRU1CRURfU1RSSU5HX0xFTkdUSCA9IDI1MDAwO1xuXG5sZXQgVkVSU0lPTjtcbmNvbnN0IFNVUFBPUlRFRF9GSUxFX1RZUEVTID0gW1wibWRcIiwgXCJjYW52YXNcIl07XG5cbi8vY3JlYXRlIG9uZSBvYmplY3Qgd2l0aCBhbGwgdGhlIHRyYW5zbGF0aW9uc1xuLy8gcmVzZWFyY2ggOiBTTUFSVF9UUkFOU0xBVElPTltsYW5ndWFnZV1ba2V5XVxuY29uc3QgU01BUlRfVFJBTlNMQVRJT04gPSB7XG4gIFwiZW5cIjoge1xuICAgIFwicHJvbm91c1wiOiBbXCJteVwiLCBcIklcIiwgXCJtZVwiLCBcIm1pbmVcIiwgXCJvdXJcIiwgXCJvdXJzXCIsIFwidXNcIiwgXCJ3ZVwiXSxcbiAgICBcInByb21wdFwiOiBcIkJhc2VkIG9uIHlvdXIgbm90ZXNcIixcbiAgICBcImluaXRpYWxfbWVzc2FnZVwiOiBcIkhpLCBJJ20gQ2hhdEdQVCB3aXRoIGFjY2VzcyB0byB5b3VyIG5vdGVzIHZpYSBTbWFydCBDb25uZWN0aW9ucy4gQXNrIG1lIGEgcXVlc3Rpb24gYWJvdXQgeW91ciBub3RlcyBhbmQgSSdsbCB0cnkgdG8gYW5zd2VyIGl0LlwiLFxuICB9LFxuICBcImVzXCI6IHtcbiAgICBcInByb25vdXNcIjogW1wibWlcIiwgXCJ5b1wiLCBcIm1cdTAwRURcIiwgXCJ0XHUwMEZBXCJdLFxuICAgIFwicHJvbXB0XCI6IFwiQmFzXHUwMEUxbmRvc2UgZW4gc3VzIG5vdGFzXCIsXG4gICAgXCJpbml0aWFsX21lc3NhZ2VcIjogXCJIb2xhLCBzb3kgQ2hhdEdQVCBjb24gYWNjZXNvIGEgdHVzIGFwdW50ZXMgYSB0cmF2XHUwMEU5cyBkZSBTbWFydCBDb25uZWN0aW9ucy4gSGF6bWUgdW5hIHByZWd1bnRhIHNvYnJlIHR1cyBhcHVudGVzIGUgaW50ZW50YXJcdTAwRTkgcmVzcG9uZGVydGUuXCIsXG4gIH0sXG4gIFwiZnJcIjoge1xuICAgIFwicHJvbm91c1wiOiBbXCJtZVwiLCBcIm1vblwiLCBcIm1hXCIsIFwibWVzXCIsIFwibW9pXCIsIFwibm91c1wiLCBcIm5vdHJlXCIsIFwibm9zXCIsIFwiamVcIiwgXCJqJ1wiLCBcIm0nXCJdLFxuICAgIFwicHJvbXB0XCI6IFwiRCdhcHJcdTAwRThzIHZvcyBub3Rlc1wiLFxuICAgIFwiaW5pdGlhbF9tZXNzYWdlXCI6IFwiQm9uam91ciwgamUgc3VpcyBDaGF0R1BUIGV0IGonYWkgYWNjXHUwMEU4cyBcdTAwRTAgdm9zIG5vdGVzIHZpYSBTbWFydCBDb25uZWN0aW9ucy4gUG9zZXotbW9pIHVuZSBxdWVzdGlvbiBzdXIgdm9zIG5vdGVzIGV0IGonZXNzYWllcmFpIGQneSByXHUwMEU5cG9uZHJlLlwiLFxuICB9LFxuICBcImRlXCI6IHtcbiAgICBcInByb25vdXNcIjogW1wibWVpblwiLCBcIm1laW5lXCIsIFwibWVpbmVuXCIsIFwibWVpbmVyXCIsIFwibWVpbmVzXCIsIFwibWlyXCIsIFwidW5zXCIsIFwidW5zZXJcIiwgXCJ1bnNlcmVuXCIsIFwidW5zZXJlclwiLCBcInVuc2VyZXNcIl0sXG4gICAgXCJwcm9tcHRcIjogXCJCYXNpZXJlbmQgYXVmIElocmVuIE5vdGl6ZW5cIixcbiAgICBcImluaXRpYWxfbWVzc2FnZVwiOiBcIkhhbGxvLCBpY2ggYmluIENoYXRHUFQgdW5kIGhhYmUgXHUwMEZDYmVyIFNtYXJ0IENvbm5lY3Rpb25zIFp1Z2FuZyB6dSBJaHJlbiBOb3RpemVuLiBTdGVsbGVuIFNpZSBtaXIgZWluZSBGcmFnZSB6dSBJaHJlbiBOb3RpemVuIHVuZCBpY2ggd2VyZGUgdmVyc3VjaGVuLCBzaWUgenUgYmVhbnR3b3J0ZW4uXCIsXG4gIH0sXG4gIFwiaXRcIjoge1xuICAgIFwicHJvbm91c1wiOiBbXCJtaW9cIiwgXCJtaWFcIiwgXCJtaWVpXCIsIFwibWllXCIsIFwibm9pXCIsIFwibm9zdHJvXCIsIFwibm9zdHJpXCIsIFwibm9zdHJhXCIsIFwibm9zdHJlXCJdLFxuICAgIFwicHJvbXB0XCI6IFwiU3VsbGEgYmFzZSBkZWdsaSBhcHB1bnRpXCIsXG4gICAgXCJpbml0aWFsX21lc3NhZ2VcIjogXCJDaWFvLCBzb25vIENoYXRHUFQgZSBobyBhY2Nlc3NvIGFpIHR1b2kgYXBwdW50aSB0cmFtaXRlIFNtYXJ0IENvbm5lY3Rpb25zLiBGYXRlbWkgdW5hIGRvbWFuZGEgc3VpIHZvc3RyaSBhcHB1bnRpIGUgY2VyY2hlclx1MDBGMiBkaSByaXNwb25kZXJ2aS5cIixcbiAgfSxcbn1cblxuLy8gcmVxdWlyZSBidWlsdC1pbiBjcnlwdG8gbW9kdWxlXG5jb25zdCBjcnlwdG8gPSByZXF1aXJlKFwiY3J5cHRvXCIpO1xuLy8gbWQ1IGhhc2ggdXNpbmcgYnVpbHQgaW4gY3J5cHRvIG1vZHVsZVxuZnVuY3Rpb24gbWQ1KHN0cikge1xuICByZXR1cm4gY3J5cHRvLmNyZWF0ZUhhc2goXCJtZDVcIikudXBkYXRlKHN0cikuZGlnZXN0KFwiaGV4XCIpO1xufVxuXG5jbGFzcyBTbWFydENvbm5lY3Rpb25zUGx1Z2luIGV4dGVuZHMgT2JzaWRpYW4uUGx1Z2luIHtcbiAgLy8gY29uc3RydWN0b3JcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoLi4uYXJndW1lbnRzKTtcbiAgICB0aGlzLmFwaSA9IG51bGw7XG4gICAgdGhpcy5lbWJlZGRpbmdzX2xvYWRlZCA9IGZhbHNlO1xuICAgIHRoaXMuZmlsZV9leGNsdXNpb25zID0gW107XG4gICAgdGhpcy5mb2xkZXJzID0gW107XG4gICAgdGhpcy5oYXNfbmV3X2VtYmVkZGluZ3MgPSBmYWxzZTtcbiAgICB0aGlzLmhlYWRlcl9leGNsdXNpb25zID0gW107XG4gICAgdGhpcy5uZWFyZXN0X2NhY2hlID0ge307XG4gICAgdGhpcy5wYXRoX29ubHkgPSBbXTtcbiAgICB0aGlzLnJlbmRlcl9sb2cgPSB7fTtcbiAgICB0aGlzLnJlbmRlcl9sb2cuZGVsZXRlZF9lbWJlZGRpbmdzID0gMDtcbiAgICB0aGlzLnJlbmRlcl9sb2cuZXhjbHVzaW9uc19sb2dzID0ge307XG4gICAgdGhpcy5yZW5kZXJfbG9nLmZhaWxlZF9lbWJlZGRpbmdzID0gW107XG4gICAgdGhpcy5yZW5kZXJfbG9nLmZpbGVzID0gW107XG4gICAgdGhpcy5yZW5kZXJfbG9nLm5ld19lbWJlZGRpbmdzID0gMDtcbiAgICB0aGlzLnJlbmRlcl9sb2cuc2tpcHBlZF9sb3dfZGVsdGEgPSB7fTtcbiAgICB0aGlzLnJlbmRlcl9sb2cudG9rZW5fdXNhZ2UgPSAwO1xuICAgIHRoaXMucmVuZGVyX2xvZy50b2tlbnNfc2F2ZWRfYnlfY2FjaGUgPSAwO1xuICAgIHRoaXMucmV0cnlfbm90aWNlX3RpbWVvdXQgPSBudWxsO1xuICAgIHRoaXMuc2F2ZV90aW1lb3V0ID0gbnVsbDtcbiAgICB0aGlzLnNjX2JyYW5kaW5nID0ge307XG4gICAgdGhpcy5zZWxmX3JlZl9rd19yZWdleCA9IG51bGw7XG4gICAgdGhpcy51cGRhdGVfYXZhaWxhYmxlID0gZmFsc2U7XG4gIH1cblxuICBhc3luYyBvbmxvYWQoKSB7XG4gICAgLy8gaW5pdGlhbGl6ZSB3aGVuIGxheW91dCBpcyByZWFkeVxuICAgIHRoaXMuYXBwLndvcmtzcGFjZS5vbkxheW91dFJlYWR5KHRoaXMuaW5pdGlhbGl6ZS5iaW5kKHRoaXMpKTtcbiAgfVxuICBvbnVubG9hZCgpIHtcbiAgICB0aGlzLm91dHB1dF9yZW5kZXJfbG9nKCk7XG4gICAgY29uc29sZS5sb2coXCJ1bmxvYWRpbmcgcGx1Z2luXCIpO1xuICAgIHRoaXMuYXBwLndvcmtzcGFjZS5kZXRhY2hMZWF2ZXNPZlR5cGUoU01BUlRfQ09OTkVDVElPTlNfVklFV19UWVBFKTtcbiAgICB0aGlzLmFwcC53b3Jrc3BhY2UuZGV0YWNoTGVhdmVzT2ZUeXBlKFNNQVJUX0NPTk5FQ1RJT05TX0NIQVRfVklFV19UWVBFKTtcbiAgfVxuICBhc3luYyBpbml0aWFsaXplKCkge1xuICAgIGNvbnNvbGUubG9nKFwiTG9hZGluZyBTbWFydCBDb25uZWN0aW9ucyBwbHVnaW5cIik7XG4gICAgVkVSU0lPTiA9IHRoaXMubWFuaWZlc3QudmVyc2lvbjtcbiAgICAvLyBWRVJTSU9OID0gJzEuMC4wJztcbiAgICAvLyBjb25zb2xlLmxvZyhWRVJTSU9OKTtcbiAgICBhd2FpdCB0aGlzLmxvYWRTZXR0aW5ncygpO1xuICAgIC8vIHJ1biBhZnRlciAzIHNlY29uZHNcbiAgICBzZXRUaW1lb3V0KHRoaXMuY2hlY2tfZm9yX3VwZGF0ZS5iaW5kKHRoaXMpLCAzMDAwKTtcbiAgICAvLyBydW4gY2hlY2sgZm9yIHVwZGF0ZSBldmVyeSAzIGhvdXJzXG4gICAgc2V0SW50ZXJ2YWwodGhpcy5jaGVja19mb3JfdXBkYXRlLmJpbmQodGhpcyksIDEwODAwMDAwKTtcblxuICAgIHRoaXMuYWRkSWNvbigpO1xuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJzYy1maW5kLW5vdGVzXCIsXG4gICAgICBuYW1lOiBcIkZpbmQ6IE1ha2UgU21hcnQgQ29ubmVjdGlvbnNcIixcbiAgICAgIGljb246IFwicGVuY2lsX2ljb25cIixcbiAgICAgIGhvdGtleXM6IFtdLFxuICAgICAgLy8gZWRpdG9yQ2FsbGJhY2s6IGFzeW5jIChlZGl0b3IpID0+IHtcbiAgICAgIGVkaXRvckNhbGxiYWNrOiBhc3luYyAoZWRpdG9yKSA9PiB7XG4gICAgICAgIGlmKGVkaXRvci5zb21ldGhpbmdTZWxlY3RlZCgpKSB7XG4gICAgICAgICAgLy8gZ2V0IHNlbGVjdGVkIHRleHRcbiAgICAgICAgICBsZXQgc2VsZWN0ZWRfdGV4dCA9IGVkaXRvci5nZXRTZWxlY3Rpb24oKTtcbiAgICAgICAgICAvLyByZW5kZXIgY29ubmVjdGlvbnMgZnJvbSBzZWxlY3RlZCB0ZXh0XG4gICAgICAgICAgYXdhaXQgdGhpcy5tYWtlX2Nvbm5lY3Rpb25zKHNlbGVjdGVkX3RleHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIGNsZWFyIG5lYXJlc3RfY2FjaGUgb24gbWFudWFsIGNhbGwgdG8gbWFrZSBjb25uZWN0aW9uc1xuICAgICAgICAgIHRoaXMubmVhcmVzdF9jYWNoZSA9IHt9O1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiQ2xlYXJlZCBuZWFyZXN0X2NhY2hlXCIpO1xuICAgICAgICAgIGF3YWl0IHRoaXMubWFrZV9jb25uZWN0aW9ucygpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiBcInNtYXJ0LWNvbm5lY3Rpb25zLXZpZXdcIixcbiAgICAgIG5hbWU6IFwiT3BlbjogVmlldyBTbWFydCBDb25uZWN0aW9uc1wiLFxuICAgICAgY2FsbGJhY2s6ICgpID0+IHtcbiAgICAgICAgdGhpcy5vcGVuX3ZpZXcoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICAvLyBvcGVuIGNoYXQgY29tbWFuZFxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJzbWFydC1jb25uZWN0aW9ucy1jaGF0XCIsXG4gICAgICBuYW1lOiBcIk9wZW46IFNtYXJ0IENoYXQgQ29udmVyc2F0aW9uXCIsXG4gICAgICBjYWxsYmFjazogKCkgPT4ge1xuICAgICAgICB0aGlzLm9wZW5fY2hhdCgpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIC8vIG9wZW4gcmFuZG9tIG5vdGUgZnJvbSBuZWFyZXN0IGNhY2hlXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcbiAgICAgIGlkOiBcInNtYXJ0LWNvbm5lY3Rpb25zLXJhbmRvbVwiLFxuICAgICAgbmFtZTogXCJPcGVuOiBSYW5kb20gTm90ZSBmcm9tIFNtYXJ0IENvbm5lY3Rpb25zXCIsXG4gICAgICBjYWxsYmFjazogKCkgPT4ge1xuICAgICAgICB0aGlzLm9wZW5fcmFuZG9tX25vdGUoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICAvLyBhZGQgc2V0dGluZ3MgdGFiXG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBTbWFydENvbm5lY3Rpb25zU2V0dGluZ3NUYWIodGhpcy5hcHAsIHRoaXMpKTtcbiAgICAvLyByZWdpc3RlciBtYWluIHZpZXcgdHlwZVxuICAgIHRoaXMucmVnaXN0ZXJWaWV3KFNNQVJUX0NPTk5FQ1RJT05TX1ZJRVdfVFlQRSwgKGxlYWYpID0+IChuZXcgU21hcnRDb25uZWN0aW9uc1ZpZXcobGVhZiwgdGhpcykpKTtcbiAgICAvLyByZWdpc3RlciBjaGF0IHZpZXcgdHlwZVxuICAgIHRoaXMucmVnaXN0ZXJWaWV3KFNNQVJUX0NPTk5FQ1RJT05TX0NIQVRfVklFV19UWVBFLCAobGVhZikgPT4gKG5ldyBTbWFydENvbm5lY3Rpb25zQ2hhdFZpZXcobGVhZiwgdGhpcykpKTtcbiAgICAvLyBjb2RlLWJsb2NrIHJlbmRlcmVyXG4gICAgdGhpcy5yZWdpc3Rlck1hcmtkb3duQ29kZUJsb2NrUHJvY2Vzc29yKFwic21hcnQtY29ubmVjdGlvbnNcIiwgdGhpcy5yZW5kZXJfY29kZV9ibG9jay5iaW5kKHRoaXMpKTtcblxuICAgIC8vIGlmIHRoaXMgc2V0dGluZ3Mudmlld19vcGVuIGlzIHRydWUsIG9wZW4gdmlldyBvbiBzdGFydHVwXG4gICAgaWYodGhpcy5zZXR0aW5ncy52aWV3X29wZW4pIHtcbiAgICAgIHRoaXMub3Blbl92aWV3KCk7XG4gICAgfVxuICAgIC8vIGlmIHRoaXMgc2V0dGluZ3MuY2hhdF9vcGVuIGlzIHRydWUsIG9wZW4gY2hhdCBvbiBzdGFydHVwXG4gICAgaWYodGhpcy5zZXR0aW5ncy5jaGF0X29wZW4pIHtcbiAgICAgIHRoaXMub3Blbl9jaGF0KCk7XG4gICAgfVxuICAgIC8vIG9uIG5ldyB2ZXJzaW9uXG4gICAgaWYodGhpcy5zZXR0aW5ncy52ZXJzaW9uICE9PSBWRVJTSU9OKSB7XG4gICAgICAvLyB1cGRhdGUgdmVyc2lvblxuICAgICAgdGhpcy5zZXR0aW5ncy52ZXJzaW9uID0gVkVSU0lPTjtcbiAgICAgIC8vIHNhdmUgc2V0dGluZ3NcbiAgICAgIGF3YWl0IHRoaXMuc2F2ZVNldHRpbmdzKCk7XG4gICAgICAvLyBvcGVuIHZpZXdcbiAgICAgIHRoaXMub3Blbl92aWV3KCk7XG4gICAgfVxuICAgIC8vIGNoZWNrIGdpdGh1YiByZWxlYXNlIGVuZHBvaW50IGlmIHVwZGF0ZSBpcyBhdmFpbGFibGVcbiAgICB0aGlzLmFkZF90b19naXRpZ25vcmUoKTtcbiAgICAvKipcbiAgICAgKiBFWFBFUklNRU5UQUxcbiAgICAgKiAtIHdpbmRvdy1iYXNlZCBBUEkgYWNjZXNzXG4gICAgICogLSBjb2RlLWJsb2NrIHJlbmRlcmluZ1xuICAgICAqL1xuICAgIHRoaXMuYXBpID0gbmV3IFNjU2VhcmNoQXBpKHRoaXMuYXBwLCB0aGlzKTtcbiAgICAvLyByZWdpc3RlciBBUEkgdG8gZ2xvYmFsIHdpbmRvdyBvYmplY3RcbiAgICAod2luZG93W1wiU21hcnRTZWFyY2hBcGlcIl0gPSB0aGlzLmFwaSkgJiYgdGhpcy5yZWdpc3RlcigoKSA9PiBkZWxldGUgd2luZG93W1wiU21hcnRTZWFyY2hBcGlcIl0pO1xuXG4gIH1cblxuICBhc3luYyBpbml0X3ZlY3MoKSB7XG4gICAgdGhpcy5zbWFydF92ZWNfbGl0ZSA9IG5ldyBWZWNMaXRlKHtcbiAgICAgIGZvbGRlcl9wYXRoOiBcIi5zbWFydC1jb25uZWN0aW9uc1wiLFxuICAgICAgZXhpc3RzX2FkYXB0ZXI6IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIuZXhpc3RzLmJpbmQodGhpcy5hcHAudmF1bHQuYWRhcHRlciksXG4gICAgICBta2Rpcl9hZGFwdGVyOiB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLm1rZGlyLmJpbmQodGhpcy5hcHAudmF1bHQuYWRhcHRlciksXG4gICAgICByZWFkX2FkYXB0ZXI6IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIucmVhZC5iaW5kKHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIpLFxuICAgICAgcmVuYW1lX2FkYXB0ZXI6IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIucmVuYW1lLmJpbmQodGhpcy5hcHAudmF1bHQuYWRhcHRlciksXG4gICAgICBzdGF0X2FkYXB0ZXI6IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIuc3RhdC5iaW5kKHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIpLFxuICAgICAgd3JpdGVfYWRhcHRlcjogdGhpcy5hcHAudmF1bHQuYWRhcHRlci53cml0ZS5iaW5kKHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIpLFxuICAgIH0pO1xuICAgIHRoaXMuZW1iZWRkaW5nc19sb2FkZWQgPSBhd2FpdCB0aGlzLnNtYXJ0X3ZlY19saXRlLmxvYWQoKTtcbiAgICByZXR1cm4gdGhpcy5lbWJlZGRpbmdzX2xvYWRlZDtcbiAgfVxuICBhc3luYyB1cGRhdGVfdG9fdjIoKSB7XG4gICAgLy8gaWYgbGljZW5zZSBrZXkgaXMgbm90IHNldCwgcmV0dXJuXG4gICAgaWYoIXRoaXMuc2V0dGluZ3MubGljZW5zZV9rZXkpIHJldHVybiBuZXcgT2JzaWRpYW4uTm90aWNlKFwiW1NtYXJ0IENvbm5lY3Rpb25zXSBTdXBwb3J0ZXIgbGljZW5zZSBrZXkgcmVxdWlyZWQgZm9yIGVhcmx5IGFjY2VzcyB0byBWMlwiKTtcbiAgICAvLyBkb3dubG9hZCBodHRwczovL2dpdGh1Yi5jb20vYnJpYW5wZXRyby9vYnNpZGlhbi1zbWFydC1jb25uZWN0aW9ucy9yZWxlYXNlcy9kb3dubG9hZC8xLjYuMzcvbWFpbi5qc1xuICAgIGNvbnN0IHYyID0gYXdhaXQgKDAsIE9ic2lkaWFuLnJlcXVlc3RVcmwpKHtcbiAgICAgIHVybDogXCJodHRwczovL3N5bmMuc21hcnRjb25uZWN0aW9ucy5hcHAvZG93bmxvYWRfdjJcIixcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgbGljZW5zZV9rZXk6IHRoaXMuc2V0dGluZ3MubGljZW5zZV9rZXksXG4gICAgICB9KVxuICAgIH0pO1xuICAgIGlmKHYyLnN0YXR1cyAhPT0gMjAwKSByZXR1cm4gY29uc29sZS5lcnJvcihcIkVycm9yIGRvd25sb2FkaW5nIHZlcnNpb24gMlwiLCB2Mik7XG4gICAgY29uc29sZS5sb2codjIpO1xuICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIud3JpdGUoXCIub2JzaWRpYW4vcGx1Z2lucy9zbWFydC1jb25uZWN0aW9ucy9tYWluLmpzXCIsIHYyLmpzb24ubWFpbik7IC8vIGFkZCBuZXdcbiAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLndyaXRlKFwiLm9ic2lkaWFuL3BsdWdpbnMvc21hcnQtY29ubmVjdGlvbnMvbWFuaWZlc3QuanNvblwiLCB2Mi5qc29uLm1hbmlmZXN0KTsgLy8gYWRkIG5ld1xuICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIud3JpdGUoXCIub2JzaWRpYW4vcGx1Z2lucy9zbWFydC1jb25uZWN0aW9ucy9zdHlsZXMuY3NzXCIsIHYyLmpzb24uc3R5bGVzKTsgLy8gYWRkIG5ld1xuICAgIHdpbmRvdy5yZXN0YXJ0X3BsdWdpbiA9IGFzeW5jIChpZCkgPT4ge1xuICAgICAgY29uc29sZS5sb2coXCJyZXN0YXJ0aW5nIHBsdWdpblwiLCBpZCk7XG4gICAgICBhd2FpdCB3aW5kb3cuYXBwLnBsdWdpbnMuZGlzYWJsZVBsdWdpbihpZCk7XG4gICAgICBhd2FpdCB3aW5kb3cuYXBwLnBsdWdpbnMuZW5hYmxlUGx1Z2luKGlkKTtcbiAgICAgIGNvbnNvbGUubG9nKFwicGx1Z2luIHJlc3RhcnRlZFwiLCBpZCk7XG4gICAgfVxuICAgIHdpbmRvdy5yZXN0YXJ0X3BsdWdpbih0aGlzLm1hbmlmZXN0LmlkKTtcbiAgfVxuXG4gIGFzeW5jIGxvYWRTZXR0aW5ncygpIHtcbiAgICB0aGlzLnNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgREVGQVVMVF9TRVRUSU5HUywgYXdhaXQgdGhpcy5sb2FkRGF0YSgpKTtcbiAgICAvLyBsb2FkIGZpbGUgZXhjbHVzaW9ucyBpZiBub3QgYmxhbmtcbiAgICBpZih0aGlzLnNldHRpbmdzLmZpbGVfZXhjbHVzaW9ucyAmJiB0aGlzLnNldHRpbmdzLmZpbGVfZXhjbHVzaW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyBzcGxpdCBmaWxlIGV4Y2x1c2lvbnMgaW50byBhcnJheSBhbmQgdHJpbSB3aGl0ZXNwYWNlXG4gICAgICB0aGlzLmZpbGVfZXhjbHVzaW9ucyA9IHRoaXMuc2V0dGluZ3MuZmlsZV9leGNsdXNpb25zLnNwbGl0KFwiLFwiKS5tYXAoKGZpbGUpID0+IHtcbiAgICAgICAgcmV0dXJuIGZpbGUudHJpbSgpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIC8vIGxvYWQgZm9sZGVyIGV4Y2x1c2lvbnMgaWYgbm90IGJsYW5rXG4gICAgaWYodGhpcy5zZXR0aW5ncy5mb2xkZXJfZXhjbHVzaW9ucyAmJiB0aGlzLnNldHRpbmdzLmZvbGRlcl9leGNsdXNpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIGFkZCBzbGFzaCB0byBlbmQgb2YgZm9sZGVyIG5hbWUgaWYgbm90IHByZXNlbnRcbiAgICAgIGNvbnN0IGZvbGRlcl9leGNsdXNpb25zID0gdGhpcy5zZXR0aW5ncy5mb2xkZXJfZXhjbHVzaW9ucy5zcGxpdChcIixcIikubWFwKChmb2xkZXIpID0+IHtcbiAgICAgICAgLy8gdHJpbSB3aGl0ZXNwYWNlXG4gICAgICAgIGZvbGRlciA9IGZvbGRlci50cmltKCk7XG4gICAgICAgIGlmKGZvbGRlci5zbGljZSgtMSkgIT09IFwiL1wiKSB7XG4gICAgICAgICAgcmV0dXJuIGZvbGRlciArIFwiL1wiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBmb2xkZXI7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgLy8gbWVyZ2UgZm9sZGVyIGV4Y2x1c2lvbnMgd2l0aCBmaWxlIGV4Y2x1c2lvbnNcbiAgICAgIHRoaXMuZmlsZV9leGNsdXNpb25zID0gdGhpcy5maWxlX2V4Y2x1c2lvbnMuY29uY2F0KGZvbGRlcl9leGNsdXNpb25zKTtcbiAgICB9XG4gICAgLy8gbG9hZCBoZWFkZXIgZXhjbHVzaW9ucyBpZiBub3QgYmxhbmtcbiAgICBpZih0aGlzLnNldHRpbmdzLmhlYWRlcl9leGNsdXNpb25zICYmIHRoaXMuc2V0dGluZ3MuaGVhZGVyX2V4Y2x1c2lvbnMubGVuZ3RoID4gMCkge1xuICAgICAgdGhpcy5oZWFkZXJfZXhjbHVzaW9ucyA9IHRoaXMuc2V0dGluZ3MuaGVhZGVyX2V4Y2x1c2lvbnMuc3BsaXQoXCIsXCIpLm1hcCgoaGVhZGVyKSA9PiB7XG4gICAgICAgIHJldHVybiBoZWFkZXIudHJpbSgpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIC8vIGxvYWQgcGF0aF9vbmx5IGlmIG5vdCBibGFua1xuICAgIGlmKHRoaXMuc2V0dGluZ3MucGF0aF9vbmx5ICYmIHRoaXMuc2V0dGluZ3MucGF0aF9vbmx5Lmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMucGF0aF9vbmx5ID0gdGhpcy5zZXR0aW5ncy5wYXRoX29ubHkuc3BsaXQoXCIsXCIpLm1hcCgocGF0aCkgPT4ge1xuICAgICAgICByZXR1cm4gcGF0aC50cmltKCk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgLy8gbG9hZCBzZWxmX3JlZl9rd19yZWdleFxuICAgIHRoaXMuc2VsZl9yZWZfa3dfcmVnZXggPSBuZXcgUmVnRXhwKGBcXFxcYigke1NNQVJUX1RSQU5TTEFUSU9OW3RoaXMuc2V0dGluZ3MubGFuZ3VhZ2VdLnByb25vdXMuam9pbihcInxcIil9KVxcXFxiYCwgXCJnaVwiKTtcbiAgICAvLyBsb2FkIGZhaWxlZCBmaWxlc1xuICAgIGF3YWl0IHRoaXMubG9hZF9mYWlsZWRfZmlsZXMoKTtcbiAgfVxuICBhc3luYyBzYXZlU2V0dGluZ3MocmVyZW5kZXI9ZmFsc2UpIHtcbiAgICBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpO1xuICAgIC8vIHJlLWxvYWQgc2V0dGluZ3MgaW50byBtZW1vcnlcbiAgICBhd2FpdCB0aGlzLmxvYWRTZXR0aW5ncygpO1xuICAgIC8vIHJlLXJlbmRlciB2aWV3IGlmIHNldCB0byB0cnVlIChmb3IgZXhhbXBsZSwgYWZ0ZXIgYWRkaW5nIEFQSSBrZXkpXG4gICAgaWYocmVyZW5kZXIpIHtcbiAgICAgIHRoaXMubmVhcmVzdF9jYWNoZSA9IHt9O1xuICAgICAgYXdhaXQgdGhpcy5tYWtlX2Nvbm5lY3Rpb25zKCk7XG4gICAgfVxuICB9XG5cbiAgLy8gY2hlY2sgZm9yIHVwZGF0ZVxuICBhc3luYyBjaGVja19mb3JfdXBkYXRlKCkge1xuICAgIC8vIGZhaWwgc2lsZW50bHksIGV4LiBpZiBubyBpbnRlcm5ldCBjb25uZWN0aW9uXG4gICAgdHJ5IHtcbiAgICAgIC8vIGdldCBsYXRlc3QgcmVsZWFzZSB2ZXJzaW9uIGZyb20gZ2l0aHViXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0ICgwLCBPYnNpZGlhbi5yZXF1ZXN0VXJsKSh7XG4gICAgICAgIHVybDogXCJodHRwczovL2FwaS5naXRodWIuY29tL3JlcG9zL2JyaWFucGV0cm8vb2JzaWRpYW4tc21hcnQtY29ubmVjdGlvbnMvcmVsZWFzZXMvbGF0ZXN0XCIsXG4gICAgICAgIG1ldGhvZDogXCJHRVRcIixcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICB9LFxuICAgICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICB9KTtcbiAgICAgIC8vIGdldCB2ZXJzaW9uIG51bWJlciBmcm9tIHJlc3BvbnNlXG4gICAgICBjb25zdCBsYXRlc3RfcmVsZWFzZSA9IEpTT04ucGFyc2UocmVzcG9uc2UudGV4dCkudGFnX25hbWU7XG4gICAgICAvLyBjb25zb2xlLmxvZyhgTGF0ZXN0IHJlbGVhc2U6ICR7bGF0ZXN0X3JlbGVhc2V9YCk7XG4gICAgICAvLyBpZiBsYXRlc3RfcmVsZWFzZSBpcyBuZXdlciB0aGFuIGN1cnJlbnQgdmVyc2lvbiwgc2hvdyBtZXNzYWdlXG4gICAgICBpZihsYXRlc3RfcmVsZWFzZSAhPT0gVkVSU0lPTikge1xuICAgICAgICBuZXcgT2JzaWRpYW4uTm90aWNlKGBbU21hcnQgQ29ubmVjdGlvbnNdIEEgbmV3IHZlcnNpb24gaXMgYXZhaWxhYmxlISAodiR7bGF0ZXN0X3JlbGVhc2V9KWApO1xuICAgICAgICB0aGlzLnVwZGF0ZV9hdmFpbGFibGUgPSB0cnVlO1xuICAgICAgICB0aGlzLnJlbmRlcl9icmFuZChcImFsbFwiKVxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmxvZyhlcnJvcik7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVuZGVyX2NvZGVfYmxvY2soY29udGVudHMsIGNvbnRhaW5lciwgY3R4KSB7XG4gICAgbGV0IG5lYXJlc3Q7XG4gICAgaWYoY29udGVudHMudHJpbSgpLmxlbmd0aCA+IDApIHtcbiAgICAgIG5lYXJlc3QgPSBhd2FpdCB0aGlzLmFwaS5zZWFyY2goY29udGVudHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyB1c2UgY3R4IHRvIGdldCBmaWxlXG4gICAgICBjb25zb2xlLmxvZyhjdHgpO1xuICAgICAgY29uc3QgZmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChjdHguc291cmNlUGF0aCk7XG4gICAgICBuZWFyZXN0ID0gYXdhaXQgdGhpcy5maW5kX25vdGVfY29ubmVjdGlvbnMoZmlsZSk7XG4gICAgfVxuICAgIGlmIChuZWFyZXN0Lmxlbmd0aCkge1xuICAgICAgdGhpcy51cGRhdGVfcmVzdWx0cyhjb250YWluZXIsIG5lYXJlc3QpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIG1ha2VfY29ubmVjdGlvbnMoc2VsZWN0ZWRfdGV4dD1udWxsKSB7XG4gICAgbGV0IHZpZXcgPSB0aGlzLmdldF92aWV3KCk7XG4gICAgaWYgKCF2aWV3KSB7XG4gICAgICAvLyBvcGVuIHZpZXcgaWYgbm90IG9wZW5cbiAgICAgIGF3YWl0IHRoaXMub3Blbl92aWV3KCk7XG4gICAgICB2aWV3ID0gdGhpcy5nZXRfdmlldygpO1xuICAgIH1cbiAgICBhd2FpdCB2aWV3LnJlbmRlcl9jb25uZWN0aW9ucyhzZWxlY3RlZF90ZXh0KTtcbiAgfVxuXG4gIGFkZEljb24oKXtcbiAgICBPYnNpZGlhbi5hZGRJY29uKFwic21hcnQtY29ubmVjdGlvbnNcIiwgYDxwYXRoIGQ9XCJNNTAsMjAgTDgwLDQwIEw4MCw2MCBMNTAsMTAwXCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiNFwiIGZpbGw9XCJub25lXCIvPlxuICAgIDxwYXRoIGQ9XCJNMzAsNTAgTDU1LDcwXCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlLXdpZHRoPVwiNVwiIGZpbGw9XCJub25lXCIvPlxuICAgIDxjaXJjbGUgY3g9XCI1MFwiIGN5PVwiMjBcIiByPVwiOVwiIGZpbGw9XCJjdXJyZW50Q29sb3JcIi8+XG4gICAgPGNpcmNsZSBjeD1cIjgwXCIgY3k9XCI0MFwiIHI9XCI5XCIgZmlsbD1cImN1cnJlbnRDb2xvclwiLz5cbiAgICA8Y2lyY2xlIGN4PVwiODBcIiBjeT1cIjcwXCIgcj1cIjlcIiBmaWxsPVwiY3VycmVudENvbG9yXCIvPlxuICAgIDxjaXJjbGUgY3g9XCI1MFwiIGN5PVwiMTAwXCIgcj1cIjlcIiBmaWxsPVwiY3VycmVudENvbG9yXCIvPlxuICAgIDxjaXJjbGUgY3g9XCIzMFwiIGN5PVwiNTBcIiByPVwiOVwiIGZpbGw9XCJjdXJyZW50Q29sb3JcIi8+YCk7XG4gIH1cblxuICAvLyBvcGVuIHJhbmRvbSBub3RlXG4gIGFzeW5jIG9wZW5fcmFuZG9tX25vdGUoKSB7XG4gICAgY29uc3QgY3Vycl9maWxlID0gdGhpcy5hcHAud29ya3NwYWNlLmdldEFjdGl2ZUZpbGUoKTtcbiAgICBjb25zdCBjdXJyX2tleSA9IG1kNShjdXJyX2ZpbGUucGF0aCk7XG4gICAgLy8gaWYgbm8gbmVhcmVzdCBjYWNoZSwgY3JlYXRlIE9ic2lkaWFuIG5vdGljZVxuICAgIGlmKHR5cGVvZiB0aGlzLm5lYXJlc3RfY2FjaGVbY3Vycl9rZXldID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICBuZXcgT2JzaWRpYW4uTm90aWNlKFwiW1NtYXJ0IENvbm5lY3Rpb25zXSBObyBTbWFydCBDb25uZWN0aW9ucyBmb3VuZC4gT3BlbiBhIG5vdGUgdG8gZ2V0IFNtYXJ0IENvbm5lY3Rpb25zLlwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gZ2V0IHJhbmRvbSBmcm9tIG5lYXJlc3QgY2FjaGVcbiAgICBjb25zdCByYW5kID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogdGhpcy5uZWFyZXN0X2NhY2hlW2N1cnJfa2V5XS5sZW5ndGgvMik7IC8vIGRpdmlkZSBieSAyIHRvIGxpbWl0IHRvIHRvcCBoYWxmIG9mIHJlc3VsdHNcbiAgICBjb25zdCByYW5kb21fZmlsZSA9IHRoaXMubmVhcmVzdF9jYWNoZVtjdXJyX2tleV1bcmFuZF07XG4gICAgLy8gb3BlbiByYW5kb20gZmlsZVxuICAgIHRoaXMub3Blbl9ub3RlKHJhbmRvbV9maWxlKTtcbiAgfVxuXG4gIGFzeW5jIG9wZW5fdmlldygpIHtcbiAgICBpZih0aGlzLmdldF92aWV3KCkpe1xuICAgICAgY29uc29sZS5sb2coXCJTbWFydCBDb25uZWN0aW9ucyB2aWV3IGFscmVhZHkgb3BlblwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5hcHAud29ya3NwYWNlLmRldGFjaExlYXZlc09mVHlwZShTTUFSVF9DT05ORUNUSU9OU19WSUVXX1RZUEUpO1xuICAgIGF3YWl0IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRSaWdodExlYWYoZmFsc2UpLnNldFZpZXdTdGF0ZSh7XG4gICAgICB0eXBlOiBTTUFSVF9DT05ORUNUSU9OU19WSUVXX1RZUEUsXG4gICAgICBhY3RpdmU6IHRydWUsXG4gICAgfSk7XG4gICAgdGhpcy5hcHAud29ya3NwYWNlLnJldmVhbExlYWYoXG4gICAgICB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKFNNQVJUX0NPTk5FQ1RJT05TX1ZJRVdfVFlQRSlbMF1cbiAgICApO1xuICB9XG4gIC8vIHNvdXJjZTogaHR0cHM6Ly9naXRodWIuY29tL29ic2lkaWFubWQvb2JzaWRpYW4tcmVsZWFzZXMvYmxvYi9tYXN0ZXIvcGx1Z2luLXJldmlldy5tZCNhdm9pZC1tYW5hZ2luZy1yZWZlcmVuY2VzLXRvLWN1c3RvbS12aWV3c1xuICBnZXRfdmlldygpIHtcbiAgICBmb3IgKGxldCBsZWFmIG9mIHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWF2ZXNPZlR5cGUoU01BUlRfQ09OTkVDVElPTlNfVklFV19UWVBFKSkge1xuICAgICAgaWYgKGxlYWYudmlldyBpbnN0YW5jZW9mIFNtYXJ0Q29ubmVjdGlvbnNWaWV3KSB7XG4gICAgICAgIHJldHVybiBsZWFmLnZpZXc7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIC8vIG9wZW4gY2hhdCB2aWV3XG4gIGFzeW5jIG9wZW5fY2hhdChyZXRyaWVzPTApIHtcbiAgICBpZighdGhpcy5lbWJlZGRpbmdzX2xvYWRlZCkge1xuICAgICAgY29uc29sZS5sb2coXCJlbWJlZGRpbmdzIG5vdCBsb2FkZWQgeWV0XCIpO1xuICAgICAgaWYocmV0cmllcyA8IDMpIHtcbiAgICAgICAgLy8gd2FpdCBhbmQgdHJ5IGFnYWluXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIHRoaXMub3Blbl9jaGF0KHJldHJpZXMrMSk7XG4gICAgICAgIH0sIDEwMDAgKiAocmV0cmllcysxKSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnNvbGUubG9nKFwiZW1iZWRkaW5ncyBzdGlsbCBub3QgbG9hZGVkLCBvcGVuaW5nIHNtYXJ0IHZpZXdcIik7XG4gICAgICB0aGlzLm9wZW5fdmlldygpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLmFwcC53b3Jrc3BhY2UuZGV0YWNoTGVhdmVzT2ZUeXBlKFNNQVJUX0NPTk5FQ1RJT05TX0NIQVRfVklFV19UWVBFKTtcbiAgICBhd2FpdCB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0UmlnaHRMZWFmKGZhbHNlKS5zZXRWaWV3U3RhdGUoe1xuICAgICAgdHlwZTogU01BUlRfQ09OTkVDVElPTlNfQ0hBVF9WSUVXX1RZUEUsXG4gICAgICBhY3RpdmU6IHRydWUsXG4gICAgfSk7XG4gICAgdGhpcy5hcHAud29ya3NwYWNlLnJldmVhbExlYWYoXG4gICAgICB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKFNNQVJUX0NPTk5FQ1RJT05TX0NIQVRfVklFV19UWVBFKVswXVxuICAgICk7XG4gIH1cbiAgXG4gIC8vIGdldCBlbWJlZGRpbmdzIGZvciBhbGwgZmlsZXNcbiAgYXN5bmMgZ2V0X2FsbF9lbWJlZGRpbmdzKCkge1xuICAgIC8vIGdldCBhbGwgZmlsZXMgaW4gdmF1bHQgYW5kIGZpbHRlciBhbGwgYnV0IG1hcmtkb3duIGFuZCBjYW52YXMgZmlsZXNcbiAgICBjb25zdCBmaWxlcyA9IChhd2FpdCB0aGlzLmFwcC52YXVsdC5nZXRGaWxlcygpKS5maWx0ZXIoKGZpbGUpID0+IGZpbGUgaW5zdGFuY2VvZiBPYnNpZGlhbi5URmlsZSAmJiAoZmlsZS5leHRlbnNpb24gPT09IFwibWRcIiB8fCBmaWxlLmV4dGVuc2lvbiA9PT0gXCJjYW52YXNcIikpO1xuICAgIC8vIGNvbnN0IGZpbGVzID0gYXdhaXQgdGhpcy5hcHAudmF1bHQuZ2V0TWFya2Rvd25GaWxlcygpO1xuICAgIC8vIGdldCBvcGVuIGZpbGVzIHRvIHNraXAgaWYgZmlsZSBpcyBjdXJyZW50bHkgb3BlblxuICAgIGNvbnN0IG9wZW5fZmlsZXMgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKFwibWFya2Rvd25cIikubWFwKChsZWFmKSA9PiBsZWFmLnZpZXcuZmlsZSk7XG4gICAgY29uc3QgY2xlYW5fdXBfbG9nID0gdGhpcy5zbWFydF92ZWNfbGl0ZS5jbGVhbl91cF9lbWJlZGRpbmdzKGZpbGVzKTtcbiAgICBpZih0aGlzLnNldHRpbmdzLmxvZ19yZW5kZXIpe1xuICAgICAgdGhpcy5yZW5kZXJfbG9nLnRvdGFsX2ZpbGVzID0gZmlsZXMubGVuZ3RoO1xuICAgICAgdGhpcy5yZW5kZXJfbG9nLmRlbGV0ZWRfZW1iZWRkaW5ncyA9IGNsZWFuX3VwX2xvZy5kZWxldGVkX2VtYmVkZGluZ3M7XG4gICAgICB0aGlzLnJlbmRlcl9sb2cudG90YWxfZW1iZWRkaW5ncyA9IGNsZWFuX3VwX2xvZy50b3RhbF9lbWJlZGRpbmdzO1xuICAgIH1cbiAgICAvLyBiYXRjaCBlbWJlZGRpbmdzXG4gICAgbGV0IGJhdGNoX3Byb21pc2VzID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBmaWxlcy5sZW5ndGg7IGkrKykge1xuICAgICAgLy8gc2tpcCBpZiBwYXRoIGNvbnRhaW5zIGEgI1xuICAgICAgaWYoZmlsZXNbaV0ucGF0aC5pbmRleE9mKFwiI1wiKSA+IC0xKSB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwic2tpcHBpbmcgZmlsZSAnXCIrZmlsZXNbaV0ucGF0aCtcIicgKHBhdGggY29udGFpbnMgIylcIik7XG4gICAgICAgIHRoaXMubG9nX2V4Y2x1c2lvbihcInBhdGggY29udGFpbnMgI1wiKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICAvLyBza2lwIGlmIGZpbGUgYWxyZWFkeSBoYXMgZW1iZWRkaW5nIGFuZCBlbWJlZGRpbmcubXRpbWUgaXMgZ3JlYXRlciB0aGFuIG9yIGVxdWFsIHRvIGZpbGUubXRpbWVcbiAgICAgIGlmKHRoaXMuc21hcnRfdmVjX2xpdGUubXRpbWVfaXNfY3VycmVudChtZDUoZmlsZXNbaV0ucGF0aCksIGZpbGVzW2ldLnN0YXQubXRpbWUpKSB7XG4gICAgICAgIC8vIGxvZyBza2lwcGluZyBmaWxlXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwic2tpcHBpbmcgZmlsZSAobXRpbWUpXCIpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIC8vIGNoZWNrIGlmIGZpbGUgaXMgaW4gZmFpbGVkX2ZpbGVzXG4gICAgICBpZih0aGlzLnNldHRpbmdzLmZhaWxlZF9maWxlcy5pbmRleE9mKGZpbGVzW2ldLnBhdGgpID4gLTEpIHtcbiAgICAgICAgLy8gbG9nIHNraXBwaW5nIGZpbGVcbiAgICAgICAgLy8gY29uc29sZS5sb2coXCJza2lwcGluZyBwcmV2aW91c2x5IGZhaWxlZCBmaWxlLCB1c2UgYnV0dG9uIGluIHNldHRpbmdzIHRvIHJldHJ5XCIpO1xuICAgICAgICAvLyB1c2Ugc2V0VGltZW91dCB0byBwcmV2ZW50IG11bHRpcGxlIG5vdGljZXNcbiAgICAgICAgaWYodGhpcy5yZXRyeV9ub3RpY2VfdGltZW91dCkge1xuICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnJldHJ5X25vdGljZV90aW1lb3V0KTtcbiAgICAgICAgICB0aGlzLnJldHJ5X25vdGljZV90aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICAvLyBsaW1pdCB0byBvbmUgbm90aWNlIGV2ZXJ5IDEwIG1pbnV0ZXNcbiAgICAgICAgaWYoIXRoaXMucmVjZW50bHlfc2VudF9yZXRyeV9ub3RpY2Upe1xuICAgICAgICAgIG5ldyBPYnNpZGlhbi5Ob3RpY2UoXCJTbWFydCBDb25uZWN0aW9uczogU2tpcHBpbmcgcHJldmlvdXNseSBmYWlsZWQgZmlsZSwgdXNlIGJ1dHRvbiBpbiBzZXR0aW5ncyB0byByZXRyeVwiKTtcbiAgICAgICAgICB0aGlzLnJlY2VudGx5X3NlbnRfcmV0cnlfbm90aWNlID0gdHJ1ZTtcbiAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMucmVjZW50bHlfc2VudF9yZXRyeV9ub3RpY2UgPSBmYWxzZTsgIFxuICAgICAgICAgIH0sIDYwMDAwMCk7XG4gICAgICAgIH1cbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICAvLyBza2lwIGZpbGVzIHdoZXJlIHBhdGggY29udGFpbnMgYW55IGV4Y2x1c2lvbnNcbiAgICAgIGxldCBza2lwID0gZmFsc2U7XG4gICAgICBmb3IobGV0IGogPSAwOyBqIDwgdGhpcy5maWxlX2V4Y2x1c2lvbnMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgaWYoZmlsZXNbaV0ucGF0aC5pbmRleE9mKHRoaXMuZmlsZV9leGNsdXNpb25zW2pdKSA+IC0xKSB7XG4gICAgICAgICAgc2tpcCA9IHRydWU7XG4gICAgICAgICAgdGhpcy5sb2dfZXhjbHVzaW9uKHRoaXMuZmlsZV9leGNsdXNpb25zW2pdKTtcbiAgICAgICAgICAvLyBicmVhayBvdXQgb2YgbG9vcFxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZihza2lwKSB7XG4gICAgICAgIGNvbnRpbnVlOyAvLyB0byBuZXh0IGZpbGVcbiAgICAgIH1cbiAgICAgIC8vIGNoZWNrIGlmIGZpbGUgaXMgb3BlblxuICAgICAgaWYob3Blbl9maWxlcy5pbmRleE9mKGZpbGVzW2ldKSA+IC0xKSB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwic2tpcHBpbmcgZmlsZSAob3BlbilcIik7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gcHVzaCBwcm9taXNlIHRvIGJhdGNoX3Byb21pc2VzXG4gICAgICAgIGJhdGNoX3Byb21pc2VzLnB1c2godGhpcy5nZXRfZmlsZV9lbWJlZGRpbmdzKGZpbGVzW2ldLCBmYWxzZSkpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xuICAgICAgfVxuICAgICAgLy8gaWYgYmF0Y2hfcHJvbWlzZXMgbGVuZ3RoIGlzIDEwXG4gICAgICBpZihiYXRjaF9wcm9taXNlcy5sZW5ndGggPiAzKSB7XG4gICAgICAgIC8vIHdhaXQgZm9yIGFsbCBwcm9taXNlcyB0byByZXNvbHZlXG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKGJhdGNoX3Byb21pc2VzKTtcbiAgICAgICAgLy8gY2xlYXIgYmF0Y2hfcHJvbWlzZXNcbiAgICAgICAgYmF0Y2hfcHJvbWlzZXMgPSBbXTtcbiAgICAgIH1cblxuICAgICAgLy8gc2F2ZSBlbWJlZGRpbmdzIEpTT04gdG8gZmlsZSBldmVyeSAxMDAgZmlsZXMgdG8gc2F2ZSBwcm9ncmVzcyBvbiBidWxrIGVtYmVkZGluZ1xuICAgICAgaWYoaSA+IDAgJiYgaSAlIDEwMCA9PT0gMCkge1xuICAgICAgICBhd2FpdCB0aGlzLnNhdmVfZW1iZWRkaW5nc190b19maWxlKCk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIHdhaXQgZm9yIGFsbCBwcm9taXNlcyB0byByZXNvbHZlXG4gICAgYXdhaXQgUHJvbWlzZS5hbGwoYmF0Y2hfcHJvbWlzZXMpO1xuICAgIC8vIHdyaXRlIGVtYmVkZGluZ3MgSlNPTiB0byBmaWxlXG4gICAgYXdhaXQgdGhpcy5zYXZlX2VtYmVkZGluZ3NfdG9fZmlsZSgpO1xuICAgIC8vIGlmIHJlbmRlcl9sb2cuZmFpbGVkX2VtYmVkZGluZ3MgdGhlbiB1cGRhdGUgZmFpbGVkX2VtYmVkZGluZ3MudHh0XG4gICAgaWYodGhpcy5yZW5kZXJfbG9nLmZhaWxlZF9lbWJlZGRpbmdzLmxlbmd0aCA+IDApIHtcbiAgICAgIGF3YWl0IHRoaXMuc2F2ZV9mYWlsZWRfZW1iZWRkaW5ncygpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHNhdmVfZW1iZWRkaW5nc190b19maWxlKGZvcmNlPWZhbHNlKSB7XG4gICAgaWYoIXRoaXMuaGFzX25ld19lbWJlZGRpbmdzKXtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gY29uc29sZS5sb2coXCJuZXcgZW1iZWRkaW5ncywgc2F2aW5nIHRvIGZpbGVcIik7XG4gICAgaWYoIWZvcmNlKSB7XG4gICAgICAvLyBwcmV2ZW50IGV4Y2Vzc2l2ZSB3cml0ZXMgdG8gZW1iZWRkaW5ncyBmaWxlIGJ5IHdhaXRpbmcgMSBtaW51dGUgYmVmb3JlIHdyaXRpbmdcbiAgICAgIGlmKHRoaXMuc2F2ZV90aW1lb3V0KSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnNhdmVfdGltZW91dCk7XG4gICAgICAgIHRoaXMuc2F2ZV90aW1lb3V0ID0gbnVsbDsgIFxuICAgICAgfVxuICAgICAgdGhpcy5zYXZlX3RpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgLy8gY29uc29sZS5sb2coXCJ3cml0aW5nIGVtYmVkZGluZ3MgdG8gZmlsZVwiKTtcbiAgICAgICAgdGhpcy5zYXZlX2VtYmVkZGluZ3NfdG9fZmlsZSh0cnVlKTtcbiAgICAgICAgLy8gY2xlYXIgdGltZW91dFxuICAgICAgICBpZih0aGlzLnNhdmVfdGltZW91dCkge1xuICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnNhdmVfdGltZW91dCk7XG4gICAgICAgICAgdGhpcy5zYXZlX3RpbWVvdXQgPSBudWxsO1xuICAgICAgICB9XG4gICAgICB9LCAzMDAwMCk7XG4gICAgICBjb25zb2xlLmxvZyhcInNjaGVkdWxlZCBzYXZlXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRyeXtcbiAgICAgIC8vIHVzZSBzbWFydF92ZWNfbGl0ZVxuICAgICAgYXdhaXQgdGhpcy5zbWFydF92ZWNfbGl0ZS5zYXZlKCk7XG4gICAgICB0aGlzLmhhc19uZXdfZW1iZWRkaW5ncyA9IGZhbHNlO1xuICAgIH1jYXRjaChlcnJvcil7XG4gICAgICBjb25zb2xlLmxvZyhlcnJvcik7XG4gICAgICBuZXcgT2JzaWRpYW4uTm90aWNlKFwiU21hcnQgQ29ubmVjdGlvbnM6IFwiK2Vycm9yLm1lc3NhZ2UpO1xuICAgIH1cblxuICB9XG4gIC8vIHNhdmUgZmFpbGVkIGVtYmVkZGluZ3MgdG8gZmlsZSBmcm9tIHJlbmRlcl9sb2cuZmFpbGVkX2VtYmVkZGluZ3NcbiAgYXN5bmMgc2F2ZV9mYWlsZWRfZW1iZWRkaW5ncyAoKSB7XG4gICAgLy8gd3JpdGUgZmFpbGVkX2VtYmVkZGluZ3MgdG8gZmlsZSBvbmUgbGluZSBwZXIgZmFpbGVkIGVtYmVkZGluZ1xuICAgIGxldCBmYWlsZWRfZW1iZWRkaW5ncyA9IFtdO1xuICAgIC8vIGlmIGZpbGUgYWxyZWFkeSBleGlzdHMgdGhlbiByZWFkIGl0XG4gICAgY29uc3QgZmFpbGVkX2VtYmVkZGluZ3NfZmlsZV9leGlzdHMgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLmV4aXN0cyhcIi5zbWFydC1jb25uZWN0aW9ucy9mYWlsZWQtZW1iZWRkaW5ncy50eHRcIik7XG4gICAgaWYoZmFpbGVkX2VtYmVkZGluZ3NfZmlsZV9leGlzdHMpIHtcbiAgICAgIGZhaWxlZF9lbWJlZGRpbmdzID0gYXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci5yZWFkKFwiLnNtYXJ0LWNvbm5lY3Rpb25zL2ZhaWxlZC1lbWJlZGRpbmdzLnR4dFwiKTtcbiAgICAgIC8vIHNwbGl0IGZhaWxlZF9lbWJlZGRpbmdzIGludG8gYXJyYXlcbiAgICAgIGZhaWxlZF9lbWJlZGRpbmdzID0gZmFpbGVkX2VtYmVkZGluZ3Muc3BsaXQoXCJcXHJcXG5cIik7XG4gICAgfVxuICAgIC8vIG1lcmdlIGZhaWxlZF9lbWJlZGRpbmdzIHdpdGggcmVuZGVyX2xvZy5mYWlsZWRfZW1iZWRkaW5nc1xuICAgIGZhaWxlZF9lbWJlZGRpbmdzID0gZmFpbGVkX2VtYmVkZGluZ3MuY29uY2F0KHRoaXMucmVuZGVyX2xvZy5mYWlsZWRfZW1iZWRkaW5ncyk7XG4gICAgLy8gcmVtb3ZlIGR1cGxpY2F0ZXNcbiAgICBmYWlsZWRfZW1iZWRkaW5ncyA9IFsuLi5uZXcgU2V0KGZhaWxlZF9lbWJlZGRpbmdzKV07XG4gICAgLy8gc29ydCBmYWlsZWRfZW1iZWRkaW5ncyBhcnJheSBhbHBoYWJldGljYWxseVxuICAgIGZhaWxlZF9lbWJlZGRpbmdzLnNvcnQoKTtcbiAgICAvLyBjb252ZXJ0IGZhaWxlZF9lbWJlZGRpbmdzIGFycmF5IHRvIHN0cmluZ1xuICAgIGZhaWxlZF9lbWJlZGRpbmdzID0gZmFpbGVkX2VtYmVkZGluZ3Muam9pbihcIlxcclxcblwiKTtcbiAgICAvLyB3cml0ZSBmYWlsZWRfZW1iZWRkaW5ncyB0byBmaWxlXG4gICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci53cml0ZShcIi5zbWFydC1jb25uZWN0aW9ucy9mYWlsZWQtZW1iZWRkaW5ncy50eHRcIiwgZmFpbGVkX2VtYmVkZGluZ3MpO1xuICAgIC8vIHJlbG9hZCBmYWlsZWRfZW1iZWRkaW5ncyB0byBwcmV2ZW50IHJldHJ5aW5nIGZhaWxlZCBmaWxlcyB1bnRpbCBleHBsaWNpdGx5IHJlcXVlc3RlZFxuICAgIGF3YWl0IHRoaXMubG9hZF9mYWlsZWRfZmlsZXMoKTtcbiAgfVxuICBcbiAgLy8gbG9hZCBmYWlsZWQgZmlsZXMgZnJvbSBmYWlsZWQtZW1iZWRkaW5ncy50eHRcbiAgYXN5bmMgbG9hZF9mYWlsZWRfZmlsZXMgKCkge1xuICAgIC8vIGNoZWNrIGlmIGZhaWxlZC1lbWJlZGRpbmdzLnR4dCBleGlzdHNcbiAgICBjb25zdCBmYWlsZWRfZW1iZWRkaW5nc19maWxlX2V4aXN0cyA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIuZXhpc3RzKFwiLnNtYXJ0LWNvbm5lY3Rpb25zL2ZhaWxlZC1lbWJlZGRpbmdzLnR4dFwiKTtcbiAgICBpZighZmFpbGVkX2VtYmVkZGluZ3NfZmlsZV9leGlzdHMpIHtcbiAgICAgIHRoaXMuc2V0dGluZ3MuZmFpbGVkX2ZpbGVzID0gW107XG4gICAgICBjb25zb2xlLmxvZyhcIk5vIGZhaWxlZCBmaWxlcy5cIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIHJlYWQgZmFpbGVkLWVtYmVkZGluZ3MudHh0XG4gICAgY29uc3QgZmFpbGVkX2VtYmVkZGluZ3MgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLnJlYWQoXCIuc21hcnQtY29ubmVjdGlvbnMvZmFpbGVkLWVtYmVkZGluZ3MudHh0XCIpO1xuICAgIC8vIHNwbGl0IGZhaWxlZF9lbWJlZGRpbmdzIGludG8gYXJyYXkgYW5kIHJlbW92ZSBlbXB0eSBsaW5lc1xuICAgIGNvbnN0IGZhaWxlZF9lbWJlZGRpbmdzX2FycmF5ID0gZmFpbGVkX2VtYmVkZGluZ3Muc3BsaXQoXCJcXHJcXG5cIik7XG4gICAgLy8gc3BsaXQgYXQgJyMnIGFuZCByZWR1Y2UgaW50byB1bmlxdWUgZmlsZSBwYXRoc1xuICAgIGNvbnN0IGZhaWxlZF9maWxlcyA9IGZhaWxlZF9lbWJlZGRpbmdzX2FycmF5Lm1hcChlbWJlZGRpbmcgPT4gZW1iZWRkaW5nLnNwbGl0KFwiI1wiKVswXSkucmVkdWNlKCh1bmlxdWUsIGl0ZW0pID0+IHVuaXF1ZS5pbmNsdWRlcyhpdGVtKSA/IHVuaXF1ZSA6IFsuLi51bmlxdWUsIGl0ZW1dLCBbXSk7XG4gICAgLy8gcmV0dXJuIGZhaWxlZF9maWxlc1xuICAgIHRoaXMuc2V0dGluZ3MuZmFpbGVkX2ZpbGVzID0gZmFpbGVkX2ZpbGVzO1xuICAgIC8vIGNvbnNvbGUubG9nKGZhaWxlZF9maWxlcyk7XG4gIH1cbiAgLy8gcmV0cnkgZmFpbGVkIGVtYmVkZGluZ3NcbiAgYXN5bmMgcmV0cnlfZmFpbGVkX2ZpbGVzICgpIHtcbiAgICAvLyByZW1vdmUgZmFpbGVkIGZpbGVzIGZyb20gZmFpbGVkX2ZpbGVzXG4gICAgdGhpcy5zZXR0aW5ncy5mYWlsZWRfZmlsZXMgPSBbXTtcbiAgICAvLyBpZiBmYWlsZWQtZW1iZWRkaW5ncy50eHQgZXhpc3RzIHRoZW4gZGVsZXRlIGl0XG4gICAgY29uc3QgZmFpbGVkX2VtYmVkZGluZ3NfZmlsZV9leGlzdHMgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLmV4aXN0cyhcIi5zbWFydC1jb25uZWN0aW9ucy9mYWlsZWQtZW1iZWRkaW5ncy50eHRcIik7XG4gICAgaWYoZmFpbGVkX2VtYmVkZGluZ3NfZmlsZV9leGlzdHMpIHtcbiAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIucmVtb3ZlKFwiLnNtYXJ0LWNvbm5lY3Rpb25zL2ZhaWxlZC1lbWJlZGRpbmdzLnR4dFwiKTtcbiAgICB9XG4gICAgLy8gcnVuIGdldCBhbGwgZW1iZWRkaW5nc1xuICAgIGF3YWl0IHRoaXMuZ2V0X2FsbF9lbWJlZGRpbmdzKCk7XG4gIH1cblxuXG4gIC8vIGFkZCAuc21hcnQtY29ubmVjdGlvbnMgdG8gLmdpdGlnbm9yZSB0byBwcmV2ZW50IGlzc3VlcyB3aXRoIGxhcmdlLCBmcmVxdWVudGx5IHVwZGF0ZWQgZW1iZWRkaW5ncyBmaWxlKHMpXG4gIGFzeW5jIGFkZF90b19naXRpZ25vcmUoKSB7XG4gICAgaWYoIShhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLmV4aXN0cyhcIi5naXRpZ25vcmVcIikpKSB7XG4gICAgICByZXR1cm47IC8vIGlmIC5naXRpZ25vcmUgZG9lc24ndCBleGlzdCB0aGVuIGRvbid0IGFkZCAuc21hcnQtY29ubmVjdGlvbnMgdG8gLmdpdGlnbm9yZVxuICAgIH1cbiAgICBsZXQgZ2l0aWdub3JlX2ZpbGUgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLnJlYWQoXCIuZ2l0aWdub3JlXCIpO1xuICAgIC8vIGlmIC5zbWFydC1jb25uZWN0aW9ucyBub3QgaW4gLmdpdGlnbm9yZVxuICAgIGlmIChnaXRpZ25vcmVfZmlsZS5pbmRleE9mKFwiLnNtYXJ0LWNvbm5lY3Rpb25zXCIpIDwgMCkge1xuICAgICAgLy8gYWRkIC5zbWFydC1jb25uZWN0aW9ucyB0byAuZ2l0aWdub3JlXG4gICAgICBsZXQgYWRkX3RvX2dpdGlnbm9yZSA9IFwiXFxuXFxuIyBJZ25vcmUgU21hcnQgQ29ubmVjdGlvbnMgZm9sZGVyIGJlY2F1c2UgZW1iZWRkaW5ncyBmaWxlIGlzIGxhcmdlIGFuZCB1cGRhdGVkIGZyZXF1ZW50bHlcIjtcbiAgICAgIGFkZF90b19naXRpZ25vcmUgKz0gXCJcXG4uc21hcnQtY29ubmVjdGlvbnNcIjtcbiAgICAgIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIud3JpdGUoXCIuZ2l0aWdub3JlXCIsIGdpdGlnbm9yZV9maWxlICsgYWRkX3RvX2dpdGlnbm9yZSk7XG4gICAgICBjb25zb2xlLmxvZyhcImFkZGVkIC5zbWFydC1jb25uZWN0aW9ucyB0byAuZ2l0aWdub3JlXCIpO1xuICAgIH1cbiAgfVxuXG4gIC8vIGZvcmNlIHJlZnJlc2ggZW1iZWRkaW5ncyBmaWxlIGJ1dCBmaXJzdCByZW5hbWUgZXhpc3RpbmcgZW1iZWRkaW5ncyBmaWxlIHRvIC5zbWFydC1jb25uZWN0aW9ucy9lbWJlZGRpbmdzLVlZWVktTU0tREQuanNvblxuICBhc3luYyBmb3JjZV9yZWZyZXNoX2VtYmVkZGluZ3NfZmlsZSgpIHtcbiAgICBuZXcgT2JzaWRpYW4uTm90aWNlKFwiU21hcnQgQ29ubmVjdGlvbnM6IGVtYmVkZGluZ3MgZmlsZSBGb3JjZSBSZWZyZXNoZWQsIG1ha2luZyBuZXcgY29ubmVjdGlvbnMuLi5cIik7XG4gICAgLy8gZm9yY2UgcmVmcmVzaFxuICAgIGF3YWl0IHRoaXMuc21hcnRfdmVjX2xpdGUuZm9yY2VfcmVmcmVzaCgpO1xuICAgIC8vIHRyaWdnZXIgbWFraW5nIG5ldyBjb25uZWN0aW9uc1xuICAgIGF3YWl0IHRoaXMuZ2V0X2FsbF9lbWJlZGRpbmdzKCk7XG4gICAgdGhpcy5vdXRwdXRfcmVuZGVyX2xvZygpO1xuICAgIG5ldyBPYnNpZGlhbi5Ob3RpY2UoXCJTbWFydCBDb25uZWN0aW9uczogZW1iZWRkaW5ncyBmaWxlIEZvcmNlIFJlZnJlc2hlZCwgbmV3IGNvbm5lY3Rpb25zIG1hZGUuXCIpO1xuICB9XG5cbiAgLy8gZ2V0IGVtYmVkZGluZ3MgZm9yIGVtYmVkX2lucHV0XG4gIGFzeW5jIGdldF9maWxlX2VtYmVkZGluZ3MoY3Vycl9maWxlLCBzYXZlPXRydWUpIHtcbiAgICAvLyBsZXQgYmF0Y2hfcHJvbWlzZXMgPSBbXTtcbiAgICBsZXQgcmVxX2JhdGNoID0gW107XG4gICAgbGV0IGJsb2NrcyA9IFtdO1xuICAgIC8vIGluaXRpYXRlIGN1cnJfZmlsZV9rZXkgZnJvbSBtZDUoY3Vycl9maWxlLnBhdGgpXG4gICAgY29uc3QgY3Vycl9maWxlX2tleSA9IG1kNShjdXJyX2ZpbGUucGF0aCk7XG4gICAgLy8gaW50aWF0ZSBmaWxlX2ZpbGVfZW1iZWRfaW5wdXQgYnkgcmVtb3ZpbmcgLm1kIGFuZCBjb252ZXJ0aW5nIGZpbGUgcGF0aCB0byBicmVhZGNydW1icyAoXCIgPiBcIilcbiAgICBsZXQgZmlsZV9lbWJlZF9pbnB1dCA9IGN1cnJfZmlsZS5wYXRoLnJlcGxhY2UoXCIubWRcIiwgXCJcIik7XG4gICAgZmlsZV9lbWJlZF9pbnB1dCA9IGZpbGVfZW1iZWRfaW5wdXQucmVwbGFjZSgvXFwvL2csIFwiID4gXCIpO1xuICAgIC8vIGVtYmVkIG9uIGZpbGUubmFtZS90aXRsZSBvbmx5IGlmIHBhdGhfb25seSBwYXRoIG1hdGNoZXIgc3BlY2lmaWVkIGluIHNldHRpbmdzXG4gICAgbGV0IHBhdGhfb25seSA9IGZhbHNlO1xuICAgIGZvcihsZXQgaiA9IDA7IGogPCB0aGlzLnBhdGhfb25seS5sZW5ndGg7IGorKykge1xuICAgICAgaWYoY3Vycl9maWxlLnBhdGguaW5kZXhPZih0aGlzLnBhdGhfb25seVtqXSkgPiAtMSkge1xuICAgICAgICBwYXRoX29ubHkgPSB0cnVlO1xuICAgICAgICBjb25zb2xlLmxvZyhcInRpdGxlIG9ubHkgZmlsZSB3aXRoIG1hdGNoZXI6IFwiICsgdGhpcy5wYXRoX29ubHlbal0pO1xuICAgICAgICAvLyBicmVhayBvdXQgb2YgbG9vcFxuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gcmV0dXJuIGVhcmx5IGlmIHBhdGhfb25seVxuICAgIGlmKHBhdGhfb25seSkge1xuICAgICAgcmVxX2JhdGNoLnB1c2goW2N1cnJfZmlsZV9rZXksIGZpbGVfZW1iZWRfaW5wdXQsIHtcbiAgICAgICAgbXRpbWU6IGN1cnJfZmlsZS5zdGF0Lm10aW1lLFxuICAgICAgICBwYXRoOiBjdXJyX2ZpbGUucGF0aCxcbiAgICAgIH1dKTtcbiAgICAgIGF3YWl0IHRoaXMuZ2V0X2VtYmVkZGluZ3NfYmF0Y2gocmVxX2JhdGNoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLyoqXG4gICAgICogQkVHSU4gQ2FudmFzIGZpbGUgdHlwZSBFbWJlZGRpbmdcbiAgICAgKi9cbiAgICBpZihjdXJyX2ZpbGUuZXh0ZW5zaW9uID09PSBcImNhbnZhc1wiKSB7XG4gICAgICAvLyBnZXQgZmlsZSBjb250ZW50cyBhbmQgcGFyc2UgYXMgSlNPTlxuICAgICAgY29uc3QgY2FudmFzX2NvbnRlbnRzID0gYXdhaXQgdGhpcy5hcHAudmF1bHQuY2FjaGVkUmVhZChjdXJyX2ZpbGUpO1xuICAgICAgaWYoKHR5cGVvZiBjYW52YXNfY29udGVudHMgPT09IFwic3RyaW5nXCIpICYmIChjYW52YXNfY29udGVudHMuaW5kZXhPZihcIm5vZGVzXCIpID4gLTEpKSB7XG4gICAgICAgIGNvbnN0IGNhbnZhc19qc29uID0gSlNPTi5wYXJzZShjYW52YXNfY29udGVudHMpO1xuICAgICAgICAvLyBmb3IgZWFjaCBvYmplY3QgaW4gbm9kZXMgYXJyYXlcbiAgICAgICAgZm9yKGxldCBqID0gMDsgaiA8IGNhbnZhc19qc29uLm5vZGVzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgLy8gaWYgb2JqZWN0IGhhcyB0ZXh0IHByb3BlcnR5XG4gICAgICAgICAgaWYoY2FudmFzX2pzb24ubm9kZXNbal0udGV4dCkge1xuICAgICAgICAgICAgLy8gYWRkIHRvIGZpbGVfZW1iZWRfaW5wdXRcbiAgICAgICAgICAgIGZpbGVfZW1iZWRfaW5wdXQgKz0gXCJcXG5cIiArIGNhbnZhc19qc29uLm5vZGVzW2pdLnRleHQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIGlmIG9iamVjdCBoYXMgZmlsZSBwcm9wZXJ0eVxuICAgICAgICAgIGlmKGNhbnZhc19qc29uLm5vZGVzW2pdLmZpbGUpIHtcbiAgICAgICAgICAgIC8vIGFkZCB0byBmaWxlX2VtYmVkX2lucHV0XG4gICAgICAgICAgICBmaWxlX2VtYmVkX2lucHV0ICs9IFwiXFxuTGluazogXCIgKyBjYW52YXNfanNvbi5ub2Rlc1tqXS5maWxlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gY29uc29sZS5sb2coZmlsZV9lbWJlZF9pbnB1dCk7XG4gICAgICByZXFfYmF0Y2gucHVzaChbY3Vycl9maWxlX2tleSwgZmlsZV9lbWJlZF9pbnB1dCwge1xuICAgICAgICBtdGltZTogY3Vycl9maWxlLnN0YXQubXRpbWUsXG4gICAgICAgIHBhdGg6IGN1cnJfZmlsZS5wYXRoLFxuICAgICAgfV0pO1xuICAgICAgYXdhaXQgdGhpcy5nZXRfZW1iZWRkaW5nc19iYXRjaChyZXFfYmF0Y2gpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBCRUdJTiBCbG9jayBcInNlY3Rpb25cIiBlbWJlZGRpbmdcbiAgICAgKi9cbiAgICAvLyBnZXQgZmlsZSBjb250ZW50c1xuICAgIGNvbnN0IG5vdGVfY29udGVudHMgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5jYWNoZWRSZWFkKGN1cnJfZmlsZSk7XG4gICAgbGV0IHByb2Nlc3NlZF9zaW5jZV9sYXN0X3NhdmUgPSAwO1xuICAgIGNvbnN0IG5vdGVfc2VjdGlvbnMgPSB0aGlzLmJsb2NrX3BhcnNlcihub3RlX2NvbnRlbnRzLCBjdXJyX2ZpbGUucGF0aCk7XG4gICAgLy8gY29uc29sZS5sb2cobm90ZV9zZWN0aW9ucyk7XG4gICAgLy8gaWYgbm90ZSBoYXMgbW9yZSB0aGFuIG9uZSBzZWN0aW9uIChpZiBvbmx5IG9uZSB0aGVuIGl0cyBzYW1lIGFzIGZ1bGwtY29udGVudClcbiAgICBpZihub3RlX3NlY3Rpb25zLmxlbmd0aCA+IDEpIHtcbiAgICAgIC8vIGZvciBlYWNoIHNlY3Rpb24gaW4gZmlsZVxuICAgICAgLy9jb25zb2xlLmxvZyhcIlNlY3Rpb25zOiBcIiArIG5vdGVfc2VjdGlvbnMubGVuZ3RoKTtcbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgbm90ZV9zZWN0aW9ucy5sZW5ndGg7IGorKykge1xuICAgICAgICAvLyBnZXQgZW1iZWRfaW5wdXQgZm9yIGJsb2NrXG4gICAgICAgIGNvbnN0IGJsb2NrX2VtYmVkX2lucHV0ID0gbm90ZV9zZWN0aW9uc1tqXS50ZXh0O1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhub3RlX3NlY3Rpb25zW2pdLnBhdGgpO1xuICAgICAgICAvLyBnZXQgYmxvY2sga2V5IGZyb20gYmxvY2sucGF0aCAoY29udGFpbnMgYm90aCBmaWxlLnBhdGggYW5kIGhlYWRlciBwYXRoKVxuICAgICAgICBjb25zdCBibG9ja19rZXkgPSBtZDUobm90ZV9zZWN0aW9uc1tqXS5wYXRoKTtcbiAgICAgICAgYmxvY2tzLnB1c2goYmxvY2tfa2V5KTtcbiAgICAgICAgLy8gc2tpcCBpZiBsZW5ndGggb2YgYmxvY2tfZW1iZWRfaW5wdXQgc2FtZSBhcyBsZW5ndGggb2YgZW1iZWRkaW5nc1tibG9ja19rZXldLm1ldGEuc2l6ZVxuICAgICAgICAvLyBUT0RPIGNvbnNpZGVyIHJvdW5kaW5nIHRvIG5lYXJlc3QgMTAgb3IgMTAwIGZvciBmdXp6eSBtYXRjaGluZ1xuICAgICAgICBpZiAodGhpcy5zbWFydF92ZWNfbGl0ZS5nZXRfc2l6ZShibG9ja19rZXkpID09PSBibG9ja19lbWJlZF9pbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAvLyBsb2cgc2tpcHBpbmcgZmlsZVxuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwic2tpcHBpbmcgYmxvY2sgKGxlbilcIik7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgLy8gYWRkIGhhc2ggdG8gYmxvY2tzIHRvIHByZXZlbnQgZW1wdHkgYmxvY2tzIHRyaWdnZXJpbmcgZnVsbC1maWxlIGVtYmVkZGluZ1xuICAgICAgICAvLyBza2lwIGlmIGVtYmVkZGluZ3Mga2V5IGFscmVhZHkgZXhpc3RzIGFuZCBibG9jayBtdGltZSBpcyBncmVhdGVyIHRoYW4gb3IgZXF1YWwgdG8gZmlsZSBtdGltZVxuICAgICAgICBpZih0aGlzLnNtYXJ0X3ZlY19saXRlLm10aW1lX2lzX2N1cnJlbnQoYmxvY2tfa2V5LCBjdXJyX2ZpbGUuc3RhdC5tdGltZSkpIHtcbiAgICAgICAgICAvLyBsb2cgc2tpcHBpbmcgZmlsZVxuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwic2tpcHBpbmcgYmxvY2sgKG10aW1lKVwiKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBza2lwIGlmIGhhc2ggaXMgcHJlc2VudCBpbiBlbWJlZGRpbmdzIGFuZCBoYXNoIG9mIGJsb2NrX2VtYmVkX2lucHV0IGlzIGVxdWFsIHRvIGhhc2ggaW4gZW1iZWRkaW5nc1xuICAgICAgICBjb25zdCBibG9ja19oYXNoID0gbWQ1KGJsb2NrX2VtYmVkX2lucHV0LnRyaW0oKSk7XG4gICAgICAgIGlmKHRoaXMuc21hcnRfdmVjX2xpdGUuZ2V0X2hhc2goYmxvY2tfa2V5KSA9PT0gYmxvY2tfaGFzaCkge1xuICAgICAgICAgIC8vIGxvZyBza2lwcGluZyBmaWxlXG4gICAgICAgICAgLy8gY29uc29sZS5sb2coXCJza2lwcGluZyBibG9jayAoaGFzaClcIik7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBjcmVhdGUgcmVxX2JhdGNoIGZvciBiYXRjaGluZyByZXF1ZXN0c1xuICAgICAgICByZXFfYmF0Y2gucHVzaChbYmxvY2tfa2V5LCBibG9ja19lbWJlZF9pbnB1dCwge1xuICAgICAgICAgIC8vIG9sZG10aW1lOiBjdXJyX2ZpbGUuc3RhdC5tdGltZSwgXG4gICAgICAgICAgLy8gZ2V0IGN1cnJlbnQgZGF0ZXRpbWUgYXMgdW5peCB0aW1lc3RhbXBcbiAgICAgICAgICBtdGltZTogRGF0ZS5ub3coKSxcbiAgICAgICAgICBoYXNoOiBibG9ja19oYXNoLCBcbiAgICAgICAgICBwYXJlbnQ6IGN1cnJfZmlsZV9rZXksXG4gICAgICAgICAgcGF0aDogbm90ZV9zZWN0aW9uc1tqXS5wYXRoLFxuICAgICAgICAgIHNpemU6IGJsb2NrX2VtYmVkX2lucHV0Lmxlbmd0aCxcbiAgICAgICAgfV0pO1xuICAgICAgICBpZihyZXFfYmF0Y2gubGVuZ3RoID4gOSkge1xuICAgICAgICAgIC8vIGFkZCBiYXRjaCB0byBiYXRjaF9wcm9taXNlc1xuICAgICAgICAgIGF3YWl0IHRoaXMuZ2V0X2VtYmVkZGluZ3NfYmF0Y2gocmVxX2JhdGNoKTtcbiAgICAgICAgICBwcm9jZXNzZWRfc2luY2VfbGFzdF9zYXZlICs9IHJlcV9iYXRjaC5sZW5ndGg7XG4gICAgICAgICAgLy8gbG9nIGVtYmVkZGluZ1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiZW1iZWRkaW5nOiBcIiArIGN1cnJfZmlsZS5wYXRoKTtcbiAgICAgICAgICBpZiAocHJvY2Vzc2VkX3NpbmNlX2xhc3Rfc2F2ZSA+PSAzMCkge1xuICAgICAgICAgICAgLy8gd3JpdGUgZW1iZWRkaW5ncyBKU09OIHRvIGZpbGVcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZV9lbWJlZGRpbmdzX3RvX2ZpbGUoKTtcbiAgICAgICAgICAgIC8vIHJlc2V0IHByb2Nlc3NlZF9zaW5jZV9sYXN0X3NhdmVcbiAgICAgICAgICAgIHByb2Nlc3NlZF9zaW5jZV9sYXN0X3NhdmUgPSAwO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyByZXNldCByZXFfYmF0Y2hcbiAgICAgICAgICByZXFfYmF0Y2ggPSBbXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBpZiByZXFfYmF0Y2ggaXMgbm90IGVtcHR5XG4gICAgaWYocmVxX2JhdGNoLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIHByb2Nlc3MgcmVtYWluaW5nIHJlcV9iYXRjaFxuICAgICAgYXdhaXQgdGhpcy5nZXRfZW1iZWRkaW5nc19iYXRjaChyZXFfYmF0Y2gpO1xuICAgICAgcmVxX2JhdGNoID0gW107XG4gICAgICBwcm9jZXNzZWRfc2luY2VfbGFzdF9zYXZlICs9IHJlcV9iYXRjaC5sZW5ndGg7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEJFR0lOIEZpbGUgXCJmdWxsIG5vdGVcIiBlbWJlZGRpbmdcbiAgICAgKi9cblxuICAgIC8vIGlmIGZpbGUgbGVuZ3RoIGlzIGxlc3MgdGhhbiB+ODAwMCB0b2tlbnMgdXNlIGZ1bGwgZmlsZSBjb250ZW50c1xuICAgIC8vIGVsc2UgaWYgZmlsZSBsZW5ndGggaXMgZ3JlYXRlciB0aGFuIDgwMDAgdG9rZW5zIGJ1aWxkIGZpbGVfZW1iZWRfaW5wdXQgZnJvbSBmaWxlIGhlYWRpbmdzXG4gICAgZmlsZV9lbWJlZF9pbnB1dCArPSBgOlxcbmA7XG4gICAgLyoqXG4gICAgICogVE9ETzogaW1wcm92ZS9yZWZhY3RvciB0aGUgZm9sbG93aW5nIFwibGFyZ2UgZmlsZSByZWR1Y2UgdG8gaGVhZGluZ3NcIiBsb2dpY1xuICAgICAqL1xuICAgIGlmKG5vdGVfY29udGVudHMubGVuZ3RoIDwgTUFYX0VNQkVEX1NUUklOR19MRU5HVEgpIHtcbiAgICAgIGZpbGVfZW1iZWRfaW5wdXQgKz0gbm90ZV9jb250ZW50c1xuICAgIH1lbHNleyBcbiAgICAgIGNvbnN0IG5vdGVfbWV0YV9jYWNoZSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKGN1cnJfZmlsZSk7XG4gICAgICAvLyBmb3IgZWFjaCBoZWFkaW5nIGluIGZpbGVcbiAgICAgIGlmKHR5cGVvZiBub3RlX21ldGFfY2FjaGUuaGVhZGluZ3MgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgLy8gY29uc29sZS5sb2coXCJubyBoZWFkaW5ncyBmb3VuZCwgdXNpbmcgZmlyc3QgY2h1bmsgb2YgZmlsZSBpbnN0ZWFkXCIpO1xuICAgICAgICBmaWxlX2VtYmVkX2lucHV0ICs9IG5vdGVfY29udGVudHMuc3Vic3RyaW5nKDAsIE1BWF9FTUJFRF9TVFJJTkdfTEVOR1RIKTtcbiAgICAgIH1lbHNle1xuICAgICAgICBsZXQgbm90ZV9oZWFkaW5ncyA9IFwiXCI7XG4gICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgbm90ZV9tZXRhX2NhY2hlLmhlYWRpbmdzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgLy8gZ2V0IGhlYWRpbmcgbGV2ZWxcbiAgICAgICAgICBjb25zdCBoZWFkaW5nX2xldmVsID0gbm90ZV9tZXRhX2NhY2hlLmhlYWRpbmdzW2pdLmxldmVsO1xuICAgICAgICAgIC8vIGdldCBoZWFkaW5nIHRleHRcbiAgICAgICAgICBjb25zdCBoZWFkaW5nX3RleHQgPSBub3RlX21ldGFfY2FjaGUuaGVhZGluZ3Nbal0uaGVhZGluZztcbiAgICAgICAgICAvLyBidWlsZCBtYXJrZG93biBoZWFkaW5nXG4gICAgICAgICAgbGV0IG1kX2hlYWRpbmcgPSBcIlwiO1xuICAgICAgICAgIGZvciAobGV0IGsgPSAwOyBrIDwgaGVhZGluZ19sZXZlbDsgaysrKSB7XG4gICAgICAgICAgICBtZF9oZWFkaW5nICs9IFwiI1wiO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBhZGQgaGVhZGluZyB0byBub3RlX2hlYWRpbmdzXG4gICAgICAgICAgbm90ZV9oZWFkaW5ncyArPSBgJHttZF9oZWFkaW5nfSAke2hlYWRpbmdfdGV4dH1cXG5gO1xuICAgICAgICB9XG4gICAgICAgIC8vY29uc29sZS5sb2cobm90ZV9oZWFkaW5ncyk7XG4gICAgICAgIGZpbGVfZW1iZWRfaW5wdXQgKz0gbm90ZV9oZWFkaW5nc1xuICAgICAgICBpZihmaWxlX2VtYmVkX2lucHV0Lmxlbmd0aCA+IE1BWF9FTUJFRF9TVFJJTkdfTEVOR1RIKSB7XG4gICAgICAgICAgZmlsZV9lbWJlZF9pbnB1dCA9IGZpbGVfZW1iZWRfaW5wdXQuc3Vic3RyaW5nKDAsIE1BWF9FTUJFRF9TVFJJTkdfTEVOR1RIKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBza2lwIGVtYmVkZGluZyBmdWxsIGZpbGUgaWYgYmxvY2tzIGlzIG5vdCBlbXB0eSBhbmQgYWxsIGhhc2hlcyBhcmUgcHJlc2VudCBpbiBlbWJlZGRpbmdzXG4gICAgLy8gYmV0dGVyIHRoYW4gaGFzaGluZyBmaWxlX2VtYmVkX2lucHV0IGJlY2F1c2UgbW9yZSByZXNpbGllbnQgdG8gaW5jb25zZXF1ZW50aWFsIGNoYW5nZXMgKHdoaXRlc3BhY2UgYmV0d2VlbiBoZWFkaW5ncylcbiAgICBjb25zdCBmaWxlX2hhc2ggPSBtZDUoZmlsZV9lbWJlZF9pbnB1dC50cmltKCkpO1xuICAgIGNvbnN0IGV4aXN0aW5nX2hhc2ggPSB0aGlzLnNtYXJ0X3ZlY19saXRlLmdldF9oYXNoKGN1cnJfZmlsZV9rZXkpO1xuICAgIGlmKGV4aXN0aW5nX2hhc2ggJiYgKGZpbGVfaGFzaCA9PT0gZXhpc3RpbmdfaGFzaCkpIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKFwic2tpcHBpbmcgZmlsZSAoaGFzaCk6IFwiICsgY3Vycl9maWxlLnBhdGgpO1xuICAgICAgdGhpcy51cGRhdGVfcmVuZGVyX2xvZyhibG9ja3MsIGZpbGVfZW1iZWRfaW5wdXQpO1xuICAgICAgcmV0dXJuO1xuICAgIH07XG5cbiAgICAvLyBpZiBub3QgYWxyZWFkeSBza2lwcGluZyBhbmQgYmxvY2tzIGFyZSBwcmVzZW50XG4gICAgY29uc3QgZXhpc3RpbmdfYmxvY2tzID0gdGhpcy5zbWFydF92ZWNfbGl0ZS5nZXRfY2hpbGRyZW4oY3Vycl9maWxlX2tleSk7XG4gICAgbGV0IGV4aXN0aW5nX2hhc19hbGxfYmxvY2tzID0gdHJ1ZTtcbiAgICBpZihleGlzdGluZ19ibG9ja3MgJiYgQXJyYXkuaXNBcnJheShleGlzdGluZ19ibG9ja3MpICYmIChibG9ja3MubGVuZ3RoID4gMCkpIHtcbiAgICAgIC8vIGlmIGFsbCBibG9ja3MgYXJlIGluIGV4aXN0aW5nX2Jsb2NrcyB0aGVuIHNraXAgKGFsbG93cyBkZWxldGlvbiBvZiBzbWFsbCBibG9ja3Mgd2l0aG91dCB0cmlnZ2VyaW5nIGZ1bGwgZmlsZSBlbWJlZGRpbmcpXG4gICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGJsb2Nrcy5sZW5ndGg7IGorKykge1xuICAgICAgICBpZihleGlzdGluZ19ibG9ja3MuaW5kZXhPZihibG9ja3Nbal0pID09PSAtMSkge1xuICAgICAgICAgIGV4aXN0aW5nX2hhc19hbGxfYmxvY2tzID0gZmFsc2U7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gaWYgZXhpc3RpbmcgaGFzIGFsbCBibG9ja3MgdGhlbiBjaGVjayBmaWxlIHNpemUgZm9yIGRlbHRhXG4gICAgaWYoZXhpc3RpbmdfaGFzX2FsbF9ibG9ja3Mpe1xuICAgICAgLy8gZ2V0IGN1cnJlbnQgbm90ZSBmaWxlIHNpemVcbiAgICAgIGNvbnN0IGN1cnJfZmlsZV9zaXplID0gY3Vycl9maWxlLnN0YXQuc2l6ZTtcbiAgICAgIC8vIGdldCBmaWxlIHNpemUgZnJvbSBlbWJlZGRpbmdzXG4gICAgICBjb25zdCBwcmV2X2ZpbGVfc2l6ZSA9IHRoaXMuc21hcnRfdmVjX2xpdGUuZ2V0X3NpemUoY3Vycl9maWxlX2tleSk7XG4gICAgICBpZiAocHJldl9maWxlX3NpemUpIHtcbiAgICAgICAgLy8gaWYgY3VyciBmaWxlIHNpemUgaXMgbGVzcyB0aGFuIDEwJSBkaWZmZXJlbnQgZnJvbSBwcmV2IGZpbGUgc2l6ZVxuICAgICAgICBjb25zdCBmaWxlX2RlbHRhX3BjdCA9IE1hdGgucm91bmQoKE1hdGguYWJzKGN1cnJfZmlsZV9zaXplIC0gcHJldl9maWxlX3NpemUpIC8gY3Vycl9maWxlX3NpemUpICogMTAwKTtcbiAgICAgICAgaWYoZmlsZV9kZWx0YV9wY3QgPCAxMCkge1xuICAgICAgICAgIC8vIHNraXAgZW1iZWRkaW5nXG4gICAgICAgICAgLy8gY29uc29sZS5sb2coXCJza2lwcGluZyBmaWxlIChzaXplKSBcIiArIGN1cnJfZmlsZS5wYXRoKTtcbiAgICAgICAgICB0aGlzLnJlbmRlcl9sb2cuc2tpcHBlZF9sb3dfZGVsdGFbY3Vycl9maWxlLm5hbWVdID0gZmlsZV9kZWx0YV9wY3QgKyBcIiVcIjtcbiAgICAgICAgICB0aGlzLnVwZGF0ZV9yZW5kZXJfbG9nKGJsb2NrcywgZmlsZV9lbWJlZF9pbnB1dCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGxldCBtZXRhID0ge1xuICAgICAgbXRpbWU6IGN1cnJfZmlsZS5zdGF0Lm10aW1lLFxuICAgICAgaGFzaDogZmlsZV9oYXNoLFxuICAgICAgcGF0aDogY3Vycl9maWxlLnBhdGgsXG4gICAgICBzaXplOiBjdXJyX2ZpbGUuc3RhdC5zaXplLFxuICAgICAgY2hpbGRyZW46IGJsb2NrcyxcbiAgICB9O1xuICAgIC8vIGJhdGNoX3Byb21pc2VzLnB1c2godGhpcy5nZXRfZW1iZWRkaW5ncyhjdXJyX2ZpbGVfa2V5LCBmaWxlX2VtYmVkX2lucHV0LCBtZXRhKSk7XG4gICAgcmVxX2JhdGNoLnB1c2goW2N1cnJfZmlsZV9rZXksIGZpbGVfZW1iZWRfaW5wdXQsIG1ldGFdKTtcbiAgICAvLyBzZW5kIGJhdGNoIHJlcXVlc3RcbiAgICBhd2FpdCB0aGlzLmdldF9lbWJlZGRpbmdzX2JhdGNoKHJlcV9iYXRjaCk7XG5cbiAgICAvLyBsb2cgZW1iZWRkaW5nXG4gICAgLy8gY29uc29sZS5sb2coXCJlbWJlZGRpbmc6IFwiICsgY3Vycl9maWxlLnBhdGgpO1xuICAgIGlmIChzYXZlKSB7XG4gICAgICAvLyB3cml0ZSBlbWJlZGRpbmdzIEpTT04gdG8gZmlsZVxuICAgICAgYXdhaXQgdGhpcy5zYXZlX2VtYmVkZGluZ3NfdG9fZmlsZSgpO1xuICAgIH1cblxuICB9XG5cbiAgdXBkYXRlX3JlbmRlcl9sb2coYmxvY2tzLCBmaWxlX2VtYmVkX2lucHV0KSB7XG4gICAgaWYgKGJsb2Nrcy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyBtdWx0aXBseSBieSAyIGJlY2F1c2UgaW1wbGllcyB3ZSBzYXZlZCB0b2tlbiBzcGVuZGluZyBvbiBibG9ja3Moc2VjdGlvbnMpLCB0b29cbiAgICAgIHRoaXMucmVuZGVyX2xvZy50b2tlbnNfc2F2ZWRfYnlfY2FjaGUgKz0gZmlsZV9lbWJlZF9pbnB1dC5sZW5ndGggLyAyO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBjYWxjIHRva2VucyBzYXZlZCBieSBjYWNoZTogZGl2aWRlIGJ5IDQgZm9yIHRva2VuIGVzdGltYXRlXG4gICAgICB0aGlzLnJlbmRlcl9sb2cudG9rZW5zX3NhdmVkX2J5X2NhY2hlICs9IGZpbGVfZW1iZWRfaW5wdXQubGVuZ3RoIC8gNDtcbiAgICB9XG4gIH1cblxuICBhc3luYyBnZXRfZW1iZWRkaW5nc19iYXRjaChyZXFfYmF0Y2gpIHtcbiAgICBjb25zb2xlLmxvZyhcImdldF9lbWJlZGRpbmdzX2JhdGNoXCIpO1xuICAgIC8vIGlmIHJlcV9iYXRjaCBpcyBlbXB0eSB0aGVuIHJldHVyblxuICAgIGlmKHJlcV9iYXRjaC5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAvLyBjcmVhdGUgYXJyYXJ5IG9mIGVtYmVkX2lucHV0cyBmcm9tIHJlcV9iYXRjaFtpXVsxXVxuICAgIGNvbnN0IGVtYmVkX2lucHV0cyA9IHJlcV9iYXRjaC5tYXAoKHJlcSkgPT4gcmVxWzFdKTtcbiAgICAvLyByZXF1ZXN0IGVtYmVkZGluZ3MgZnJvbSBlbWJlZF9pbnB1dHNcbiAgICBjb25zdCByZXF1ZXN0UmVzdWx0cyA9IGF3YWl0IHRoaXMucmVxdWVzdF9lbWJlZGRpbmdfZnJvbV9pbnB1dChlbWJlZF9pbnB1dHMpO1xuICAgIC8vIGlmIHJlcXVlc3RSZXN1bHRzIGlzIG51bGwgdGhlbiByZXR1cm5cbiAgICBpZighcmVxdWVzdFJlc3VsdHMpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiZmFpbGVkIGVtYmVkZGluZyBiYXRjaFwiKTtcbiAgICAgIC8vIGxvZyBmYWlsZWQgZmlsZSBuYW1lcyB0byByZW5kZXJfbG9nXG4gICAgICB0aGlzLnJlbmRlcl9sb2cuZmFpbGVkX2VtYmVkZGluZ3MgPSBbLi4udGhpcy5yZW5kZXJfbG9nLmZhaWxlZF9lbWJlZGRpbmdzLCAuLi5yZXFfYmF0Y2gubWFwKChyZXEpID0+IHJlcVsyXS5wYXRoKV07XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIGlmIHJlcXVlc3RSZXN1bHRzIGlzIG5vdCBudWxsXG4gICAgaWYocmVxdWVzdFJlc3VsdHMpe1xuICAgICAgdGhpcy5oYXNfbmV3X2VtYmVkZGluZ3MgPSB0cnVlO1xuICAgICAgLy8gYWRkIGVtYmVkZGluZyBrZXkgdG8gcmVuZGVyX2xvZ1xuICAgICAgaWYodGhpcy5zZXR0aW5ncy5sb2dfcmVuZGVyKXtcbiAgICAgICAgaWYodGhpcy5zZXR0aW5ncy5sb2dfcmVuZGVyX2ZpbGVzKXtcbiAgICAgICAgICB0aGlzLnJlbmRlcl9sb2cuZmlsZXMgPSBbLi4udGhpcy5yZW5kZXJfbG9nLmZpbGVzLCAuLi5yZXFfYmF0Y2gubWFwKChyZXEpID0+IHJlcVsyXS5wYXRoKV07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZW5kZXJfbG9nLm5ld19lbWJlZGRpbmdzICs9IHJlcV9iYXRjaC5sZW5ndGg7XG4gICAgICAgIC8vIGFkZCB0b2tlbiB1c2FnZSB0byByZW5kZXJfbG9nXG4gICAgICAgIHRoaXMucmVuZGVyX2xvZy50b2tlbl91c2FnZSArPSByZXF1ZXN0UmVzdWx0cy51c2FnZS50b3RhbF90b2tlbnM7XG4gICAgICB9XG4gICAgICAvLyBjb25zb2xlLmxvZyhyZXF1ZXN0UmVzdWx0cy5kYXRhLmxlbmd0aCk7XG4gICAgICAvLyBsb29wIHRocm91Z2ggcmVxdWVzdFJlc3VsdHMuZGF0YVxuICAgICAgZm9yKGxldCBpID0gMDsgaSA8IHJlcXVlc3RSZXN1bHRzLmRhdGEubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgdmVjID0gcmVxdWVzdFJlc3VsdHMuZGF0YVtpXS5lbWJlZGRpbmc7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gcmVxdWVzdFJlc3VsdHMuZGF0YVtpXS5pbmRleDtcbiAgICAgICAgaWYodmVjKSB7XG4gICAgICAgICAgY29uc3Qga2V5ID0gcmVxX2JhdGNoW2luZGV4XVswXTtcbiAgICAgICAgICBjb25zdCBtZXRhID0gcmVxX2JhdGNoW2luZGV4XVsyXTtcbiAgICAgICAgICB0aGlzLnNtYXJ0X3ZlY19saXRlLnNhdmVfZW1iZWRkaW5nKGtleSwgdmVjLCBtZXRhKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHJlcXVlc3RfZW1iZWRkaW5nX2Zyb21faW5wdXQoZW1iZWRfaW5wdXQsIHJldHJpZXMgPSAwKSB7XG4gICAgLy8gKEZPUiBURVNUSU5HKSB0ZXN0IGZhaWwgcHJvY2VzcyBieSBmb3JjaW5nIGZhaWxcbiAgICAvLyByZXR1cm4gbnVsbDtcbiAgICAvLyBjaGVjayBpZiBlbWJlZF9pbnB1dCBpcyBhIHN0cmluZ1xuICAgIC8vIGlmKHR5cGVvZiBlbWJlZF9pbnB1dCAhPT0gXCJzdHJpbmdcIikge1xuICAgIC8vICAgY29uc29sZS5sb2coXCJlbWJlZF9pbnB1dCBpcyBub3QgYSBzdHJpbmdcIik7XG4gICAgLy8gICByZXR1cm4gbnVsbDtcbiAgICAvLyB9XG4gICAgLy8gY2hlY2sgaWYgZW1iZWRfaW5wdXQgaXMgZW1wdHlcbiAgICBpZihlbWJlZF9pbnB1dC5sZW5ndGggPT09IDApIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiZW1iZWRfaW5wdXQgaXMgZW1wdHlcIik7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgY29uc3QgdXNlZFBhcmFtcyA9IHtcbiAgICAgIG1vZGVsOiBcInRleHQtZW1iZWRkaW5nLWFkYS0wMDJcIixcbiAgICAgIGlucHV0OiBlbWJlZF9pbnB1dCxcbiAgICB9O1xuICAgIC8vIGNvbnNvbGUubG9nKHRoaXMuc2V0dGluZ3MuYXBpX2tleSk7XG4gICAgY29uc3QgcmVxUGFyYW1zID0ge1xuICAgICAgdXJsOiBgaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS92MS9lbWJlZGRpbmdzYCxcbiAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh1c2VkUGFyYW1zKSxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIFwiQXV0aG9yaXphdGlvblwiOiBgQmVhcmVyICR7dGhpcy5zZXR0aW5ncy5hcGlfa2V5fWBcbiAgICAgIH1cbiAgICB9O1xuICAgIGxldCByZXNwO1xuICAgIHRyeSB7XG4gICAgICByZXNwID0gYXdhaXQgKDAsIE9ic2lkaWFuLnJlcXVlc3QpKHJlcVBhcmFtcylcbiAgICAgIHJldHVybiBKU09OLnBhcnNlKHJlc3ApO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAvLyByZXRyeSByZXF1ZXN0IGlmIGVycm9yIGlzIDQyOVxuICAgICAgaWYoKGVycm9yLnN0YXR1cyA9PT0gNDI5KSAmJiAocmV0cmllcyA8IDMpKSB7XG4gICAgICAgIHJldHJpZXMrKztcbiAgICAgICAgLy8gZXhwb25lbnRpYWwgYmFja29mZlxuICAgICAgICBjb25zdCBiYWNrb2ZmID0gTWF0aC5wb3cocmV0cmllcywgMik7XG4gICAgICAgIGNvbnNvbGUubG9nKGByZXRyeWluZyByZXF1ZXN0ICg0MjkpIGluICR7YmFja29mZn0gc2Vjb25kcy4uLmApO1xuICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgMTAwMCAqIGJhY2tvZmYpKTtcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVxdWVzdF9lbWJlZGRpbmdfZnJvbV9pbnB1dChlbWJlZF9pbnB1dCwgcmV0cmllcyk7XG4gICAgICB9XG4gICAgICAvLyBsb2cgZnVsbCBlcnJvciB0byBjb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhyZXNwKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKFwiZmlyc3QgbGluZSBvZiBlbWJlZDogXCIgKyBlbWJlZF9pbnB1dC5zdWJzdHJpbmcoMCwgZW1iZWRfaW5wdXQuaW5kZXhPZihcIlxcblwiKSkpO1xuICAgICAgLy8gY29uc29sZS5sb2coXCJlbWJlZCBpbnB1dCBsZW5ndGg6IFwiKyBlbWJlZF9pbnB1dC5sZW5ndGgpO1xuICAgICAgLy8gaWYoQXJyYXkuaXNBcnJheShlbWJlZF9pbnB1dCkpIHtcbiAgICAgIC8vICAgY29uc29sZS5sb2coZW1iZWRfaW5wdXQubWFwKChpbnB1dCkgPT4gaW5wdXQubGVuZ3RoKSk7XG4gICAgICAvLyB9XG4gICAgICAvLyBjb25zb2xlLmxvZyhcImVycm9uZW91cyBlbWJlZCBpbnB1dDogXCIgKyBlbWJlZF9pbnB1dCk7XG4gICAgICBjb25zb2xlLmxvZyhlcnJvcik7XG4gICAgICAvLyBjb25zb2xlLmxvZyh1c2VkUGFyYW1zKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKHVzZWRQYXJhbXMuaW5wdXQubGVuZ3RoKTtcbiAgICAgIHJldHVybiBudWxsOyBcbiAgICB9XG4gIH1cbiAgYXN5bmMgdGVzdF9hcGlfa2V5KCkge1xuICAgIGNvbnN0IGVtYmVkX2lucHV0ID0gXCJUaGlzIGlzIGEgdGVzdCBvZiB0aGUgT3BlbkFJIEFQSS5cIjtcbiAgICBjb25zdCByZXNwID0gYXdhaXQgdGhpcy5yZXF1ZXN0X2VtYmVkZGluZ19mcm9tX2lucHV0KGVtYmVkX2lucHV0KTtcbiAgICBpZihyZXNwICYmIHJlc3AudXNhZ2UpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiQVBJIGtleSBpcyB2YWxpZFwiKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1lbHNle1xuICAgICAgY29uc29sZS5sb2coXCJBUEkga2V5IGlzIGludmFsaWRcIik7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cblxuICBvdXRwdXRfcmVuZGVyX2xvZygpIHtcbiAgICAvLyBpZiBzZXR0aW5ncy5sb2dfcmVuZGVyIGlzIHRydWVcbiAgICBpZih0aGlzLnNldHRpbmdzLmxvZ19yZW5kZXIpIHtcbiAgICAgIGlmICh0aGlzLnJlbmRlcl9sb2cubmV3X2VtYmVkZGluZ3MgPT09IDApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfWVsc2V7XG4gICAgICAgIC8vIHByZXR0eSBwcmludCB0aGlzLnJlbmRlcl9sb2cgdG8gY29uc29sZVxuICAgICAgICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeSh0aGlzLnJlbmRlcl9sb2csIG51bGwsIDIpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBjbGVhciByZW5kZXJfbG9nXG4gICAgdGhpcy5yZW5kZXJfbG9nID0ge307XG4gICAgdGhpcy5yZW5kZXJfbG9nLmRlbGV0ZWRfZW1iZWRkaW5ncyA9IDA7XG4gICAgdGhpcy5yZW5kZXJfbG9nLmV4Y2x1c2lvbnNfbG9ncyA9IHt9O1xuICAgIHRoaXMucmVuZGVyX2xvZy5mYWlsZWRfZW1iZWRkaW5ncyA9IFtdO1xuICAgIHRoaXMucmVuZGVyX2xvZy5maWxlcyA9IFtdO1xuICAgIHRoaXMucmVuZGVyX2xvZy5uZXdfZW1iZWRkaW5ncyA9IDA7XG4gICAgdGhpcy5yZW5kZXJfbG9nLnNraXBwZWRfbG93X2RlbHRhID0ge307XG4gICAgdGhpcy5yZW5kZXJfbG9nLnRva2VuX3VzYWdlID0gMDtcbiAgICB0aGlzLnJlbmRlcl9sb2cudG9rZW5zX3NhdmVkX2J5X2NhY2hlID0gMDtcbiAgfVxuXG4gIC8vIGZpbmQgY29ubmVjdGlvbnMgYnkgbW9zdCBzaW1pbGFyIHRvIGN1cnJlbnQgbm90ZSBieSBjb3NpbmUgc2ltaWxhcml0eVxuICBhc3luYyBmaW5kX25vdGVfY29ubmVjdGlvbnMoY3VycmVudF9ub3RlPW51bGwpIHtcbiAgICAvLyBtZDUgb2YgY3VycmVudCBub3RlIHBhdGhcbiAgICBjb25zdCBjdXJyX2tleSA9IG1kNShjdXJyZW50X25vdGUucGF0aCk7XG4gICAgLy8gaWYgaW4gdGhpcy5uZWFyZXN0X2NhY2hlIHRoZW4gc2V0IHRvIG5lYXJlc3RcbiAgICAvLyBlbHNlIGdldCBuZWFyZXN0XG4gICAgbGV0IG5lYXJlc3QgPSBbXTtcbiAgICBpZih0aGlzLm5lYXJlc3RfY2FjaGVbY3Vycl9rZXldKSB7XG4gICAgICBuZWFyZXN0ID0gdGhpcy5uZWFyZXN0X2NhY2hlW2N1cnJfa2V5XTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKFwibmVhcmVzdCBmcm9tIGNhY2hlXCIpO1xuICAgIH1lbHNle1xuICAgICAgLy8gc2tpcCBmaWxlcyB3aGVyZSBwYXRoIGNvbnRhaW5zIGFueSBleGNsdXNpb25zXG4gICAgICBmb3IobGV0IGogPSAwOyBqIDwgdGhpcy5maWxlX2V4Y2x1c2lvbnMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgaWYoY3VycmVudF9ub3RlLnBhdGguaW5kZXhPZih0aGlzLmZpbGVfZXhjbHVzaW9uc1tqXSkgPiAtMSkge1xuICAgICAgICAgIHRoaXMubG9nX2V4Y2x1c2lvbih0aGlzLmZpbGVfZXhjbHVzaW9uc1tqXSk7XG4gICAgICAgICAgLy8gYnJlYWsgb3V0IG9mIGxvb3AgYW5kIGZpbmlzaCBoZXJlXG4gICAgICAgICAgcmV0dXJuIFwiZXhjbHVkZWRcIjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gZ2V0IGFsbCBlbWJlZGRpbmdzXG4gICAgICAvLyBhd2FpdCB0aGlzLmdldF9hbGxfZW1iZWRkaW5ncygpO1xuICAgICAgLy8gd3JhcCBnZXQgYWxsIGluIHNldFRpbWVvdXQgdG8gYWxsb3cgZm9yIFVJIHRvIHVwZGF0ZVxuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIHRoaXMuZ2V0X2FsbF9lbWJlZGRpbmdzKClcbiAgICAgIH0sIDMwMDApO1xuICAgICAgLy8gZ2V0IGZyb20gY2FjaGUgaWYgbXRpbWUgaXMgc2FtZSBhbmQgdmFsdWVzIGFyZSBub3QgZW1wdHlcbiAgICAgIGlmKHRoaXMuc21hcnRfdmVjX2xpdGUubXRpbWVfaXNfY3VycmVudChjdXJyX2tleSwgY3VycmVudF9ub3RlLnN0YXQubXRpbWUpKSB7XG4gICAgICAgIC8vIHNraXBwaW5nIGdldCBmaWxlIGVtYmVkZGluZ3MgYmVjYXVzZSBub3RoaW5nIGhhcyBjaGFuZ2VkXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwiZmluZF9ub3RlX2Nvbm5lY3Rpb25zIC0gc2tpcHBpbmcgZmlsZSAobXRpbWUpXCIpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIC8vIGdldCBmaWxlIGVtYmVkZGluZ3NcbiAgICAgICAgYXdhaXQgdGhpcy5nZXRfZmlsZV9lbWJlZGRpbmdzKGN1cnJlbnRfbm90ZSk7XG4gICAgICB9XG4gICAgICAvLyBnZXQgY3VycmVudCBub3RlIGVtYmVkZGluZyB2ZWN0b3JcbiAgICAgIGNvbnN0IHZlYyA9IHRoaXMuc21hcnRfdmVjX2xpdGUuZ2V0X3ZlYyhjdXJyX2tleSk7XG4gICAgICBpZighdmVjKSB7XG4gICAgICAgIHJldHVybiBcIkVycm9yIGdldHRpbmcgZW1iZWRkaW5ncyBmb3I6IFwiK2N1cnJlbnRfbm90ZS5wYXRoO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBjb21wdXRlIGNvc2luZSBzaW1pbGFyaXR5IGJldHdlZW4gY3VycmVudCBub3RlIGFuZCBhbGwgb3RoZXIgbm90ZXMgdmlhIGVtYmVkZGluZ3NcbiAgICAgIG5lYXJlc3QgPSB0aGlzLnNtYXJ0X3ZlY19saXRlLm5lYXJlc3QodmVjLCB7XG4gICAgICAgIHNraXBfa2V5OiBjdXJyX2tleSxcbiAgICAgICAgc2tpcF9zZWN0aW9uczogdGhpcy5zZXR0aW5ncy5za2lwX3NlY3Rpb25zLFxuICAgICAgfSk7XG4gIFxuICAgICAgLy8gc2F2ZSB0byB0aGlzLm5lYXJlc3RfY2FjaGVcbiAgICAgIHRoaXMubmVhcmVzdF9jYWNoZVtjdXJyX2tleV0gPSBuZWFyZXN0O1xuICAgIH1cblxuICAgIC8vIHJldHVybiBhcnJheSBzb3J0ZWQgYnkgY29zaW5lIHNpbWlsYXJpdHlcbiAgICByZXR1cm4gbmVhcmVzdDtcbiAgfVxuICBcbiAgLy8gY3JlYXRlIHJlbmRlcl9sb2cgb2JqZWN0IG9mIGV4bHVzaW9ucyB3aXRoIG51bWJlciBvZiB0aW1lcyBza2lwcGVkIGFzIHZhbHVlXG4gIGxvZ19leGNsdXNpb24oZXhjbHVzaW9uKSB7XG4gICAgLy8gaW5jcmVtZW50IHJlbmRlcl9sb2cgZm9yIHNraXBwZWQgZmlsZVxuICAgIHRoaXMucmVuZGVyX2xvZy5leGNsdXNpb25zX2xvZ3NbZXhjbHVzaW9uXSA9ICh0aGlzLnJlbmRlcl9sb2cuZXhjbHVzaW9uc19sb2dzW2V4Y2x1c2lvbl0gfHwgMCkgKyAxO1xuICB9XG4gIFxuXG4gIGJsb2NrX3BhcnNlcihtYXJrZG93biwgZmlsZV9wYXRoKXtcbiAgICAvLyBpZiB0aGlzLnNldHRpbmdzLnNraXBfc2VjdGlvbnMgaXMgdHJ1ZSB0aGVuIHJldHVybiBlbXB0eSBhcnJheVxuICAgIGlmKHRoaXMuc2V0dGluZ3Muc2tpcF9zZWN0aW9ucykge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICAvLyBzcGxpdCB0aGUgbWFya2Rvd24gaW50byBsaW5lc1xuICAgIGNvbnN0IGxpbmVzID0gbWFya2Rvd24uc3BsaXQoJ1xcbicpO1xuICAgIC8vIGluaXRpYWxpemUgdGhlIGJsb2NrcyBhcnJheVxuICAgIGxldCBibG9ja3MgPSBbXTtcbiAgICAvLyBjdXJyZW50IGhlYWRlcnMgYXJyYXlcbiAgICBsZXQgY3VycmVudEhlYWRlcnMgPSBbXTtcbiAgICAvLyByZW1vdmUgLm1kIGZpbGUgZXh0ZW5zaW9uIGFuZCBjb252ZXJ0IGZpbGVfcGF0aCB0byBicmVhZGNydW1iIGZvcm1hdHRpbmdcbiAgICBjb25zdCBmaWxlX2JyZWFkY3J1bWJzID0gZmlsZV9wYXRoLnJlcGxhY2UoJy5tZCcsICcnKS5yZXBsYWNlKC9cXC8vZywgJyA+ICcpO1xuICAgIC8vIGluaXRpYWxpemUgdGhlIGJsb2NrIHN0cmluZ1xuICAgIGxldCBibG9jayA9ICcnO1xuICAgIGxldCBibG9ja19oZWFkaW5ncyA9ICcnO1xuICAgIGxldCBibG9ja19wYXRoID0gZmlsZV9wYXRoO1xuXG4gICAgbGV0IGxhc3RfaGVhZGluZ19saW5lID0gMDtcbiAgICBsZXQgaSA9IDA7XG4gICAgbGV0IGJsb2NrX2hlYWRpbmdzX2xpc3QgPSBbXTtcbiAgICAvLyBsb29wIHRocm91Z2ggdGhlIGxpbmVzXG4gICAgZm9yIChpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAvLyBnZXQgdGhlIGxpbmVcbiAgICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tpXTtcbiAgICAgIC8vIGlmIGxpbmUgZG9lcyBub3Qgc3RhcnQgd2l0aCAjXG4gICAgICAvLyBvciBpZiBsaW5lIHN0YXJ0cyB3aXRoICMgYW5kIHNlY29uZCBjaGFyYWN0ZXIgaXMgYSB3b3JkIG9yIG51bWJlciBpbmRpY2F0aW5nIGEgXCJ0YWdcIlxuICAgICAgLy8gdGhlbiBhZGQgdG8gYmxvY2tcbiAgICAgIGlmICghbGluZS5zdGFydHNXaXRoKCcjJykgfHwgKFsnIycsJyAnXS5pbmRleE9mKGxpbmVbMV0pIDwgMCkpe1xuICAgICAgICAvLyBza2lwIGlmIGxpbmUgaXMgZW1wdHlcbiAgICAgICAgaWYobGluZSA9PT0gJycpIGNvbnRpbnVlO1xuICAgICAgICAvLyBza2lwIGlmIGxpbmUgaXMgZW1wdHkgYnVsbGV0IG9yIGNoZWNrYm94XG4gICAgICAgIGlmKFsnLSAnLCAnLSBbIF0gJ10uaW5kZXhPZihsaW5lKSA+IC0xKSBjb250aW51ZTtcbiAgICAgICAgLy8gaWYgY3VycmVudEhlYWRlcnMgaXMgZW1wdHkgc2tpcCAob25seSBibG9ja3Mgd2l0aCBoZWFkZXJzLCBvdGhlcndpc2UgYmxvY2sucGF0aCBjb25mbGljdHMgd2l0aCBmaWxlLnBhdGgpXG4gICAgICAgIGlmKGN1cnJlbnRIZWFkZXJzLmxlbmd0aCA9PT0gMCkgY29udGludWU7XG4gICAgICAgIC8vIGFkZCBsaW5lIHRvIGJsb2NrXG4gICAgICAgIGJsb2NrICs9IFwiXFxuXCIgKyBsaW5lO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIC8qKlxuICAgICAgICogQkVHSU4gSGVhZGluZyBwYXJzaW5nXG4gICAgICAgKiAtIGxpa2VseSBhIGhlYWRpbmcgaWYgbWFkZSBpdCB0aGlzIGZhclxuICAgICAgICovXG4gICAgICBsYXN0X2hlYWRpbmdfbGluZSA9IGk7XG4gICAgICAvLyBwdXNoIHRoZSBjdXJyZW50IGJsb2NrIHRvIHRoZSBibG9ja3MgYXJyYXkgdW5sZXNzIGxhc3QgbGluZSB3YXMgYSBhbHNvIGEgaGVhZGVyXG4gICAgICBpZihpID4gMCAmJiAobGFzdF9oZWFkaW5nX2xpbmUgIT09IChpLTEpKSAmJiAoYmxvY2suaW5kZXhPZihcIlxcblwiKSA+IC0xKSAmJiB0aGlzLnZhbGlkYXRlX2hlYWRpbmdzKGJsb2NrX2hlYWRpbmdzKSkge1xuICAgICAgICBvdXRwdXRfYmxvY2soKTtcbiAgICAgIH1cbiAgICAgIC8vIGdldCB0aGUgaGVhZGVyIGxldmVsXG4gICAgICBjb25zdCBsZXZlbCA9IGxpbmUuc3BsaXQoJyMnKS5sZW5ndGggLSAxO1xuICAgICAgLy8gcmVtb3ZlIGFueSBoZWFkZXJzIGZyb20gdGhlIGN1cnJlbnQgaGVhZGVycyBhcnJheSB0aGF0IGFyZSBoaWdoZXIgdGhhbiB0aGUgY3VycmVudCBoZWFkZXIgbGV2ZWxcbiAgICAgIGN1cnJlbnRIZWFkZXJzID0gY3VycmVudEhlYWRlcnMuZmlsdGVyKGhlYWRlciA9PiBoZWFkZXIubGV2ZWwgPCBsZXZlbCk7XG4gICAgICAvLyBhZGQgaGVhZGVyIGFuZCBsZXZlbCB0byBjdXJyZW50IGhlYWRlcnMgYXJyYXlcbiAgICAgIC8vIHRyaW0gdGhlIGhlYWRlciB0byByZW1vdmUgXCIjXCIgYW5kIGFueSB0cmFpbGluZyBzcGFjZXNcbiAgICAgIGN1cnJlbnRIZWFkZXJzLnB1c2goe2hlYWRlcjogbGluZS5yZXBsYWNlKC8jL2csICcnKS50cmltKCksIGxldmVsOiBsZXZlbH0pO1xuICAgICAgLy8gaW5pdGlhbGl6ZSB0aGUgYmxvY2sgYnJlYWRjcnVtYnMgd2l0aCBmaWxlLnBhdGggdGhlIGN1cnJlbnQgaGVhZGVyc1xuICAgICAgYmxvY2sgPSBmaWxlX2JyZWFkY3J1bWJzO1xuICAgICAgYmxvY2sgKz0gXCI6IFwiICsgY3VycmVudEhlYWRlcnMubWFwKGhlYWRlciA9PiBoZWFkZXIuaGVhZGVyKS5qb2luKCcgPiAnKTtcbiAgICAgIGJsb2NrX2hlYWRpbmdzID0gXCIjXCIrY3VycmVudEhlYWRlcnMubWFwKGhlYWRlciA9PiBoZWFkZXIuaGVhZGVyKS5qb2luKCcjJyk7XG4gICAgICAvLyBpZiBibG9ja19oZWFkaW5ncyBpcyBhbHJlYWR5IGluIGJsb2NrX2hlYWRpbmdzX2xpc3QgdGhlbiBhZGQgYSBudW1iZXIgdG8gdGhlIGVuZFxuICAgICAgaWYoYmxvY2tfaGVhZGluZ3NfbGlzdC5pbmRleE9mKGJsb2NrX2hlYWRpbmdzKSA+IC0xKSB7XG4gICAgICAgIGxldCBjb3VudCA9IDE7XG4gICAgICAgIHdoaWxlKGJsb2NrX2hlYWRpbmdzX2xpc3QuaW5kZXhPZihgJHtibG9ja19oZWFkaW5nc317JHtjb3VudH19YCkgPiAtMSkge1xuICAgICAgICAgIGNvdW50Kys7XG4gICAgICAgIH1cbiAgICAgICAgYmxvY2tfaGVhZGluZ3MgPSBgJHtibG9ja19oZWFkaW5nc317JHtjb3VudH19YDtcbiAgICAgIH1cbiAgICAgIGJsb2NrX2hlYWRpbmdzX2xpc3QucHVzaChibG9ja19oZWFkaW5ncyk7XG4gICAgICBibG9ja19wYXRoID0gZmlsZV9wYXRoICsgYmxvY2tfaGVhZGluZ3M7XG4gICAgfVxuICAgIC8vIGhhbmRsZSByZW1haW5pbmcgYWZ0ZXIgbG9vcFxuICAgIGlmKChsYXN0X2hlYWRpbmdfbGluZSAhPT0gKGktMSkpICYmIChibG9jay5pbmRleE9mKFwiXFxuXCIpID4gLTEpICYmIHRoaXMudmFsaWRhdGVfaGVhZGluZ3MoYmxvY2tfaGVhZGluZ3MpKSBvdXRwdXRfYmxvY2soKTtcbiAgICAvLyByZW1vdmUgYW55IGJsb2NrcyB0aGF0IGFyZSB0b28gc2hvcnQgKGxlbmd0aCA8IDUwKVxuICAgIGJsb2NrcyA9IGJsb2Nrcy5maWx0ZXIoYiA9PiBiLmxlbmd0aCA+IDUwKTtcbiAgICAvLyBjb25zb2xlLmxvZyhibG9ja3MpO1xuICAgIC8vIHJldHVybiB0aGUgYmxvY2tzIGFycmF5XG4gICAgcmV0dXJuIGJsb2NrcztcblxuICAgIGZ1bmN0aW9uIG91dHB1dF9ibG9jaygpIHtcbiAgICAgIC8vIGJyZWFkY3J1bWJzIGxlbmd0aCAoZmlyc3QgbGluZSBvZiBibG9jaylcbiAgICAgIGNvbnN0IGJyZWFkY3J1bWJzX2xlbmd0aCA9IGJsb2NrLmluZGV4T2YoXCJcXG5cIikgKyAxO1xuICAgICAgY29uc3QgYmxvY2tfbGVuZ3RoID0gYmxvY2subGVuZ3RoIC0gYnJlYWRjcnVtYnNfbGVuZ3RoO1xuICAgICAgLy8gdHJpbSBibG9jayB0byBtYXggbGVuZ3RoXG4gICAgICBpZiAoYmxvY2subGVuZ3RoID4gTUFYX0VNQkVEX1NUUklOR19MRU5HVEgpIHtcbiAgICAgICAgYmxvY2sgPSBibG9jay5zdWJzdHJpbmcoMCwgTUFYX0VNQkVEX1NUUklOR19MRU5HVEgpO1xuICAgICAgfVxuICAgICAgYmxvY2tzLnB1c2goeyB0ZXh0OiBibG9jay50cmltKCksIHBhdGg6IGJsb2NrX3BhdGgsIGxlbmd0aDogYmxvY2tfbGVuZ3RoIH0pO1xuICAgIH1cbiAgfVxuICAvLyByZXZlcnNlLXJldHJpZXZlIGJsb2NrIGdpdmVuIHBhdGhcbiAgYXN5bmMgYmxvY2tfcmV0cmlldmVyKHBhdGgsIGxpbWl0cz17fSkge1xuICAgIGxpbWl0cyA9IHtcbiAgICAgIGxpbmVzOiBudWxsLFxuICAgICAgY2hhcnNfcGVyX2xpbmU6IG51bGwsXG4gICAgICBtYXhfY2hhcnM6IG51bGwsXG4gICAgICAuLi5saW1pdHNcbiAgICB9XG4gICAgLy8gcmV0dXJuIGlmIG5vICMgaW4gcGF0aFxuICAgIGlmIChwYXRoLmluZGV4T2YoJyMnKSA8IDApIHtcbiAgICAgIGNvbnNvbGUubG9nKFwibm90IGEgYmxvY2sgcGF0aDogXCIrcGF0aCk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGxldCBibG9jayA9IFtdO1xuICAgIGxldCBibG9ja19oZWFkaW5ncyA9IHBhdGguc3BsaXQoJyMnKS5zbGljZSgxKTtcbiAgICAvLyBpZiBwYXRoIGVuZHMgd2l0aCBudW1iZXIgaW4gY3VybHkgYnJhY2VzXG4gICAgbGV0IGhlYWRpbmdfb2NjdXJyZW5jZSA9IDA7XG4gICAgaWYoYmxvY2tfaGVhZGluZ3NbYmxvY2tfaGVhZGluZ3MubGVuZ3RoLTFdLmluZGV4T2YoJ3snKSA+IC0xKSB7XG4gICAgICAvLyBnZXQgdGhlIG9jY3VycmVuY2UgbnVtYmVyXG4gICAgICBoZWFkaW5nX29jY3VycmVuY2UgPSBwYXJzZUludChibG9ja19oZWFkaW5nc1tibG9ja19oZWFkaW5ncy5sZW5ndGgtMV0uc3BsaXQoJ3snKVsxXS5yZXBsYWNlKCd9JywgJycpKTtcbiAgICAgIC8vIHJlbW92ZSB0aGUgb2NjdXJyZW5jZSBmcm9tIHRoZSBsYXN0IGhlYWRpbmdcbiAgICAgIGJsb2NrX2hlYWRpbmdzW2Jsb2NrX2hlYWRpbmdzLmxlbmd0aC0xXSA9IGJsb2NrX2hlYWRpbmdzW2Jsb2NrX2hlYWRpbmdzLmxlbmd0aC0xXS5zcGxpdCgneycpWzBdO1xuICAgIH1cbiAgICBsZXQgY3VycmVudEhlYWRlcnMgPSBbXTtcbiAgICBsZXQgb2NjdXJyZW5jZV9jb3VudCA9IDA7XG4gICAgbGV0IGJlZ2luX2xpbmUgPSAwO1xuICAgIGxldCBpID0gMDtcbiAgICAvLyBnZXQgZmlsZSBwYXRoIGZyb20gcGF0aFxuICAgIGNvbnN0IGZpbGVfcGF0aCA9IHBhdGguc3BsaXQoJyMnKVswXTtcbiAgICAvLyBnZXQgZmlsZVxuICAgIGNvbnN0IGZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgoZmlsZV9wYXRoKTtcbiAgICBpZighKGZpbGUgaW5zdGFuY2VvZiBPYnNpZGlhbi5URmlsZSkpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwibm90IGEgZmlsZTogXCIrZmlsZV9wYXRoKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gZ2V0IGZpbGUgY29udGVudHNcbiAgICBjb25zdCBmaWxlX2NvbnRlbnRzID0gYXdhaXQgdGhpcy5hcHAudmF1bHQuY2FjaGVkUmVhZChmaWxlKTtcbiAgICAvLyBzcGxpdCB0aGUgZmlsZSBjb250ZW50cyBpbnRvIGxpbmVzXG4gICAgY29uc3QgbGluZXMgPSBmaWxlX2NvbnRlbnRzLnNwbGl0KCdcXG4nKTtcbiAgICAvLyBsb29wIHRocm91Z2ggdGhlIGxpbmVzXG4gICAgbGV0IGlzX2NvZGUgPSBmYWxzZTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIC8vIGdldCB0aGUgbGluZVxuICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2ldO1xuICAgICAgLy8gaWYgbGluZSBiZWdpbnMgd2l0aCB0aHJlZSBiYWNrdGlja3MgdGhlbiB0b2dnbGUgaXNfY29kZVxuICAgICAgaWYobGluZS5pbmRleE9mKCdgYGAnKSA9PT0gMCkge1xuICAgICAgICBpc19jb2RlID0gIWlzX2NvZGU7XG4gICAgICB9XG4gICAgICAvLyBpZiBpc19jb2RlIGlzIHRydWUgdGhlbiBhZGQgbGluZSB3aXRoIHByZWNlZGluZyB0YWIgYW5kIGNvbnRpbnVlXG4gICAgICBpZihpc19jb2RlKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgLy8gc2tpcCBpZiBsaW5lIGlzIGVtcHR5IGJ1bGxldCBvciBjaGVja2JveFxuICAgICAgaWYoWyctICcsICctIFsgXSAnXS5pbmRleE9mKGxpbmUpID4gLTEpIGNvbnRpbnVlO1xuICAgICAgLy8gaWYgbGluZSBkb2VzIG5vdCBzdGFydCB3aXRoICNcbiAgICAgIC8vIG9yIGlmIGxpbmUgc3RhcnRzIHdpdGggIyBhbmQgc2Vjb25kIGNoYXJhY3RlciBpcyBhIHdvcmQgb3IgbnVtYmVyIGluZGljYXRpbmcgYSBcInRhZ1wiXG4gICAgICAvLyB0aGVuIGNvbnRpbnVlIHRvIG5leHQgbGluZVxuICAgICAgaWYgKCFsaW5lLnN0YXJ0c1dpdGgoJyMnKSB8fCAoWycjJywnICddLmluZGV4T2YobGluZVsxXSkgPCAwKSl7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgLyoqXG4gICAgICAgKiBCRUdJTiBIZWFkaW5nIHBhcnNpbmdcbiAgICAgICAqIC0gbGlrZWx5IGEgaGVhZGluZyBpZiBtYWRlIGl0IHRoaXMgZmFyXG4gICAgICAgKi9cbiAgICAgIC8vIGdldCB0aGUgaGVhZGluZyB0ZXh0XG4gICAgICBjb25zdCBoZWFkaW5nX3RleHQgPSBsaW5lLnJlcGxhY2UoLyMvZywgJycpLnRyaW0oKTtcbiAgICAgIC8vIGNvbnRpbnVlIGlmIGhlYWRpbmcgdGV4dCBpcyBub3QgaW4gYmxvY2tfaGVhZGluZ3NcbiAgICAgIGNvbnN0IGhlYWRpbmdfaW5kZXggPSBibG9ja19oZWFkaW5ncy5pbmRleE9mKGhlYWRpbmdfdGV4dCk7XG4gICAgICBpZiAoaGVhZGluZ19pbmRleCA8IDApIGNvbnRpbnVlO1xuICAgICAgLy8gaWYgY3VycmVudEhlYWRlcnMubGVuZ3RoICE9PSBoZWFkaW5nX2luZGV4IHRoZW4gd2UgaGF2ZSBhIG1pc21hdGNoXG4gICAgICBpZiAoY3VycmVudEhlYWRlcnMubGVuZ3RoICE9PSBoZWFkaW5nX2luZGV4KSBjb250aW51ZTtcbiAgICAgIC8vIHB1c2ggdGhlIGhlYWRpbmcgdGV4dCB0byB0aGUgY3VycmVudEhlYWRlcnMgYXJyYXlcbiAgICAgIGN1cnJlbnRIZWFkZXJzLnB1c2goaGVhZGluZ190ZXh0KTtcbiAgICAgIC8vIGlmIGN1cnJlbnRIZWFkZXJzLmxlbmd0aCA9PT0gYmxvY2tfaGVhZGluZ3MubGVuZ3RoIHRoZW4gd2UgaGF2ZSBhIG1hdGNoXG4gICAgICBpZiAoY3VycmVudEhlYWRlcnMubGVuZ3RoID09PSBibG9ja19oZWFkaW5ncy5sZW5ndGgpIHtcbiAgICAgICAgLy8gaWYgaGVhZGluZ19vY2N1cnJlbmNlIGlzIGRlZmluZWQgdGhlbiBpbmNyZW1lbnQgb2NjdXJyZW5jZV9jb3VudFxuICAgICAgICBpZihoZWFkaW5nX29jY3VycmVuY2UgPT09IDApIHtcbiAgICAgICAgICAvLyBzZXQgYmVnaW5fbGluZSB0byBpICsgMVxuICAgICAgICAgIGJlZ2luX2xpbmUgPSBpICsgMTtcbiAgICAgICAgICBicmVhazsgLy8gYnJlYWsgb3V0IG9mIGxvb3BcbiAgICAgICAgfVxuICAgICAgICAvLyBpZiBvY2N1cnJlbmNlX2NvdW50ICE9PSBoZWFkaW5nX29jY3VycmVuY2UgdGhlbiBjb250aW51ZVxuICAgICAgICBpZihvY2N1cnJlbmNlX2NvdW50ID09PSBoZWFkaW5nX29jY3VycmVuY2Upe1xuICAgICAgICAgIGJlZ2luX2xpbmUgPSBpICsgMTtcbiAgICAgICAgICBicmVhazsgLy8gYnJlYWsgb3V0IG9mIGxvb3BcbiAgICAgICAgfVxuICAgICAgICBvY2N1cnJlbmNlX2NvdW50Kys7XG4gICAgICAgIC8vIHJlc2V0IGN1cnJlbnRIZWFkZXJzXG4gICAgICAgIGN1cnJlbnRIZWFkZXJzLnBvcCgpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gaWYgbm8gYmVnaW5fbGluZSB0aGVuIHJldHVybiBmYWxzZVxuICAgIGlmIChiZWdpbl9saW5lID09PSAwKSByZXR1cm4gZmFsc2U7XG4gICAgLy8gaXRlcmF0ZSB0aHJvdWdoIGxpbmVzIHN0YXJ0aW5nIGF0IGJlZ2luX2xpbmVcbiAgICBpc19jb2RlID0gZmFsc2U7XG4gICAgLy8gY2hhcmFjdGVyIGFjY3VtdWxhdG9yXG4gICAgbGV0IGNoYXJfY291bnQgPSAwO1xuICAgIGZvciAoaSA9IGJlZ2luX2xpbmU7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYoKHR5cGVvZiBsaW5lX2xpbWl0ID09PSBcIm51bWJlclwiKSAmJiAoYmxvY2subGVuZ3RoID4gbGluZV9saW1pdCkpe1xuICAgICAgICBibG9jay5wdXNoKFwiLi4uXCIpO1xuICAgICAgICBicmVhazsgLy8gZW5kcyB3aGVuIGxpbmVfbGltaXQgaXMgcmVhY2hlZFxuICAgICAgfVxuICAgICAgbGV0IGxpbmUgPSBsaW5lc1tpXTtcbiAgICAgIGlmICgobGluZS5pbmRleE9mKCcjJykgPT09IDApICYmIChbJyMnLCcgJ10uaW5kZXhPZihsaW5lWzFdKSAhPT0gLTEpKXtcbiAgICAgICAgYnJlYWs7IC8vIGVuZHMgd2hlbiBlbmNvdW50ZXJpbmcgbmV4dCBoZWFkZXJcbiAgICAgIH1cbiAgICAgIC8vIERFUFJFQ0FURUQ6IHNob3VsZCBiZSBoYW5kbGVkIGJ5IG5ld19saW5lK2NoYXJfY291bnQgY2hlY2sgKGhhcHBlbnMgaW4gcHJldmlvdXMgaXRlcmF0aW9uKVxuICAgICAgLy8gaWYgY2hhcl9jb3VudCBpcyBncmVhdGVyIHRoYW4gbGltaXQubWF4X2NoYXJzLCBza2lwXG4gICAgICBpZiAobGltaXRzLm1heF9jaGFycyAmJiBjaGFyX2NvdW50ID4gbGltaXRzLm1heF9jaGFycykge1xuICAgICAgICBibG9jay5wdXNoKFwiLi4uXCIpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIC8vIGlmIG5ld19saW5lICsgY2hhcl9jb3VudCBpcyBncmVhdGVyIHRoYW4gbGltaXQubWF4X2NoYXJzLCBza2lwXG4gICAgICBpZiAobGltaXRzLm1heF9jaGFycyAmJiAoKGxpbmUubGVuZ3RoICsgY2hhcl9jb3VudCkgPiBsaW1pdHMubWF4X2NoYXJzKSkge1xuICAgICAgICBjb25zdCBtYXhfbmV3X2NoYXJzID0gbGltaXRzLm1heF9jaGFycyAtIGNoYXJfY291bnQ7XG4gICAgICAgIGxpbmUgPSBsaW5lLnNsaWNlKDAsIG1heF9uZXdfY2hhcnMpICsgXCIuLi5cIjtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICAvLyB2YWxpZGF0ZS9mb3JtYXRcbiAgICAgIC8vIGlmIGxpbmUgaXMgZW1wdHksIHNraXBcbiAgICAgIGlmIChsaW5lLmxlbmd0aCA9PT0gMCkgY29udGludWU7XG4gICAgICAvLyBsaW1pdCBsZW5ndGggb2YgbGluZSB0byBOIGNoYXJhY3RlcnNcbiAgICAgIGlmIChsaW1pdHMuY2hhcnNfcGVyX2xpbmUgJiYgbGluZS5sZW5ndGggPiBsaW1pdHMuY2hhcnNfcGVyX2xpbmUpIHtcbiAgICAgICAgbGluZSA9IGxpbmUuc2xpY2UoMCwgbGltaXRzLmNoYXJzX3Blcl9saW5lKSArIFwiLi4uXCI7XG4gICAgICB9XG4gICAgICAvLyBpZiBsaW5lIGlzIGEgY29kZSBibG9jaywgc2tpcFxuICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aChcImBgYFwiKSkge1xuICAgICAgICBpc19jb2RlID0gIWlzX2NvZGU7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKGlzX2NvZGUpe1xuICAgICAgICAvLyBhZGQgdGFiIHRvIGJlZ2lubmluZyBvZiBsaW5lXG4gICAgICAgIGxpbmUgPSBcIlxcdFwiK2xpbmU7XG4gICAgICB9XG4gICAgICAvLyBhZGQgbGluZSB0byBibG9ja1xuICAgICAgYmxvY2sucHVzaChsaW5lKTtcbiAgICAgIC8vIGluY3JlbWVudCBjaGFyX2NvdW50XG4gICAgICBjaGFyX2NvdW50ICs9IGxpbmUubGVuZ3RoO1xuICAgIH1cbiAgICAvLyBjbG9zZSBjb2RlIGJsb2NrIGlmIG9wZW5cbiAgICBpZiAoaXNfY29kZSkge1xuICAgICAgYmxvY2sucHVzaChcImBgYFwiKTtcbiAgICB9XG4gICAgcmV0dXJuIGJsb2NrLmpvaW4oXCJcXG5cIikudHJpbSgpO1xuICB9XG5cbiAgLy8gcmV0cmlldmUgYSBmaWxlIGZyb20gdGhlIHZhdWx0XG4gIGFzeW5jIGZpbGVfcmV0cmlldmVyKGxpbmssIGxpbWl0cz17fSkge1xuICAgIGxpbWl0cyA9IHtcbiAgICAgIGxpbmVzOiBudWxsLFxuICAgICAgbWF4X2NoYXJzOiBudWxsLFxuICAgICAgY2hhcnNfcGVyX2xpbmU6IG51bGwsXG4gICAgICAuLi5saW1pdHNcbiAgICB9O1xuICAgIGNvbnN0IHRoaXNfZmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aChsaW5rKTtcbiAgICAvLyBpZiBmaWxlIGlzIG5vdCBmb3VuZCwgc2tpcFxuICAgIGlmICghKHRoaXNfZmlsZSBpbnN0YW5jZW9mIE9ic2lkaWFuLlRBYnN0cmFjdEZpbGUpKSByZXR1cm4gZmFsc2U7XG4gICAgLy8gdXNlIGNhY2hlZFJlYWQgdG8gZ2V0IHRoZSBmaXJzdCAxMCBsaW5lcyBvZiB0aGUgZmlsZVxuICAgIGNvbnN0IGZpbGVfY29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNhY2hlZFJlYWQodGhpc19maWxlKTtcbiAgICBjb25zdCBmaWxlX2xpbmVzID0gZmlsZV9jb250ZW50LnNwbGl0KFwiXFxuXCIpO1xuICAgIGxldCBmaXJzdF90ZW5fbGluZXMgPSBbXTtcbiAgICBsZXQgaXNfY29kZSA9IGZhbHNlO1xuICAgIGxldCBjaGFyX2FjY3VtID0gMDtcbiAgICBjb25zdCBsaW5lX2xpbWl0ID0gbGltaXRzLmxpbmVzIHx8IGZpbGVfbGluZXMubGVuZ3RoO1xuICAgIGZvciAobGV0IGkgPSAwOyBmaXJzdF90ZW5fbGluZXMubGVuZ3RoIDwgbGluZV9saW1pdDsgaSsrKSB7XG4gICAgICBsZXQgbGluZSA9IGZpbGVfbGluZXNbaV07XG4gICAgICAvLyBpZiBsaW5lIGlzIHVuZGVmaW5lZCwgYnJlYWtcbiAgICAgIGlmICh0eXBlb2YgbGluZSA9PT0gJ3VuZGVmaW5lZCcpXG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gaWYgbGluZSBpcyBlbXB0eSwgc2tpcFxuICAgICAgaWYgKGxpbmUubGVuZ3RoID09PSAwKVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIC8vIGxpbWl0IGxlbmd0aCBvZiBsaW5lIHRvIE4gY2hhcmFjdGVyc1xuICAgICAgaWYgKGxpbWl0cy5jaGFyc19wZXJfbGluZSAmJiBsaW5lLmxlbmd0aCA+IGxpbWl0cy5jaGFyc19wZXJfbGluZSkge1xuICAgICAgICBsaW5lID0gbGluZS5zbGljZSgwLCBsaW1pdHMuY2hhcnNfcGVyX2xpbmUpICsgXCIuLi5cIjtcbiAgICAgIH1cbiAgICAgIC8vIGlmIGxpbmUgaXMgXCItLS1cIiwgc2tpcFxuICAgICAgaWYgKGxpbmUgPT09IFwiLS0tXCIpXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgLy8gc2tpcCBpZiBsaW5lIGlzIGVtcHR5IGJ1bGxldCBvciBjaGVja2JveFxuICAgICAgaWYgKFsnLSAnLCAnLSBbIF0gJ10uaW5kZXhPZihsaW5lKSA+IC0xKVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIC8vIGlmIGxpbmUgaXMgYSBjb2RlIGJsb2NrLCBza2lwXG4gICAgICBpZiAobGluZS5pbmRleE9mKFwiYGBgXCIpID09PSAwKSB7XG4gICAgICAgIGlzX2NvZGUgPSAhaXNfY29kZTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICAvLyBpZiBjaGFyX2FjY3VtIGlzIGdyZWF0ZXIgdGhhbiBsaW1pdC5tYXhfY2hhcnMsIHNraXBcbiAgICAgIGlmIChsaW1pdHMubWF4X2NoYXJzICYmIGNoYXJfYWNjdW0gPiBsaW1pdHMubWF4X2NoYXJzKSB7XG4gICAgICAgIGZpcnN0X3Rlbl9saW5lcy5wdXNoKFwiLi4uXCIpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGlmIChpc19jb2RlKSB7XG4gICAgICAgIC8vIGlmIGlzIGNvZGUsIGFkZCB0YWIgdG8gYmVnaW5uaW5nIG9mIGxpbmVcbiAgICAgICAgbGluZSA9IFwiXFx0XCIgKyBsaW5lO1xuICAgICAgfVxuICAgICAgLy8gaWYgbGluZSBpcyBhIGhlYWRpbmdcbiAgICAgIGlmIChsaW5lX2lzX2hlYWRpbmcobGluZSkpIHtcbiAgICAgICAgLy8gbG9vayBhdCBsYXN0IGxpbmUgaW4gZmlyc3RfdGVuX2xpbmVzIHRvIHNlZSBpZiBpdCBpcyBhIGhlYWRpbmdcbiAgICAgICAgLy8gbm90ZTogdXNlcyBsYXN0IGluIGZpcnN0X3Rlbl9saW5lcywgaW5zdGVhZCBvZiBsb29rIGFoZWFkIGluIGZpbGVfbGluZXMsIGJlY2F1c2UuLlxuICAgICAgICAvLyAuLi5uZXh0IGxpbmUgbWF5IGJlIGV4Y2x1ZGVkIGZyb20gZmlyc3RfdGVuX2xpbmVzIGJ5IHByZXZpb3VzIGlmIHN0YXRlbWVudHNcbiAgICAgICAgaWYgKChmaXJzdF90ZW5fbGluZXMubGVuZ3RoID4gMCkgJiYgbGluZV9pc19oZWFkaW5nKGZpcnN0X3Rlbl9saW5lc1tmaXJzdF90ZW5fbGluZXMubGVuZ3RoIC0gMV0pKSB7XG4gICAgICAgICAgLy8gaWYgbGFzdCBsaW5lIGlzIGEgaGVhZGluZywgcmVtb3ZlIGl0XG4gICAgICAgICAgZmlyc3RfdGVuX2xpbmVzLnBvcCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBhZGQgbGluZSB0byBmaXJzdF90ZW5fbGluZXNcbiAgICAgIGZpcnN0X3Rlbl9saW5lcy5wdXNoKGxpbmUpO1xuICAgICAgLy8gaW5jcmVtZW50IGNoYXJfYWNjdW1cbiAgICAgIGNoYXJfYWNjdW0gKz0gbGluZS5sZW5ndGg7XG4gICAgfVxuICAgIC8vIGZvciBlYWNoIGxpbmUgaW4gZmlyc3RfdGVuX2xpbmVzLCBhcHBseSB2aWV3LXNwZWNpZmljIGZvcm1hdHRpbmdcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZpcnN0X3Rlbl9saW5lcy5sZW5ndGg7IGkrKykge1xuICAgICAgLy8gaWYgbGluZSBpcyBhIGhlYWRpbmdcbiAgICAgIGlmIChsaW5lX2lzX2hlYWRpbmcoZmlyc3RfdGVuX2xpbmVzW2ldKSkge1xuICAgICAgICAvLyBpZiB0aGlzIGlzIHRoZSBsYXN0IGxpbmUgaW4gZmlyc3RfdGVuX2xpbmVzXG4gICAgICAgIGlmIChpID09PSBmaXJzdF90ZW5fbGluZXMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgIC8vIHJlbW92ZSB0aGUgbGFzdCBsaW5lIGlmIGl0IGlzIGEgaGVhZGluZ1xuICAgICAgICAgIGZpcnN0X3Rlbl9saW5lcy5wb3AoKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICAvLyByZW1vdmUgaGVhZGluZyBzeW50YXggdG8gaW1wcm92ZSByZWFkYWJpbGl0eSBpbiBzbWFsbCBzcGFjZVxuICAgICAgICBmaXJzdF90ZW5fbGluZXNbaV0gPSBmaXJzdF90ZW5fbGluZXNbaV0ucmVwbGFjZSgvIysvLCBcIlwiKTtcbiAgICAgICAgZmlyc3RfdGVuX2xpbmVzW2ldID0gYFxcbiR7Zmlyc3RfdGVuX2xpbmVzW2ldfTpgO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBqb2luIGZpcnN0IHRlbiBsaW5lcyBpbnRvIHN0cmluZ1xuICAgIGZpcnN0X3Rlbl9saW5lcyA9IGZpcnN0X3Rlbl9saW5lcy5qb2luKFwiXFxuXCIpO1xuICAgIHJldHVybiBmaXJzdF90ZW5fbGluZXM7XG4gIH1cblxuICAvLyBpdGVyYXRlIHRocm91Z2ggYmxvY2tzIGFuZCBza2lwIGlmIGJsb2NrX2hlYWRpbmdzIGNvbnRhaW5zIHRoaXMuaGVhZGVyX2V4Y2x1c2lvbnNcbiAgdmFsaWRhdGVfaGVhZGluZ3MoYmxvY2tfaGVhZGluZ3MpIHtcbiAgICBsZXQgdmFsaWQgPSB0cnVlO1xuICAgIGlmICh0aGlzLmhlYWRlcl9leGNsdXNpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgIGZvciAobGV0IGsgPSAwOyBrIDwgdGhpcy5oZWFkZXJfZXhjbHVzaW9ucy5sZW5ndGg7IGsrKykge1xuICAgICAgICBpZiAoYmxvY2tfaGVhZGluZ3MuaW5kZXhPZih0aGlzLmhlYWRlcl9leGNsdXNpb25zW2tdKSA+IC0xKSB7XG4gICAgICAgICAgdmFsaWQgPSBmYWxzZTtcbiAgICAgICAgICB0aGlzLmxvZ19leGNsdXNpb24oXCJoZWFkaW5nOiBcIit0aGlzLmhlYWRlcl9leGNsdXNpb25zW2tdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdmFsaWQ7XG4gIH1cbiAgLy8gcmVuZGVyIFwiU21hcnQgQ29ubmVjdGlvbnNcIiB0ZXh0IGZpeGVkIGluIHRoZSBib3R0b20gcmlnaHQgY29ybmVyXG4gIHJlbmRlcl9icmFuZChjb250YWluZXIsIGxvY2F0aW9uPVwiZGVmYXVsdFwiKSB7XG4gICAgLy8gaWYgbG9jYXRpb24gaXMgYWxsIHRoZW4gZ2V0IE9iamVjdC5rZXlzKHRoaXMuc2NfYnJhbmRpbmcpIGFuZCBjYWxsIHRoaXMgZnVuY3Rpb24gZm9yIGVhY2hcbiAgICBpZiAoY29udGFpbmVyID09PSBcImFsbFwiKSB7XG4gICAgICBjb25zdCBsb2NhdGlvbnMgPSBPYmplY3Qua2V5cyh0aGlzLnNjX2JyYW5kaW5nKTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbG9jYXRpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXMucmVuZGVyX2JyYW5kKHRoaXMuc2NfYnJhbmRpbmdbbG9jYXRpb25zW2ldXSwgbG9jYXRpb25zW2ldKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gYnJhbmQgY29udGFpbmVyXG4gICAgdGhpcy5zY19icmFuZGluZ1tsb2NhdGlvbl0gPSBjb250YWluZXI7XG4gICAgLy8gaWYgdGhpcy5zY19icmFuZGluZ1tsb2NhdGlvbl0gY29udGFpbnMgY2hpbGQgd2l0aCBjbGFzcyBcInNjLWJyYW5kXCIsIHJlbW92ZSBpdFxuICAgIGlmICh0aGlzLnNjX2JyYW5kaW5nW2xvY2F0aW9uXS5xdWVyeVNlbGVjdG9yKFwiLnNjLWJyYW5kXCIpKSB7XG4gICAgICB0aGlzLnNjX2JyYW5kaW5nW2xvY2F0aW9uXS5xdWVyeVNlbGVjdG9yKFwiLnNjLWJyYW5kXCIpLnJlbW92ZSgpO1xuICAgIH1cbiAgICBjb25zdCBicmFuZF9jb250YWluZXIgPSB0aGlzLnNjX2JyYW5kaW5nW2xvY2F0aW9uXS5jcmVhdGVFbChcImRpdlwiLCB7IGNsczogXCJzYy1icmFuZFwiIH0pO1xuICAgIC8vIGFkZCB0ZXh0XG4gICAgLy8gYWRkIFNWRyBzaWduYWwgaWNvbiB1c2luZyBnZXRJY29uXG4gICAgT2JzaWRpYW4uc2V0SWNvbihicmFuZF9jb250YWluZXIsIFwic21hcnQtY29ubmVjdGlvbnNcIik7XG4gICAgY29uc3QgYnJhbmRfcCA9IGJyYW5kX2NvbnRhaW5lci5jcmVhdGVFbChcInBcIik7XG4gICAgbGV0IHRleHQgPSBcIlNtYXJ0IENvbm5lY3Rpb25zXCI7XG4gICAgbGV0IGF0dHIgPSB7fTtcbiAgICAvLyBpZiB1cGRhdGUgYXZhaWxhYmxlLCBjaGFuZ2UgdGV4dCB0byBcIlVwZGF0ZSBBdmFpbGFibGVcIlxuICAgIGlmICh0aGlzLnVwZGF0ZV9hdmFpbGFibGUpIHtcbiAgICAgIHRleHQgPSBcIlVwZGF0ZSBBdmFpbGFibGVcIjtcbiAgICAgIGF0dHIgPSB7XG4gICAgICAgIHN0eWxlOiBcImZvbnQtd2VpZ2h0OiA3MDA7XCJcbiAgICAgIH07XG4gICAgfVxuICAgIGJyYW5kX3AuY3JlYXRlRWwoXCJhXCIsIHtcbiAgICAgIGNsczogXCJcIixcbiAgICAgIHRleHQ6IHRleHQsXG4gICAgICBocmVmOiBcImh0dHBzOi8vZ2l0aHViLmNvbS9icmlhbnBldHJvL29ic2lkaWFuLXNtYXJ0LWNvbm5lY3Rpb25zL2Rpc2N1c3Npb25zXCIsXG4gICAgICB0YXJnZXQ6IFwiX2JsYW5rXCIsXG4gICAgICBhdHRyOiBhdHRyXG4gICAgfSk7XG4gIH1cblxuXG4gIC8vIGNyZWF0ZSBsaXN0IG9mIG5lYXJlc3Qgbm90ZXNcbiAgYXN5bmMgdXBkYXRlX3Jlc3VsdHMoY29udGFpbmVyLCBuZWFyZXN0KSB7XG4gICAgbGV0IGxpc3Q7XG4gICAgLy8gY2hlY2sgaWYgbGlzdCBleGlzdHNcbiAgICBpZigoY29udGFpbmVyLmNoaWxkcmVuLmxlbmd0aCA+IDEpICYmIChjb250YWluZXIuY2hpbGRyZW5bMV0uY2xhc3NMaXN0LmNvbnRhaW5zKFwic2MtbGlzdFwiKSkpe1xuICAgICAgbGlzdCA9IGNvbnRhaW5lci5jaGlsZHJlblsxXTtcbiAgICB9XG4gICAgLy8gaWYgbGlzdCBleGlzdHMsIGVtcHR5IGl0XG4gICAgaWYgKGxpc3QpIHtcbiAgICAgIGxpc3QuZW1wdHkoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gY3JlYXRlIGxpc3QgZWxlbWVudFxuICAgICAgbGlzdCA9IGNvbnRhaW5lci5jcmVhdGVFbChcImRpdlwiLCB7IGNsczogXCJzYy1saXN0XCIgfSk7XG4gICAgfVxuICAgIGxldCBzZWFyY2hfcmVzdWx0X2NsYXNzID0gXCJzZWFyY2gtcmVzdWx0XCI7XG4gICAgLy8gaWYgc2V0dGluZ3MgZXhwYW5kZWRfdmlldyBpcyBmYWxzZSwgYWRkIHNjLWNvbGxhcHNlZCBjbGFzc1xuICAgIGlmKCF0aGlzLnNldHRpbmdzLmV4cGFuZGVkX3ZpZXcpIHNlYXJjaF9yZXN1bHRfY2xhc3MgKz0gXCIgc2MtY29sbGFwc2VkXCI7XG5cbiAgICAvLyBUT0RPOiBhZGQgb3B0aW9uIHRvIGdyb3VwIG5lYXJlc3QgYnkgZmlsZVxuICAgIGlmKCF0aGlzLnNldHRpbmdzLmdyb3VwX25lYXJlc3RfYnlfZmlsZSkge1xuICAgICAgLy8gZm9yIGVhY2ggbmVhcmVzdCBub3RlXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG5lYXJlc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEJFR0lOIEVYVEVSTkFMIExJTksgTE9HSUNcbiAgICAgICAgICogaWYgbGluayBpcyBhbiBvYmplY3QsIGl0IGluZGljYXRlcyBleHRlcm5hbCBsaW5rXG4gICAgICAgICAqL1xuICAgICAgICBpZiAodHlwZW9mIG5lYXJlc3RbaV0ubGluayA9PT0gXCJvYmplY3RcIikge1xuICAgICAgICAgIGNvbnN0IGl0ZW0gPSBsaXN0LmNyZWF0ZUVsKFwiZGl2XCIsIHsgY2xzOiBcInNlYXJjaC1yZXN1bHRcIiB9KTtcbiAgICAgICAgICBjb25zdCBsaW5rID0gaXRlbS5jcmVhdGVFbChcImFcIiwge1xuICAgICAgICAgICAgY2xzOiBcInNlYXJjaC1yZXN1bHQtZmlsZS10aXRsZSBpcy1jbGlja2FibGVcIixcbiAgICAgICAgICAgIGhyZWY6IG5lYXJlc3RbaV0ubGluay5wYXRoLFxuICAgICAgICAgICAgdGl0bGU6IG5lYXJlc3RbaV0ubGluay50aXRsZSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBsaW5rLmlubmVySFRNTCA9IHRoaXMucmVuZGVyX2V4dGVybmFsX2xpbmtfZWxtKG5lYXJlc3RbaV0ubGluayk7XG4gICAgICAgICAgaXRlbS5zZXRBdHRyKCdkcmFnZ2FibGUnLCAndHJ1ZScpXG4gICAgICAgICAgY29udGludWU7IC8vIGVuZHMgaGVyZSBmb3IgZXh0ZXJuYWwgbGlua3NcbiAgICAgICAgfVxuICAgICAgICAvKipcbiAgICAgICAgICogQkVHSU4gSU5URVJOQUwgTElOSyBMT0dJQ1xuICAgICAgICAgKiBpZiBsaW5rIGlzIGEgc3RyaW5nLCBpdCBpbmRpY2F0ZXMgaW50ZXJuYWwgbGlua1xuICAgICAgICAgKi9cbiAgICAgICAgbGV0IGZpbGVfbGlua190ZXh0O1xuICAgICAgICBjb25zdCBmaWxlX3NpbWlsYXJpdHlfcGN0ID0gTWF0aC5yb3VuZChuZWFyZXN0W2ldLnNpbWlsYXJpdHkgKiAxMDApICsgXCIlXCI7XG4gICAgICAgIGlmKHRoaXMuc2V0dGluZ3Muc2hvd19mdWxsX3BhdGgpIHtcbiAgICAgICAgICBjb25zdCBwY3MgPSBuZWFyZXN0W2ldLmxpbmsuc3BsaXQoXCIvXCIpO1xuICAgICAgICAgIGZpbGVfbGlua190ZXh0ID0gcGNzW3Bjcy5sZW5ndGggLSAxXTtcbiAgICAgICAgICBjb25zdCBwYXRoID0gcGNzLnNsaWNlKDAsIHBjcy5sZW5ndGggLSAxKS5qb2luKFwiL1wiKTtcbiAgICAgICAgICAvLyBmaWxlX2xpbmtfdGV4dCA9IGA8c21hbGw+JHtwYXRofSB8ICR7ZmlsZV9zaW1pbGFyaXR5X3BjdH08L3NtYWxsPjxicj4ke2ZpbGVfbGlua190ZXh0fWA7XG4gICAgICAgICAgZmlsZV9saW5rX3RleHQgPSBgPHNtYWxsPiR7ZmlsZV9zaW1pbGFyaXR5X3BjdH0gfCAke3BhdGh9IHwgJHtmaWxlX2xpbmtfdGV4dH08L3NtYWxsPmA7XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgIGZpbGVfbGlua190ZXh0ID0gJzxzbWFsbD4nICsgZmlsZV9zaW1pbGFyaXR5X3BjdCArIFwiIHwgXCIgKyBuZWFyZXN0W2ldLmxpbmsuc3BsaXQoXCIvXCIpLnBvcCgpICsgJzwvc21hbGw+JztcbiAgICAgICAgfVxuICAgICAgICAvLyBza2lwIGNvbnRlbnRzIHJlbmRlcmluZyBpZiBpbmNvbXBhdGlibGUgZmlsZSB0eXBlXG4gICAgICAgIC8vIGV4LiBub3QgbWFya2Rvd24gZmlsZSBvciBjb250YWlucyBubyAnLmV4Y2FsaWRyYXcnXG4gICAgICAgIGlmKCF0aGlzLnJlbmRlcmFibGVfZmlsZV90eXBlKG5lYXJlc3RbaV0ubGluaykpe1xuICAgICAgICAgIGNvbnN0IGl0ZW0gPSBsaXN0LmNyZWF0ZUVsKFwiZGl2XCIsIHsgY2xzOiBcInNlYXJjaC1yZXN1bHRcIiB9KTtcbiAgICAgICAgICBjb25zdCBsaW5rID0gaXRlbS5jcmVhdGVFbChcImFcIiwge1xuICAgICAgICAgICAgY2xzOiBcInNlYXJjaC1yZXN1bHQtZmlsZS10aXRsZSBpcy1jbGlja2FibGVcIixcbiAgICAgICAgICAgIGhyZWY6IG5lYXJlc3RbaV0ubGluayxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBsaW5rLmlubmVySFRNTCA9IGZpbGVfbGlua190ZXh0O1xuICAgICAgICAgIC8vIGRyYWcgYW5kIGRyb3BcbiAgICAgICAgICBpdGVtLnNldEF0dHIoJ2RyYWdnYWJsZScsICd0cnVlJylcbiAgICAgICAgICAvLyBhZGQgbGlzdGVuZXJzIHRvIGxpbmtcbiAgICAgICAgICB0aGlzLmFkZF9saW5rX2xpc3RlbmVycyhsaW5rLCBuZWFyZXN0W2ldLCBpdGVtKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIHJlbW92ZSBmaWxlIGV4dGVuc2lvbiBpZiAubWQgYW5kIG1ha2UgIyBpbnRvID5cbiAgICAgICAgZmlsZV9saW5rX3RleHQgPSBmaWxlX2xpbmtfdGV4dC5yZXBsYWNlKFwiLm1kXCIsIFwiXCIpLnJlcGxhY2UoLyMvZywgXCIgPiBcIik7XG4gICAgICAgIC8vIGNyZWF0ZSBpdGVtXG4gICAgICAgIGNvbnN0IGl0ZW0gPSBsaXN0LmNyZWF0ZUVsKFwiZGl2XCIsIHsgY2xzOiBzZWFyY2hfcmVzdWx0X2NsYXNzIH0pO1xuICAgICAgICAvLyBjcmVhdGUgc3BhbiBmb3IgdG9nZ2xlXG4gICAgICAgIGNvbnN0IHRvZ2dsZSA9IGl0ZW0uY3JlYXRlRWwoXCJzcGFuXCIsIHsgY2xzOiBcImlzLWNsaWNrYWJsZVwiIH0pO1xuICAgICAgICAvLyBpbnNlcnQgcmlnaHQgdHJpYW5nbGUgc3ZnIGFzIHRvZ2dsZVxuICAgICAgICBPYnNpZGlhbi5zZXRJY29uKHRvZ2dsZSwgXCJyaWdodC10cmlhbmdsZVwiKTsgLy8gbXVzdCBjb21lIGJlZm9yZSBhZGRpbmcgb3RoZXIgZWxtcyB0byBwcmV2ZW50IG92ZXJ3cml0ZVxuICAgICAgICBjb25zdCBsaW5rID0gdG9nZ2xlLmNyZWF0ZUVsKFwiYVwiLCB7XG4gICAgICAgICAgY2xzOiBcInNlYXJjaC1yZXN1bHQtZmlsZS10aXRsZVwiLFxuICAgICAgICAgIHRpdGxlOiBuZWFyZXN0W2ldLmxpbmssXG4gICAgICAgIH0pO1xuICAgICAgICBsaW5rLmlubmVySFRNTCA9IGZpbGVfbGlua190ZXh0O1xuICAgICAgICAvLyBhZGQgbGlzdGVuZXJzIHRvIGxpbmtcbiAgICAgICAgdGhpcy5hZGRfbGlua19saXN0ZW5lcnMobGluaywgbmVhcmVzdFtpXSwgaXRlbSk7XG4gICAgICAgIHRvZ2dsZS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgLy8gZmluZCBwYXJlbnQgY29udGFpbmluZyBzZWFyY2gtcmVzdWx0IGNsYXNzXG4gICAgICAgICAgbGV0IHBhcmVudCA9IGV2ZW50LnRhcmdldC5wYXJlbnRFbGVtZW50O1xuICAgICAgICAgIHdoaWxlICghcGFyZW50LmNsYXNzTGlzdC5jb250YWlucyhcInNlYXJjaC1yZXN1bHRcIikpIHtcbiAgICAgICAgICAgIHBhcmVudCA9IHBhcmVudC5wYXJlbnRFbGVtZW50O1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyB0b2dnbGUgc2MtY29sbGFwc2VkIGNsYXNzXG4gICAgICAgICAgcGFyZW50LmNsYXNzTGlzdC50b2dnbGUoXCJzYy1jb2xsYXBzZWRcIik7XG4gICAgICAgIH0pO1xuICAgICAgICBjb25zdCBjb250ZW50cyA9IGl0ZW0uY3JlYXRlRWwoXCJ1bFwiLCB7IGNsczogXCJcIiB9KTtcbiAgICAgICAgY29uc3QgY29udGVudHNfY29udGFpbmVyID0gY29udGVudHMuY3JlYXRlRWwoXCJsaVwiLCB7XG4gICAgICAgICAgY2xzOiBcInNlYXJjaC1yZXN1bHQtZmlsZS10aXRsZSBpcy1jbGlja2FibGVcIixcbiAgICAgICAgICB0aXRsZTogbmVhcmVzdFtpXS5saW5rLFxuICAgICAgICB9KTtcbiAgICAgICAgaWYobmVhcmVzdFtpXS5saW5rLmluZGV4T2YoXCIjXCIpID4gLTEpeyAvLyBpcyBibG9ja1xuICAgICAgICAgIE9ic2lkaWFuLk1hcmtkb3duUmVuZGVyZXIucmVuZGVyTWFya2Rvd24oKGF3YWl0IHRoaXMuYmxvY2tfcmV0cmlldmVyKG5lYXJlc3RbaV0ubGluaywge2xpbmVzOiAxMCwgbWF4X2NoYXJzOiAxMDAwfSkpLCBjb250ZW50c19jb250YWluZXIsIG5lYXJlc3RbaV0ubGluaywgbmV3IE9ic2lkaWFuLkNvbXBvbmVudCgpKTtcbiAgICAgICAgfWVsc2V7IC8vIGlzIGZpbGVcbiAgICAgICAgICBjb25zdCBmaXJzdF90ZW5fbGluZXMgPSBhd2FpdCB0aGlzLmZpbGVfcmV0cmlldmVyKG5lYXJlc3RbaV0ubGluaywge2xpbmVzOiAxMCwgbWF4X2NoYXJzOiAxMDAwfSk7XG4gICAgICAgICAgaWYoIWZpcnN0X3Rlbl9saW5lcykgY29udGludWU7IC8vIHNraXAgaWYgZmlsZSBpcyBlbXB0eVxuICAgICAgICAgIE9ic2lkaWFuLk1hcmtkb3duUmVuZGVyZXIucmVuZGVyTWFya2Rvd24oZmlyc3RfdGVuX2xpbmVzLCBjb250ZW50c19jb250YWluZXIsIG5lYXJlc3RbaV0ubGluaywgbmV3IE9ic2lkaWFuLkNvbXBvbmVudCgpKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmFkZF9saW5rX2xpc3RlbmVycyhjb250ZW50cywgbmVhcmVzdFtpXSwgaXRlbSk7XG4gICAgICB9XG4gICAgICB0aGlzLnJlbmRlcl9icmFuZChjb250YWluZXIsIFwiYmxvY2tcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gZ3JvdXAgbmVhcmVzdCBieSBmaWxlXG4gICAgY29uc3QgbmVhcmVzdF9ieV9maWxlID0ge307XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuZWFyZXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBjdXJyID0gbmVhcmVzdFtpXTtcbiAgICAgIGNvbnN0IGxpbmsgPSBjdXJyLmxpbms7XG4gICAgICAvLyBza2lwIGlmIGxpbmsgaXMgYW4gb2JqZWN0IChpbmRpY2F0ZXMgZXh0ZXJuYWwgbG9naWMpXG4gICAgICBpZiAodHlwZW9mIGxpbmsgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgbmVhcmVzdF9ieV9maWxlW2xpbmsucGF0aF0gPSBbY3Vycl07XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKGxpbmsuaW5kZXhPZihcIiNcIikgPiAtMSkge1xuICAgICAgICBjb25zdCBmaWxlX3BhdGggPSBsaW5rLnNwbGl0KFwiI1wiKVswXTtcbiAgICAgICAgaWYgKCFuZWFyZXN0X2J5X2ZpbGVbZmlsZV9wYXRoXSkge1xuICAgICAgICAgIG5lYXJlc3RfYnlfZmlsZVtmaWxlX3BhdGhdID0gW107XG4gICAgICAgIH1cbiAgICAgICAgbmVhcmVzdF9ieV9maWxlW2ZpbGVfcGF0aF0ucHVzaChuZWFyZXN0W2ldKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICghbmVhcmVzdF9ieV9maWxlW2xpbmtdKSB7XG4gICAgICAgICAgbmVhcmVzdF9ieV9maWxlW2xpbmtdID0gW107XG4gICAgICAgIH1cbiAgICAgICAgLy8gYWx3YXlzIGFkZCB0byBmcm9udCBvZiBhcnJheVxuICAgICAgICBuZWFyZXN0X2J5X2ZpbGVbbGlua10udW5zaGlmdChuZWFyZXN0W2ldKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gZm9yIGVhY2ggZmlsZVxuICAgIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhuZWFyZXN0X2J5X2ZpbGUpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgZmlsZSA9IG5lYXJlc3RfYnlfZmlsZVtrZXlzW2ldXTtcbiAgICAgIC8qKlxuICAgICAgICogQmVnaW4gZXh0ZXJuYWwgbGluayBoYW5kbGluZ1xuICAgICAgICovXG4gICAgICAvLyBpZiBsaW5rIGlzIGFuIG9iamVjdCAoaW5kaWNhdGVzIHYyIGxvZ2ljKVxuICAgICAgaWYgKHR5cGVvZiBmaWxlWzBdLmxpbmsgPT09IFwib2JqZWN0XCIpIHtcbiAgICAgICAgY29uc3QgY3VyciA9IGZpbGVbMF07XG4gICAgICAgIGNvbnN0IG1ldGEgPSBjdXJyLmxpbms7XG4gICAgICAgIGlmIChtZXRhLnBhdGguc3RhcnRzV2l0aChcImh0dHBcIikpIHtcbiAgICAgICAgICBjb25zdCBpdGVtID0gbGlzdC5jcmVhdGVFbChcImRpdlwiLCB7IGNsczogXCJzZWFyY2gtcmVzdWx0XCIgfSk7XG4gICAgICAgICAgY29uc3QgbGluayA9IGl0ZW0uY3JlYXRlRWwoXCJhXCIsIHtcbiAgICAgICAgICAgIGNsczogXCJzZWFyY2gtcmVzdWx0LWZpbGUtdGl0bGUgaXMtY2xpY2thYmxlXCIsXG4gICAgICAgICAgICBocmVmOiBtZXRhLnBhdGgsXG4gICAgICAgICAgICB0aXRsZTogbWV0YS50aXRsZSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBsaW5rLmlubmVySFRNTCA9IHRoaXMucmVuZGVyX2V4dGVybmFsX2xpbmtfZWxtKG1ldGEpO1xuICAgICAgICAgIGl0ZW0uc2V0QXR0cignZHJhZ2dhYmxlJywgJ3RydWUnKTtcbiAgICAgICAgICBjb250aW51ZTsgLy8gZW5kcyBoZXJlIGZvciBleHRlcm5hbCBsaW5rc1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvKipcbiAgICAgICAqIEhhbmRsZXMgSW50ZXJuYWxcbiAgICAgICAqL1xuICAgICAgbGV0IGZpbGVfbGlua190ZXh0O1xuICAgICAgY29uc3QgZmlsZV9zaW1pbGFyaXR5X3BjdCA9IE1hdGgucm91bmQoZmlsZVswXS5zaW1pbGFyaXR5ICogMTAwKSArIFwiJVwiO1xuICAgICAgaWYgKHRoaXMuc2V0dGluZ3Muc2hvd19mdWxsX3BhdGgpIHtcbiAgICAgICAgY29uc3QgcGNzID0gZmlsZVswXS5saW5rLnNwbGl0KFwiL1wiKTtcbiAgICAgICAgZmlsZV9saW5rX3RleHQgPSBwY3NbcGNzLmxlbmd0aCAtIDFdO1xuICAgICAgICBjb25zdCBwYXRoID0gcGNzLnNsaWNlKDAsIHBjcy5sZW5ndGggLSAxKS5qb2luKFwiL1wiKTtcbiAgICAgICAgZmlsZV9saW5rX3RleHQgPSBgPHNtYWxsPiR7cGF0aH0gfCAke2ZpbGVfc2ltaWxhcml0eV9wY3R9PC9zbWFsbD48YnI+JHtmaWxlX2xpbmtfdGV4dH1gO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZmlsZV9saW5rX3RleHQgPSBmaWxlWzBdLmxpbmsuc3BsaXQoXCIvXCIpLnBvcCgpO1xuICAgICAgICAvLyBhZGQgc2ltaWxhcml0eSBwZXJjZW50YWdlXG4gICAgICAgIGZpbGVfbGlua190ZXh0ICs9ICcgfCAnICsgZmlsZV9zaW1pbGFyaXR5X3BjdDtcbiAgICAgIH1cblxuXG4gICAgICAgIFxuICAgICAgLy8gc2tpcCBjb250ZW50cyByZW5kZXJpbmcgaWYgaW5jb21wYXRpYmxlIGZpbGUgdHlwZVxuICAgICAgLy8gZXguIG5vdCBtYXJrZG93biBvciBjb250YWlucyAnLmV4Y2FsaWRyYXcnXG4gICAgICBpZighdGhpcy5yZW5kZXJhYmxlX2ZpbGVfdHlwZShmaWxlWzBdLmxpbmspKSB7XG4gICAgICAgIGNvbnN0IGl0ZW0gPSBsaXN0LmNyZWF0ZUVsKFwiZGl2XCIsIHsgY2xzOiBcInNlYXJjaC1yZXN1bHRcIiB9KTtcbiAgICAgICAgY29uc3QgZmlsZV9saW5rID0gaXRlbS5jcmVhdGVFbChcImFcIiwge1xuICAgICAgICAgIGNsczogXCJzZWFyY2gtcmVzdWx0LWZpbGUtdGl0bGUgaXMtY2xpY2thYmxlXCIsXG4gICAgICAgICAgdGl0bGU6IGZpbGVbMF0ubGluayxcbiAgICAgICAgfSk7XG4gICAgICAgIGZpbGVfbGluay5pbm5lckhUTUwgPSBmaWxlX2xpbmtfdGV4dDtcbiAgICAgICAgLy8gYWRkIGxpbmsgbGlzdGVuZXJzIHRvIGZpbGUgbGlua1xuICAgICAgICB0aGlzLmFkZF9saW5rX2xpc3RlbmVycyhmaWxlX2xpbmssIGZpbGVbMF0sIGl0ZW0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuXG4gICAgICAvLyByZW1vdmUgZmlsZSBleHRlbnNpb24gaWYgLm1kXG4gICAgICBmaWxlX2xpbmtfdGV4dCA9IGZpbGVfbGlua190ZXh0LnJlcGxhY2UoXCIubWRcIiwgXCJcIikucmVwbGFjZSgvIy9nLCBcIiA+IFwiKTtcbiAgICAgIGNvbnN0IGl0ZW0gPSBsaXN0LmNyZWF0ZUVsKFwiZGl2XCIsIHsgY2xzOiBzZWFyY2hfcmVzdWx0X2NsYXNzIH0pO1xuICAgICAgY29uc3QgdG9nZ2xlID0gaXRlbS5jcmVhdGVFbChcInNwYW5cIiwgeyBjbHM6IFwiaXMtY2xpY2thYmxlXCIgfSk7XG4gICAgICAvLyBpbnNlcnQgcmlnaHQgdHJpYW5nbGUgc3ZnIGljb24gYXMgdG9nZ2xlIGJ1dHRvbiBpbiBzcGFuXG4gICAgICBPYnNpZGlhbi5zZXRJY29uKHRvZ2dsZSwgXCJyaWdodC10cmlhbmdsZVwiKTsgLy8gbXVzdCBjb21lIGJlZm9yZSBhZGRpbmcgb3RoZXIgZWxtcyBlbHNlIG92ZXJ3cml0ZXNcbiAgICAgIGNvbnN0IGZpbGVfbGluayA9IHRvZ2dsZS5jcmVhdGVFbChcImFcIiwge1xuICAgICAgICBjbHM6IFwic2VhcmNoLXJlc3VsdC1maWxlLXRpdGxlXCIsXG4gICAgICAgIHRpdGxlOiBmaWxlWzBdLmxpbmssXG4gICAgICB9KTtcbiAgICAgIGZpbGVfbGluay5pbm5lckhUTUwgPSBmaWxlX2xpbmtfdGV4dDtcbiAgICAgIC8vIGFkZCBsaW5rIGxpc3RlbmVycyB0byBmaWxlIGxpbmtcbiAgICAgIHRoaXMuYWRkX2xpbmtfbGlzdGVuZXJzKGZpbGVfbGluaywgZmlsZVswXSwgdG9nZ2xlKTtcbiAgICAgIHRvZ2dsZS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGV2ZW50KSA9PiB7XG4gICAgICAgIC8vIGZpbmQgcGFyZW50IGNvbnRhaW5pbmcgY2xhc3Mgc2VhcmNoLXJlc3VsdFxuICAgICAgICBsZXQgcGFyZW50ID0gZXZlbnQudGFyZ2V0O1xuICAgICAgICB3aGlsZSAoIXBhcmVudC5jbGFzc0xpc3QuY29udGFpbnMoXCJzZWFyY2gtcmVzdWx0XCIpKSB7XG4gICAgICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudEVsZW1lbnQ7XG4gICAgICAgIH1cbiAgICAgICAgcGFyZW50LmNsYXNzTGlzdC50b2dnbGUoXCJzYy1jb2xsYXBzZWRcIik7XG4gICAgICAgIC8vIFRPRE86IGlmIGJsb2NrIGNvbnRhaW5lciBpcyBlbXB0eSwgcmVuZGVyIG1hcmtkb3duIGZyb20gYmxvY2sgcmV0cmlldmVyXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGZpbGVfbGlua19saXN0ID0gaXRlbS5jcmVhdGVFbChcInVsXCIpO1xuICAgICAgLy8gZm9yIGVhY2ggbGluayBpbiBmaWxlXG4gICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGZpbGUubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgLy8gaWYgaXMgYSBibG9jayAoaGFzICMgaW4gbGluaylcbiAgICAgICAgaWYoZmlsZVtqXS5saW5rLmluZGV4T2YoXCIjXCIpID4gLTEpIHtcbiAgICAgICAgICBjb25zdCBibG9jayA9IGZpbGVbal07XG4gICAgICAgICAgY29uc3QgYmxvY2tfbGluayA9IGZpbGVfbGlua19saXN0LmNyZWF0ZUVsKFwibGlcIiwge1xuICAgICAgICAgICAgY2xzOiBcInNlYXJjaC1yZXN1bHQtZmlsZS10aXRsZSBpcy1jbGlja2FibGVcIixcbiAgICAgICAgICAgIHRpdGxlOiBibG9jay5saW5rLFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIC8vIHNraXAgYmxvY2sgY29udGV4dCBpZiBmaWxlLmxlbmd0aCA9PT0gMSBiZWNhdXNlIGFscmVhZHkgYWRkZWRcbiAgICAgICAgICBpZihmaWxlLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IGJsb2NrX2NvbnRleHQgPSB0aGlzLnJlbmRlcl9ibG9ja19jb250ZXh0KGJsb2NrKTtcbiAgICAgICAgICAgIGNvbnN0IGJsb2NrX3NpbWlsYXJpdHlfcGN0ID0gTWF0aC5yb3VuZChibG9jay5zaW1pbGFyaXR5ICogMTAwKSArIFwiJVwiO1xuICAgICAgICAgICAgYmxvY2tfbGluay5pbm5lckhUTUwgPSBgPHNtYWxsPiR7YmxvY2tfY29udGV4dH0gfCAke2Jsb2NrX3NpbWlsYXJpdHlfcGN0fTwvc21hbGw+YDtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgYmxvY2tfY29udGFpbmVyID0gYmxvY2tfbGluay5jcmVhdGVFbChcImRpdlwiKTtcbiAgICAgICAgICAvLyBUT0RPOiBtb3ZlIHRvIHJlbmRlcmluZyBvbiBleHBhbmRpbmcgc2VjdGlvbiAodG9nZ2xlIGNvbGxhcHNlZClcbiAgICAgICAgICBPYnNpZGlhbi5NYXJrZG93blJlbmRlcmVyLnJlbmRlck1hcmtkb3duKChhd2FpdCB0aGlzLmJsb2NrX3JldHJpZXZlcihibG9jay5saW5rLCB7bGluZXM6IDEwLCBtYXhfY2hhcnM6IDEwMDB9KSksIGJsb2NrX2NvbnRhaW5lciwgYmxvY2subGluaywgbmV3IE9ic2lkaWFuLkNvbXBvbmVudCgpKTtcbiAgICAgICAgICAvLyBhZGQgbGluayBsaXN0ZW5lcnMgdG8gYmxvY2sgbGlua1xuICAgICAgICAgIHRoaXMuYWRkX2xpbmtfbGlzdGVuZXJzKGJsb2NrX2xpbmssIGJsb2NrLCBmaWxlX2xpbmtfbGlzdCk7XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgIC8vIGdldCBmaXJzdCB0ZW4gbGluZXMgb2YgZmlsZVxuICAgICAgICAgIGNvbnN0IGZpbGVfbGlua19saXN0ID0gaXRlbS5jcmVhdGVFbChcInVsXCIpO1xuICAgICAgICAgIGNvbnN0IGJsb2NrX2xpbmsgPSBmaWxlX2xpbmtfbGlzdC5jcmVhdGVFbChcImxpXCIsIHtcbiAgICAgICAgICAgIGNsczogXCJzZWFyY2gtcmVzdWx0LWZpbGUtdGl0bGUgaXMtY2xpY2thYmxlXCIsXG4gICAgICAgICAgICB0aXRsZTogZmlsZVswXS5saW5rLFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGNvbnN0IGJsb2NrX2NvbnRhaW5lciA9IGJsb2NrX2xpbmsuY3JlYXRlRWwoXCJkaXZcIik7XG4gICAgICAgICAgbGV0IGZpcnN0X3Rlbl9saW5lcyA9IGF3YWl0IHRoaXMuZmlsZV9yZXRyaWV2ZXIoZmlsZVswXS5saW5rLCB7bGluZXM6IDEwLCBtYXhfY2hhcnM6IDEwMDB9KTtcbiAgICAgICAgICBpZighZmlyc3RfdGVuX2xpbmVzKSBjb250aW51ZTsgLy8gaWYgZmlsZSBub3QgZm91bmQsIHNraXBcbiAgICAgICAgICBPYnNpZGlhbi5NYXJrZG93blJlbmRlcmVyLnJlbmRlck1hcmtkb3duKGZpcnN0X3Rlbl9saW5lcywgYmxvY2tfY29udGFpbmVyLCBmaWxlWzBdLmxpbmssIG5ldyBPYnNpZGlhbi5Db21wb25lbnQoKSk7XG4gICAgICAgICAgdGhpcy5hZGRfbGlua19saXN0ZW5lcnMoYmxvY2tfbGluaywgZmlsZVswXSwgZmlsZV9saW5rX2xpc3QpO1xuXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5yZW5kZXJfYnJhbmQoY29udGFpbmVyLCBcImZpbGVcIik7XG4gIH1cblxuICBhZGRfbGlua19saXN0ZW5lcnMoaXRlbSwgY3VyciwgbGlzdCkge1xuICAgIGl0ZW0uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGFzeW5jIChldmVudCkgPT4ge1xuICAgICAgYXdhaXQgdGhpcy5vcGVuX25vdGUoY3VyciwgZXZlbnQpO1xuICAgIH0pO1xuICAgIC8vIGRyYWctb25cbiAgICAvLyBjdXJyZW50bHkgb25seSB3b3JrcyB3aXRoIGZ1bGwtZmlsZSBsaW5rc1xuICAgIGl0ZW0uc2V0QXR0cignZHJhZ2dhYmxlJywgJ3RydWUnKTtcbiAgICBpdGVtLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdzdGFydCcsIChldmVudCkgPT4ge1xuICAgICAgY29uc3QgZHJhZ01hbmFnZXIgPSB0aGlzLmFwcC5kcmFnTWFuYWdlcjtcbiAgICAgIGNvbnN0IGZpbGVfcGF0aCA9IGN1cnIubGluay5zcGxpdChcIiNcIilbMF07XG4gICAgICBjb25zdCBmaWxlID0gdGhpcy5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaXJzdExpbmtwYXRoRGVzdChmaWxlX3BhdGgsICcnKTtcbiAgICAgIGNvbnN0IGRyYWdEYXRhID0gZHJhZ01hbmFnZXIuZHJhZ0ZpbGUoZXZlbnQsIGZpbGUpO1xuICAgICAgLy8gY29uc29sZS5sb2coZHJhZ0RhdGEpO1xuICAgICAgZHJhZ01hbmFnZXIub25EcmFnU3RhcnQoZXZlbnQsIGRyYWdEYXRhKTtcbiAgICB9KTtcbiAgICAvLyBpZiBjdXJyLmxpbmsgY29udGFpbnMgY3VybHkgYnJhY2VzLCByZXR1cm4gKGluY29tcGF0aWJsZSB3aXRoIGhvdmVyLWxpbmspXG4gICAgaWYgKGN1cnIubGluay5pbmRleE9mKFwie1wiKSA+IC0xKSByZXR1cm47XG4gICAgLy8gdHJpZ2dlciBob3ZlciBldmVudCBvbiBsaW5rXG4gICAgaXRlbS5hZGRFdmVudExpc3RlbmVyKFwibW91c2VvdmVyXCIsIChldmVudCkgPT4ge1xuICAgICAgdGhpcy5hcHAud29ya3NwYWNlLnRyaWdnZXIoXCJob3Zlci1saW5rXCIsIHtcbiAgICAgICAgZXZlbnQsXG4gICAgICAgIHNvdXJjZTogU01BUlRfQ09OTkVDVElPTlNfVklFV19UWVBFLFxuICAgICAgICBob3ZlclBhcmVudDogbGlzdCxcbiAgICAgICAgdGFyZ2V0RWw6IGl0ZW0sXG4gICAgICAgIGxpbmt0ZXh0OiBjdXJyLmxpbmssXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIGdldCB0YXJnZXQgZmlsZSBmcm9tIGxpbmsgcGF0aFxuICAvLyBpZiBzdWItc2VjdGlvbiBpcyBsaW5rZWQsIG9wZW4gZmlsZSBhbmQgc2Nyb2xsIHRvIHN1Yi1zZWN0aW9uXG4gIGFzeW5jIG9wZW5fbm90ZShjdXJyLCBldmVudD1udWxsKSB7XG4gICAgbGV0IHRhcmdldEZpbGU7XG4gICAgbGV0IGhlYWRpbmc7XG4gICAgaWYgKGN1cnIubGluay5pbmRleE9mKFwiI1wiKSA+IC0xKSB7XG4gICAgICAvLyByZW1vdmUgYWZ0ZXIgIyBmcm9tIGxpbmtcbiAgICAgIHRhcmdldEZpbGUgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpcnN0TGlua3BhdGhEZXN0KGN1cnIubGluay5zcGxpdChcIiNcIilbMF0sIFwiXCIpO1xuICAgICAgLy8gY29uc29sZS5sb2codGFyZ2V0RmlsZSk7XG4gICAgICBjb25zdCB0YXJnZXRfZmlsZV9jYWNoZSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlKHRhcmdldEZpbGUpO1xuICAgICAgLy8gY29uc29sZS5sb2codGFyZ2V0X2ZpbGVfY2FjaGUpO1xuICAgICAgLy8gZ2V0IGhlYWRpbmdcbiAgICAgIGxldCBoZWFkaW5nX3RleHQgPSBjdXJyLmxpbmsuc3BsaXQoXCIjXCIpLnBvcCgpO1xuICAgICAgLy8gaWYgaGVhZGluZyB0ZXh0IGNvbnRhaW5zIGEgY3VybHkgYnJhY2UsIGdldCB0aGUgbnVtYmVyIGluc2lkZSB0aGUgY3VybHkgYnJhY2VzIGFzIG9jY3VyZW5jZVxuICAgICAgbGV0IG9jY3VyZW5jZSA9IDA7XG4gICAgICBpZiAoaGVhZGluZ190ZXh0LmluZGV4T2YoXCJ7XCIpID4gLTEpIHtcbiAgICAgICAgLy8gZ2V0IG9jY3VyZW5jZVxuICAgICAgICBvY2N1cmVuY2UgPSBwYXJzZUludChoZWFkaW5nX3RleHQuc3BsaXQoXCJ7XCIpWzFdLnNwbGl0KFwifVwiKVswXSk7XG4gICAgICAgIC8vIHJlbW92ZSBvY2N1cmVuY2UgZnJvbSBoZWFkaW5nIHRleHRcbiAgICAgICAgaGVhZGluZ190ZXh0ID0gaGVhZGluZ190ZXh0LnNwbGl0KFwie1wiKVswXTtcbiAgICAgIH1cbiAgICAgIC8vIGdldCBoZWFkaW5ncyBmcm9tIGZpbGUgY2FjaGVcbiAgICAgIGNvbnN0IGhlYWRpbmdzID0gdGFyZ2V0X2ZpbGVfY2FjaGUuaGVhZGluZ3M7XG4gICAgICAvLyBnZXQgaGVhZGluZ3Mgd2l0aCB0aGUgc2FtZSBkZXB0aCBhbmQgdGV4dCBhcyB0aGUgbGlua1xuICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGhlYWRpbmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChoZWFkaW5nc1tpXS5oZWFkaW5nID09PSBoZWFkaW5nX3RleHQpIHtcbiAgICAgICAgICAvLyBpZiBvY2N1cmVuY2UgaXMgMCwgc2V0IGhlYWRpbmcgYW5kIGJyZWFrXG4gICAgICAgICAgaWYob2NjdXJlbmNlID09PSAwKSB7XG4gICAgICAgICAgICBoZWFkaW5nID0gaGVhZGluZ3NbaV07XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgb2NjdXJlbmNlLS07IC8vIGRlY3JlbWVudCBvY2N1cmVuY2VcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gY29uc29sZS5sb2coaGVhZGluZyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRhcmdldEZpbGUgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpcnN0TGlua3BhdGhEZXN0KGN1cnIubGluaywgXCJcIik7XG4gICAgfVxuICAgIGxldCBsZWFmO1xuICAgIGlmKGV2ZW50KSB7XG4gICAgICAvLyBwcm9wZXJseSBoYW5kbGUgaWYgdGhlIG1ldGEvY3RybCBrZXkgaXMgcHJlc3NlZFxuICAgICAgY29uc3QgbW9kID0gT2JzaWRpYW4uS2V5bWFwLmlzTW9kRXZlbnQoZXZlbnQpO1xuICAgICAgLy8gZ2V0IG1vc3QgcmVjZW50IGxlYWZcbiAgICAgIGxlYWYgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhZihtb2QpO1xuICAgIH1lbHNle1xuICAgICAgLy8gZ2V0IG1vc3QgcmVjZW50IGxlYWZcbiAgICAgIGxlYWYgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TW9zdFJlY2VudExlYWYoKTtcbiAgICB9XG4gICAgYXdhaXQgbGVhZi5vcGVuRmlsZSh0YXJnZXRGaWxlKTtcbiAgICBpZiAoaGVhZGluZykge1xuICAgICAgbGV0IHsgZWRpdG9yIH0gPSBsZWFmLnZpZXc7XG4gICAgICBjb25zdCBwb3MgPSB7IGxpbmU6IGhlYWRpbmcucG9zaXRpb24uc3RhcnQubGluZSwgY2g6IDAgfTtcbiAgICAgIGVkaXRvci5zZXRDdXJzb3IocG9zKTtcbiAgICAgIGVkaXRvci5zY3JvbGxJbnRvVmlldyh7IHRvOiBwb3MsIGZyb206IHBvcyB9LCB0cnVlKTtcbiAgICB9XG4gIH1cblxuICByZW5kZXJfYmxvY2tfY29udGV4dChibG9jaykge1xuICAgIGNvbnN0IGJsb2NrX2hlYWRpbmdzID0gYmxvY2subGluay5zcGxpdChcIi5tZFwiKVsxXS5zcGxpdChcIiNcIik7XG4gICAgLy8gc3RhcnRpbmcgd2l0aCB0aGUgbGFzdCBoZWFkaW5nIGZpcnN0LCBpdGVyYXRlIHRocm91Z2ggaGVhZGluZ3NcbiAgICBsZXQgYmxvY2tfY29udGV4dCA9IFwiXCI7XG4gICAgZm9yIChsZXQgaSA9IGJsb2NrX2hlYWRpbmdzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICBpZihibG9ja19jb250ZXh0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgYmxvY2tfY29udGV4dCA9IGAgPiAke2Jsb2NrX2NvbnRleHR9YDtcbiAgICAgIH1cbiAgICAgIGJsb2NrX2NvbnRleHQgPSBibG9ja19oZWFkaW5nc1tpXSArIGJsb2NrX2NvbnRleHQ7XG4gICAgICAvLyBpZiBibG9jayBjb250ZXh0IGlzIGxvbmdlciB0aGFuIE4gY2hhcmFjdGVycywgYnJlYWtcbiAgICAgIGlmIChibG9ja19jb250ZXh0Lmxlbmd0aCA+IDEwMCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gcmVtb3ZlIGxlYWRpbmcgPiBpZiBleGlzdHNcbiAgICBpZiAoYmxvY2tfY29udGV4dC5zdGFydHNXaXRoKFwiID4gXCIpKSB7XG4gICAgICBibG9ja19jb250ZXh0ID0gYmxvY2tfY29udGV4dC5zbGljZSgzKTtcbiAgICB9XG4gICAgcmV0dXJuIGJsb2NrX2NvbnRleHQ7XG5cbiAgfVxuXG4gIHJlbmRlcmFibGVfZmlsZV90eXBlKGxpbmspIHtcbiAgICByZXR1cm4gKGxpbmsuaW5kZXhPZihcIi5tZFwiKSAhPT0gLTEpICYmIChsaW5rLmluZGV4T2YoXCIuZXhjYWxpZHJhd1wiKSA9PT0gLTEpO1xuICB9XG5cbiAgcmVuZGVyX2V4dGVybmFsX2xpbmtfZWxtKG1ldGEpe1xuICAgIGlmKG1ldGEuc291cmNlKSB7XG4gICAgICBpZihtZXRhLnNvdXJjZSA9PT0gXCJHbWFpbFwiKSBtZXRhLnNvdXJjZSA9IFwiXHVEODNEXHVEQ0U3IEdtYWlsXCI7XG4gICAgICByZXR1cm4gYDxzbWFsbD4ke21ldGEuc291cmNlfTwvc21hbGw+PGJyPiR7bWV0YS50aXRsZX1gO1xuICAgIH1cbiAgICAvLyByZW1vdmUgaHR0cChzKTovL1xuICAgIGxldCBkb21haW4gPSBtZXRhLnBhdGgucmVwbGFjZSgvKF5cXHcrOnxeKVxcL1xcLy8sIFwiXCIpO1xuICAgIC8vIHNlcGFyYXRlIGRvbWFpbiBmcm9tIHBhdGhcbiAgICBkb21haW4gPSBkb21haW4uc3BsaXQoXCIvXCIpWzBdO1xuICAgIC8vIHdyYXAgZG9tYWluIGluIDxzbWFsbD4gYW5kIGFkZCBsaW5lIGJyZWFrXG4gICAgcmV0dXJuIGA8c21hbGw+XHVEODNDXHVERjEwICR7ZG9tYWlufTwvc21hbGw+PGJyPiR7bWV0YS50aXRsZX1gO1xuICB9XG4gIC8vIGdldCBhbGwgZm9sZGVyc1xuICBhc3luYyBnZXRfYWxsX2ZvbGRlcnMoKSB7XG4gICAgaWYoIXRoaXMuZm9sZGVycyB8fCB0aGlzLmZvbGRlcnMubGVuZ3RoID09PSAwKXtcbiAgICAgIHRoaXMuZm9sZGVycyA9IGF3YWl0IHRoaXMuZ2V0X2ZvbGRlcnMoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZm9sZGVycztcbiAgfVxuICAvLyBnZXQgZm9sZGVycywgdHJhdmVyc2Ugbm9uLWhpZGRlbiBzdWItZm9sZGVyc1xuICBhc3luYyBnZXRfZm9sZGVycyhwYXRoID0gXCIvXCIpIHtcbiAgICBsZXQgZm9sZGVycyA9IChhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLmxpc3QocGF0aCkpLmZvbGRlcnM7XG4gICAgbGV0IGZvbGRlcl9saXN0ID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBmb2xkZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoZm9sZGVyc1tpXS5zdGFydHNXaXRoKFwiLlwiKSkgY29udGludWU7XG4gICAgICBmb2xkZXJfbGlzdC5wdXNoKGZvbGRlcnNbaV0pO1xuICAgICAgZm9sZGVyX2xpc3QgPSBmb2xkZXJfbGlzdC5jb25jYXQoYXdhaXQgdGhpcy5nZXRfZm9sZGVycyhmb2xkZXJzW2ldICsgXCIvXCIpKTtcbiAgICB9XG4gICAgcmV0dXJuIGZvbGRlcl9saXN0O1xuICB9XG5cblxuICBhc3luYyBzeW5jX25vdGVzKCkge1xuICAgIC8vIGlmIGxpY2Vuc2Uga2V5IGlzIG5vdCBzZXQsIHJldHVyblxuICAgIGlmKCF0aGlzLnNldHRpbmdzLmxpY2Vuc2Vfa2V5KXtcbiAgICAgIG5ldyBPYnNpZGlhbi5Ob3RpY2UoXCJTbWFydCBDb25uZWN0aW9uczogU3VwcG9ydGVyIGxpY2Vuc2Uga2V5IGlzIHJlcXVpcmVkIHRvIHN5bmMgbm90ZXMgdG8gdGhlIENoYXRHUFQgUGx1Z2luIHNlcnZlci5cIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnNvbGUubG9nKFwic3luY2luZyBub3Rlc1wiKTtcbiAgICAvLyBnZXQgYWxsIGZpbGVzIGluIHZhdWx0XG4gICAgY29uc3QgZmlsZXMgPSB0aGlzLmFwcC52YXVsdC5nZXRNYXJrZG93bkZpbGVzKCkuZmlsdGVyKChmaWxlKSA9PiB7XG4gICAgICAvLyBmaWx0ZXIgb3V0IGZpbGUgcGF0aHMgbWF0Y2hpbmcgYW55IHN0cmluZ3MgaW4gdGhpcy5maWxlX2V4Y2x1c2lvbnNcbiAgICAgIGZvcihsZXQgaSA9IDA7IGkgPCB0aGlzLmZpbGVfZXhjbHVzaW9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZihmaWxlLnBhdGguaW5kZXhPZih0aGlzLmZpbGVfZXhjbHVzaW9uc1tpXSkgPiAtMSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gICAgY29uc3Qgbm90ZXMgPSBhd2FpdCB0aGlzLmJ1aWxkX25vdGVzX29iamVjdChmaWxlcyk7XG4gICAgY29uc29sZS5sb2coXCJvYmplY3QgYnVpbHRcIik7XG4gICAgLy8gc2F2ZSBub3RlcyBvYmplY3QgdG8gLnNtYXJ0LWNvbm5lY3Rpb25zL25vdGVzLmpzb25cbiAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLndyaXRlKFwiLnNtYXJ0LWNvbm5lY3Rpb25zL25vdGVzLmpzb25cIiwgSlNPTi5zdHJpbmdpZnkobm90ZXMsIG51bGwsIDIpKTtcbiAgICBjb25zb2xlLmxvZyhcIm5vdGVzIHNhdmVkXCIpO1xuICAgIGNvbnNvbGUubG9nKHRoaXMuc2V0dGluZ3MubGljZW5zZV9rZXkpO1xuICAgIC8vIFBPU1Qgbm90ZXMgb2JqZWN0IHRvIHNlcnZlclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgKDAsIE9ic2lkaWFuLnJlcXVlc3RVcmwpKHtcbiAgICAgIHVybDogXCJodHRwczovL3N5bmMuc21hcnRjb25uZWN0aW9ucy5hcHAvc3luY1wiLFxuICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICB9LFxuICAgICAgY29udGVudFR5cGU6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBsaWNlbnNlX2tleTogdGhpcy5zZXR0aW5ncy5saWNlbnNlX2tleSxcbiAgICAgICAgbm90ZXM6IG5vdGVzXG4gICAgICB9KVxuICAgIH0pO1xuICAgIGNvbnNvbGUubG9nKHJlc3BvbnNlKTtcblxuICB9XG5cbiAgYXN5bmMgYnVpbGRfbm90ZXNfb2JqZWN0KGZpbGVzKSB7XG4gICAgbGV0IG91dHB1dCA9IHt9O1xuICBcbiAgICBmb3IobGV0IGkgPSAwOyBpIDwgZmlsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGxldCBmaWxlID0gZmlsZXNbaV07XG4gICAgICBsZXQgcGFydHMgPSBmaWxlLnBhdGguc3BsaXQoXCIvXCIpO1xuICAgICAgbGV0IGN1cnJlbnQgPSBvdXRwdXQ7XG4gIFxuICAgICAgZm9yIChsZXQgaWkgPSAwOyBpaSA8IHBhcnRzLmxlbmd0aDsgaWkrKykge1xuICAgICAgICBsZXQgcGFydCA9IHBhcnRzW2lpXTtcbiAgXG4gICAgICAgIGlmIChpaSA9PT0gcGFydHMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgIC8vIFRoaXMgaXMgYSBmaWxlXG4gICAgICAgICAgY3VycmVudFtwYXJ0XSA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNhY2hlZFJlYWQoZmlsZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gVGhpcyBpcyBhIGRpcmVjdG9yeVxuICAgICAgICAgIGlmICghY3VycmVudFtwYXJ0XSkge1xuICAgICAgICAgICAgY3VycmVudFtwYXJ0XSA9IHt9O1xuICAgICAgICAgIH1cbiAgXG4gICAgICAgICAgY3VycmVudCA9IGN1cnJlbnRbcGFydF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIFxuICAgIHJldHVybiBvdXRwdXQ7XG4gIH1cblxufVxuXG5jb25zdCBTTUFSVF9DT05ORUNUSU9OU19WSUVXX1RZUEUgPSBcInNtYXJ0LWNvbm5lY3Rpb25zLXZpZXdcIjtcbmNsYXNzIFNtYXJ0Q29ubmVjdGlvbnNWaWV3IGV4dGVuZHMgT2JzaWRpYW4uSXRlbVZpZXcge1xuICBjb25zdHJ1Y3RvcihsZWFmLCBwbHVnaW4pIHtcbiAgICBzdXBlcihsZWFmKTtcbiAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgICB0aGlzLm5lYXJlc3QgPSBudWxsO1xuICAgIHRoaXMubG9hZF93YWl0ID0gbnVsbDtcbiAgfVxuICBnZXRWaWV3VHlwZSgpIHtcbiAgICByZXR1cm4gU01BUlRfQ09OTkVDVElPTlNfVklFV19UWVBFO1xuICB9XG5cbiAgZ2V0RGlzcGxheVRleHQoKSB7XG4gICAgcmV0dXJuIFwiU21hcnQgQ29ubmVjdGlvbnMgRmlsZXNcIjtcbiAgfVxuXG4gIGdldEljb24oKSB7XG4gICAgcmV0dXJuIFwic21hcnQtY29ubmVjdGlvbnNcIjtcbiAgfVxuXG5cbiAgc2V0X21lc3NhZ2UobWVzc2FnZSkge1xuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMuY29udGFpbmVyRWwuY2hpbGRyZW5bMV07XG4gICAgLy8gY2xlYXIgY29udGFpbmVyXG4gICAgY29udGFpbmVyLmVtcHR5KCk7XG4gICAgLy8gaW5pdGlhdGUgdG9wIGJhclxuICAgIHRoaXMuaW5pdGlhdGVfdG9wX2Jhcihjb250YWluZXIpO1xuICAgIC8vIGlmIG1lc2FnZSBpcyBhbiBhcnJheSwgbG9vcCB0aHJvdWdoIGFuZCBjcmVhdGUgYSBuZXcgcCBlbGVtZW50IGZvciBlYWNoIG1lc3NhZ2VcbiAgICBpZiAoQXJyYXkuaXNBcnJheShtZXNzYWdlKSkge1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBtZXNzYWdlLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnRhaW5lci5jcmVhdGVFbChcInBcIiwgeyBjbHM6IFwic2NfbWVzc2FnZVwiLCB0ZXh0OiBtZXNzYWdlW2ldIH0pO1xuICAgICAgfVxuICAgIH1lbHNle1xuICAgICAgLy8gY3JlYXRlIHAgZWxlbWVudCB3aXRoIG1lc3NhZ2VcbiAgICAgIGNvbnRhaW5lci5jcmVhdGVFbChcInBcIiwgeyBjbHM6IFwic2NfbWVzc2FnZVwiLCB0ZXh0OiBtZXNzYWdlIH0pO1xuICAgIH1cbiAgfVxuICByZW5kZXJfbGlua190ZXh0KGxpbmssIHNob3dfZnVsbF9wYXRoPWZhbHNlKSB7XG4gICAgLyoqXG4gICAgICogQmVnaW4gaW50ZXJuYWwgbGlua3NcbiAgICAgKi9cbiAgICAvLyBpZiBzaG93IGZ1bGwgcGF0aCBpcyBmYWxzZSwgcmVtb3ZlIGZpbGUgcGF0aFxuICAgIGlmICghc2hvd19mdWxsX3BhdGgpIHtcbiAgICAgIGxpbmsgPSBsaW5rLnNwbGl0KFwiL1wiKS5wb3AoKTtcbiAgICB9XG4gICAgLy8gaWYgY29udGFpbnMgJyMnXG4gICAgaWYgKGxpbmsuaW5kZXhPZihcIiNcIikgPiAtMSkge1xuICAgICAgLy8gc3BsaXQgYXQgLm1kXG4gICAgICBsaW5rID0gbGluay5zcGxpdChcIi5tZFwiKTtcbiAgICAgIC8vIHdyYXAgZmlyc3QgcGFydCBpbiA8c21hbGw+IGFuZCBhZGQgbGluZSBicmVha1xuICAgICAgbGlua1swXSA9IGA8c21hbGw+JHtsaW5rWzBdfTwvc21hbGw+PGJyPmA7XG4gICAgICAvLyBqb2luIGJhY2sgdG9nZXRoZXJcbiAgICAgIGxpbmsgPSBsaW5rLmpvaW4oXCJcIik7XG4gICAgICAvLyByZXBsYWNlICcjJyB3aXRoICcgXHUwMEJCICdcbiAgICAgIGxpbmsgPSBsaW5rLnJlcGxhY2UoL1xcIy9nLCBcIiBcdTAwQkIgXCIpO1xuICAgIH1lbHNle1xuICAgICAgLy8gcmVtb3ZlICcubWQnXG4gICAgICBsaW5rID0gbGluay5yZXBsYWNlKFwiLm1kXCIsIFwiXCIpO1xuICAgIH1cbiAgICByZXR1cm4gbGluaztcbiAgfVxuXG5cbiAgc2V0X25lYXJlc3QobmVhcmVzdCwgbmVhcmVzdF9jb250ZXh0PW51bGwsIHJlc3VsdHNfb25seT1mYWxzZSkge1xuICAgIC8vIGdldCBjb250YWluZXIgZWxlbWVudFxuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMuY29udGFpbmVyRWwuY2hpbGRyZW5bMV07XG4gICAgLy8gaWYgcmVzdWx0cyBvbmx5IGlzIGZhbHNlLCBjbGVhciBjb250YWluZXIgYW5kIGluaXRpYXRlIHRvcCBiYXJcbiAgICBpZighcmVzdWx0c19vbmx5KXtcbiAgICAgIC8vIGNsZWFyIGNvbnRhaW5lclxuICAgICAgY29udGFpbmVyLmVtcHR5KCk7XG4gICAgICB0aGlzLmluaXRpYXRlX3RvcF9iYXIoY29udGFpbmVyLCBuZWFyZXN0X2NvbnRleHQpO1xuICAgIH1cbiAgICAvLyB1cGRhdGUgcmVzdWx0c1xuICAgIHRoaXMucGx1Z2luLnVwZGF0ZV9yZXN1bHRzKGNvbnRhaW5lciwgbmVhcmVzdCk7XG4gIH1cblxuICBpbml0aWF0ZV90b3BfYmFyKGNvbnRhaW5lciwgbmVhcmVzdF9jb250ZXh0PW51bGwpIHtcbiAgICBsZXQgdG9wX2JhcjtcbiAgICAvLyBpZiB0b3AgYmFyIGFscmVhZHkgZXhpc3RzLCBlbXB0eSBpdFxuICAgIGlmICgoY29udGFpbmVyLmNoaWxkcmVuLmxlbmd0aCA+IDApICYmIChjb250YWluZXIuY2hpbGRyZW5bMF0uY2xhc3NMaXN0LmNvbnRhaW5zKFwic2MtdG9wLWJhclwiKSkpIHtcbiAgICAgIHRvcF9iYXIgPSBjb250YWluZXIuY2hpbGRyZW5bMF07XG4gICAgICB0b3BfYmFyLmVtcHR5KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGluaXQgY29udGFpbmVyIGZvciB0b3AgYmFyXG4gICAgICB0b3BfYmFyID0gY29udGFpbmVyLmNyZWF0ZUVsKFwiZGl2XCIsIHsgY2xzOiBcInNjLXRvcC1iYXJcIiB9KTtcbiAgICB9XG4gICAgLy8gaWYgaGlnaGxpZ2h0ZWQgdGV4dCBpcyBub3QgbnVsbCwgY3JlYXRlIHAgZWxlbWVudCB3aXRoIGhpZ2hsaWdodGVkIHRleHRcbiAgICBpZiAobmVhcmVzdF9jb250ZXh0KSB7XG4gICAgICB0b3BfYmFyLmNyZWF0ZUVsKFwicFwiLCB7IGNsczogXCJzYy1jb250ZXh0XCIsIHRleHQ6IG5lYXJlc3RfY29udGV4dCB9KTtcbiAgICB9XG4gICAgLy8gYWRkIGNoYXQgYnV0dG9uXG4gICAgY29uc3QgY2hhdF9idXR0b24gPSB0b3BfYmFyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgY2xzOiBcInNjLWNoYXQtYnV0dG9uXCIgfSk7XG4gICAgLy8gYWRkIGljb24gdG8gY2hhdCBidXR0b25cbiAgICBPYnNpZGlhbi5zZXRJY29uKGNoYXRfYnV0dG9uLCBcIm1lc3NhZ2Utc3F1YXJlXCIpO1xuICAgIC8vIGFkZCBjbGljayBsaXN0ZW5lciB0byBjaGF0IGJ1dHRvblxuICAgIGNoYXRfYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XG4gICAgICAvLyBvcGVuIGNoYXRcbiAgICAgIHRoaXMucGx1Z2luLm9wZW5fY2hhdCgpO1xuICAgIH0pO1xuICAgIC8vIGFkZCBzZWFyY2ggYnV0dG9uXG4gICAgY29uc3Qgc2VhcmNoX2J1dHRvbiA9IHRvcF9iYXIuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2Mtc2VhcmNoLWJ1dHRvblwiIH0pO1xuICAgIC8vIGFkZCBpY29uIHRvIHNlYXJjaCBidXR0b25cbiAgICBPYnNpZGlhbi5zZXRJY29uKHNlYXJjaF9idXR0b24sIFwic2VhcmNoXCIpO1xuICAgIC8vIGFkZCBjbGljayBsaXN0ZW5lciB0byBzZWFyY2ggYnV0dG9uXG4gICAgc2VhcmNoX2J1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xuICAgICAgLy8gZW1wdHkgdG9wIGJhclxuICAgICAgdG9wX2Jhci5lbXB0eSgpO1xuICAgICAgLy8gY3JlYXRlIGlucHV0IGVsZW1lbnRcbiAgICAgIGNvbnN0IHNlYXJjaF9jb250YWluZXIgPSB0b3BfYmFyLmNyZWF0ZUVsKFwiZGl2XCIsIHsgY2xzOiBcInNlYXJjaC1pbnB1dC1jb250YWluZXJcIiB9KTtcbiAgICAgIGNvbnN0IGlucHV0ID0gc2VhcmNoX2NvbnRhaW5lci5jcmVhdGVFbChcImlucHV0XCIsIHtcbiAgICAgICAgY2xzOiBcInNjLXNlYXJjaC1pbnB1dFwiLFxuICAgICAgICB0eXBlOiBcInNlYXJjaFwiLFxuICAgICAgICBwbGFjZWhvbGRlcjogXCJUeXBlIHRvIHN0YXJ0IHNlYXJjaC4uLlwiLCBcbiAgICAgIH0pO1xuICAgICAgLy8gZm9jdXMgaW5wdXRcbiAgICAgIGlucHV0LmZvY3VzKCk7XG4gICAgICAvLyBhZGQga2V5ZG93biBsaXN0ZW5lciB0byBpbnB1dFxuICAgICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgKGV2ZW50KSA9PiB7XG4gICAgICAgIC8vIGlmIGVzY2FwZSBrZXkgaXMgcHJlc3NlZFxuICAgICAgICBpZiAoZXZlbnQua2V5ID09PSBcIkVzY2FwZVwiKSB7XG4gICAgICAgICAgdGhpcy5jbGVhcl9hdXRvX3NlYXJjaGVyKCk7XG4gICAgICAgICAgLy8gY2xlYXIgdG9wIGJhclxuICAgICAgICAgIHRoaXMuaW5pdGlhdGVfdG9wX2Jhcihjb250YWluZXIsIG5lYXJlc3RfY29udGV4dCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICAvLyBhZGQga2V5dXAgbGlzdGVuZXIgdG8gaW5wdXRcbiAgICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCAoZXZlbnQpID0+IHtcbiAgICAgICAgLy8gaWYgdGhpcy5zZWFyY2hfdGltZW91dCBpcyBub3QgbnVsbCB0aGVuIGNsZWFyIGl0IGFuZCBzZXQgdG8gbnVsbFxuICAgICAgICB0aGlzLmNsZWFyX2F1dG9fc2VhcmNoZXIoKTtcbiAgICAgICAgLy8gZ2V0IHNlYXJjaCB0ZXJtXG4gICAgICAgIGNvbnN0IHNlYXJjaF90ZXJtID0gaW5wdXQudmFsdWU7XG4gICAgICAgIC8vIGlmIGVudGVyIGtleSBpcyBwcmVzc2VkXG4gICAgICAgIGlmIChldmVudC5rZXkgPT09IFwiRW50ZXJcIiAmJiBzZWFyY2hfdGVybSAhPT0gXCJcIikge1xuICAgICAgICAgIHRoaXMuc2VhcmNoKHNlYXJjaF90ZXJtKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBpZiBhbnkgb3RoZXIga2V5IGlzIHByZXNzZWQgYW5kIGlucHV0IGlzIG5vdCBlbXB0eSB0aGVuIHdhaXQgNTAwbXMgYW5kIG1ha2VfY29ubmVjdGlvbnNcbiAgICAgICAgZWxzZSBpZiAoc2VhcmNoX3Rlcm0gIT09IFwiXCIpIHtcbiAgICAgICAgICAvLyBjbGVhciB0aW1lb3V0XG4gICAgICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuc2VhcmNoX3RpbWVvdXQpO1xuICAgICAgICAgIC8vIHNldCB0aW1lb3V0XG4gICAgICAgICAgdGhpcy5zZWFyY2hfdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zZWFyY2goc2VhcmNoX3Rlcm0sIHRydWUpO1xuICAgICAgICAgIH0sIDcwMCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gcmVuZGVyIGJ1dHRvbnM6IFwiY3JlYXRlXCIgYW5kIFwicmV0cnlcIiBmb3IgbG9hZGluZyBlbWJlZGRpbmdzLmpzb24gZmlsZVxuICByZW5kZXJfZW1iZWRkaW5nc19idXR0b25zKCkge1xuICAgIC8vIGdldCBjb250YWluZXIgZWxlbWVudFxuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMuY29udGFpbmVyRWwuY2hpbGRyZW5bMV07XG4gICAgLy8gY2xlYXIgY29udGFpbmVyXG4gICAgY29udGFpbmVyLmVtcHR5KCk7XG4gICAgLy8gY3JlYXRlIGhlYWRpbmcgdGhhdCBzYXlzIFwiRW1iZWRkaW5ncyBmaWxlIG5vdCBmb3VuZFwiXG4gICAgY29udGFpbmVyLmNyZWF0ZUVsKFwiaDJcIiwgeyBjbHM6IFwic2NIZWFkaW5nXCIsIHRleHQ6IFwiRW1iZWRkaW5ncyBmaWxlIG5vdCBmb3VuZFwiIH0pO1xuICAgIC8vIGNyZWF0ZSBkaXYgZm9yIGJ1dHRvbnNcbiAgICBjb25zdCBidXR0b25fZGl2ID0gY29udGFpbmVyLmNyZWF0ZUVsKFwiZGl2XCIsIHsgY2xzOiBcInNjQnV0dG9uRGl2XCIgfSk7XG4gICAgLy8gY3JlYXRlIFwiY3JlYXRlXCIgYnV0dG9uXG4gICAgY29uc3QgY3JlYXRlX2J1dHRvbiA9IGJ1dHRvbl9kaXYuY3JlYXRlRWwoXCJidXR0b25cIiwgeyBjbHM6IFwic2NCdXR0b25cIiwgdGV4dDogXCJDcmVhdGUgZW1iZWRkaW5ncy5qc29uXCIgfSk7XG4gICAgLy8gbm90ZSB0aGF0IGNyZWF0aW5nIGVtYmVkZGluZ3MuanNvbiBmaWxlIHdpbGwgdHJpZ2dlciBidWxrIGVtYmVkZGluZyBhbmQgbWF5IHRha2UgYSB3aGlsZVxuICAgIGJ1dHRvbl9kaXYuY3JlYXRlRWwoXCJwXCIsIHsgY2xzOiBcInNjQnV0dG9uTm90ZVwiLCB0ZXh0OiBcIldhcm5pbmc6IENyZWF0aW5nIGVtYmVkZGluZ3MuanNvbiBmaWxlIHdpbGwgdHJpZ2dlciBidWxrIGVtYmVkZGluZyBhbmQgbWF5IHRha2UgYSB3aGlsZVwiIH0pO1xuICAgIC8vIGNyZWF0ZSBcInJldHJ5XCIgYnV0dG9uXG4gICAgY29uc3QgcmV0cnlfYnV0dG9uID0gYnV0dG9uX2Rpdi5jcmVhdGVFbChcImJ1dHRvblwiLCB7IGNsczogXCJzY0J1dHRvblwiLCB0ZXh0OiBcIlJldHJ5XCIgfSk7XG4gICAgLy8gdHJ5IHRvIGxvYWQgZW1iZWRkaW5ncy5qc29uIGZpbGUgYWdhaW5cbiAgICBidXR0b25fZGl2LmNyZWF0ZUVsKFwicFwiLCB7IGNsczogXCJzY0J1dHRvbk5vdGVcIiwgdGV4dDogXCJJZiBlbWJlZGRpbmdzLmpzb24gZmlsZSBhbHJlYWR5IGV4aXN0cywgY2xpY2sgJ1JldHJ5JyB0byBsb2FkIGl0XCIgfSk7XG5cbiAgICAvLyBhZGQgY2xpY2sgZXZlbnQgdG8gXCJjcmVhdGVcIiBidXR0b25cbiAgICBjcmVhdGVfYnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhc3luYyAoZXZlbnQpID0+IHtcbiAgICAgIC8vIGNyZWF0ZSBlbWJlZGRpbmdzLmpzb24gZmlsZVxuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc21hcnRfdmVjX2xpdGUuaW5pdF9lbWJlZGRpbmdzX2ZpbGUoKTtcbiAgICAgIC8vIHJlbG9hZCB2aWV3XG4gICAgICBhd2FpdCB0aGlzLnJlbmRlcl9jb25uZWN0aW9ucygpO1xuICAgIH0pO1xuXG4gICAgLy8gYWRkIGNsaWNrIGV2ZW50IHRvIFwicmV0cnlcIiBidXR0b25cbiAgICByZXRyeV9idXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGFzeW5jIChldmVudCkgPT4ge1xuICAgICAgY29uc29sZS5sb2coXCJyZXRyeWluZyB0byBsb2FkIGVtYmVkZGluZ3MuanNvbiBmaWxlXCIpO1xuICAgICAgLy8gcmVsb2FkIGVtYmVkZGluZ3MuanNvbiBmaWxlXG4gICAgICBhd2FpdCB0aGlzLnBsdWdpbi5pbml0X3ZlY3MoKTtcbiAgICAgIC8vIHJlbG9hZCB2aWV3XG4gICAgICBhd2FpdCB0aGlzLnJlbmRlcl9jb25uZWN0aW9ucygpO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgb25PcGVuKCkge1xuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRoaXMuY29udGFpbmVyRWwuY2hpbGRyZW5bMV07XG4gICAgY29udGFpbmVyLmVtcHR5KCk7XG4gICAgLy8gcGxhY2Vob2xkZXIgdGV4dFxuICAgIGNvbnRhaW5lci5jcmVhdGVFbChcInBcIiwgeyBjbHM6IFwic2NQbGFjZWhvbGRlclwiLCB0ZXh0OiBcIk9wZW4gYSBub3RlIHRvIGZpbmQgY29ubmVjdGlvbnMuXCIgfSk7IFxuXG4gICAgLy8gcnVucyB3aGVuIGZpbGUgaXMgb3BlbmVkXG4gICAgdGhpcy5wbHVnaW4ucmVnaXN0ZXJFdmVudCh0aGlzLmFwcC53b3Jrc3BhY2Uub24oJ2ZpbGUtb3BlbicsIChmaWxlKSA9PiB7XG4gICAgICAvLyBpZiBubyBmaWxlIGlzIG9wZW4sIHJldHVyblxuICAgICAgaWYoIWZpbGUpIHtcbiAgICAgICAgLy8gY29uc29sZS5sb2coXCJubyBmaWxlIG9wZW4sIHJldHVybmluZ1wiKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgLy8gcmV0dXJuIGlmIGZpbGUgdHlwZSBpcyBub3Qgc3VwcG9ydGVkXG4gICAgICBpZihTVVBQT1JURURfRklMRV9UWVBFUy5pbmRleE9mKGZpbGUuZXh0ZW5zaW9uKSA9PT0gLTEpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0X21lc3NhZ2UoW1xuICAgICAgICAgIFwiRmlsZTogXCIrZmlsZS5uYW1lXG4gICAgICAgICAgLFwiVW5zdXBwb3J0ZWQgZmlsZSB0eXBlIChTdXBwb3J0ZWQ6IFwiK1NVUFBPUlRFRF9GSUxFX1RZUEVTLmpvaW4oXCIsIFwiKStcIilcIlxuICAgICAgICBdKTtcbiAgICAgIH1cbiAgICAgIC8vIHJ1biByZW5kZXJfY29ubmVjdGlvbnMgYWZ0ZXIgMSBzZWNvbmQgdG8gYWxsb3cgZm9yIGZpbGUgdG8gbG9hZFxuICAgICAgaWYodGhpcy5sb2FkX3dhaXQpe1xuICAgICAgICBjbGVhclRpbWVvdXQodGhpcy5sb2FkX3dhaXQpO1xuICAgICAgfVxuICAgICAgdGhpcy5sb2FkX3dhaXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgdGhpcy5yZW5kZXJfY29ubmVjdGlvbnMoZmlsZSk7XG4gICAgICAgIHRoaXMubG9hZF93YWl0ID0gbnVsbDtcbiAgICAgIH0sIDEwMDApO1xuICAgICAgICBcbiAgICB9KSk7XG5cbiAgICB0aGlzLmFwcC53b3Jrc3BhY2UucmVnaXN0ZXJIb3ZlckxpbmtTb3VyY2UoU01BUlRfQ09OTkVDVElPTlNfVklFV19UWVBFLCB7XG4gICAgICAgIGRpc3BsYXk6ICdTbWFydCBDb25uZWN0aW9ucyBGaWxlcycsXG4gICAgICAgIGRlZmF1bHRNb2Q6IHRydWUsXG4gICAgfSk7XG4gICAgdGhpcy5hcHAud29ya3NwYWNlLnJlZ2lzdGVySG92ZXJMaW5rU291cmNlKFNNQVJUX0NPTk5FQ1RJT05TX0NIQVRfVklFV19UWVBFLCB7XG4gICAgICAgIGRpc3BsYXk6ICdTbWFydCBDaGF0IExpbmtzJyxcbiAgICAgICAgZGVmYXVsdE1vZDogdHJ1ZSxcbiAgICB9KTtcblxuICAgIHRoaXMuYXBwLndvcmtzcGFjZS5vbkxheW91dFJlYWR5KHRoaXMuaW5pdGlhbGl6ZS5iaW5kKHRoaXMpKTtcbiAgICBcbiAgfVxuICBcbiAgYXN5bmMgaW5pdGlhbGl6ZSgpIHtcbiAgICB0aGlzLnNldF9tZXNzYWdlKFwiTG9hZGluZyBlbWJlZGRpbmdzIGZpbGUuLi5cIik7XG4gICAgY29uc3QgdmVjc19pbnRpYXRlZCA9IGF3YWl0IHRoaXMucGx1Z2luLmluaXRfdmVjcygpO1xuICAgIGlmKHZlY3NfaW50aWF0ZWQpe1xuICAgICAgdGhpcy5zZXRfbWVzc2FnZShcIkVtYmVkZGluZ3MgZmlsZSBsb2FkZWQuXCIpO1xuICAgICAgYXdhaXQgdGhpcy5yZW5kZXJfY29ubmVjdGlvbnMoKTtcbiAgICB9ZWxzZXtcbiAgICAgIHRoaXMucmVuZGVyX2VtYmVkZGluZ3NfYnV0dG9ucygpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEVYUEVSSU1FTlRBTFxuICAgICAqIC0gd2luZG93LWJhc2VkIEFQSSBhY2Nlc3NcbiAgICAgKiAtIGNvZGUtYmxvY2sgcmVuZGVyaW5nXG4gICAgICovXG4gICAgdGhpcy5hcGkgPSBuZXcgU21hcnRDb25uZWN0aW9uc1ZpZXdBcGkodGhpcy5hcHAsIHRoaXMucGx1Z2luLCB0aGlzKTtcbiAgICAvLyByZWdpc3RlciBBUEkgdG8gZ2xvYmFsIHdpbmRvdyBvYmplY3RcbiAgICAod2luZG93W1wiU21hcnRDb25uZWN0aW9uc1ZpZXdBcGlcIl0gPSB0aGlzLmFwaSkgJiYgdGhpcy5yZWdpc3RlcigoKSA9PiBkZWxldGUgd2luZG93W1wiU21hcnRDb25uZWN0aW9uc1ZpZXdBcGlcIl0pO1xuXG4gIH1cblxuICBhc3luYyBvbkNsb3NlKCkge1xuICAgIGNvbnNvbGUubG9nKFwiY2xvc2luZyBzbWFydCBjb25uZWN0aW9ucyB2aWV3XCIpO1xuICAgIHRoaXMuYXBwLndvcmtzcGFjZS51bnJlZ2lzdGVySG92ZXJMaW5rU291cmNlKFNNQVJUX0NPTk5FQ1RJT05TX1ZJRVdfVFlQRSk7XG4gICAgdGhpcy5wbHVnaW4udmlldyA9IG51bGw7XG4gIH1cblxuICBhc3luYyByZW5kZXJfY29ubmVjdGlvbnMoY29udGV4dD1udWxsKSB7XG4gICAgY29uc29sZS5sb2coXCJyZW5kZXJpbmcgY29ubmVjdGlvbnNcIik7XG4gICAgLy8gaWYgQVBJIGtleSBpcyBub3Qgc2V0IHRoZW4gdXBkYXRlIHZpZXcgbWVzc2FnZVxuICAgIGlmKCF0aGlzLnBsdWdpbi5zZXR0aW5ncy5hcGlfa2V5KSB7XG4gICAgICB0aGlzLnNldF9tZXNzYWdlKFwiQW4gT3BlbkFJIEFQSSBrZXkgaXMgcmVxdWlyZWQgdG8gbWFrZSBTbWFydCBDb25uZWN0aW9uc1wiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYoIXRoaXMucGx1Z2luLmVtYmVkZGluZ3NfbG9hZGVkKXtcbiAgICAgIGF3YWl0IHRoaXMucGx1Z2luLmluaXRfdmVjcygpO1xuICAgIH1cbiAgICAvLyBpZiBlbWJlZGRpbmcgc3RpbGwgbm90IGxvYWRlZCwgcmV0dXJuXG4gICAgaWYoIXRoaXMucGx1Z2luLmVtYmVkZGluZ3NfbG9hZGVkKSB7XG4gICAgICBjb25zb2xlLmxvZyhcImVtYmVkZGluZ3MgZmlsZXMgc3RpbGwgbm90IGxvYWRlZCBvciB5ZXQgdG8gYmUgY3JlYXRlZFwiKTtcbiAgICAgIHRoaXMucmVuZGVyX2VtYmVkZGluZ3NfYnV0dG9ucygpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnNldF9tZXNzYWdlKFwiTWFraW5nIFNtYXJ0IENvbm5lY3Rpb25zLi4uXCIpO1xuICAgIC8qKlxuICAgICAqIEJlZ2luIGhpZ2hsaWdodGVkLXRleHQtbGV2ZWwgc2VhcmNoXG4gICAgICovXG4gICAgaWYodHlwZW9mIGNvbnRleHQgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIGNvbnN0IGhpZ2hsaWdodGVkX3RleHQgPSBjb250ZXh0O1xuICAgICAgLy8gZ2V0IGVtYmVkZGluZyBmb3IgaGlnaGxpZ2h0ZWQgdGV4dFxuICAgICAgYXdhaXQgdGhpcy5zZWFyY2goaGlnaGxpZ2h0ZWRfdGV4dCk7XG4gICAgICByZXR1cm47IC8vIGVuZHMgaGVyZSBpZiBjb250ZXh0IGlzIGEgc3RyaW5nXG4gICAgfVxuXG4gICAgLyoqIFxuICAgICAqIEJlZ2luIGZpbGUtbGV2ZWwgc2VhcmNoXG4gICAgICovICAgIFxuICAgIHRoaXMubmVhcmVzdCA9IG51bGw7XG4gICAgdGhpcy5pbnRlcnZhbF9jb3VudCA9IDA7XG4gICAgdGhpcy5yZW5kZXJpbmcgPSBmYWxzZTtcbiAgICB0aGlzLmZpbGUgPSBjb250ZXh0O1xuICAgIC8vIGlmIHRoaXMuaW50ZXJ2YWwgaXMgc2V0IHRoZW4gY2xlYXIgaXRcbiAgICBpZih0aGlzLmludGVydmFsKSB7XG4gICAgICBjbGVhckludGVydmFsKHRoaXMuaW50ZXJ2YWwpO1xuICAgICAgdGhpcy5pbnRlcnZhbCA9IG51bGw7XG4gICAgfVxuICAgIC8vIHNldCBpbnRlcnZhbCB0byBjaGVjayBpZiBuZWFyZXN0IGlzIHNldFxuICAgIHRoaXMuaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICBpZighdGhpcy5yZW5kZXJpbmcpe1xuICAgICAgICBpZih0aGlzLmZpbGUgaW5zdGFuY2VvZiBPYnNpZGlhbi5URmlsZSkge1xuICAgICAgICAgIHRoaXMucmVuZGVyaW5nID0gdHJ1ZTtcbiAgICAgICAgICB0aGlzLnJlbmRlcl9ub3RlX2Nvbm5lY3Rpb25zKHRoaXMuZmlsZSk7XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgIC8vIGdldCBjdXJyZW50IG5vdGVcbiAgICAgICAgICB0aGlzLmZpbGUgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlRmlsZSgpO1xuICAgICAgICAgIC8vIGlmIHN0aWxsIG5vIGN1cnJlbnQgbm90ZSB0aGVuIHJldHVyblxuICAgICAgICAgIGlmKCF0aGlzLmZpbGUgJiYgdGhpcy5jb3VudCA+IDEpIHtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5pbnRlcnZhbCk7XG4gICAgICAgICAgICB0aGlzLnNldF9tZXNzYWdlKFwiTm8gYWN0aXZlIGZpbGVcIik7XG4gICAgICAgICAgICByZXR1cm47IFxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfWVsc2V7XG4gICAgICAgIGlmKHRoaXMubmVhcmVzdCkge1xuICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5pbnRlcnZhbCk7XG4gICAgICAgICAgLy8gaWYgbmVhcmVzdCBpcyBhIHN0cmluZyB0aGVuIHVwZGF0ZSB2aWV3IG1lc3NhZ2VcbiAgICAgICAgICBpZiAodHlwZW9mIHRoaXMubmVhcmVzdCA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgdGhpcy5zZXRfbWVzc2FnZSh0aGlzLm5lYXJlc3QpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXQgbmVhcmVzdCBjb25uZWN0aW9uc1xuICAgICAgICAgICAgdGhpcy5zZXRfbmVhcmVzdCh0aGlzLm5lYXJlc3QsIFwiRmlsZTogXCIgKyB0aGlzLmZpbGUubmFtZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIGlmIHJlbmRlcl9sb2cuZmFpbGVkX2VtYmVkZGluZ3MgdGhlbiB1cGRhdGUgZmFpbGVkX2VtYmVkZGluZ3MudHh0XG4gICAgICAgICAgaWYgKHRoaXMucGx1Z2luLnJlbmRlcl9sb2cuZmFpbGVkX2VtYmVkZGluZ3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2F2ZV9mYWlsZWRfZW1iZWRkaW5ncygpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBnZXQgb2JqZWN0IGtleXMgb2YgcmVuZGVyX2xvZ1xuICAgICAgICAgIHRoaXMucGx1Z2luLm91dHB1dF9yZW5kZXJfbG9nKCk7XG4gICAgICAgICAgcmV0dXJuOyBcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgdGhpcy5pbnRlcnZhbF9jb3VudCsrO1xuICAgICAgICAgIHRoaXMuc2V0X21lc3NhZ2UoXCJNYWtpbmcgU21hcnQgQ29ubmVjdGlvbnMuLi5cIit0aGlzLmludGVydmFsX2NvdW50KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sIDEwKTtcbiAgfVxuXG4gIGFzeW5jIHJlbmRlcl9ub3RlX2Nvbm5lY3Rpb25zKGZpbGUpIHtcbiAgICB0aGlzLm5lYXJlc3QgPSBhd2FpdCB0aGlzLnBsdWdpbi5maW5kX25vdGVfY29ubmVjdGlvbnMoZmlsZSk7XG4gIH1cblxuICBjbGVhcl9hdXRvX3NlYXJjaGVyKCkge1xuICAgIGlmICh0aGlzLnNlYXJjaF90aW1lb3V0KSB7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5zZWFyY2hfdGltZW91dCk7XG4gICAgICB0aGlzLnNlYXJjaF90aW1lb3V0ID0gbnVsbDtcbiAgICB9XG4gIH1cblxuICBhc3luYyBzZWFyY2goc2VhcmNoX3RleHQsIHJlc3VsdHNfb25seT1mYWxzZSkge1xuICAgIGNvbnN0IG5lYXJlc3QgPSBhd2FpdCB0aGlzLnBsdWdpbi5hcGkuc2VhcmNoKHNlYXJjaF90ZXh0KTtcbiAgICAvLyByZW5kZXIgcmVzdWx0cyBpbiB2aWV3IHdpdGggZmlyc3QgMTAwIGNoYXJhY3RlcnMgb2Ygc2VhcmNoIHRleHRcbiAgICBjb25zdCBuZWFyZXN0X2NvbnRleHQgPSBgU2VsZWN0aW9uOiBcIiR7c2VhcmNoX3RleHQubGVuZ3RoID4gMTAwID8gc2VhcmNoX3RleHQuc3Vic3RyaW5nKDAsIDEwMCkgKyBcIi4uLlwiIDogc2VhcmNoX3RleHR9XCJgO1xuICAgIHRoaXMuc2V0X25lYXJlc3QobmVhcmVzdCwgbmVhcmVzdF9jb250ZXh0LCByZXN1bHRzX29ubHkpO1xuICB9XG5cbn1cbmNsYXNzIFNtYXJ0Q29ubmVjdGlvbnNWaWV3QXBpIHtcbiAgY29uc3RydWN0b3IoYXBwLCBwbHVnaW4sIHZpZXcpIHtcbiAgICB0aGlzLmFwcCA9IGFwcDtcbiAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgICB0aGlzLnZpZXcgPSB2aWV3O1xuICB9XG4gIGFzeW5jIHNlYXJjaCAoc2VhcmNoX3RleHQpIHtcbiAgICByZXR1cm4gYXdhaXQgdGhpcy5wbHVnaW4uYXBpLnNlYXJjaChzZWFyY2hfdGV4dCk7XG4gIH1cbiAgLy8gdHJpZ2dlciByZWxvYWQgb2YgZW1iZWRkaW5ncyBmaWxlXG4gIGFzeW5jIHJlbG9hZF9lbWJlZGRpbmdzX2ZpbGUoKSB7XG4gICAgYXdhaXQgdGhpcy5wbHVnaW4uaW5pdF92ZWNzKCk7XG4gICAgYXdhaXQgdGhpcy52aWV3LnJlbmRlcl9jb25uZWN0aW9ucygpO1xuICB9XG59XG5jbGFzcyBTY1NlYXJjaEFwaSB7XG4gIGNvbnN0cnVjdG9yKGFwcCwgcGx1Z2luKSB7XG4gICAgdGhpcy5hcHAgPSBhcHA7XG4gICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gIH1cbiAgYXN5bmMgc2VhcmNoIChzZWFyY2hfdGV4dCwgZmlsdGVyPXt9KSB7XG4gICAgZmlsdGVyID0ge1xuICAgICAgc2tpcF9zZWN0aW9uczogdGhpcy5wbHVnaW4uc2V0dGluZ3Muc2tpcF9zZWN0aW9ucyxcbiAgICAgIC4uLmZpbHRlclxuICAgIH1cbiAgICBsZXQgbmVhcmVzdCA9IFtdO1xuICAgIGNvbnN0IHJlc3AgPSBhd2FpdCB0aGlzLnBsdWdpbi5yZXF1ZXN0X2VtYmVkZGluZ19mcm9tX2lucHV0KHNlYXJjaF90ZXh0KTtcbiAgICBpZiAocmVzcCAmJiByZXNwLmRhdGEgJiYgcmVzcC5kYXRhWzBdICYmIHJlc3AuZGF0YVswXS5lbWJlZGRpbmcpIHtcbiAgICAgIG5lYXJlc3QgPSB0aGlzLnBsdWdpbi5zbWFydF92ZWNfbGl0ZS5uZWFyZXN0KHJlc3AuZGF0YVswXS5lbWJlZGRpbmcsIGZpbHRlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHJlc3AgaXMgbnVsbCwgdW5kZWZpbmVkLCBvciBtaXNzaW5nIGRhdGFcbiAgICAgIG5ldyBPYnNpZGlhbi5Ob3RpY2UoXCJTbWFydCBDb25uZWN0aW9uczogRXJyb3IgZ2V0dGluZyBlbWJlZGRpbmdcIik7XG4gICAgfVxuICAgIHJldHVybiBuZWFyZXN0O1xuICB9XG59XG5cbmNsYXNzIFNtYXJ0Q29ubmVjdGlvbnNTZXR0aW5nc1RhYiBleHRlbmRzIE9ic2lkaWFuLlBsdWdpblNldHRpbmdUYWIge1xuICBjb25zdHJ1Y3RvcihhcHAsIHBsdWdpbikge1xuICAgIHN1cGVyKGFwcCwgcGx1Z2luKTtcbiAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcbiAgfVxuICBkaXNwbGF5KCkge1xuICAgIGNvbnN0IHtcbiAgICAgIGNvbnRhaW5lckVsXG4gICAgfSA9IHRoaXM7XG4gICAgY29udGFpbmVyRWwuZW1wdHkoKTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImgyXCIsIHtcbiAgICAgIHRleHQ6IFwiU3VwcG9ydGVyIFNldHRpbmdzXCJcbiAgICB9KTtcbiAgICAvLyBsaXN0IHN1cHBvcnRlciBiZW5lZml0c1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICB0ZXh0OiBcIkFzIGEgU21hcnQgQ29ubmVjdGlvbnMgXFxcIlN1cHBvcnRlclxcXCIsIGZhc3QtdHJhY2sgeW91ciBQS00gam91cm5leSB3aXRoIHByaW9yaXR5IHBlcmtzIGFuZCBwaW9uZWVyaW5nIGlubm92YXRpb25zLlwiXG4gICAgfSk7XG4gICAgLy8gdGhyZWUgbGlzdCBpdGVtc1xuICAgIGNvbnN0IHN1cHBvcnRlcl9iZW5lZml0c19saXN0ID0gY29udGFpbmVyRWwuY3JlYXRlRWwoXCJ1bFwiKTtcbiAgICBzdXBwb3J0ZXJfYmVuZWZpdHNfbGlzdC5jcmVhdGVFbChcImxpXCIsIHtcbiAgICAgIHRleHQ6IFwiRW5qb3kgc3dpZnQsIHRvcC1wcmlvcml0eSBzdXBwb3J0LlwiXG4gICAgfSk7XG4gICAgc3VwcG9ydGVyX2JlbmVmaXRzX2xpc3QuY3JlYXRlRWwoXCJsaVwiLCB7XG4gICAgICB0ZXh0OiBcIkdhaW4gZWFybHkgYWNjZXNzIHRvIHZlcnNpb24gMiAoaW5jbHVkZXMgbG9jYWwgZW1iZWRkaW5nIG1vZGVsKS5cIlxuICAgIH0pO1xuICAgIHN1cHBvcnRlcl9iZW5lZml0c19saXN0LmNyZWF0ZUVsKFwibGlcIiwge1xuICAgICAgdGV4dDogXCJTdGF5IGluZm9ybWVkIGFuZCBlbmdhZ2VkIHdpdGggZXhjbHVzaXZlIHN1cHBvcnRlci1vbmx5IGNvbW11bmljYXRpb25zLlwiXG4gICAgfSk7XG4gICAgLy8gYWRkIGEgdGV4dCBpbnB1dCB0byBlbnRlciBzdXBwb3J0ZXIgbGljZW5zZSBrZXlcbiAgICBuZXcgT2JzaWRpYW4uU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZShcIlN1cHBvcnRlciBMaWNlbnNlIEtleVwiKS5zZXREZXNjKFwiTm90ZTogdGhpcyBpcyBub3QgcmVxdWlyZWQgdG8gdXNlIFNtYXJ0IENvbm5lY3Rpb25zLlwiKS5hZGRUZXh0KCh0ZXh0KSA9PiB0ZXh0LnNldFBsYWNlaG9sZGVyKFwiRW50ZXIgeW91ciBsaWNlbnNlX2tleVwiKS5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5saWNlbnNlX2tleSkub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5saWNlbnNlX2tleSA9IHZhbHVlLnRyaW0oKTtcbiAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncyh0cnVlKTtcbiAgICB9KSk7XG4gICAgLy8gYnV0dG9uIFwiZ2V0IHYyXCJcbiAgICBuZXcgT2JzaWRpYW4uU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZShcIkdldCB2MlwiKS5zZXREZXNjKFwiR2V0IHYyICh3YXJuaW5nOiB2ZXJ5IGVhcmx5IGJldGEgcmVsZWFzZSwgbGlrZWx5IHRvIGNyYXNoLCBwbGVhc2Ugc2VuZCBpc3N1ZXMgZGlyZWN0bHkgdG8gdGhlIHN1cHBvcnRlciBlbWFpbCBmb3IgcXVpY2sgcmVzcG9uc2UpXCIpLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiBidXR0b24uc2V0QnV0dG9uVGV4dChcIkdldCB2MiAodW5zdGFibGUpXCIpLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4udXBkYXRlX3RvX3YyKCk7XG4gICAgfSkpO1xuICAgIC8vIGFkZCBidXR0b24gdG8gdHJpZ2dlciBzeW5jIG5vdGVzIHRvIHVzZSB3aXRoIENoYXRHUFRcbiAgICBuZXcgT2JzaWRpYW4uU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZShcIlN5bmMgTm90ZXNcIikuc2V0RGVzYyhcIk1ha2Ugbm90ZXMgYXZhaWxhYmxlIHZpYSB0aGUgU21hcnQgQ29ubmVjdGlvbnMgQ2hhdEdQVCBQbHVnaW4uIFJlc3BlY3RzIGV4Y2x1c2lvbiBzZXR0aW5ncyBjb25maWd1cmVkIGJlbG93LlwiKS5hZGRCdXR0b24oKGJ1dHRvbikgPT4gYnV0dG9uLnNldEJ1dHRvblRleHQoXCJTeW5jIE5vdGVzXCIpLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgLy8gc3luYyBub3Rlc1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc3luY19ub3RlcygpO1xuICAgIH0pKTtcbiAgICAvLyBhZGQgYnV0dG9uIHRvIGJlY29tZSBhIHN1cHBvcnRlclxuICAgIG5ldyBPYnNpZGlhbi5TZXR0aW5nKGNvbnRhaW5lckVsKS5zZXROYW1lKFwiQmVjb21lIGEgU3VwcG9ydGVyXCIpLnNldERlc2MoXCJCZWNvbWUgYSBTdXBwb3J0ZXJcIikuYWRkQnV0dG9uKChidXR0b24pID0+IGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiQmVjb21lIGEgU3VwcG9ydGVyXCIpLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcGF5bWVudF9wYWdlcyA9IFtcbiAgICAgICAgXCJodHRwczovL2J1eS5zdHJpcGUuY29tLzlBUTVrTzVRbmJBV2dHQWJJWVwiLFxuICAgICAgICBcImh0dHBzOi8vYnV5LnN0cmlwZS5jb20vOUFRN3NXZW1UNDh1MUxHY040XCJcbiAgICAgIF07XG4gICAgICBpZighdGhpcy5wbHVnaW4ucGF5bWVudF9wYWdlX2luZGV4KXtcbiAgICAgICAgdGhpcy5wbHVnaW4ucGF5bWVudF9wYWdlX2luZGV4ID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpKTtcbiAgICAgIH1cbiAgICAgIC8vIG9wZW4gc3VwcG9ydGVyIHBhZ2UgaW4gYnJvd3NlclxuICAgICAgd2luZG93Lm9wZW4ocGF5bWVudF9wYWdlc1t0aGlzLnBsdWdpbi5wYXltZW50X3BhZ2VfaW5kZXhdKTtcbiAgICB9KSk7XG5cbiAgICBcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImgyXCIsIHtcbiAgICAgIHRleHQ6IFwiT3BlbkFJIFNldHRpbmdzXCJcbiAgICB9KTtcbiAgICAvLyBhZGQgYSB0ZXh0IGlucHV0IHRvIGVudGVyIHRoZSBBUEkga2V5XG4gICAgbmV3IE9ic2lkaWFuLlNldHRpbmcoY29udGFpbmVyRWwpLnNldE5hbWUoXCJPcGVuQUkgQVBJIEtleVwiKS5zZXREZXNjKFwiUmVxdWlyZWQ6IGFuIE9wZW5BSSBBUEkga2V5IGlzIGN1cnJlbnRseSByZXF1aXJlZCB0byB1c2UgU21hcnQgQ29ubmVjdGlvbnMuXCIpLmFkZFRleHQoKHRleHQpID0+IHRleHQuc2V0UGxhY2Vob2xkZXIoXCJFbnRlciB5b3VyIGFwaV9rZXlcIikuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuYXBpX2tleSkub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5hcGlfa2V5ID0gdmFsdWUudHJpbSgpO1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKHRydWUpO1xuICAgIH0pKTtcbiAgICAvLyBhZGQgYSBidXR0b24gdG8gdGVzdCB0aGUgQVBJIGtleSBpcyB3b3JraW5nXG4gICAgbmV3IE9ic2lkaWFuLlNldHRpbmcoY29udGFpbmVyRWwpLnNldE5hbWUoXCJUZXN0IEFQSSBLZXlcIikuc2V0RGVzYyhcIlRlc3QgQVBJIEtleVwiKS5hZGRCdXR0b24oKGJ1dHRvbikgPT4gYnV0dG9uLnNldEJ1dHRvblRleHQoXCJUZXN0IEFQSSBLZXlcIikub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICAvLyB0ZXN0IEFQSSBrZXlcbiAgICAgIGNvbnN0IHJlc3AgPSBhd2FpdCB0aGlzLnBsdWdpbi50ZXN0X2FwaV9rZXkoKTtcbiAgICAgIGlmKHJlc3ApIHtcbiAgICAgICAgbmV3IE9ic2lkaWFuLk5vdGljZShcIlNtYXJ0IENvbm5lY3Rpb25zOiBBUEkga2V5IGlzIHZhbGlkXCIpO1xuICAgICAgfWVsc2V7XG4gICAgICAgIG5ldyBPYnNpZGlhbi5Ob3RpY2UoXCJTbWFydCBDb25uZWN0aW9uczogQVBJIGtleSBpcyBub3Qgd29ya2luZyBhcyBleHBlY3RlZCFcIik7XG4gICAgICB9XG4gICAgfSkpO1xuICAgIC8vIGFkZCBkcm9wZG93biB0byBzZWxlY3QgdGhlIG1vZGVsXG4gICAgbmV3IE9ic2lkaWFuLlNldHRpbmcoY29udGFpbmVyRWwpLnNldE5hbWUoXCJTbWFydCBDaGF0IE1vZGVsXCIpLnNldERlc2MoXCJTZWxlY3QgYSBtb2RlbCB0byB1c2Ugd2l0aCBTbWFydCBDaGF0LlwiKS5hZGREcm9wZG93bigoZHJvcGRvd24pID0+IHtcbiAgICAgIGRyb3Bkb3duLmFkZE9wdGlvbihcImdwdC0zLjUtdHVyYm8tMTZrXCIsIFwiZ3B0LTMuNS10dXJiby0xNmtcIik7XG4gICAgICBkcm9wZG93bi5hZGRPcHRpb24oXCJncHQtNFwiLCBcImdwdC00IChsaW1pdGVkIGFjY2VzcywgOGspXCIpO1xuICAgICAgZHJvcGRvd24uYWRkT3B0aW9uKFwiZ3B0LTMuNS10dXJib1wiLCBcImdwdC0zLjUtdHVyYm8gKDRrKVwiKTtcbiAgICAgIGRyb3Bkb3duLmFkZE9wdGlvbihcImdwdC00LTExMDYtcHJldmlld1wiLCBcImdwdC00LXR1cmJvICgxMjhrKVwiKTtcbiAgICAgIGRyb3Bkb3duLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5zbWFydF9jaGF0X21vZGVsID0gdmFsdWU7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgfSk7XG4gICAgICBkcm9wZG93bi5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5zbWFydF9jaGF0X21vZGVsKTtcbiAgICB9KTtcbiAgICAvLyBsYW5ndWFnZVxuICAgIG5ldyBPYnNpZGlhbi5TZXR0aW5nKGNvbnRhaW5lckVsKS5zZXROYW1lKFwiRGVmYXVsdCBMYW5ndWFnZVwiKS5zZXREZXNjKFwiRGVmYXVsdCBsYW5ndWFnZSB0byB1c2UgZm9yIFNtYXJ0IENoYXQuIENoYW5nZXMgd2hpY2ggc2VsZi1yZWZlcmVudGlhbCBwcm9ub3VucyB3aWxsIHRyaWdnZXIgbG9va3VwIG9mIHlvdXIgbm90ZXMuXCIpLmFkZERyb3Bkb3duKChkcm9wZG93bikgPT4ge1xuICAgICAgLy8gZ2V0IE9iamVjdCBrZXlzIGZyb20gcHJvbm91c1xuICAgICAgY29uc3QgbGFuZ3VhZ2VzID0gT2JqZWN0LmtleXMoU01BUlRfVFJBTlNMQVRJT04pO1xuICAgICAgZm9yKGxldCBpID0gMDsgaSA8IGxhbmd1YWdlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBkcm9wZG93bi5hZGRPcHRpb24obGFuZ3VhZ2VzW2ldLCBsYW5ndWFnZXNbaV0pO1xuICAgICAgfVxuICAgICAgZHJvcGRvd24ub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmxhbmd1YWdlID0gdmFsdWU7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgICAgICBzZWxmX3JlZl9wcm9ub3Vuc19saXN0LnNldFRleHQodGhpcy5nZXRfc2VsZl9yZWZfbGlzdCgpKTtcbiAgICAgICAgLy8gaWYgY2hhdCB2aWV3IGlzIG9wZW4gdGhlbiBydW4gbmV3X2NoYXQoKVxuICAgICAgICBjb25zdCBjaGF0X3ZpZXcgPSB0aGlzLmFwcC53b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKFNNQVJUX0NPTk5FQ1RJT05TX0NIQVRfVklFV19UWVBFKS5sZW5ndGggPiAwID8gdGhpcy5hcHAud29ya3NwYWNlLmdldExlYXZlc09mVHlwZShTTUFSVF9DT05ORUNUSU9OU19DSEFUX1ZJRVdfVFlQRSlbMF0udmlldyA6IG51bGw7XG4gICAgICAgIGlmKGNoYXRfdmlldykge1xuICAgICAgICAgIGNoYXRfdmlldy5uZXdfY2hhdCgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGRyb3Bkb3duLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmxhbmd1YWdlKTtcbiAgICB9KTtcbiAgICAvLyBsaXN0IGN1cnJlbnQgc2VsZi1yZWZlcmVudGlhbCBwcm9ub3Vuc1xuICAgIGNvbnN0IHNlbGZfcmVmX3Byb25vdW5zX2xpc3QgPSBjb250YWluZXJFbC5jcmVhdGVFbChcInNwYW5cIiwge1xuICAgICAgdGV4dDogdGhpcy5nZXRfc2VsZl9yZWZfbGlzdCgpXG4gICAgfSk7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoMlwiLCB7XG4gICAgICB0ZXh0OiBcIkV4Y2x1c2lvbnNcIlxuICAgIH0pO1xuICAgIC8vIGxpc3QgZmlsZSBleGNsdXNpb25zXG4gICAgbmV3IE9ic2lkaWFuLlNldHRpbmcoY29udGFpbmVyRWwpLnNldE5hbWUoXCJmaWxlX2V4Y2x1c2lvbnNcIikuc2V0RGVzYyhcIidFeGNsdWRlZCBmaWxlJyBtYXRjaGVycyBzZXBhcmF0ZWQgYnkgYSBjb21tYS5cIikuYWRkVGV4dCgodGV4dCkgPT4gdGV4dC5zZXRQbGFjZWhvbGRlcihcImRyYXdpbmdzLHByb21wdHMvbG9nc1wiKS5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5maWxlX2V4Y2x1c2lvbnMpLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZmlsZV9leGNsdXNpb25zID0gdmFsdWU7XG4gICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICB9KSk7XG4gICAgLy8gbGlzdCBmb2xkZXIgZXhjbHVzaW9uc1xuICAgIG5ldyBPYnNpZGlhbi5TZXR0aW5nKGNvbnRhaW5lckVsKS5zZXROYW1lKFwiZm9sZGVyX2V4Y2x1c2lvbnNcIikuc2V0RGVzYyhcIidFeGNsdWRlZCBmb2xkZXInIG1hdGNoZXJzIHNlcGFyYXRlZCBieSBhIGNvbW1hLlwiKS5hZGRUZXh0KCh0ZXh0KSA9PiB0ZXh0LnNldFBsYWNlaG9sZGVyKFwiZHJhd2luZ3MscHJvbXB0cy9sb2dzXCIpLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmZvbGRlcl9leGNsdXNpb25zKS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmZvbGRlcl9leGNsdXNpb25zID0gdmFsdWU7XG4gICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcbiAgICB9KSk7XG4gICAgLy8gbGlzdCBwYXRoIG9ubHkgbWF0Y2hlcnNcbiAgICBuZXcgT2JzaWRpYW4uU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZShcInBhdGhfb25seVwiKS5zZXREZXNjKFwiJ1BhdGggb25seScgbWF0Y2hlcnMgc2VwYXJhdGVkIGJ5IGEgY29tbWEuXCIpLmFkZFRleHQoKHRleHQpID0+IHRleHQuc2V0UGxhY2Vob2xkZXIoXCJkcmF3aW5ncyxwcm9tcHRzL2xvZ3NcIikuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MucGF0aF9vbmx5KS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnBhdGhfb25seSA9IHZhbHVlO1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgfSkpO1xuICAgIC8vIGxpc3QgaGVhZGVyIGV4Y2x1c2lvbnNcbiAgICBuZXcgT2JzaWRpYW4uU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZShcImhlYWRlcl9leGNsdXNpb25zXCIpLnNldERlc2MoXCInRXhjbHVkZWQgaGVhZGVyJyBtYXRjaGVycyBzZXBhcmF0ZWQgYnkgYSBjb21tYS4gV29ya3MgZm9yICdibG9ja3MnIG9ubHkuXCIpLmFkZFRleHQoKHRleHQpID0+IHRleHQuc2V0UGxhY2Vob2xkZXIoXCJkcmF3aW5ncyxwcm9tcHRzL2xvZ3NcIikuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuaGVhZGVyX2V4Y2x1c2lvbnMpLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuaGVhZGVyX2V4Y2x1c2lvbnMgPSB2YWx1ZTtcbiAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xuICAgIH0pKTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImgyXCIsIHtcbiAgICAgIHRleHQ6IFwiRGlzcGxheVwiXG4gICAgfSk7XG4gICAgLy8gdG9nZ2xlIHNob3dpbmcgZnVsbCBwYXRoIGluIHZpZXdcbiAgICBuZXcgT2JzaWRpYW4uU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZShcInNob3dfZnVsbF9wYXRoXCIpLnNldERlc2MoXCJTaG93IGZ1bGwgcGF0aCBpbiB2aWV3LlwiKS5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4gdG9nZ2xlLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLnNob3dfZnVsbF9wYXRoKS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnNob3dfZnVsbF9wYXRoID0gdmFsdWU7XG4gICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3ModHJ1ZSk7XG4gICAgfSkpO1xuICAgIC8vIHRvZ2dsZSBleHBhbmRlZCB2aWV3IGJ5IGRlZmF1bHRcbiAgICBuZXcgT2JzaWRpYW4uU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZShcImV4cGFuZGVkX3ZpZXdcIikuc2V0RGVzYyhcIkV4cGFuZGVkIHZpZXcgYnkgZGVmYXVsdC5cIikuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHRvZ2dsZS5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5leHBhbmRlZF92aWV3KS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmV4cGFuZGVkX3ZpZXcgPSB2YWx1ZTtcbiAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncyh0cnVlKTtcbiAgICB9KSk7XG4gICAgLy8gdG9nZ2xlIGdyb3VwIG5lYXJlc3QgYnkgZmlsZVxuICAgIG5ldyBPYnNpZGlhbi5TZXR0aW5nKGNvbnRhaW5lckVsKS5zZXROYW1lKFwiZ3JvdXBfbmVhcmVzdF9ieV9maWxlXCIpLnNldERlc2MoXCJHcm91cCBuZWFyZXN0IGJ5IGZpbGUuXCIpLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB0b2dnbGUuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZ3JvdXBfbmVhcmVzdF9ieV9maWxlKS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmdyb3VwX25lYXJlc3RfYnlfZmlsZSA9IHZhbHVlO1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKHRydWUpO1xuICAgIH0pKTtcbiAgICAvLyB0b2dnbGUgdmlld19vcGVuIG9uIE9ic2lkaWFuIHN0YXJ0dXBcbiAgICBuZXcgT2JzaWRpYW4uU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZShcInZpZXdfb3BlblwiKS5zZXREZXNjKFwiT3BlbiB2aWV3IG9uIE9ic2lkaWFuIHN0YXJ0dXAuXCIpLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB0b2dnbGUuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3Mudmlld19vcGVuKS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnZpZXdfb3BlbiA9IHZhbHVlO1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKHRydWUpO1xuICAgIH0pKTtcbiAgICAvLyB0b2dnbGUgY2hhdF9vcGVuIG9uIE9ic2lkaWFuIHN0YXJ0dXBcbiAgICBuZXcgT2JzaWRpYW4uU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZShcImNoYXRfb3BlblwiKS5zZXREZXNjKFwiT3BlbiB2aWV3IG9uIE9ic2lkaWFuIHN0YXJ0dXAuXCIpLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB0b2dnbGUuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuY2hhdF9vcGVuKS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmNoYXRfb3BlbiA9IHZhbHVlO1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKHRydWUpO1xuICAgIH0pKTtcbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImgyXCIsIHtcbiAgICAgIHRleHQ6IFwiQWR2YW5jZWRcIlxuICAgIH0pO1xuICAgIC8vIHRvZ2dsZSBsb2dfcmVuZGVyXG4gICAgbmV3IE9ic2lkaWFuLlNldHRpbmcoY29udGFpbmVyRWwpLnNldE5hbWUoXCJsb2dfcmVuZGVyXCIpLnNldERlc2MoXCJMb2cgcmVuZGVyIGRldGFpbHMgdG8gY29uc29sZSAoaW5jbHVkZXMgdG9rZW5fdXNhZ2UpLlwiKS5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4gdG9nZ2xlLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmxvZ19yZW5kZXIpLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MubG9nX3JlbmRlciA9IHZhbHVlO1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKHRydWUpO1xuICAgIH0pKTtcbiAgICAvLyB0b2dnbGUgZmlsZXMgaW4gbG9nX3JlbmRlclxuICAgIG5ldyBPYnNpZGlhbi5TZXR0aW5nKGNvbnRhaW5lckVsKS5zZXROYW1lKFwibG9nX3JlbmRlcl9maWxlc1wiKS5zZXREZXNjKFwiTG9nIGVtYmVkZGVkIG9iamVjdHMgcGF0aHMgd2l0aCBsb2cgcmVuZGVyIChmb3IgZGVidWdnaW5nKS5cIikuYWRkVG9nZ2xlKCh0b2dnbGUpID0+IHRvZ2dsZS5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5sb2dfcmVuZGVyX2ZpbGVzKS5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcbiAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmxvZ19yZW5kZXJfZmlsZXMgPSB2YWx1ZTtcbiAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncyh0cnVlKTtcbiAgICB9KSk7XG4gICAgLy8gdG9nZ2xlIHNraXBfc2VjdGlvbnNcbiAgICBuZXcgT2JzaWRpYW4uU2V0dGluZyhjb250YWluZXJFbCkuc2V0TmFtZShcInNraXBfc2VjdGlvbnNcIikuc2V0RGVzYyhcIlNraXBzIG1ha2luZyBjb25uZWN0aW9ucyB0byBzcGVjaWZpYyBzZWN0aW9ucyB3aXRoaW4gbm90ZXMuIFdhcm5pbmc6IHJlZHVjZXMgdXNlZnVsbmVzcyBmb3IgbGFyZ2UgZmlsZXMgYW5kIHJlcXVpcmVzICdGb3JjZSBSZWZyZXNoJyBmb3Igc2VjdGlvbnMgdG8gd29yayBpbiB0aGUgZnV0dXJlLlwiKS5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4gdG9nZ2xlLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLnNraXBfc2VjdGlvbnMpLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3Muc2tpcF9zZWN0aW9ucyA9IHZhbHVlO1xuICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKHRydWUpO1xuICAgIH0pKTtcbiAgICAvLyB0ZXN0IGZpbGUgd3JpdGluZyBieSBjcmVhdGluZyBhIHRlc3QgZmlsZSwgdGhlbiB3cml0aW5nIGFkZGl0aW9uYWwgZGF0YSB0byB0aGUgZmlsZSwgYW5kIHJldHVybmluZyBhbnkgZXJyb3IgdGV4dCBpZiBpdCBmYWlsc1xuICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDNcIiwge1xuICAgICAgdGV4dDogXCJUZXN0IEZpbGUgV3JpdGluZ1wiXG4gICAgfSk7XG4gICAgLy8gbWFudWFsIHNhdmUgYnV0dG9uXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoM1wiLCB7XG4gICAgICB0ZXh0OiBcIk1hbnVhbCBTYXZlXCJcbiAgICB9KTtcbiAgICBsZXQgbWFudWFsX3NhdmVfcmVzdWx0cyA9IGNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiZGl2XCIpO1xuICAgIG5ldyBPYnNpZGlhbi5TZXR0aW5nKGNvbnRhaW5lckVsKS5zZXROYW1lKFwibWFudWFsX3NhdmVcIikuc2V0RGVzYyhcIlNhdmUgY3VycmVudCBlbWJlZGRpbmdzXCIpLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiBidXR0b24uc2V0QnV0dG9uVGV4dChcIk1hbnVhbCBTYXZlXCIpLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgLy8gY29uZmlybVxuICAgICAgaWYgKGNvbmZpcm0oXCJBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gc2F2ZSB5b3VyIGN1cnJlbnQgZW1iZWRkaW5ncz9cIikpIHtcbiAgICAgICAgLy8gc2F2ZVxuICAgICAgICB0cnl7XG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZV9lbWJlZGRpbmdzX3RvX2ZpbGUodHJ1ZSk7XG4gICAgICAgICAgbWFudWFsX3NhdmVfcmVzdWx0cy5pbm5lckhUTUwgPSBcIkVtYmVkZGluZ3Mgc2F2ZWQgc3VjY2Vzc2Z1bGx5LlwiO1xuICAgICAgICB9Y2F0Y2goZSl7XG4gICAgICAgICAgbWFudWFsX3NhdmVfcmVzdWx0cy5pbm5lckhUTUwgPSBcIkVtYmVkZGluZ3MgZmFpbGVkIHRvIHNhdmUuIEVycm9yOiBcIiArIGU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KSk7XG5cbiAgICAvLyBsaXN0IHByZXZpb3VzbHkgZmFpbGVkIGZpbGVzXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoM1wiLCB7XG4gICAgICB0ZXh0OiBcIlByZXZpb3VzbHkgZmFpbGVkIGZpbGVzXCJcbiAgICB9KTtcbiAgICBsZXQgZmFpbGVkX2xpc3QgPSBjb250YWluZXJFbC5jcmVhdGVFbChcImRpdlwiKTtcbiAgICB0aGlzLmRyYXdfZmFpbGVkX2ZpbGVzX2xpc3QoZmFpbGVkX2xpc3QpO1xuXG4gICAgLy8gZm9yY2UgcmVmcmVzaCBidXR0b25cbiAgICBjb250YWluZXJFbC5jcmVhdGVFbChcImgzXCIsIHtcbiAgICAgIHRleHQ6IFwiRm9yY2UgUmVmcmVzaFwiXG4gICAgfSk7XG4gICAgbmV3IE9ic2lkaWFuLlNldHRpbmcoY29udGFpbmVyRWwpLnNldE5hbWUoXCJmb3JjZV9yZWZyZXNoXCIpLnNldERlc2MoXCJXQVJOSU5HOiBETyBOT1QgdXNlIHVubGVzcyB5b3Uga25vdyB3aGF0IHlvdSBhcmUgZG9pbmchIFRoaXMgd2lsbCBkZWxldGUgYWxsIG9mIHlvdXIgY3VycmVudCBlbWJlZGRpbmdzIGZyb20gT3BlbkFJIGFuZCB0cmlnZ2VyIHJlcHJvY2Vzc2luZyBvZiB5b3VyIGVudGlyZSB2YXVsdCFcIikuYWRkQnV0dG9uKChidXR0b24pID0+IGJ1dHRvbi5zZXRCdXR0b25UZXh0KFwiRm9yY2UgUmVmcmVzaFwiKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgIC8vIGNvbmZpcm1cbiAgICAgIGlmIChjb25maXJtKFwiQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIEZvcmNlIFJlZnJlc2g/IEJ5IGNsaWNraW5nIHllcyB5b3UgY29uZmlybSB0aGF0IHlvdSB1bmRlcnN0YW5kIHRoZSBjb25zZXF1ZW5jZXMgb2YgdGhpcyBhY3Rpb24uXCIpKSB7XG4gICAgICAgIC8vIGZvcmNlIHJlZnJlc2hcbiAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uZm9yY2VfcmVmcmVzaF9lbWJlZGRpbmdzX2ZpbGUoKTtcbiAgICAgIH1cbiAgICB9KSk7XG5cbiAgfVxuICBnZXRfc2VsZl9yZWZfbGlzdCgpIHtcbiAgICByZXR1cm4gXCJDdXJyZW50OiBcIiArIFNNQVJUX1RSQU5TTEFUSU9OW3RoaXMucGx1Z2luLnNldHRpbmdzLmxhbmd1YWdlXS5wcm9ub3VzLmpvaW4oXCIsIFwiKTtcbiAgfVxuXG4gIGRyYXdfZmFpbGVkX2ZpbGVzX2xpc3QoZmFpbGVkX2xpc3QpIHtcbiAgICBmYWlsZWRfbGlzdC5lbXB0eSgpO1xuICAgIGlmKHRoaXMucGx1Z2luLnNldHRpbmdzLmZhaWxlZF9maWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyBhZGQgbWVzc2FnZSB0aGF0IHRoZXNlIGZpbGVzIHdpbGwgYmUgc2tpcHBlZCB1bnRpbCBtYW51YWxseSByZXRyaWVkXG4gICAgICBmYWlsZWRfbGlzdC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgICB0ZXh0OiBcIlRoZSBmb2xsb3dpbmcgZmlsZXMgZmFpbGVkIHRvIHByb2Nlc3MgYW5kIHdpbGwgYmUgc2tpcHBlZCB1bnRpbCBtYW51YWxseSByZXRyaWVkLlwiXG4gICAgICB9KTtcbiAgICAgIGxldCBsaXN0ID0gZmFpbGVkX2xpc3QuY3JlYXRlRWwoXCJ1bFwiKTtcbiAgICAgIGZvciAobGV0IGZhaWxlZF9maWxlIG9mIHRoaXMucGx1Z2luLnNldHRpbmdzLmZhaWxlZF9maWxlcykge1xuICAgICAgICBsaXN0LmNyZWF0ZUVsKFwibGlcIiwge1xuICAgICAgICAgIHRleHQ6IGZhaWxlZF9maWxlXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgLy8gYWRkIGJ1dHRvbiB0byByZXRyeSBmYWlsZWQgZmlsZXMgb25seVxuICAgICAgbmV3IE9ic2lkaWFuLlNldHRpbmcoZmFpbGVkX2xpc3QpLnNldE5hbWUoXCJyZXRyeV9mYWlsZWRfZmlsZXNcIikuc2V0RGVzYyhcIlJldHJ5IGZhaWxlZCBmaWxlcyBvbmx5XCIpLmFkZEJ1dHRvbigoYnV0dG9uKSA9PiBidXR0b24uc2V0QnV0dG9uVGV4dChcIlJldHJ5IGZhaWxlZCBmaWxlcyBvbmx5XCIpLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgICAvLyBjbGVhciBmYWlsZWRfbGlzdCBlbGVtZW50XG4gICAgICAgIGZhaWxlZF9saXN0LmVtcHR5KCk7XG4gICAgICAgIC8vIHNldCBcInJldHJ5aW5nXCIgdGV4dFxuICAgICAgICBmYWlsZWRfbGlzdC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgICAgIHRleHQ6IFwiUmV0cnlpbmcgZmFpbGVkIGZpbGVzLi4uXCJcbiAgICAgICAgfSk7XG4gICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnJldHJ5X2ZhaWxlZF9maWxlcygpO1xuICAgICAgICAvLyByZWRyYXcgZmFpbGVkIGZpbGVzIGxpc3RcbiAgICAgICAgdGhpcy5kcmF3X2ZhaWxlZF9maWxlc19saXN0KGZhaWxlZF9saXN0KTtcbiAgICAgIH0pKTtcbiAgICB9ZWxzZXtcbiAgICAgIGZhaWxlZF9saXN0LmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICAgIHRleHQ6IFwiTm8gZmFpbGVkIGZpbGVzXCJcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBsaW5lX2lzX2hlYWRpbmcobGluZSkge1xuICByZXR1cm4gKGxpbmUuaW5kZXhPZihcIiNcIikgPT09IDApICYmIChbJyMnLCAnICddLmluZGV4T2YobGluZVsxXSkgIT09IC0xKTtcbn1cblxuY29uc3QgU01BUlRfQ09OTkVDVElPTlNfQ0hBVF9WSUVXX1RZUEUgPSBcInNtYXJ0LWNvbm5lY3Rpb25zLWNoYXQtdmlld1wiO1xuXG5jbGFzcyBTbWFydENvbm5lY3Rpb25zQ2hhdFZpZXcgZXh0ZW5kcyBPYnNpZGlhbi5JdGVtVmlldyB7XG4gIGNvbnN0cnVjdG9yKGxlYWYsIHBsdWdpbikge1xuICAgIHN1cGVyKGxlYWYpO1xuICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xuICAgIHRoaXMuYWN0aXZlX2VsbSA9IG51bGw7XG4gICAgdGhpcy5hY3RpdmVfc3RyZWFtID0gbnVsbDtcbiAgICB0aGlzLmJyYWNrZXRzX2N0ID0gMDtcbiAgICB0aGlzLmNoYXQgPSBudWxsO1xuICAgIHRoaXMuY2hhdF9ib3ggPSBudWxsO1xuICAgIHRoaXMuY2hhdF9jb250YWluZXIgPSBudWxsO1xuICAgIHRoaXMuY3VycmVudF9jaGF0X21sID0gW107XG4gICAgdGhpcy5maWxlcyA9IFtdO1xuICAgIHRoaXMubGFzdF9mcm9tID0gbnVsbDtcbiAgICB0aGlzLm1lc3NhZ2VfY29udGFpbmVyID0gbnVsbDtcbiAgICB0aGlzLnByZXZlbnRfaW5wdXQgPSBmYWxzZTtcbiAgfVxuICBnZXREaXNwbGF5VGV4dCgpIHtcbiAgICByZXR1cm4gXCJTbWFydCBDb25uZWN0aW9ucyBDaGF0XCI7XG4gIH1cbiAgZ2V0SWNvbigpIHtcbiAgICByZXR1cm4gXCJtZXNzYWdlLXNxdWFyZVwiO1xuICB9XG4gIGdldFZpZXdUeXBlKCkge1xuICAgIHJldHVybiBTTUFSVF9DT05ORUNUSU9OU19DSEFUX1ZJRVdfVFlQRTtcbiAgfVxuICBvbk9wZW4oKSB7XG4gICAgdGhpcy5uZXdfY2hhdCgpO1xuICAgIHRoaXMucGx1Z2luLmdldF9hbGxfZm9sZGVycygpOyAvLyBzZXRzIHRoaXMucGx1Z2luLmZvbGRlcnMgbmVjZXNzYXJ5IGZvciBmb2xkZXItY29udGV4dFxuICB9XG4gIG9uQ2xvc2UoKSB7XG4gICAgdGhpcy5jaGF0LnNhdmVfY2hhdCgpO1xuICAgIHRoaXMuYXBwLndvcmtzcGFjZS51bnJlZ2lzdGVySG92ZXJMaW5rU291cmNlKFNNQVJUX0NPTk5FQ1RJT05TX0NIQVRfVklFV19UWVBFKTtcbiAgfVxuICByZW5kZXJfY2hhdCgpIHtcbiAgICB0aGlzLmNvbnRhaW5lckVsLmVtcHR5KCk7XG4gICAgdGhpcy5jaGF0X2NvbnRhaW5lciA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KFwic2MtY2hhdC1jb250YWluZXJcIik7XG4gICAgLy8gcmVuZGVyIHBsdXMgc2lnbiBmb3IgY2xlYXIgYnV0dG9uXG4gICAgdGhpcy5yZW5kZXJfdG9wX2JhcigpO1xuICAgIC8vIHJlbmRlciBjaGF0IG1lc3NhZ2VzIGNvbnRhaW5lclxuICAgIHRoaXMucmVuZGVyX2NoYXRfYm94KCk7XG4gICAgLy8gcmVuZGVyIGNoYXQgaW5wdXRcbiAgICB0aGlzLnJlbmRlcl9jaGF0X2lucHV0KCk7XG4gICAgdGhpcy5wbHVnaW4ucmVuZGVyX2JyYW5kKHRoaXMuY29udGFpbmVyRWwsIFwiY2hhdFwiKTtcbiAgfVxuICAvLyByZW5kZXIgcGx1cyBzaWduIGZvciBjbGVhciBidXR0b25cbiAgcmVuZGVyX3RvcF9iYXIoKSB7XG4gICAgLy8gY3JlYXRlIGNvbnRhaW5lciBmb3IgY2xlYXIgYnV0dG9uXG4gICAgbGV0IHRvcF9iYXJfY29udGFpbmVyID0gdGhpcy5jaGF0X2NvbnRhaW5lci5jcmVhdGVEaXYoXCJzYy10b3AtYmFyLWNvbnRhaW5lclwiKTtcbiAgICAvLyByZW5kZXIgdGhlIG5hbWUgb2YgdGhlIGNoYXQgaW4gYW4gaW5wdXQgYm94IChwb3AgY29udGVudCBhZnRlciBsYXN0IGh5cGhlbiBpbiBjaGF0X2lkKVxuICAgIGxldCBjaGF0X25hbWUgPXRoaXMuY2hhdC5uYW1lKCk7XG4gICAgbGV0IGNoYXRfbmFtZV9pbnB1dCA9IHRvcF9iYXJfY29udGFpbmVyLmNyZWF0ZUVsKFwiaW5wdXRcIiwge1xuICAgICAgYXR0cjoge1xuICAgICAgICB0eXBlOiBcInRleHRcIixcbiAgICAgICAgdmFsdWU6IGNoYXRfbmFtZVxuICAgICAgfSxcbiAgICAgIGNsczogXCJzYy1jaGF0LW5hbWUtaW5wdXRcIlxuICAgIH0pO1xuICAgIGNoYXRfbmFtZV9pbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIHRoaXMucmVuYW1lX2NoYXQuYmluZCh0aGlzKSk7XG4gICAgXG4gICAgLy8gY3JlYXRlIGJ1dHRvbiB0byBTbWFydCBWaWV3XG4gICAgbGV0IHNtYXJ0X3ZpZXdfYnRuID0gdGhpcy5jcmVhdGVfdG9wX2Jhcl9idXR0b24odG9wX2Jhcl9jb250YWluZXIsIFwiU21hcnQgVmlld1wiLCBcInNtYXJ0LWNvbm5lY3Rpb25zXCIpO1xuICAgIHNtYXJ0X3ZpZXdfYnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCB0aGlzLm9wZW5fc21hcnRfdmlldy5iaW5kKHRoaXMpKTtcbiAgICAvLyBjcmVhdGUgYnV0dG9uIHRvIHNhdmUgY2hhdFxuICAgIGxldCBzYXZlX2J0biA9IHRoaXMuY3JlYXRlX3RvcF9iYXJfYnV0dG9uKHRvcF9iYXJfY29udGFpbmVyLCBcIlNhdmUgQ2hhdFwiLCBcInNhdmVcIik7XG4gICAgc2F2ZV9idG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHRoaXMuc2F2ZV9jaGF0LmJpbmQodGhpcykpO1xuICAgIC8vIGNyZWF0ZSBidXR0b24gdG8gb3BlbiBjaGF0IGhpc3RvcnkgbW9kYWxcbiAgICBsZXQgaGlzdG9yeV9idG4gPSB0aGlzLmNyZWF0ZV90b3BfYmFyX2J1dHRvbih0b3BfYmFyX2NvbnRhaW5lciwgXCJDaGF0IEhpc3RvcnlcIiwgXCJoaXN0b3J5XCIpO1xuICAgIGhpc3RvcnlfYnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCB0aGlzLm9wZW5fY2hhdF9oaXN0b3J5LmJpbmQodGhpcykpO1xuICAgIC8vIGNyZWF0ZSBidXR0b24gdG8gc3RhcnQgbmV3IGNoYXRcbiAgICBjb25zdCBuZXdfY2hhdF9idG4gPSB0aGlzLmNyZWF0ZV90b3BfYmFyX2J1dHRvbih0b3BfYmFyX2NvbnRhaW5lciwgXCJOZXcgQ2hhdFwiLCBcInBsdXNcIik7XG4gICAgbmV3X2NoYXRfYnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCB0aGlzLm5ld19jaGF0LmJpbmQodGhpcykpO1xuICB9XG4gIGFzeW5jIG9wZW5fY2hhdF9oaXN0b3J5KCkge1xuICAgIGNvbnN0IGZvbGRlciA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIubGlzdChcIi5zbWFydC1jb25uZWN0aW9ucy9jaGF0c1wiKTtcbiAgICB0aGlzLmZpbGVzID0gZm9sZGVyLmZpbGVzLm1hcCgoZmlsZSkgPT4ge1xuICAgICAgcmV0dXJuIGZpbGUucmVwbGFjZShcIi5zbWFydC1jb25uZWN0aW9ucy9jaGF0cy9cIiwgXCJcIikucmVwbGFjZShcIi5qc29uXCIsIFwiXCIpO1xuICAgIH0pO1xuICAgIC8vIG9wZW4gY2hhdCBoaXN0b3J5IG1vZGFsXG4gICAgaWYgKCF0aGlzLm1vZGFsKVxuICAgICAgdGhpcy5tb2RhbCA9IG5ldyBTbWFydENvbm5lY3Rpb25zQ2hhdEhpc3RvcnlNb2RhbCh0aGlzLmFwcCwgdGhpcyk7XG4gICAgdGhpcy5tb2RhbC5vcGVuKCk7XG4gIH1cblxuICBjcmVhdGVfdG9wX2Jhcl9idXR0b24odG9wX2Jhcl9jb250YWluZXIsIHRpdGxlLCBpY29uPW51bGwpIHtcbiAgICBsZXQgYnRuID0gdG9wX2Jhcl9jb250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xuICAgICAgYXR0cjoge1xuICAgICAgICB0aXRsZTogdGl0bGVcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZihpY29uKXtcbiAgICAgIE9ic2lkaWFuLnNldEljb24oYnRuLCBpY29uKTtcbiAgICB9ZWxzZXtcbiAgICAgIGJ0bi5pbm5lckhUTUwgPSB0aXRsZTtcbiAgICB9XG4gICAgcmV0dXJuIGJ0bjtcbiAgfVxuICAvLyByZW5kZXIgbmV3IGNoYXRcbiAgbmV3X2NoYXQoKSB7XG4gICAgdGhpcy5jbGVhcl9jaGF0KCk7XG4gICAgdGhpcy5yZW5kZXJfY2hhdCgpO1xuICAgIC8vIHJlbmRlciBpbml0aWFsIG1lc3NhZ2UgZnJvbSBhc3Npc3RhbnQgKGRvbid0IHVzZSByZW5kZXJfbWVzc2FnZSB0byBza2lwIGFkZGluZyB0byBjaGF0IGhpc3RvcnkpXG4gICAgdGhpcy5uZXdfbWVzc3NhZ2VfYnViYmxlKFwiYXNzaXN0YW50XCIpO1xuICAgIHRoaXMuYWN0aXZlX2VsbS5pbm5lckhUTUwgPSAnPHA+JyArIFNNQVJUX1RSQU5TTEFUSU9OW3RoaXMucGx1Z2luLnNldHRpbmdzLmxhbmd1YWdlXS5pbml0aWFsX21lc3NhZ2UrJzwvcD4nO1xuICB9XG4gIC8vIG9wZW4gYSBjaGF0IGZyb20gdGhlIGNoYXQgaGlzdG9yeSBtb2RhbFxuICBhc3luYyBvcGVuX2NoYXQoY2hhdF9pZCkge1xuICAgIHRoaXMuY2xlYXJfY2hhdCgpO1xuICAgIGF3YWl0IHRoaXMuY2hhdC5sb2FkX2NoYXQoY2hhdF9pZCk7XG4gICAgdGhpcy5yZW5kZXJfY2hhdCgpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5jaGF0LmNoYXRfbWwubGVuZ3RoOyBpKyspIHtcbiAgICAgIGF3YWl0IHRoaXMucmVuZGVyX21lc3NhZ2UodGhpcy5jaGF0LmNoYXRfbWxbaV0uY29udGVudCwgdGhpcy5jaGF0LmNoYXRfbWxbaV0ucm9sZSk7XG4gICAgfVxuICB9XG4gIC8vIGNsZWFyIGN1cnJlbnQgY2hhdCBzdGF0ZVxuICBjbGVhcl9jaGF0KCkge1xuICAgIGlmICh0aGlzLmNoYXQpIHtcbiAgICAgIHRoaXMuY2hhdC5zYXZlX2NoYXQoKTtcbiAgICB9XG4gICAgdGhpcy5jaGF0ID0gbmV3IFNtYXJ0Q29ubmVjdGlvbnNDaGF0TW9kZWwodGhpcy5wbHVnaW4pO1xuICAgIC8vIGlmIHRoaXMuZG90ZG90ZG90X2ludGVydmFsIGlzIG5vdCBudWxsLCBjbGVhciBpbnRlcnZhbFxuICAgIGlmICh0aGlzLmRvdGRvdGRvdF9pbnRlcnZhbCkge1xuICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLmRvdGRvdGRvdF9pbnRlcnZhbCk7XG4gICAgfVxuICAgIC8vIGNsZWFyIGN1cnJlbnQgY2hhdCBtbFxuICAgIHRoaXMuY3VycmVudF9jaGF0X21sID0gW107XG4gICAgLy8gdXBkYXRlIHByZXZlbnQgaW5wdXRcbiAgICB0aGlzLmVuZF9zdHJlYW0oKTtcbiAgfVxuXG4gIHJlbmFtZV9jaGF0KGV2ZW50KSB7XG4gICAgbGV0IG5ld19jaGF0X25hbWUgPSBldmVudC50YXJnZXQudmFsdWU7XG4gICAgdGhpcy5jaGF0LnJlbmFtZV9jaGF0KG5ld19jaGF0X25hbWUpO1xuICB9XG4gIFxuICAvLyBzYXZlIGN1cnJlbnQgY2hhdFxuICBzYXZlX2NoYXQoKSB7XG4gICAgdGhpcy5jaGF0LnNhdmVfY2hhdCgpO1xuICAgIG5ldyBPYnNpZGlhbi5Ob3RpY2UoXCJbU21hcnQgQ29ubmVjdGlvbnNdIENoYXQgc2F2ZWRcIik7XG4gIH1cbiAgXG4gIG9wZW5fc21hcnRfdmlldygpIHtcbiAgICB0aGlzLnBsdWdpbi5vcGVuX3ZpZXcoKTtcbiAgfVxuICAvLyByZW5kZXIgY2hhdCBtZXNzYWdlcyBjb250YWluZXJcbiAgcmVuZGVyX2NoYXRfYm94KCkge1xuICAgIC8vIGNyZWF0ZSBjb250YWluZXIgZm9yIGNoYXQgbWVzc2FnZXNcbiAgICB0aGlzLmNoYXRfYm94ID0gdGhpcy5jaGF0X2NvbnRhaW5lci5jcmVhdGVEaXYoXCJzYy1jaGF0LWJveFwiKTtcbiAgICAvLyBjcmVhdGUgY29udGFpbmVyIGZvciBtZXNzYWdlXG4gICAgdGhpcy5tZXNzYWdlX2NvbnRhaW5lciA9IHRoaXMuY2hhdF9ib3guY3JlYXRlRGl2KFwic2MtbWVzc2FnZS1jb250YWluZXJcIik7XG4gIH1cbiAgLy8gb3BlbiBmaWxlIHN1Z2dlc3Rpb24gbW9kYWxcbiAgb3Blbl9maWxlX3N1Z2dlc3Rpb25fbW9kYWwoKSB7XG4gICAgLy8gb3BlbiBmaWxlIHN1Z2dlc3Rpb24gbW9kYWxcbiAgICBpZighdGhpcy5maWxlX3NlbGVjdG9yKSB0aGlzLmZpbGVfc2VsZWN0b3IgPSBuZXcgU21hcnRDb25uZWN0aW9uc0ZpbGVTZWxlY3RNb2RhbCh0aGlzLmFwcCwgdGhpcyk7XG4gICAgdGhpcy5maWxlX3NlbGVjdG9yLm9wZW4oKTtcbiAgfVxuICAvLyBvcGVuIGZvbGRlciBzdWdnZXN0aW9uIG1vZGFsXG4gIGFzeW5jIG9wZW5fZm9sZGVyX3N1Z2dlc3Rpb25fbW9kYWwoKSB7XG4gICAgLy8gb3BlbiBmb2xkZXIgc3VnZ2VzdGlvbiBtb2RhbFxuICAgIGlmKCF0aGlzLmZvbGRlcl9zZWxlY3Rvcil7XG4gICAgICB0aGlzLmZvbGRlcl9zZWxlY3RvciA9IG5ldyBTbWFydENvbm5lY3Rpb25zRm9sZGVyU2VsZWN0TW9kYWwodGhpcy5hcHAsIHRoaXMpO1xuICAgIH1cbiAgICB0aGlzLmZvbGRlcl9zZWxlY3Rvci5vcGVuKCk7XG4gIH1cbiAgLy8gaW5zZXJ0X3NlbGVjdGlvbiBmcm9tIGZpbGUgc3VnZ2VzdGlvbiBtb2RhbFxuICBpbnNlcnRfc2VsZWN0aW9uKGluc2VydF90ZXh0KSB7XG4gICAgLy8gZ2V0IGNhcmV0IHBvc2l0aW9uXG4gICAgbGV0IGNhcmV0X3BvcyA9IHRoaXMudGV4dGFyZWEuc2VsZWN0aW9uU3RhcnQ7XG4gICAgLy8gZ2V0IHRleHQgYmVmb3JlIGNhcmV0XG4gICAgbGV0IHRleHRfYmVmb3JlID0gdGhpcy50ZXh0YXJlYS52YWx1ZS5zdWJzdHJpbmcoMCwgY2FyZXRfcG9zKTtcbiAgICAvLyBnZXQgdGV4dCBhZnRlciBjYXJldFxuICAgIGxldCB0ZXh0X2FmdGVyID0gdGhpcy50ZXh0YXJlYS52YWx1ZS5zdWJzdHJpbmcoY2FyZXRfcG9zLCB0aGlzLnRleHRhcmVhLnZhbHVlLmxlbmd0aCk7XG4gICAgLy8gaW5zZXJ0IHRleHRcbiAgICB0aGlzLnRleHRhcmVhLnZhbHVlID0gdGV4dF9iZWZvcmUgKyBpbnNlcnRfdGV4dCArIHRleHRfYWZ0ZXI7XG4gICAgLy8gc2V0IGNhcmV0IHBvc2l0aW9uXG4gICAgdGhpcy50ZXh0YXJlYS5zZWxlY3Rpb25TdGFydCA9IGNhcmV0X3BvcyArIGluc2VydF90ZXh0Lmxlbmd0aDtcbiAgICB0aGlzLnRleHRhcmVhLnNlbGVjdGlvbkVuZCA9IGNhcmV0X3BvcyArIGluc2VydF90ZXh0Lmxlbmd0aDtcbiAgICAvLyBmb2N1cyBvbiB0ZXh0YXJlYVxuICAgIHRoaXMudGV4dGFyZWEuZm9jdXMoKTtcbiAgfVxuXG4gIC8vIHJlbmRlciBjaGF0IHRleHRhcmVhIGFuZCBidXR0b25cbiAgcmVuZGVyX2NoYXRfaW5wdXQoKSB7XG4gICAgLy8gY3JlYXRlIGNvbnRhaW5lciBmb3IgY2hhdCBpbnB1dFxuICAgIGxldCBjaGF0X2lucHV0ID0gdGhpcy5jaGF0X2NvbnRhaW5lci5jcmVhdGVEaXYoXCJzYy1jaGF0LWZvcm1cIik7XG4gICAgLy8gY3JlYXRlIHRleHRhcmVhXG4gICAgdGhpcy50ZXh0YXJlYSA9IGNoYXRfaW5wdXQuY3JlYXRlRWwoXCJ0ZXh0YXJlYVwiLCB7XG4gICAgICBjbHM6IFwic2MtY2hhdC1pbnB1dFwiLFxuICAgICAgYXR0cjoge1xuICAgICAgICBwbGFjZWhvbGRlcjogYFRyeSBcIkJhc2VkIG9uIG15IG5vdGVzXCIgb3IgXCJTdW1tYXJpemUgW1t0aGlzIG5vdGVdXVwiIG9yIFwiSW1wb3J0YW50IHRhc2tzIGluIC9mb2xkZXIvXCJgXG4gICAgICB9XG4gICAgfSk7XG4gICAgLy8gdXNlIGNvbnRlbnRlZGl0YWJsZSBpbnN0ZWFkIG9mIHRleHRhcmVhXG4gICAgLy8gdGhpcy50ZXh0YXJlYSA9IGNoYXRfaW5wdXQuY3JlYXRlRWwoXCJkaXZcIiwge2NsczogXCJzYy1jaGF0LWlucHV0XCIsIGF0dHI6IHtjb250ZW50ZWRpdGFibGU6IHRydWV9fSk7XG4gICAgLy8gYWRkIGV2ZW50IGxpc3RlbmVyIHRvIGxpc3RlbiBmb3Igc2hpZnQrZW50ZXJcbiAgICBjaGF0X2lucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCAoZSkgPT4ge1xuICAgICAgaWYoW1wiW1wiLCBcIi9cIl0uaW5kZXhPZihlLmtleSkgPT09IC0xKSByZXR1cm47IC8vIHNraXAgaWYga2V5IGlzIG5vdCBbIG9yIC9cbiAgICAgIGNvbnN0IGNhcmV0X3BvcyA9IHRoaXMudGV4dGFyZWEuc2VsZWN0aW9uU3RhcnQ7XG4gICAgICAvLyBpZiBrZXkgaXMgb3BlbiBzcXVhcmUgYnJhY2tldFxuICAgICAgaWYgKGUua2V5ID09PSBcIltcIikge1xuICAgICAgICAvLyBpZiBwcmV2aW91cyBjaGFyIGlzIFtcbiAgICAgICAgaWYodGhpcy50ZXh0YXJlYS52YWx1ZVtjYXJldF9wb3MgLSAyXSA9PT0gXCJbXCIpe1xuICAgICAgICAgIC8vIG9wZW4gZmlsZSBzdWdnZXN0aW9uIG1vZGFsXG4gICAgICAgICAgdGhpcy5vcGVuX2ZpbGVfc3VnZ2VzdGlvbl9tb2RhbCgpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfWVsc2V7XG4gICAgICAgIHRoaXMuYnJhY2tldHNfY3QgPSAwO1xuICAgICAgfVxuICAgICAgLy8gaWYgLyBpcyBwcmVzc2VkXG4gICAgICBpZiAoZS5rZXkgPT09IFwiL1wiKSB7XG4gICAgICAgIC8vIGdldCBjYXJldCBwb3NpdGlvblxuICAgICAgICAvLyBpZiB0aGlzIGlzIGZpcnN0IGNoYXIgb3IgcHJldmlvdXMgY2hhciBpcyBzcGFjZVxuICAgICAgICBpZiAodGhpcy50ZXh0YXJlYS52YWx1ZS5sZW5ndGggPT09IDEgfHwgdGhpcy50ZXh0YXJlYS52YWx1ZVtjYXJldF9wb3MgLSAyXSA9PT0gXCIgXCIpIHtcbiAgICAgICAgICAvLyBvcGVuIGZvbGRlciBzdWdnZXN0aW9uIG1vZGFsXG4gICAgICAgICAgdGhpcy5vcGVuX2ZvbGRlcl9zdWdnZXN0aW9uX21vZGFsKCk7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICB9KTtcblxuICAgIGNoYXRfaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgKGUpID0+IHtcbiAgICAgIGlmIChlLmtleSA9PT0gXCJFbnRlclwiICYmIGUuc2hpZnRLZXkpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBpZih0aGlzLnByZXZlbnRfaW5wdXQpe1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwid2FpdCB1bnRpbCBjdXJyZW50IHJlc3BvbnNlIGlzIGZpbmlzaGVkXCIpO1xuICAgICAgICAgIG5ldyBPYnNpZGlhbi5Ob3RpY2UoXCJbU21hcnQgQ29ubmVjdGlvbnNdIFdhaXQgdW50aWwgY3VycmVudCByZXNwb25zZSBpcyBmaW5pc2hlZFwiKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gZ2V0IHRleHQgZnJvbSB0ZXh0YXJlYVxuICAgICAgICBsZXQgdXNlcl9pbnB1dCA9IHRoaXMudGV4dGFyZWEudmFsdWU7XG4gICAgICAgIC8vIGNsZWFyIHRleHRhcmVhXG4gICAgICAgIHRoaXMudGV4dGFyZWEudmFsdWUgPSBcIlwiO1xuICAgICAgICAvLyBpbml0aWF0ZSByZXNwb25zZSBmcm9tIGFzc2lzdGFudFxuICAgICAgICB0aGlzLmluaXRpYWxpemVfcmVzcG9uc2UodXNlcl9pbnB1dCk7XG4gICAgICB9XG4gICAgICB0aGlzLnRleHRhcmVhLnN0eWxlLmhlaWdodCA9ICdhdXRvJztcbiAgICAgIHRoaXMudGV4dGFyZWEuc3R5bGUuaGVpZ2h0ID0gKHRoaXMudGV4dGFyZWEuc2Nyb2xsSGVpZ2h0KSArICdweCc7XG4gICAgfSk7XG4gICAgLy8gYnV0dG9uIGNvbnRhaW5lclxuICAgIGxldCBidXR0b25fY29udGFpbmVyID0gY2hhdF9pbnB1dC5jcmVhdGVEaXYoXCJzYy1idXR0b24tY29udGFpbmVyXCIpO1xuICAgIC8vIGNyZWF0ZSBoaWRkZW4gYWJvcnQgYnV0dG9uXG4gICAgbGV0IGFib3J0X2J1dHRvbiA9IGJ1dHRvbl9jb250YWluZXIuY3JlYXRlRWwoXCJzcGFuXCIsIHsgYXR0cjoge2lkOiBcInNjLWFib3J0LWJ1dHRvblwiLCBzdHlsZTogXCJkaXNwbGF5OiBub25lO1wifSB9KTtcbiAgICBPYnNpZGlhbi5zZXRJY29uKGFib3J0X2J1dHRvbiwgXCJzcXVhcmVcIik7XG4gICAgLy8gYWRkIGV2ZW50IGxpc3RlbmVyIHRvIGJ1dHRvblxuICAgIGFib3J0X2J1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xuICAgICAgLy8gYWJvcnQgY3VycmVudCByZXNwb25zZVxuICAgICAgdGhpcy5lbmRfc3RyZWFtKCk7XG4gICAgfSk7XG4gICAgLy8gY3JlYXRlIGJ1dHRvblxuICAgIGxldCBidXR0b24gPSBidXR0b25fY29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHsgYXR0cjoge2lkOiBcInNjLXNlbmQtYnV0dG9uXCJ9LCBjbHM6IFwic2VuZC1idXR0b25cIiB9KTtcbiAgICBidXR0b24uaW5uZXJIVE1MID0gXCJTZW5kXCI7XG4gICAgLy8gYWRkIGV2ZW50IGxpc3RlbmVyIHRvIGJ1dHRvblxuICAgIGJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xuICAgICAgaWYodGhpcy5wcmV2ZW50X2lucHV0KXtcbiAgICAgICAgY29uc29sZS5sb2coXCJ3YWl0IHVudGlsIGN1cnJlbnQgcmVzcG9uc2UgaXMgZmluaXNoZWRcIik7XG4gICAgICAgIG5ldyBPYnNpZGlhbi5Ob3RpY2UoXCJXYWl0IHVudGlsIGN1cnJlbnQgcmVzcG9uc2UgaXMgZmluaXNoZWRcIik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIC8vIGdldCB0ZXh0IGZyb20gdGV4dGFyZWFcbiAgICAgIGxldCB1c2VyX2lucHV0ID0gdGhpcy50ZXh0YXJlYS52YWx1ZTtcbiAgICAgIC8vIGNsZWFyIHRleHRhcmVhXG4gICAgICB0aGlzLnRleHRhcmVhLnZhbHVlID0gXCJcIjtcbiAgICAgIC8vIGluaXRpYXRlIHJlc3BvbnNlIGZyb20gYXNzaXN0YW50XG4gICAgICB0aGlzLmluaXRpYWxpemVfcmVzcG9uc2UodXNlcl9pbnB1dCk7XG4gICAgfSk7XG4gIH1cbiAgYXN5bmMgaW5pdGlhbGl6ZV9yZXNwb25zZSh1c2VyX2lucHV0KSB7XG4gICAgdGhpcy5zZXRfc3RyZWFtaW5nX3V4KCk7XG4gICAgLy8gcmVuZGVyIG1lc3NhZ2VcbiAgICBhd2FpdCB0aGlzLnJlbmRlcl9tZXNzYWdlKHVzZXJfaW5wdXQsIFwidXNlclwiKTtcbiAgICB0aGlzLmNoYXQubmV3X21lc3NhZ2VfaW5fdGhyZWFkKHtcbiAgICAgIHJvbGU6IFwidXNlclwiLFxuICAgICAgY29udGVudDogdXNlcl9pbnB1dFxuICAgIH0pO1xuICAgIGF3YWl0IHRoaXMucmVuZGVyX2RvdGRvdGRvdCgpO1xuXG4gICAgLy8gaWYgY29udGFpbnMgaW50ZXJuYWwgbGluayByZXByZXNlbnRlZCBieSBbW2xpbmtdXVxuICAgIGlmKHRoaXMuY2hhdC5jb250YWluc19pbnRlcm5hbF9saW5rKHVzZXJfaW5wdXQpKSB7XG4gICAgICB0aGlzLmNoYXQuZ2V0X3Jlc3BvbnNlX3dpdGhfbm90ZV9jb250ZXh0KHVzZXJfaW5wdXQsIHRoaXMpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyAvLyBmb3IgdGVzdGluZyBwdXJwb3Nlc1xuICAgIC8vIGlmKHRoaXMuY2hhdC5jb250YWluc19mb2xkZXJfcmVmZXJlbmNlKHVzZXJfaW5wdXQpKSB7XG4gICAgLy8gICBjb25zdCBmb2xkZXJzID0gdGhpcy5jaGF0LmdldF9mb2xkZXJfcmVmZXJlbmNlcyh1c2VyX2lucHV0KTtcbiAgICAvLyAgIGNvbnNvbGUubG9nKGZvbGRlcnMpO1xuICAgIC8vICAgcmV0dXJuO1xuICAgIC8vIH1cbiAgICAvLyBpZiBjb250YWlucyBzZWxmIHJlZmVyZW50aWFsIGtleXdvcmRzIG9yIGZvbGRlciByZWZlcmVuY2VcbiAgICBpZih0aGlzLmNvbnRhaW5zX3NlbGZfcmVmZXJlbnRpYWxfa2V5d29yZHModXNlcl9pbnB1dCkgfHwgdGhpcy5jaGF0LmNvbnRhaW5zX2ZvbGRlcl9yZWZlcmVuY2UodXNlcl9pbnB1dCkpIHtcbiAgICAgIC8vIGdldCBoeWRlXG4gICAgICBjb25zdCBjb250ZXh0ID0gYXdhaXQgdGhpcy5nZXRfY29udGV4dF9oeWRlKHVzZXJfaW5wdXQpO1xuICAgICAgLy8gZ2V0IHVzZXIgaW5wdXQgd2l0aCBhZGRlZCBjb250ZXh0XG4gICAgICAvLyBjb25zdCBjb250ZXh0X2lucHV0ID0gdGhpcy5idWlsZF9jb250ZXh0X2lucHV0KGNvbnRleHQpO1xuICAgICAgLy8gY29uc29sZS5sb2coY29udGV4dF9pbnB1dCk7XG4gICAgICBjb25zdCBjaGF0bWwgPSBbXG4gICAgICAgIHtcbiAgICAgICAgICByb2xlOiBcInN5c3RlbVwiLFxuICAgICAgICAgIC8vIGNvbnRlbnQ6IGNvbnRleHRfaW5wdXRcbiAgICAgICAgICBjb250ZW50OiBjb250ZXh0XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICByb2xlOiBcInVzZXJcIixcbiAgICAgICAgICBjb250ZW50OiB1c2VyX2lucHV0XG4gICAgICAgIH1cbiAgICAgIF07XG4gICAgICB0aGlzLnJlcXVlc3RfY2hhdGdwdF9jb21wbGV0aW9uKHttZXNzYWdlczogY2hhdG1sLCB0ZW1wZXJhdHVyZTogMH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBjb21wbGV0aW9uIHdpdGhvdXQgYW55IHNwZWNpZmljIGNvbnRleHRcbiAgICB0aGlzLnJlcXVlc3RfY2hhdGdwdF9jb21wbGV0aW9uKCk7XG4gIH1cbiAgXG4gIGFzeW5jIHJlbmRlcl9kb3Rkb3Rkb3QoKSB7XG4gICAgaWYgKHRoaXMuZG90ZG90ZG90X2ludGVydmFsKVxuICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLmRvdGRvdGRvdF9pbnRlcnZhbCk7XG4gICAgYXdhaXQgdGhpcy5yZW5kZXJfbWVzc2FnZShcIi4uLlwiLCBcImFzc2lzdGFudFwiKTtcbiAgICAvLyBpZiBpcyAnLi4uJywgdGhlbiBpbml0aWF0ZSBpbnRlcnZhbCB0byBjaGFuZ2UgdG8gJy4nIGFuZCB0aGVuIHRvICcuLicgYW5kIHRoZW4gdG8gJy4uLidcbiAgICBsZXQgZG90cyA9IDA7XG4gICAgdGhpcy5hY3RpdmVfZWxtLmlubmVySFRNTCA9ICcuLi4nO1xuICAgIHRoaXMuZG90ZG90ZG90X2ludGVydmFsID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgZG90cysrO1xuICAgICAgaWYgKGRvdHMgPiAzKVxuICAgICAgICBkb3RzID0gMTtcbiAgICAgIHRoaXMuYWN0aXZlX2VsbS5pbm5lckhUTUwgPSAnLicucmVwZWF0KGRvdHMpO1xuICAgIH0sIDUwMCk7XG4gICAgLy8gd2FpdCAyIHNlY29uZHMgZm9yIHRlc3RpbmdcbiAgICAvLyBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgMjAwMCkpO1xuICB9XG5cbiAgc2V0X3N0cmVhbWluZ191eCgpIHtcbiAgICB0aGlzLnByZXZlbnRfaW5wdXQgPSB0cnVlO1xuICAgIC8vIGhpZGUgc2VuZCBidXR0b25cbiAgICBpZihkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNjLXNlbmQtYnV0dG9uXCIpKVxuICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzYy1zZW5kLWJ1dHRvblwiKS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgLy8gc2hvdyBhYm9ydCBidXR0b25cbiAgICBpZihkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNjLWFib3J0LWJ1dHRvblwiKSlcbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic2MtYWJvcnQtYnV0dG9uXCIpLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XG4gIH1cbiAgdW5zZXRfc3RyZWFtaW5nX3V4KCkge1xuICAgIHRoaXMucHJldmVudF9pbnB1dCA9IGZhbHNlO1xuICAgIC8vIHNob3cgc2VuZCBidXR0b24sIHJlbW92ZSBkaXNwbGF5IG5vbmVcbiAgICBpZihkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNjLXNlbmQtYnV0dG9uXCIpKVxuICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzYy1zZW5kLWJ1dHRvblwiKS5zdHlsZS5kaXNwbGF5ID0gXCJcIjtcbiAgICAvLyBoaWRlIGFib3J0IGJ1dHRvblxuICAgIGlmKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwic2MtYWJvcnQtYnV0dG9uXCIpKVxuICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJzYy1hYm9ydC1idXR0b25cIikuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICB9XG5cblxuICAvLyBjaGVjayBpZiBpbmNsdWRlcyBrZXl3b3JkcyByZWZlcnJpbmcgdG8gb25lJ3Mgb3duIG5vdGVzXG4gIGNvbnRhaW5zX3NlbGZfcmVmZXJlbnRpYWxfa2V5d29yZHModXNlcl9pbnB1dCkge1xuICAgIGNvbnN0IG1hdGNoZXMgPSB1c2VyX2lucHV0Lm1hdGNoKHRoaXMucGx1Z2luLnNlbGZfcmVmX2t3X3JlZ2V4KTtcbiAgICBpZihtYXRjaGVzKSByZXR1cm4gdHJ1ZTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyByZW5kZXIgbWVzc2FnZVxuICBhc3luYyByZW5kZXJfbWVzc2FnZShtZXNzYWdlLCBmcm9tPVwiYXNzaXN0YW50XCIsIGFwcGVuZF9sYXN0PWZhbHNlKSB7XG4gICAgLy8gaWYgZG90ZG90ZG90IGludGVydmFsIGlzIHNldCwgdGhlbiBjbGVhciBpdFxuICAgIGlmKHRoaXMuZG90ZG90ZG90X2ludGVydmFsKSB7XG4gICAgICBjbGVhckludGVydmFsKHRoaXMuZG90ZG90ZG90X2ludGVydmFsKTtcbiAgICAgIHRoaXMuZG90ZG90ZG90X2ludGVydmFsID0gbnVsbDtcbiAgICAgIC8vIGNsZWFyIGxhc3QgbWVzc2FnZVxuICAgICAgdGhpcy5hY3RpdmVfZWxtLmlubmVySFRNTCA9ICcnO1xuICAgIH1cbiAgICBpZihhcHBlbmRfbGFzdCkge1xuICAgICAgdGhpcy5jdXJyZW50X21lc3NhZ2VfcmF3ICs9IG1lc3NhZ2U7XG4gICAgICBpZihtZXNzYWdlLmluZGV4T2YoJ1xcbicpID09PSAtMSkge1xuICAgICAgICB0aGlzLmFjdGl2ZV9lbG0uaW5uZXJIVE1MICs9IG1lc3NhZ2U7XG4gICAgICB9ZWxzZXtcbiAgICAgICAgdGhpcy5hY3RpdmVfZWxtLmlubmVySFRNTCA9ICcnO1xuICAgICAgICAvLyBhcHBlbmQgdG8gbGFzdCBtZXNzYWdlXG4gICAgICAgIGF3YWl0IE9ic2lkaWFuLk1hcmtkb3duUmVuZGVyZXIucmVuZGVyTWFya2Rvd24odGhpcy5jdXJyZW50X21lc3NhZ2VfcmF3LCB0aGlzLmFjdGl2ZV9lbG0sICc/bm8tZGF0YXZpZXcnLCBuZXcgT2JzaWRpYW4uQ29tcG9uZW50KCkpO1xuICAgICAgfVxuICAgIH1lbHNle1xuICAgICAgdGhpcy5jdXJyZW50X21lc3NhZ2VfcmF3ID0gJyc7XG4gICAgICBpZigodGhpcy5jaGF0LnRocmVhZC5sZW5ndGggPT09IDApIHx8ICh0aGlzLmxhc3RfZnJvbSAhPT0gZnJvbSkpIHtcbiAgICAgICAgLy8gY3JlYXRlIG1lc3NhZ2VcbiAgICAgICAgdGhpcy5uZXdfbWVzc3NhZ2VfYnViYmxlKGZyb20pO1xuICAgICAgfVxuICAgICAgLy8gc2V0IG1lc3NhZ2UgdGV4dFxuICAgICAgdGhpcy5hY3RpdmVfZWxtLmlubmVySFRNTCA9ICcnO1xuICAgICAgYXdhaXQgT2JzaWRpYW4uTWFya2Rvd25SZW5kZXJlci5yZW5kZXJNYXJrZG93bihtZXNzYWdlLCB0aGlzLmFjdGl2ZV9lbG0sICc/bm8tZGF0YXZpZXcnLCBuZXcgT2JzaWRpYW4uQ29tcG9uZW50KCkpO1xuICAgICAgLy8gZ2V0IGxpbmtzXG4gICAgICB0aGlzLmhhbmRsZV9saW5rc19pbl9tZXNzYWdlKCk7XG4gICAgICAvLyByZW5kZXIgYnV0dG9uKHMpXG4gICAgICB0aGlzLnJlbmRlcl9tZXNzYWdlX2FjdGlvbl9idXR0b25zKG1lc3NhZ2UpO1xuICAgIH1cbiAgICAvLyBzY3JvbGwgdG8gYm90dG9tXG4gICAgdGhpcy5tZXNzYWdlX2NvbnRhaW5lci5zY3JvbGxUb3AgPSB0aGlzLm1lc3NhZ2VfY29udGFpbmVyLnNjcm9sbEhlaWdodDtcbiAgfVxuICByZW5kZXJfbWVzc2FnZV9hY3Rpb25fYnV0dG9ucyhtZXNzYWdlKSB7XG4gICAgaWYgKHRoaXMuY2hhdC5jb250ZXh0ICYmIHRoaXMuY2hhdC5oeWQpIHtcbiAgICAgIC8vIHJlbmRlciBidXR0b24gdG8gY29weSBoeWQgaW4gc21hcnQtY29ubmVjdGlvbnMgY29kZSBibG9ja1xuICAgICAgY29uc3QgY29udGV4dF92aWV3ID0gdGhpcy5hY3RpdmVfZWxtLmNyZWF0ZUVsKFwic3BhblwiLCB7XG4gICAgICAgIGNsczogXCJzYy1tc2ctYnV0dG9uXCIsXG4gICAgICAgIGF0dHI6IHtcbiAgICAgICAgICB0aXRsZTogXCJDb3B5IGNvbnRleHQgdG8gY2xpcGJvYXJkXCIgLyogdG9vbHRpcCAqL1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHRoaXNfaHlkID0gdGhpcy5jaGF0Lmh5ZDtcbiAgICAgIE9ic2lkaWFuLnNldEljb24oY29udGV4dF92aWV3LCBcImV5ZVwiKTtcbiAgICAgIGNvbnRleHRfdmlldy5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xuICAgICAgICAvLyBjb3B5IHRvIGNsaXBib2FyZFxuICAgICAgICBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChcImBgYHNtYXJ0LWNvbm5lY3Rpb25zXFxuXCIgKyB0aGlzX2h5ZCArIFwiXFxuYGBgXFxuXCIpO1xuICAgICAgICBuZXcgT2JzaWRpYW4uTm90aWNlKFwiW1NtYXJ0IENvbm5lY3Rpb25zXSBDb250ZXh0IGNvZGUgYmxvY2sgY29waWVkIHRvIGNsaXBib2FyZFwiKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBpZih0aGlzLmNoYXQuY29udGV4dCkge1xuICAgICAgLy8gcmVuZGVyIGNvcHkgY29udGV4dCBidXR0b25cbiAgICAgIGNvbnN0IGNvcHlfcHJvbXB0X2J1dHRvbiA9IHRoaXMuYWN0aXZlX2VsbS5jcmVhdGVFbChcInNwYW5cIiwge1xuICAgICAgICBjbHM6IFwic2MtbXNnLWJ1dHRvblwiLFxuICAgICAgICBhdHRyOiB7XG4gICAgICAgICAgdGl0bGU6IFwiQ29weSBwcm9tcHQgdG8gY2xpcGJvYXJkXCIgLyogdG9vbHRpcCAqL1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHRoaXNfY29udGV4dCA9IHRoaXMuY2hhdC5jb250ZXh0LnJlcGxhY2UoL1xcYFxcYFxcYC9nLCBcIlxcdGBgYFwiKS50cmltTGVmdCgpO1xuICAgICAgT2JzaWRpYW4uc2V0SWNvbihjb3B5X3Byb21wdF9idXR0b24sIFwiZmlsZXNcIik7XG4gICAgICBjb3B5X3Byb21wdF9idXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcbiAgICAgICAgLy8gY29weSB0byBjbGlwYm9hcmRcbiAgICAgICAgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQoXCJgYGBwcm9tcHQtY29udGV4dFxcblwiICsgdGhpc19jb250ZXh0ICsgXCJcXG5gYGBcXG5cIik7XG4gICAgICAgIG5ldyBPYnNpZGlhbi5Ob3RpY2UoXCJbU21hcnQgQ29ubmVjdGlvbnNdIENvbnRleHQgY29waWVkIHRvIGNsaXBib2FyZFwiKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICAvLyByZW5kZXIgY29weSBidXR0b25cbiAgICBjb25zdCBjb3B5X2J1dHRvbiA9IHRoaXMuYWN0aXZlX2VsbS5jcmVhdGVFbChcInNwYW5cIiwge1xuICAgICAgY2xzOiBcInNjLW1zZy1idXR0b25cIixcbiAgICAgIGF0dHI6IHtcbiAgICAgICAgdGl0bGU6IFwiQ29weSBtZXNzYWdlIHRvIGNsaXBib2FyZFwiIC8qIHRvb2x0aXAgKi9cbiAgICAgIH1cbiAgICB9KTtcbiAgICBPYnNpZGlhbi5zZXRJY29uKGNvcHlfYnV0dG9uLCBcImNvcHlcIik7XG4gICAgY29weV9idXR0b24uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcbiAgICAgIC8vIGNvcHkgbWVzc2FnZSB0byBjbGlwYm9hcmRcbiAgICAgIG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KG1lc3NhZ2UudHJpbUxlZnQoKSk7XG4gICAgICBuZXcgT2JzaWRpYW4uTm90aWNlKFwiW1NtYXJ0IENvbm5lY3Rpb25zXSBNZXNzYWdlIGNvcGllZCB0byBjbGlwYm9hcmRcIik7XG4gICAgfSk7XG4gIH1cblxuICBoYW5kbGVfbGlua3NfaW5fbWVzc2FnZSgpIHtcbiAgICBjb25zdCBsaW5rcyA9IHRoaXMuYWN0aXZlX2VsbS5xdWVyeVNlbGVjdG9yQWxsKFwiYVwiKTtcbiAgICAvLyBpZiB0aGlzIGFjdGl2ZSBlbGVtZW50IGNvbnRhaW5zIGEgbGlua1xuICAgIGlmIChsaW5rcy5sZW5ndGggPiAwKSB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmtzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IGxpbmsgPSBsaW5rc1tpXTtcbiAgICAgICAgY29uc3QgbGlua190ZXh0ID0gbGluay5nZXRBdHRyaWJ1dGUoXCJkYXRhLWhyZWZcIik7XG4gICAgICAgIC8vIHRyaWdnZXIgaG92ZXIgZXZlbnQgb24gbGlua1xuICAgICAgICBsaW5rLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW92ZXJcIiwgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgdGhpcy5hcHAud29ya3NwYWNlLnRyaWdnZXIoXCJob3Zlci1saW5rXCIsIHtcbiAgICAgICAgICAgIGV2ZW50LFxuICAgICAgICAgICAgc291cmNlOiBTTUFSVF9DT05ORUNUSU9OU19DSEFUX1ZJRVdfVFlQRSxcbiAgICAgICAgICAgIGhvdmVyUGFyZW50OiBsaW5rLnBhcmVudEVsZW1lbnQsXG4gICAgICAgICAgICB0YXJnZXRFbDogbGluayxcbiAgICAgICAgICAgIC8vIGV4dHJhY3QgbGluayB0ZXh0IGZyb20gYS5kYXRhLWhyZWZcbiAgICAgICAgICAgIGxpbmt0ZXh0OiBsaW5rX3RleHRcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIHRyaWdnZXIgb3BlbiBsaW5rIGV2ZW50IG9uIGxpbmtcbiAgICAgICAgbGluay5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgY29uc3QgbGlua190ZmlsZSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0Rmlyc3RMaW5rcGF0aERlc3QobGlua190ZXh0LCBcIi9cIik7XG4gICAgICAgICAgLy8gcHJvcGVybHkgaGFuZGxlIGlmIHRoZSBtZXRhL2N0cmwga2V5IGlzIHByZXNzZWRcbiAgICAgICAgICBjb25zdCBtb2QgPSBPYnNpZGlhbi5LZXltYXAuaXNNb2RFdmVudChldmVudCk7XG4gICAgICAgICAgLy8gZ2V0IG1vc3QgcmVjZW50IGxlYWZcbiAgICAgICAgICBsZXQgbGVhZiA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRMZWFmKG1vZCk7XG4gICAgICAgICAgbGVhZi5vcGVuRmlsZShsaW5rX3RmaWxlKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgbmV3X21lc3NzYWdlX2J1YmJsZShmcm9tKSB7XG4gICAgbGV0IG1lc3NhZ2VfZWwgPSB0aGlzLm1lc3NhZ2VfY29udGFpbmVyLmNyZWF0ZURpdihgc2MtbWVzc2FnZSAke2Zyb219YCk7XG4gICAgLy8gY3JlYXRlIG1lc3NhZ2UgY29udGVudFxuICAgIHRoaXMuYWN0aXZlX2VsbSA9IG1lc3NhZ2VfZWwuY3JlYXRlRGl2KFwic2MtbWVzc2FnZS1jb250ZW50XCIpO1xuICAgIC8vIHNldCBsYXN0IGZyb21cbiAgICB0aGlzLmxhc3RfZnJvbSA9IGZyb207XG4gIH1cblxuICBhc3luYyByZXF1ZXN0X2NoYXRncHRfY29tcGxldGlvbihvcHRzPXt9KSB7XG4gICAgY29uc3QgY2hhdF9tbCA9IG9wdHMubWVzc2FnZXMgfHwgb3B0cy5jaGF0X21sIHx8IHRoaXMuY2hhdC5wcmVwYXJlX2NoYXRfbWwoKTtcbiAgICBjb25zb2xlLmxvZyhcImNoYXRfbWxcIiwgY2hhdF9tbCk7XG4gICAgY29uc3QgbWF4X3RvdGFsX3Rva2VucyA9IE1hdGgucm91bmQoZ2V0X21heF9jaGFycyh0aGlzLnBsdWdpbi5zZXR0aW5ncy5zbWFydF9jaGF0X21vZGVsKSAvIDQpO1xuICAgIGNvbnNvbGUubG9nKFwibWF4X3RvdGFsX3Rva2Vuc1wiLCBtYXhfdG90YWxfdG9rZW5zKTtcbiAgICBjb25zdCBjdXJyX3Rva2VuX2VzdCA9IE1hdGgucm91bmQoSlNPTi5zdHJpbmdpZnkoY2hhdF9tbCkubGVuZ3RoIC8gMyk7XG4gICAgY29uc29sZS5sb2coXCJjdXJyX3Rva2VuX2VzdFwiLCBjdXJyX3Rva2VuX2VzdCk7XG4gICAgbGV0IG1heF9hdmFpbGFibGVfdG9rZW5zID0gbWF4X3RvdGFsX3Rva2VucyAtIGN1cnJfdG9rZW5fZXN0O1xuICAgIC8vIGlmIG1heF9hdmFpbGFibGVfdG9rZW5zIGlzIGxlc3MgdGhhbiAwLCBzZXQgdG8gMjAwXG4gICAgaWYobWF4X2F2YWlsYWJsZV90b2tlbnMgPCAwKSBtYXhfYXZhaWxhYmxlX3Rva2VucyA9IDIwMDtcbiAgICBlbHNlIGlmKG1heF9hdmFpbGFibGVfdG9rZW5zID4gNDA5NikgbWF4X2F2YWlsYWJsZV90b2tlbnMgPSA0MDk2O1xuICAgIGNvbnNvbGUubG9nKFwibWF4X2F2YWlsYWJsZV90b2tlbnNcIiwgbWF4X2F2YWlsYWJsZV90b2tlbnMpO1xuICAgIG9wdHMgPSB7XG4gICAgICBtb2RlbDogdGhpcy5wbHVnaW4uc2V0dGluZ3Muc21hcnRfY2hhdF9tb2RlbCxcbiAgICAgIG1lc3NhZ2VzOiBjaGF0X21sLFxuICAgICAgLy8gbWF4X3Rva2VuczogMjUwLFxuICAgICAgbWF4X3Rva2VuczogbWF4X2F2YWlsYWJsZV90b2tlbnMsXG4gICAgICB0ZW1wZXJhdHVyZTogMC4zLFxuICAgICAgdG9wX3A6IDEsXG4gICAgICBwcmVzZW5jZV9wZW5hbHR5OiAwLFxuICAgICAgZnJlcXVlbmN5X3BlbmFsdHk6IDAsXG4gICAgICBzdHJlYW06IHRydWUsXG4gICAgICBzdG9wOiBudWxsLFxuICAgICAgbjogMSxcbiAgICAgIC8vIGxvZ2l0X2JpYXM6IGxvZ2l0X2JpYXMsXG4gICAgICAuLi5vcHRzXG4gICAgfVxuICAgIC8vIGNvbnNvbGUubG9nKG9wdHMubWVzc2FnZXMpO1xuICAgIGlmKG9wdHMuc3RyZWFtKSB7XG4gICAgICBjb25zdCBmdWxsX3N0ciA9IGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcInN0cmVhbVwiLCBvcHRzKTtcbiAgICAgICAgICBjb25zdCB1cmwgPSBcImh0dHBzOi8vYXBpLm9wZW5haS5jb20vdjEvY2hhdC9jb21wbGV0aW9uc1wiO1xuICAgICAgICAgIHRoaXMuYWN0aXZlX3N0cmVhbSA9IG5ldyBTY1N0cmVhbWVyKHVybCwge1xuICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke3RoaXMucGx1Z2luLnNldHRpbmdzLmFwaV9rZXl9YFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICAgICAgICBwYXlsb2FkOiBKU09OLnN0cmluZ2lmeShvcHRzKVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGxldCB0eHQgPSBcIlwiO1xuICAgICAgICAgIHRoaXMuYWN0aXZlX3N0cmVhbS5hZGRFdmVudExpc3RlbmVyKFwibWVzc2FnZVwiLCAoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGUuZGF0YSAhPSBcIltET05FXVwiKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHBheWxvYWQgPSBKU09OLnBhcnNlKGUuZGF0YSk7XG4gICAgICAgICAgICAgIGNvbnN0IHRleHQgPSBwYXlsb2FkLmNob2ljZXNbMF0uZGVsdGEuY29udGVudDtcbiAgICAgICAgICAgICAgaWYgKCF0ZXh0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHR4dCArPSB0ZXh0O1xuICAgICAgICAgICAgICB0aGlzLnJlbmRlcl9tZXNzYWdlKHRleHQsIFwiYXNzaXN0YW50XCIsIHRydWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhpcy5lbmRfc3RyZWFtKCk7XG4gICAgICAgICAgICAgIHJlc29sdmUodHh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICB0aGlzLmFjdGl2ZV9zdHJlYW0uYWRkRXZlbnRMaXN0ZW5lcihcInJlYWR5c3RhdGVjaGFuZ2VcIiwgKGUpID0+IHtcbiAgICAgICAgICAgIGlmIChlLnJlYWR5U3RhdGUgPj0gMikge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIlJlYWR5U3RhdGU6IFwiICsgZS5yZWFkeVN0YXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICB0aGlzLmFjdGl2ZV9zdHJlYW0uYWRkRXZlbnRMaXN0ZW5lcihcImVycm9yXCIsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGUpO1xuICAgICAgICAgICAgbmV3IE9ic2lkaWFuLk5vdGljZShcIlNtYXJ0IENvbm5lY3Rpb25zIEVycm9yIFN0cmVhbWluZyBSZXNwb25zZS4gU2VlIGNvbnNvbGUgZm9yIGRldGFpbHMuXCIpO1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJfbWVzc2FnZShcIipBUEkgRXJyb3IuIFNlZSBjb25zb2xlIGxvZ3MgZm9yIGRldGFpbHMuKlwiLCBcImFzc2lzdGFudFwiKTtcbiAgICAgICAgICAgIHRoaXMuZW5kX3N0cmVhbSgpO1xuICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHRoaXMuYWN0aXZlX3N0cmVhbS5zdHJlYW0oKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICAgIG5ldyBPYnNpZGlhbi5Ob3RpY2UoXCJTbWFydCBDb25uZWN0aW9ucyBFcnJvciBTdHJlYW1pbmcgUmVzcG9uc2UuIFNlZSBjb25zb2xlIGZvciBkZXRhaWxzLlwiKTtcbiAgICAgICAgICB0aGlzLmVuZF9zdHJlYW0oKTtcbiAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICAvLyBjb25zb2xlLmxvZyhmdWxsX3N0cik7XG4gICAgICBhd2FpdCB0aGlzLnJlbmRlcl9tZXNzYWdlKGZ1bGxfc3RyLCBcImFzc2lzdGFudFwiKTtcbiAgICAgIHRoaXMuY2hhdC5uZXdfbWVzc2FnZV9pbl90aHJlYWQoe1xuICAgICAgICByb2xlOiBcImFzc2lzdGFudFwiLFxuICAgICAgICBjb250ZW50OiBmdWxsX3N0clxuICAgICAgfSk7XG4gICAgICByZXR1cm47XG4gICAgfWVsc2V7XG4gICAgICB0cnl7XG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgKDAsIE9ic2lkaWFuLnJlcXVlc3RVcmwpKHtcbiAgICAgICAgICB1cmw6IGBodHRwczovL2FwaS5vcGVuYWkuY29tL3YxL2NoYXQvY29tcGxldGlvbnNgLFxuICAgICAgICAgIG1ldGhvZDogXCJQT1NUXCIsXG4gICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke3RoaXMucGx1Z2luLnNldHRpbmdzLmFwaV9rZXl9YCxcbiAgICAgICAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkob3B0cyksXG4gICAgICAgICAgdGhyb3c6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhyZXNwb25zZSk7XG4gICAgICAgIHJldHVybiBKU09OLnBhcnNlKHJlc3BvbnNlLnRleHQpLmNob2ljZXNbMF0ubWVzc2FnZS5jb250ZW50O1xuICAgICAgfWNhdGNoKGVycil7XG4gICAgICAgIG5ldyBPYnNpZGlhbi5Ob3RpY2UoYFNtYXJ0IENvbm5lY3Rpb25zIEFQSSBFcnJvciA6OiAke2Vycn1gKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBlbmRfc3RyZWFtKCkge1xuICAgIGlmKHRoaXMuYWN0aXZlX3N0cmVhbSl7XG4gICAgICB0aGlzLmFjdGl2ZV9zdHJlYW0uY2xvc2UoKTtcbiAgICAgIHRoaXMuYWN0aXZlX3N0cmVhbSA9IG51bGw7XG4gICAgfVxuICAgIHRoaXMudW5zZXRfc3RyZWFtaW5nX3V4KCk7XG4gICAgaWYodGhpcy5kb3Rkb3Rkb3RfaW50ZXJ2YWwpe1xuICAgICAgY2xlYXJJbnRlcnZhbCh0aGlzLmRvdGRvdGRvdF9pbnRlcnZhbCk7XG4gICAgICB0aGlzLmRvdGRvdGRvdF9pbnRlcnZhbCA9IG51bGw7XG4gICAgICAvLyByZW1vdmUgcGFyZW50IG9mIGFjdGl2ZV9lbG1cbiAgICAgIHRoaXMuYWN0aXZlX2VsbS5wYXJlbnRFbGVtZW50LnJlbW92ZSgpO1xuICAgICAgdGhpcy5hY3RpdmVfZWxtID0gbnVsbDtcbiAgICB9XG4gIH1cblxuICBhc3luYyBnZXRfY29udGV4dF9oeWRlKHVzZXJfaW5wdXQpIHtcbiAgICB0aGlzLmNoYXQucmVzZXRfY29udGV4dCgpO1xuICAgIC8vIGNvdW50IGN1cnJlbnQgY2hhdCBtbCBtZXNzYWdlcyB0byBkZXRlcm1pbmUgJ3F1ZXN0aW9uJyBvciAnY2hhdCBsb2cnIHdvcmRpbmdcbiAgICBjb25zdCBoeWRfaW5wdXQgPSBgQW50aWNpcGF0ZSB3aGF0IHRoZSB1c2VyIGlzIHNlZWtpbmcuIFJlc3BvbmQgaW4gdGhlIGZvcm0gb2YgYSBoeXBvdGhldGljYWwgbm90ZSB3cml0dGVuIGJ5IHRoZSB1c2VyLiBUaGUgbm90ZSBtYXkgY29udGFpbiBzdGF0ZW1lbnRzIGFzIHBhcmFncmFwaHMsIGxpc3RzLCBvciBjaGVja2xpc3RzIGluIG1hcmtkb3duIGZvcm1hdCB3aXRoIG5vIGhlYWRpbmdzLiBQbGVhc2UgcmVzcG9uZCB3aXRoIG9uZSBoeXBvdGhldGljYWwgbm90ZSBhbmQgYWJzdGFpbiBmcm9tIGFueSBvdGhlciBjb21tZW50YXJ5LiBVc2UgdGhlIGZvcm1hdDogUEFSRU5UIEZPTERFUiBOQU1FID4gQ0hJTEQgRk9MREVSIE5BTUUgPiBGSUxFIE5BTUUgPiBIRUFESU5HIDEgPiBIRUFESU5HIDIgPiBIRUFESU5HIDM6IEhZUE9USEVUSUNBTCBOT1RFIENPTlRFTlRTLmA7XG4gICAgLy8gY29tcGxldGVcbiAgICBjb25zdCBjaGF0bWwgPSBbXG4gICAgICB7XG4gICAgICAgIHJvbGU6IFwic3lzdGVtXCIsXG4gICAgICAgIGNvbnRlbnQ6IGh5ZF9pbnB1dCBcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHJvbGU6IFwidXNlclwiLFxuICAgICAgICBjb250ZW50OiB1c2VyX2lucHV0XG4gICAgICB9XG4gICAgXTtcbiAgICBjb25zdCBoeWQgPSBhd2FpdCB0aGlzLnJlcXVlc3RfY2hhdGdwdF9jb21wbGV0aW9uKHtcbiAgICAgIG1lc3NhZ2VzOiBjaGF0bWwsXG4gICAgICBzdHJlYW06IGZhbHNlLFxuICAgICAgdGVtcGVyYXR1cmU6IDAsXG4gICAgICBtYXhfdG9rZW5zOiAxMzcsXG4gICAgfSk7XG4gICAgdGhpcy5jaGF0Lmh5ZCA9IGh5ZDtcbiAgICAvLyBjb25zb2xlLmxvZyhoeWQpO1xuICAgIGxldCBmaWx0ZXIgPSB7fTtcbiAgICAvLyBpZiBjb250YWlucyBmb2xkZXIgcmVmZXJlbmNlIHJlcHJlc2VudGVkIGJ5IC9mb2xkZXIvXG4gICAgaWYodGhpcy5jaGF0LmNvbnRhaW5zX2ZvbGRlcl9yZWZlcmVuY2UodXNlcl9pbnB1dCkpIHtcbiAgICAgIC8vIGdldCBmb2xkZXIgcmVmZXJlbmNlc1xuICAgICAgY29uc3QgZm9sZGVyX3JlZnMgPSB0aGlzLmNoYXQuZ2V0X2ZvbGRlcl9yZWZlcmVuY2VzKHVzZXJfaW5wdXQpO1xuICAgICAgLy8gY29uc29sZS5sb2coZm9sZGVyX3JlZnMpO1xuICAgICAgLy8gaWYgZm9sZGVyIHJlZmVyZW5jZXMgYXJlIHZhbGlkIChzdHJpbmcgb3IgYXJyYXkgb2Ygc3RyaW5ncylcbiAgICAgIGlmKGZvbGRlcl9yZWZzKXtcbiAgICAgICAgZmlsdGVyID0ge1xuICAgICAgICAgIHBhdGhfYmVnaW5zX3dpdGg6IGZvbGRlcl9yZWZzXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuICAgIC8vIHNlYXJjaCBmb3IgbmVhcmVzdCBiYXNlZCBvbiBoeWRcbiAgICBsZXQgbmVhcmVzdCA9IGF3YWl0IHRoaXMucGx1Z2luLmFwaS5zZWFyY2goaHlkLCBmaWx0ZXIpO1xuICAgIGNvbnNvbGUubG9nKFwibmVhcmVzdFwiLCBuZWFyZXN0Lmxlbmd0aCk7XG4gICAgbmVhcmVzdCA9IHRoaXMuZ2V0X25lYXJlc3RfdW50aWxfbmV4dF9kZXZfZXhjZWVkc19zdGRfZGV2KG5lYXJlc3QpO1xuICAgIGNvbnNvbGUubG9nKFwibmVhcmVzdCBhZnRlciBzdGQgZGV2IHNsaWNlXCIsIG5lYXJlc3QubGVuZ3RoKTtcbiAgICBuZWFyZXN0ID0gdGhpcy5zb3J0X2J5X2xlbl9hZGp1c3RlZF9zaW1pbGFyaXR5KG5lYXJlc3QpO1xuICAgIFxuICAgIHJldHVybiBhd2FpdCB0aGlzLmdldF9jb250ZXh0X2Zvcl9wcm9tcHQobmVhcmVzdCk7XG4gIH1cbiAgXG4gIFxuICBzb3J0X2J5X2xlbl9hZGp1c3RlZF9zaW1pbGFyaXR5KG5lYXJlc3QpIHtcbiAgICAvLyByZS1zb3J0IGJ5IHF1b3RpZW50IG9mIHNpbWlsYXJpdHkgZGl2aWRlZCBieSBsZW4gREVTQ1xuICAgIG5lYXJlc3QgPSBuZWFyZXN0LnNvcnQoKGEsIGIpID0+IHtcbiAgICAgIGNvbnN0IGFfc2NvcmUgPSBhLnNpbWlsYXJpdHkgLyBhLmxlbjtcbiAgICAgIGNvbnN0IGJfc2NvcmUgPSBiLnNpbWlsYXJpdHkgLyBiLmxlbjtcbiAgICAgIC8vIGlmIGEgaXMgZ3JlYXRlciB0aGFuIGIsIHJldHVybiAtMVxuICAgICAgaWYgKGFfc2NvcmUgPiBiX3Njb3JlKVxuICAgICAgICByZXR1cm4gLTE7XG4gICAgICAvLyBpZiBhIGlzIGxlc3MgdGhhbiBiLCByZXR1cm4gMVxuICAgICAgaWYgKGFfc2NvcmUgPCBiX3Njb3JlKVxuICAgICAgICByZXR1cm4gMTtcbiAgICAgIC8vIGlmIGEgaXMgZXF1YWwgdG8gYiwgcmV0dXJuIDBcbiAgICAgIHJldHVybiAwO1xuICAgIH0pO1xuICAgIHJldHVybiBuZWFyZXN0O1xuICB9XG5cbiAgZ2V0X25lYXJlc3RfdW50aWxfbmV4dF9kZXZfZXhjZWVkc19zdGRfZGV2KG5lYXJlc3QpIHtcbiAgICAvLyBnZXQgc3RkIGRldiBvZiBzaW1pbGFyaXR5XG4gICAgY29uc3Qgc2ltID0gbmVhcmVzdC5tYXAoKG4pID0+IG4uc2ltaWxhcml0eSk7XG4gICAgY29uc3QgbWVhbiA9IHNpbS5yZWR1Y2UoKGEsIGIpID0+IGEgKyBiKSAvIHNpbS5sZW5ndGg7XG4gICAgbGV0IHN0ZF9kZXYgPSBNYXRoLnNxcnQoc2ltLm1hcCgoeCkgPT4gTWF0aC5wb3coeCAtIG1lYW4sIDIpKS5yZWR1Y2UoKGEsIGIpID0+IGEgKyBiKSAvIHNpbS5sZW5ndGgpO1xuICAgIC8vIHNsaWNlIHdoZXJlIG5leHQgaXRlbSBkZXZpYXRpb24gaXMgZ3JlYXRlciB0aGFuIHN0ZF9kZXZcbiAgICBsZXQgc2xpY2VfaSA9IDA7XG4gICAgd2hpbGUgKHNsaWNlX2kgPCBuZWFyZXN0Lmxlbmd0aCkge1xuICAgICAgY29uc3QgbmV4dCA9IG5lYXJlc3Rbc2xpY2VfaSArIDFdO1xuICAgICAgaWYgKG5leHQpIHtcbiAgICAgICAgY29uc3QgbmV4dF9kZXYgPSBNYXRoLmFicyhuZXh0LnNpbWlsYXJpdHkgLSBuZWFyZXN0W3NsaWNlX2ldLnNpbWlsYXJpdHkpO1xuICAgICAgICBpZiAobmV4dF9kZXYgPiBzdGRfZGV2KSB7XG4gICAgICAgICAgaWYoc2xpY2VfaSA8IDMpIHN0ZF9kZXYgPSBzdGRfZGV2ICogMS41O1xuICAgICAgICAgIGVsc2UgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHNsaWNlX2krKztcbiAgICB9XG4gICAgLy8gc2VsZWN0IHRvcCByZXN1bHRzXG4gICAgbmVhcmVzdCA9IG5lYXJlc3Quc2xpY2UoMCwgc2xpY2VfaSsxKTtcbiAgICByZXR1cm4gbmVhcmVzdDtcbiAgfVxuICAvLyB0aGlzLnRlc3RfZ2V0X25lYXJlc3RfdW50aWxfbmV4dF9kZXZfZXhjZWVkc19zdGRfZGV2KCk7XG4gIC8vIC8vIHRlc3QgZ2V0X25lYXJlc3RfdW50aWxfbmV4dF9kZXZfZXhjZWVkc19zdGRfZGV2XG4gIC8vIHRlc3RfZ2V0X25lYXJlc3RfdW50aWxfbmV4dF9kZXZfZXhjZWVkc19zdGRfZGV2KCkge1xuICAvLyAgIGNvbnN0IG5lYXJlc3QgPSBbe3NpbWlsYXJpdHk6IDAuOTl9LCB7c2ltaWxhcml0eTogMC45OH0sIHtzaW1pbGFyaXR5OiAwLjk3fSwge3NpbWlsYXJpdHk6IDAuOTZ9LCB7c2ltaWxhcml0eTogMC45NX0sIHtzaW1pbGFyaXR5OiAwLjk0fSwge3NpbWlsYXJpdHk6IDAuOTN9LCB7c2ltaWxhcml0eTogMC45Mn0sIHtzaW1pbGFyaXR5OiAwLjkxfSwge3NpbWlsYXJpdHk6IDAuOX0sIHtzaW1pbGFyaXR5OiAwLjc5fSwge3NpbWlsYXJpdHk6IDAuNzh9LCB7c2ltaWxhcml0eTogMC43N30sIHtzaW1pbGFyaXR5OiAwLjc2fSwge3NpbWlsYXJpdHk6IDAuNzV9LCB7c2ltaWxhcml0eTogMC43NH0sIHtzaW1pbGFyaXR5OiAwLjczfSwge3NpbWlsYXJpdHk6IDAuNzJ9XTtcbiAgLy8gICBjb25zdCByZXN1bHQgPSB0aGlzLmdldF9uZWFyZXN0X3VudGlsX25leHRfZGV2X2V4Y2VlZHNfc3RkX2RldihuZWFyZXN0KTtcbiAgLy8gICBpZihyZXN1bHQubGVuZ3RoICE9PSAxMCl7XG4gIC8vICAgICBjb25zb2xlLmVycm9yKFwiZ2V0X25lYXJlc3RfdW50aWxfbmV4dF9kZXZfZXhjZWVkc19zdGRfZGV2IGZhaWxlZFwiLCByZXN1bHQpO1xuICAvLyAgIH1cbiAgLy8gfVxuXG4gIGFzeW5jIGdldF9jb250ZXh0X2Zvcl9wcm9tcHQobmVhcmVzdCkge1xuICAgIGxldCBjb250ZXh0ID0gW107XG4gICAgY29uc3QgTUFYX1NPVVJDRVMgPSAodGhpcy5wbHVnaW4uc2V0dGluZ3Muc21hcnRfY2hhdF9tb2RlbCA9PT0gJ2dwdC00LTExMDYtcHJldmlldycpID8gNDIgOiAyMDtcbiAgICBjb25zdCBNQVhfQ0hBUlMgPSBnZXRfbWF4X2NoYXJzKHRoaXMucGx1Z2luLnNldHRpbmdzLnNtYXJ0X2NoYXRfbW9kZWwpIC8gMjtcbiAgICBsZXQgY2hhcl9hY2N1bSA9IDA7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuZWFyZXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoY29udGV4dC5sZW5ndGggPj0gTUFYX1NPVVJDRVMpXG4gICAgICAgIGJyZWFrO1xuICAgICAgaWYgKGNoYXJfYWNjdW0gPj0gTUFYX0NIQVJTKVxuICAgICAgICBicmVhaztcbiAgICAgIGlmICh0eXBlb2YgbmVhcmVzdFtpXS5saW5rICE9PSAnc3RyaW5nJylcbiAgICAgICAgY29udGludWU7XG4gICAgICAvLyBnZW5lcmF0ZSBicmVhZGNydW1ic1xuICAgICAgY29uc3QgYnJlYWRjcnVtYnMgPSBuZWFyZXN0W2ldLmxpbmsucmVwbGFjZSgvIy9nLCBcIiA+IFwiKS5yZXBsYWNlKFwiLm1kXCIsIFwiXCIpLnJlcGxhY2UoL1xcLy9nLCBcIiA+IFwiKTtcbiAgICAgIGxldCBuZXdfY29udGV4dCA9IGAke2JyZWFkY3J1bWJzfTpcXG5gO1xuICAgICAgLy8gZ2V0IG1heCBhdmFpbGFibGUgY2hhcnMgdG8gYWRkIHRvIGNvbnRleHRcbiAgICAgIGNvbnN0IG1heF9hdmFpbGFibGVfY2hhcnMgPSBNQVhfQ0hBUlMgLSBjaGFyX2FjY3VtIC0gbmV3X2NvbnRleHQubGVuZ3RoO1xuICAgICAgaWYgKG5lYXJlc3RbaV0ubGluay5pbmRleE9mKFwiI1wiKSAhPT0gLTEpIHsgLy8gaXMgYmxvY2tcbiAgICAgICAgbmV3X2NvbnRleHQgKz0gYXdhaXQgdGhpcy5wbHVnaW4uYmxvY2tfcmV0cmlldmVyKG5lYXJlc3RbaV0ubGluaywgeyBtYXhfY2hhcnM6IG1heF9hdmFpbGFibGVfY2hhcnMgfSk7XG4gICAgICB9IGVsc2UgeyAvLyBpcyBmaWxlXG4gICAgICAgIG5ld19jb250ZXh0ICs9IGF3YWl0IHRoaXMucGx1Z2luLmZpbGVfcmV0cmlldmVyKG5lYXJlc3RbaV0ubGluaywgeyBtYXhfY2hhcnM6IG1heF9hdmFpbGFibGVfY2hhcnMgfSk7XG4gICAgICB9XG4gICAgICAvLyBhZGQgdG8gY2hhcl9hY2N1bVxuICAgICAgY2hhcl9hY2N1bSArPSBuZXdfY29udGV4dC5sZW5ndGg7XG4gICAgICAvLyBhZGQgdG8gY29udGV4dFxuICAgICAgY29udGV4dC5wdXNoKHtcbiAgICAgICAgbGluazogbmVhcmVzdFtpXS5saW5rLFxuICAgICAgICB0ZXh0OiBuZXdfY29udGV4dFxuICAgICAgfSk7XG4gICAgfVxuICAgIC8vIGNvbnRleHQgc291cmNlc1xuICAgIGNvbnNvbGUubG9nKFwiY29udGV4dCBzb3VyY2VzOiBcIiArIGNvbnRleHQubGVuZ3RoKTtcbiAgICAvLyBjaGFyX2FjY3VtIGRpdmlkZWQgYnkgNCBhbmQgcm91bmRlZCB0byBuZWFyZXN0IGludGVnZXIgZm9yIGVzdGltYXRlZCB0b2tlbnNcbiAgICBjb25zb2xlLmxvZyhcInRvdGFsIGNvbnRleHQgdG9rZW5zOiB+XCIgKyBNYXRoLnJvdW5kKGNoYXJfYWNjdW0gLyAzLjUpKTtcbiAgICAvLyBidWlsZCBjb250ZXh0IGlucHV0XG4gICAgdGhpcy5jaGF0LmNvbnRleHQgPSBgQW50aWNpcGF0ZSB0aGUgdHlwZSBvZiBhbnN3ZXIgZGVzaXJlZCBieSB0aGUgdXNlci4gSW1hZ2luZSB0aGUgZm9sbG93aW5nICR7Y29udGV4dC5sZW5ndGh9IG5vdGVzIHdlcmUgd3JpdHRlbiBieSB0aGUgdXNlciBhbmQgY29udGFpbiBhbGwgdGhlIG5lY2Vzc2FyeSBpbmZvcm1hdGlvbiB0byBhbnN3ZXIgdGhlIHVzZXIncyBxdWVzdGlvbi4gQmVnaW4gcmVzcG9uc2VzIHdpdGggXCIke1NNQVJUX1RSQU5TTEFUSU9OW3RoaXMucGx1Z2luLnNldHRpbmdzLmxhbmd1YWdlXS5wcm9tcHR9Li4uXCJgO1xuICAgIGZvcihsZXQgaSA9IDA7IGkgPCBjb250ZXh0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICB0aGlzLmNoYXQuY29udGV4dCArPSBgXFxuLS0tQkVHSU4gIyR7aSsxfS0tLVxcbiR7Y29udGV4dFtpXS50ZXh0fVxcbi0tLUVORCAjJHtpKzF9LS0tYDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuY2hhdC5jb250ZXh0O1xuICB9XG5cblxufVxuXG5mdW5jdGlvbiBnZXRfbWF4X2NoYXJzKG1vZGVsPVwiZ3B0LTMuNS10dXJib1wiKSB7XG4gIGNvbnN0IE1BWF9DSEFSX01BUCA9IHtcbiAgICBcImdwdC0zLjUtdHVyYm8tMTZrXCI6IDQ4MDAwLFxuICAgIFwiZ3B0LTRcIjogMjQwMDAsXG4gICAgXCJncHQtMy41LXR1cmJvXCI6IDEyMDAwLFxuICAgIFwiZ3B0LTQtMTEwNi1wcmV2aWV3XCI6IDIwMDAwMCxcbiAgfTtcbiAgcmV0dXJuIE1BWF9DSEFSX01BUFttb2RlbF07XG59XG4vKipcbiAqIFNtYXJ0Q29ubmVjdGlvbnNDaGF0TW9kZWxcbiAqIC0tLVxuICogLSAndGhyZWFkJyBmb3JtYXQ6IEFycmF5W0FycmF5W09iamVjdHtyb2xlLCBjb250ZW50LCBoeWRlfV1dXG4gKiAgLSBbVHVyblt2YXJpYXRpb257fV0sIFR1cm5bdmFyaWF0aW9ue30sIHZhcmlhdGlvbnt9XSwgLi4uXVxuICogLSBTYXZlcyBpbiAndGhyZWFkJyBmb3JtYXQgdG8gSlNPTiBmaWxlIGluIC5zbWFydC1jb25uZWN0aW9ucyBmb2xkZXIgdXNpbmcgY2hhdF9pZCBhcyBmaWxlbmFtZVxuICogLSBMb2FkcyBjaGF0IGluICd0aHJlYWQnIGZvcm1hdCBBcnJheVtBcnJheVtPYmplY3R7cm9sZSwgY29udGVudCwgaHlkZX1dXSBmcm9tIEpTT04gZmlsZSBpbiAuc21hcnQtY29ubmVjdGlvbnMgZm9sZGVyXG4gKiAtIHByZXBhcmVzIGNoYXRfbWwgcmV0dXJucyBpbiAnQ2hhdE1MJyBmb3JtYXQgXG4gKiAgLSBzdHJpcHMgYWxsIGJ1dCByb2xlIGFuZCBjb250ZW50IHByb3BlcnRpZXMgZnJvbSBPYmplY3QgaW4gQ2hhdE1MIGZvcm1hdFxuICogLSBDaGF0TUwgQXJyYXlbT2JqZWN0e3JvbGUsIGNvbnRlbnR9XVxuICogIC0gW0N1cnJlbnRfVmFyaWF0aW9uX0Zvcl9UdXJuXzF7fSwgQ3VycmVudF9WYXJpYXRpb25fRm9yX1R1cm5fMnt9LCAuLi5dXG4gKi9cbmNsYXNzIFNtYXJ0Q29ubmVjdGlvbnNDaGF0TW9kZWwge1xuICBjb25zdHJ1Y3RvcihwbHVnaW4pIHtcbiAgICB0aGlzLmFwcCA9IHBsdWdpbi5hcHA7XG4gICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XG4gICAgdGhpcy5jaGF0X2lkID0gbnVsbDtcbiAgICB0aGlzLmNoYXRfbWwgPSBbXTtcbiAgICB0aGlzLmNvbnRleHQgPSBudWxsO1xuICAgIHRoaXMuaHlkID0gbnVsbDtcbiAgICB0aGlzLnRocmVhZCA9IFtdO1xuICB9XG4gIGFzeW5jIHNhdmVfY2hhdCgpIHtcbiAgICAvLyByZXR1cm4gaWYgdGhyZWFkIGlzIGVtcHR5XG4gICAgaWYgKHRoaXMudGhyZWFkLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgIC8vIHNhdmUgY2hhdCB0byBmaWxlIGluIC5zbWFydC1jb25uZWN0aW9ucyBmb2xkZXJcbiAgICAvLyBjcmVhdGUgLnNtYXJ0LWNvbm5lY3Rpb25zL2NoYXRzLyBmb2xkZXIgaWYgaXQgZG9lc24ndCBleGlzdFxuICAgIGlmICghKGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIuZXhpc3RzKFwiLnNtYXJ0LWNvbm5lY3Rpb25zL2NoYXRzXCIpKSkge1xuICAgICAgYXdhaXQgdGhpcy5hcHAudmF1bHQuYWRhcHRlci5ta2RpcihcIi5zbWFydC1jb25uZWN0aW9ucy9jaGF0c1wiKTtcbiAgICB9XG4gICAgLy8gaWYgY2hhdF9pZCBpcyBub3Qgc2V0LCBzZXQgaXQgdG8gVU5USVRMRUQtJHt1bml4IHRpbWVzdGFtcH1cbiAgICBpZiAoIXRoaXMuY2hhdF9pZCkge1xuICAgICAgdGhpcy5jaGF0X2lkID0gdGhpcy5uYW1lKCkgKyBcIlx1MjAxNFwiICsgdGhpcy5nZXRfZmlsZV9kYXRlX3N0cmluZygpO1xuICAgIH1cbiAgICAvLyB2YWxpZGF0ZSBjaGF0X2lkIGlzIHNldCB0byB2YWxpZCBmaWxlbmFtZSBjaGFyYWN0ZXJzIChsZXR0ZXJzLCBudW1iZXJzLCB1bmRlcnNjb3JlcywgZGFzaGVzLCBlbSBkYXNoLCBhbmQgc3BhY2VzKVxuICAgIGlmICghdGhpcy5jaGF0X2lkLm1hdGNoKC9eW2EtekEtWjAtOV9cdTIwMTRcXC0gXSskLykpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiSW52YWxpZCBjaGF0X2lkOiBcIiArIHRoaXMuY2hhdF9pZCk7XG4gICAgICBuZXcgT2JzaWRpYW4uTm90aWNlKFwiW1NtYXJ0IENvbm5lY3Rpb25zXSBGYWlsZWQgdG8gc2F2ZSBjaGF0LiBJbnZhbGlkIGNoYXRfaWQ6ICdcIiArIHRoaXMuY2hhdF9pZCArIFwiJ1wiKTtcbiAgICB9XG4gICAgLy8gZmlsZW5hbWUgaXMgY2hhdF9pZFxuICAgIGNvbnN0IGNoYXRfZmlsZSA9IHRoaXMuY2hhdF9pZCArIFwiLmpzb25cIjtcbiAgICB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLndyaXRlKFxuICAgICAgXCIuc21hcnQtY29ubmVjdGlvbnMvY2hhdHMvXCIgKyBjaGF0X2ZpbGUsXG4gICAgICBKU09OLnN0cmluZ2lmeSh0aGlzLnRocmVhZCwgbnVsbCwgMilcbiAgICApO1xuICB9XG4gIGFzeW5jIGxvYWRfY2hhdChjaGF0X2lkKSB7XG4gICAgdGhpcy5jaGF0X2lkID0gY2hhdF9pZDtcbiAgICAvLyBsb2FkIGNoYXQgZnJvbSBmaWxlIGluIC5zbWFydC1jb25uZWN0aW9ucyBmb2xkZXJcbiAgICAvLyBmaWxlbmFtZSBpcyBjaGF0X2lkXG4gICAgY29uc3QgY2hhdF9maWxlID0gdGhpcy5jaGF0X2lkICsgXCIuanNvblwiO1xuICAgIC8vIHJlYWQgZmlsZVxuICAgIGxldCBjaGF0X2pzb24gPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLnJlYWQoXG4gICAgICBcIi5zbWFydC1jb25uZWN0aW9ucy9jaGF0cy9cIiArIGNoYXRfZmlsZVxuICAgICk7XG4gICAgLy8gcGFyc2UganNvblxuICAgIHRoaXMudGhyZWFkID0gSlNPTi5wYXJzZShjaGF0X2pzb24pO1xuICAgIC8vIGxvYWQgY2hhdF9tbFxuICAgIHRoaXMuY2hhdF9tbCA9IHRoaXMucHJlcGFyZV9jaGF0X21sKCk7XG4gICAgLy8gcmVuZGVyIG1lc3NhZ2VzIGluIGNoYXQgdmlld1xuICAgIC8vIGZvciBlYWNoIHR1cm4gaW4gY2hhdF9tbFxuICAgIC8vIGNvbnNvbGUubG9nKHRoaXMudGhyZWFkKTtcbiAgICAvLyBjb25zb2xlLmxvZyh0aGlzLmNoYXRfbWwpO1xuICB9XG4gIC8vIHByZXBhcmUgY2hhdF9tbCBmcm9tIGNoYXRcbiAgLy8gZ2V0cyB0aGUgbGFzdCBtZXNzYWdlIG9mIGVhY2ggdHVybiB1bmxlc3MgdHVybl92YXJpYXRpb25fb2Zmc2V0cz1bW3R1cm5faW5kZXgsdmFyaWF0aW9uX2luZGV4XV0gaXMgc3BlY2lmaWVkIGluIG9mZnNldFxuICBwcmVwYXJlX2NoYXRfbWwodHVybl92YXJpYXRpb25fb2Zmc2V0cz1bXSkge1xuICAgIC8vIGlmIG5vIHR1cm5fdmFyaWF0aW9uX29mZnNldHMsIGdldCB0aGUgbGFzdCBtZXNzYWdlIG9mIGVhY2ggdHVyblxuICAgIGlmKHR1cm5fdmFyaWF0aW9uX29mZnNldHMubGVuZ3RoID09PSAwKXtcbiAgICAgIHRoaXMuY2hhdF9tbCA9IHRoaXMudGhyZWFkLm1hcCh0dXJuID0+IHtcbiAgICAgICAgcmV0dXJuIHR1cm5bdHVybi5sZW5ndGggLSAxXTtcbiAgICAgIH0pO1xuICAgIH1lbHNle1xuICAgICAgLy8gY3JlYXRlIGFuIGFycmF5IGZyb20gdHVybl92YXJpYXRpb25fb2Zmc2V0cyB0aGF0IGluZGV4ZXMgdmFyaWF0aW9uX2luZGV4IGF0IHR1cm5faW5kZXhcbiAgICAgIC8vIGV4LiBbWzMsNV1dID0+IFt1bmRlZmluZWQsIHVuZGVmaW5lZCwgdW5kZWZpbmVkLCA1XVxuICAgICAgbGV0IHR1cm5fdmFyaWF0aW9uX2luZGV4ID0gW107XG4gICAgICBmb3IobGV0IGkgPSAwOyBpIDwgdHVybl92YXJpYXRpb25fb2Zmc2V0cy5sZW5ndGg7IGkrKyl7XG4gICAgICAgIHR1cm5fdmFyaWF0aW9uX2luZGV4W3R1cm5fdmFyaWF0aW9uX29mZnNldHNbaV1bMF1dID0gdHVybl92YXJpYXRpb25fb2Zmc2V0c1tpXVsxXTtcbiAgICAgIH1cbiAgICAgIC8vIGxvb3AgdGhyb3VnaCBjaGF0XG4gICAgICB0aGlzLmNoYXRfbWwgPSB0aGlzLnRocmVhZC5tYXAoKHR1cm4sIHR1cm5faW5kZXgpID0+IHtcbiAgICAgICAgLy8gaWYgdGhlcmUgaXMgYW4gaW5kZXggZm9yIHRoaXMgdHVybiwgcmV0dXJuIHRoZSB2YXJpYXRpb24gYXQgdGhhdCBpbmRleFxuICAgICAgICBpZih0dXJuX3ZhcmlhdGlvbl9pbmRleFt0dXJuX2luZGV4XSAhPT0gdW5kZWZpbmVkKXtcbiAgICAgICAgICByZXR1cm4gdHVyblt0dXJuX3ZhcmlhdGlvbl9pbmRleFt0dXJuX2luZGV4XV07XG4gICAgICAgIH1cbiAgICAgICAgLy8gb3RoZXJ3aXNlIHJldHVybiB0aGUgbGFzdCBtZXNzYWdlIG9mIHRoZSB0dXJuXG4gICAgICAgIHJldHVybiB0dXJuW3R1cm4ubGVuZ3RoIC0gMV07XG4gICAgICB9KTtcbiAgICB9XG4gICAgLy8gc3RyaXAgYWxsIGJ1dCByb2xlIGFuZCBjb250ZW50IHByb3BlcnRpZXMgZnJvbSBlYWNoIG1lc3NhZ2VcbiAgICB0aGlzLmNoYXRfbWwgPSB0aGlzLmNoYXRfbWwubWFwKG1lc3NhZ2UgPT4ge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcm9sZTogbWVzc2FnZS5yb2xlLFxuICAgICAgICBjb250ZW50OiBtZXNzYWdlLmNvbnRlbnRcbiAgICAgIH07XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMuY2hhdF9tbDtcbiAgfVxuICBsYXN0KCkge1xuICAgIC8vIGdldCBsYXN0IG1lc3NhZ2UgZnJvbSBjaGF0XG4gICAgcmV0dXJuIHRoaXMudGhyZWFkW3RoaXMudGhyZWFkLmxlbmd0aCAtIDFdW3RoaXMudGhyZWFkW3RoaXMudGhyZWFkLmxlbmd0aCAtIDFdLmxlbmd0aCAtIDFdO1xuICB9XG4gIGxhc3RfZnJvbSgpIHtcbiAgICByZXR1cm4gdGhpcy5sYXN0KCkucm9sZTtcbiAgfVxuICAvLyByZXR1cm5zIHVzZXJfaW5wdXQgb3IgY29tcGxldGlvblxuICBsYXN0X21lc3NhZ2UoKSB7XG4gICAgcmV0dXJuIHRoaXMubGFzdCgpLmNvbnRlbnQ7XG4gIH1cbiAgLy8gbWVzc2FnZT17fVxuICAvLyBhZGQgbmV3IG1lc3NhZ2UgdG8gdGhyZWFkXG4gIG5ld19tZXNzYWdlX2luX3RocmVhZChtZXNzYWdlLCB0dXJuPS0xKSB7XG4gICAgLy8gaWYgdHVybiBpcyAtMSwgYWRkIHRvIG5ldyB0dXJuXG4gICAgaWYodGhpcy5jb250ZXh0KXtcbiAgICAgIG1lc3NhZ2UuY29udGV4dCA9IHRoaXMuY29udGV4dDtcbiAgICAgIHRoaXMuY29udGV4dCA9IG51bGw7XG4gICAgfVxuICAgIGlmKHRoaXMuaHlkKXtcbiAgICAgIG1lc3NhZ2UuaHlkID0gdGhpcy5oeWQ7XG4gICAgICB0aGlzLmh5ZCA9IG51bGw7XG4gICAgfVxuICAgIGlmICh0dXJuID09PSAtMSkge1xuICAgICAgdGhpcy50aHJlYWQucHVzaChbbWVzc2FnZV0pO1xuICAgIH1lbHNle1xuICAgICAgLy8gb3RoZXJ3aXNlIGFkZCB0byBzcGVjaWZpZWQgdHVyblxuICAgICAgdGhpcy50aHJlYWRbdHVybl0ucHVzaChtZXNzYWdlKTtcbiAgICB9XG4gIH1cbiAgcmVzZXRfY29udGV4dCgpe1xuICAgIHRoaXMuY29udGV4dCA9IG51bGw7XG4gICAgdGhpcy5oeWQgPSBudWxsO1xuICB9XG4gIGFzeW5jIHJlbmFtZV9jaGF0KG5ld19uYW1lKXtcbiAgICAvLyBjaGVjayBpZiBjdXJyZW50IGNoYXRfaWQgZmlsZSBleGlzdHNcbiAgICBpZiAodGhpcy5jaGF0X2lkICYmIGF3YWl0IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIuZXhpc3RzKFwiLnNtYXJ0LWNvbm5lY3Rpb25zL2NoYXRzL1wiICsgdGhpcy5jaGF0X2lkICsgXCIuanNvblwiKSkge1xuICAgICAgbmV3X25hbWUgPSB0aGlzLmNoYXRfaWQucmVwbGFjZSh0aGlzLm5hbWUoKSwgbmV3X25hbWUpO1xuICAgICAgLy8gcmVuYW1lIGZpbGUgaWYgaXQgZXhpc3RzXG4gICAgICBhd2FpdCB0aGlzLmFwcC52YXVsdC5hZGFwdGVyLnJlbmFtZShcbiAgICAgICAgXCIuc21hcnQtY29ubmVjdGlvbnMvY2hhdHMvXCIgKyB0aGlzLmNoYXRfaWQgKyBcIi5qc29uXCIsXG4gICAgICAgIFwiLnNtYXJ0LWNvbm5lY3Rpb25zL2NoYXRzL1wiICsgbmV3X25hbWUgKyBcIi5qc29uXCJcbiAgICAgICk7XG4gICAgICAvLyBzZXQgY2hhdF9pZCB0byBuZXdfbmFtZVxuICAgICAgdGhpcy5jaGF0X2lkID0gbmV3X25hbWU7XG4gICAgfWVsc2V7XG4gICAgICB0aGlzLmNoYXRfaWQgPSBuZXdfbmFtZSArIFwiXHUyMDE0XCIgKyB0aGlzLmdldF9maWxlX2RhdGVfc3RyaW5nKCk7XG4gICAgICAvLyBzYXZlIGNoYXRcbiAgICAgIGF3YWl0IHRoaXMuc2F2ZV9jaGF0KCk7XG4gICAgfVxuXG4gIH1cblxuICBuYW1lKCkge1xuICAgIGlmKHRoaXMuY2hhdF9pZCl7XG4gICAgICAvLyByZW1vdmUgZGF0ZSBhZnRlciBsYXN0IGVtIGRhc2hcbiAgICAgIHJldHVybiB0aGlzLmNoYXRfaWQucmVwbGFjZSgvXHUyMDE0W15cdTIwMTRdKiQvLFwiXCIpO1xuICAgIH1cbiAgICByZXR1cm4gXCJVTlRJVExFRFwiO1xuICB9XG5cbiAgZ2V0X2ZpbGVfZGF0ZV9zdHJpbmcoKSB7XG4gICAgcmV0dXJuIG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5yZXBsYWNlKC8oVHw6fFxcLi4qKS9nLCBcIiBcIikudHJpbSgpO1xuICB9XG4gIC8vIGdldCByZXNwb25zZSBmcm9tIHdpdGggbm90ZSBjb250ZXh0XG4gIGFzeW5jIGdldF9yZXNwb25zZV93aXRoX25vdGVfY29udGV4dCh1c2VyX2lucHV0LCBjaGF0X3ZpZXcpIHtcbiAgICBsZXQgc3lzdGVtX2lucHV0ID0gXCJJbWFnaW5lIHRoZSBmb2xsb3dpbmcgbm90ZXMgd2VyZSB3cml0dGVuIGJ5IHRoZSB1c2VyIGFuZCBjb250YWluIHRoZSBuZWNlc3NhcnkgaW5mb3JtYXRpb24gdG8gc3ludGhlc2l6ZSBhIHVzZWZ1bCBhbnN3ZXIgdGhlIHVzZXIncyBxdWVyeTpcXG5cIjtcbiAgICAvLyBleHRyYWN0IGludGVybmFsIGxpbmtzXG4gICAgY29uc3Qgbm90ZXMgPSB0aGlzLmV4dHJhY3RfaW50ZXJuYWxfbGlua3ModXNlcl9pbnB1dCk7XG4gICAgLy8gZ2V0IGNvbnRlbnQgb2YgaW50ZXJuYWwgbGlua3MgYXMgY29udGV4dFxuICAgIGxldCBtYXhfY2hhcnMgPSBnZXRfbWF4X2NoYXJzKHRoaXMucGx1Z2luLnNldHRpbmdzLnNtYXJ0X2NoYXRfbW9kZWwpO1xuICAgIGZvcihsZXQgaSA9IDA7IGkgPCBub3Rlcy5sZW5ndGg7IGkrKyl7XG4gICAgICAvLyBtYXggY2hhcnMgZm9yIHRoaXMgbm90ZSBpcyBtYXhfY2hhcnMgZGl2aWRlZCBieSBudW1iZXIgb2Ygbm90ZXMgbGVmdFxuICAgICAgY29uc3QgdGhpc19tYXhfY2hhcnMgPSAobm90ZXMubGVuZ3RoIC0gaSA+IDEpID8gTWF0aC5mbG9vcihtYXhfY2hhcnMgLyAobm90ZXMubGVuZ3RoIC0gaSkpIDogbWF4X2NoYXJzO1xuICAgICAgLy8gY29uc29sZS5sb2coXCJmaWxlIGNvbnRleHQgbWF4IGNoYXJzOiBcIiArIHRoaXNfbWF4X2NoYXJzKTtcbiAgICAgIGNvbnN0IG5vdGVfY29udGVudCA9IGF3YWl0IHRoaXMuZ2V0X25vdGVfY29udGVudHMobm90ZXNbaV0sIHtjaGFyX2xpbWl0OiB0aGlzX21heF9jaGFyc30pO1xuICAgICAgc3lzdGVtX2lucHV0ICs9IGAtLS1CRUdJTiBOT1RFOiBbWyR7bm90ZXNbaV0uYmFzZW5hbWV9XV0tLS1cXG5gXG4gICAgICBzeXN0ZW1faW5wdXQgKz0gbm90ZV9jb250ZW50O1xuICAgICAgc3lzdGVtX2lucHV0ICs9IGAtLS1FTkQgTk9URS0tLVxcbmBcbiAgICAgIG1heF9jaGFycyAtPSBub3RlX2NvbnRlbnQubGVuZ3RoO1xuICAgICAgaWYobWF4X2NoYXJzIDw9IDApIGJyZWFrO1xuICAgIH1cbiAgICB0aGlzLmNvbnRleHQgPSBzeXN0ZW1faW5wdXQ7XG4gICAgY29uc3QgY2hhdG1sID0gW1xuICAgICAge1xuICAgICAgICByb2xlOiBcInN5c3RlbVwiLFxuICAgICAgICBjb250ZW50OiBzeXN0ZW1faW5wdXRcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHJvbGU6IFwidXNlclwiLFxuICAgICAgICBjb250ZW50OiB1c2VyX2lucHV0XG4gICAgICB9XG4gICAgXTtcbiAgICBjaGF0X3ZpZXcucmVxdWVzdF9jaGF0Z3B0X2NvbXBsZXRpb24oe21lc3NhZ2VzOiBjaGF0bWwsIHRlbXBlcmF0dXJlOiAwfSk7XG4gIH1cbiAgLy8gY2hlY2sgaWYgY29udGFpbnMgaW50ZXJuYWwgbGlua1xuICBjb250YWluc19pbnRlcm5hbF9saW5rKHVzZXJfaW5wdXQpIHtcbiAgICBpZih1c2VyX2lucHV0LmluZGV4T2YoXCJbW1wiKSA9PT0gLTEpIHJldHVybiBmYWxzZTtcbiAgICBpZih1c2VyX2lucHV0LmluZGV4T2YoXCJdXVwiKSA9PT0gLTEpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICAvLyBjaGVjayBpZiBjb250YWlucyBmb2xkZXIgcmVmZXJlbmNlIChleC4gL2ZvbGRlci8sIG9yIC9mb2xkZXIvc3ViZm9sZGVyLylcbiAgY29udGFpbnNfZm9sZGVyX3JlZmVyZW5jZSh1c2VyX2lucHV0KSB7XG4gICAgaWYodXNlcl9pbnB1dC5pbmRleE9mKFwiL1wiKSA9PT0gLTEpIHJldHVybiBmYWxzZTtcbiAgICBpZih1c2VyX2lucHV0LmluZGV4T2YoXCIvXCIpID09PSB1c2VyX2lucHV0Lmxhc3RJbmRleE9mKFwiL1wiKSkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIC8vIGdldCBmb2xkZXIgcmVmZXJlbmNlcyBmcm9tIHVzZXIgaW5wdXRcbiAgZ2V0X2ZvbGRlcl9yZWZlcmVuY2VzKHVzZXJfaW5wdXQpIHtcbiAgICAvLyB1c2UgdGhpcy5mb2xkZXJzIHRvIGV4dHJhY3QgZm9sZGVyIHJlZmVyZW5jZXMgYnkgbG9uZ2VzdCBmaXJzdCAoZXguIC9mb2xkZXIvc3ViZm9sZGVyLyBiZWZvcmUgL2ZvbGRlci8pIHRvIGF2b2lkIG1hdGNoaW5nIC9mb2xkZXIvc3ViZm9sZGVyLyBhcyAvZm9sZGVyL1xuICAgIGNvbnN0IGZvbGRlcnMgPSB0aGlzLnBsdWdpbi5mb2xkZXJzLnNsaWNlKCk7IC8vIGNvcHkgZm9sZGVycyBhcnJheVxuICAgIGNvbnN0IG1hdGNoZXMgPSBmb2xkZXJzLnNvcnQoKGEsIGIpID0+IGIubGVuZ3RoIC0gYS5sZW5ndGgpLm1hcChmb2xkZXIgPT4ge1xuICAgICAgLy8gY2hlY2sgaWYgZm9sZGVyIGlzIGluIHVzZXJfaW5wdXRcbiAgICAgIGlmKHVzZXJfaW5wdXQuaW5kZXhPZihmb2xkZXIpICE9PSAtMSl7XG4gICAgICAgIC8vIHJlbW92ZSBmb2xkZXIgZnJvbSB1c2VyX2lucHV0IHRvIHByZXZlbnQgbWF0Y2hpbmcgL2ZvbGRlci9zdWJmb2xkZXIvIGFzIC9mb2xkZXIvXG4gICAgICAgIHVzZXJfaW5wdXQgPSB1c2VyX2lucHV0LnJlcGxhY2UoZm9sZGVyLCBcIlwiKTtcbiAgICAgICAgcmV0dXJuIGZvbGRlcjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9KS5maWx0ZXIoZm9sZGVyID0+IGZvbGRlcik7XG4gICAgY29uc29sZS5sb2cobWF0Y2hlcyk7XG4gICAgLy8gcmV0dXJuIGFycmF5IG9mIG1hdGNoZXNcbiAgICBpZihtYXRjaGVzKSByZXR1cm4gbWF0Y2hlcztcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuXG4gIC8vIGV4dHJhY3QgaW50ZXJuYWwgbGlua3NcbiAgZXh0cmFjdF9pbnRlcm5hbF9saW5rcyh1c2VyX2lucHV0KSB7XG4gICAgY29uc3QgbWF0Y2hlcyA9IHVzZXJfaW5wdXQubWF0Y2goL1xcW1xcWyguKj8pXFxdXFxdL2cpO1xuICAgIGNvbnNvbGUubG9nKG1hdGNoZXMpO1xuICAgIC8vIHJldHVybiBhcnJheSBvZiBURmlsZSBvYmplY3RzXG4gICAgaWYobWF0Y2hlcykgcmV0dXJuIG1hdGNoZXMubWFwKG1hdGNoID0+IHtcbiAgICAgIHJldHVybiB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpcnN0TGlua3BhdGhEZXN0KG1hdGNoLnJlcGxhY2UoXCJbW1wiLCBcIlwiKS5yZXBsYWNlKFwiXV1cIiwgXCJcIiksIFwiL1wiKTtcbiAgICB9KTtcbiAgICByZXR1cm4gW107XG4gIH1cbiAgLy8gZ2V0IGNvbnRleHQgZnJvbSBpbnRlcm5hbCBsaW5rc1xuICBhc3luYyBnZXRfbm90ZV9jb250ZW50cyhub3RlLCBvcHRzPXt9KSB7XG4gICAgb3B0cyA9IHtcbiAgICAgIGNoYXJfbGltaXQ6IDEwMDAwLFxuICAgICAgLi4ub3B0c1xuICAgIH1cbiAgICAvLyByZXR1cm4gaWYgbm90ZSBpcyBub3QgYSBmaWxlXG4gICAgaWYoIShub3RlIGluc3RhbmNlb2YgT2JzaWRpYW4uVEZpbGUpKSByZXR1cm4gXCJcIjtcbiAgICAvLyBnZXQgZmlsZSBjb250ZW50XG4gICAgbGV0IGZpbGVfY29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LmNhY2hlZFJlYWQobm90ZSk7XG4gICAgLy8gY2hlY2sgaWYgY29udGFpbnMgZGF0YXZpZXcgY29kZSBibG9ja1xuICAgIGlmKGZpbGVfY29udGVudC5pbmRleE9mKFwiYGBgZGF0YXZpZXdcIikgPiAtMSl7XG4gICAgICAvLyBpZiBjb250YWlucyBkYXRhdmlldyBjb2RlIGJsb2NrIGdldCBhbGwgZGF0YXZpZXcgY29kZSBibG9ja3NcbiAgICAgIGZpbGVfY29udGVudCA9IGF3YWl0IHRoaXMucmVuZGVyX2RhdGF2aWV3X3F1ZXJpZXMoZmlsZV9jb250ZW50LCBub3RlLnBhdGgsIG9wdHMpO1xuICAgIH1cbiAgICBmaWxlX2NvbnRlbnQgPSBmaWxlX2NvbnRlbnQuc3Vic3RyaW5nKDAsIG9wdHMuY2hhcl9saW1pdCk7XG4gICAgLy8gY29uc29sZS5sb2coZmlsZV9jb250ZW50Lmxlbmd0aCk7XG4gICAgcmV0dXJuIGZpbGVfY29udGVudDtcbiAgfVxuXG5cbiAgYXN5bmMgcmVuZGVyX2RhdGF2aWV3X3F1ZXJpZXMoZmlsZV9jb250ZW50LCBub3RlX3BhdGgsIG9wdHM9e30pIHtcbiAgICBvcHRzID0ge1xuICAgICAgY2hhcl9saW1pdDogbnVsbCxcbiAgICAgIC4uLm9wdHNcbiAgICB9O1xuICAgIC8vIHVzZSB3aW5kb3cgdG8gZ2V0IGRhdGF2aWV3IGFwaVxuICAgIGNvbnN0IGRhdGF2aWV3X2FwaSA9IHdpbmRvd1tcIkRhdGF2aWV3QVBJXCJdO1xuICAgIC8vIHNraXAgaWYgZGF0YXZpZXcgYXBpIG5vdCBmb3VuZFxuICAgIGlmKCFkYXRhdmlld19hcGkpIHJldHVybiBmaWxlX2NvbnRlbnQ7XG4gICAgY29uc3QgZGF0YXZpZXdfY29kZV9ibG9ja3MgPSBmaWxlX2NvbnRlbnQubWF0Y2goL2BgYGRhdGF2aWV3KC4qPylgYGAvZ3MpO1xuICAgIC8vIGZvciBlYWNoIGRhdGF2aWV3IGNvZGUgYmxvY2tcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRhdGF2aWV3X2NvZGVfYmxvY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAvLyBpZiBvcHRzIGNoYXJfbGltaXQgaXMgbGVzcyB0aGFuIGluZGV4T2YgZGF0YXZpZXcgY29kZSBibG9jaywgYnJlYWtcbiAgICAgIGlmKG9wdHMuY2hhcl9saW1pdCAmJiBvcHRzLmNoYXJfbGltaXQgPCBmaWxlX2NvbnRlbnQuaW5kZXhPZihkYXRhdmlld19jb2RlX2Jsb2Nrc1tpXSkpIGJyZWFrO1xuICAgICAgLy8gZ2V0IGRhdGF2aWV3IGNvZGUgYmxvY2tcbiAgICAgIGNvbnN0IGRhdGF2aWV3X2NvZGVfYmxvY2sgPSBkYXRhdmlld19jb2RlX2Jsb2Nrc1tpXTtcbiAgICAgIC8vIGdldCBjb250ZW50IG9mIGRhdGF2aWV3IGNvZGUgYmxvY2tcbiAgICAgIGNvbnN0IGRhdGF2aWV3X2NvZGVfYmxvY2tfY29udGVudCA9IGRhdGF2aWV3X2NvZGVfYmxvY2sucmVwbGFjZShcImBgYGRhdGF2aWV3XCIsIFwiXCIpLnJlcGxhY2UoXCJgYGBcIiwgXCJcIik7XG4gICAgICAvLyBnZXQgZGF0YXZpZXcgcXVlcnkgcmVzdWx0XG4gICAgICBjb25zdCBkYXRhdmlld19xdWVyeV9yZXN1bHQgPSBhd2FpdCBkYXRhdmlld19hcGkucXVlcnlNYXJrZG93bihkYXRhdmlld19jb2RlX2Jsb2NrX2NvbnRlbnQsIG5vdGVfcGF0aCwgbnVsbCk7XG4gICAgICAvLyBpZiBxdWVyeSByZXN1bHQgaXMgc3VjY2Vzc2Z1bCwgcmVwbGFjZSBkYXRhdmlldyBjb2RlIGJsb2NrIHdpdGggcXVlcnkgcmVzdWx0XG4gICAgICBpZiAoZGF0YXZpZXdfcXVlcnlfcmVzdWx0LnN1Y2Nlc3NmdWwpIHtcbiAgICAgICAgZmlsZV9jb250ZW50ID0gZmlsZV9jb250ZW50LnJlcGxhY2UoZGF0YXZpZXdfY29kZV9ibG9jaywgZGF0YXZpZXdfcXVlcnlfcmVzdWx0LnZhbHVlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZpbGVfY29udGVudDtcbiAgfVxufVxuXG5jbGFzcyBTbWFydENvbm5lY3Rpb25zQ2hhdEhpc3RvcnlNb2RhbCBleHRlbmRzIE9ic2lkaWFuLkZ1enp5U3VnZ2VzdE1vZGFsIHtcbiAgY29uc3RydWN0b3IoYXBwLCB2aWV3LCBmaWxlcykge1xuICAgIHN1cGVyKGFwcCk7XG4gICAgdGhpcy5hcHAgPSBhcHA7XG4gICAgdGhpcy52aWV3ID0gdmlldztcbiAgICB0aGlzLnNldFBsYWNlaG9sZGVyKFwiVHlwZSB0aGUgbmFtZSBvZiBhIGNoYXQgc2Vzc2lvbi4uLlwiKTtcbiAgfVxuICBnZXRJdGVtcygpIHtcbiAgICBpZiAoIXRoaXMudmlldy5maWxlcykge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy52aWV3LmZpbGVzO1xuICB9XG4gIGdldEl0ZW1UZXh0KGl0ZW0pIHtcbiAgICAvLyBpZiBub3QgVU5USVRMRUQsIHJlbW92ZSBkYXRlIGFmdGVyIGxhc3QgZW0gZGFzaFxuICAgIGlmKGl0ZW0uaW5kZXhPZihcIlVOVElUTEVEXCIpID09PSAtMSl7XG4gICAgICBpdGVtLnJlcGxhY2UoL1x1MjAxNFteXHUyMDE0XSokLyxcIlwiKTtcbiAgICB9XG4gICAgcmV0dXJuIGl0ZW07XG4gIH1cbiAgb25DaG9vc2VJdGVtKHNlc3Npb24pIHtcbiAgICB0aGlzLnZpZXcub3Blbl9jaGF0KHNlc3Npb24pO1xuICB9XG59XG5cbi8vIEZpbGUgU2VsZWN0IEZ1enp5IFN1Z2dlc3QgTW9kYWxcbmNsYXNzIFNtYXJ0Q29ubmVjdGlvbnNGaWxlU2VsZWN0TW9kYWwgZXh0ZW5kcyBPYnNpZGlhbi5GdXp6eVN1Z2dlc3RNb2RhbCB7XG4gIGNvbnN0cnVjdG9yKGFwcCwgdmlldykge1xuICAgIHN1cGVyKGFwcCk7XG4gICAgdGhpcy5hcHAgPSBhcHA7XG4gICAgdGhpcy52aWV3ID0gdmlldztcbiAgICB0aGlzLnNldFBsYWNlaG9sZGVyKFwiVHlwZSB0aGUgbmFtZSBvZiBhIGZpbGUuLi5cIik7XG4gIH1cbiAgZ2V0SXRlbXMoKSB7XG4gICAgLy8gZ2V0IGFsbCBtYXJrZG93biBmaWxlc1xuICAgIHJldHVybiB0aGlzLmFwcC52YXVsdC5nZXRNYXJrZG93bkZpbGVzKCkuc29ydCgoYSwgYikgPT4gYS5iYXNlbmFtZS5sb2NhbGVDb21wYXJlKGIuYmFzZW5hbWUpKTtcbiAgfVxuICBnZXRJdGVtVGV4dChpdGVtKSB7XG4gICAgcmV0dXJuIGl0ZW0uYmFzZW5hbWU7XG4gIH1cbiAgb25DaG9vc2VJdGVtKGZpbGUpIHtcbiAgICB0aGlzLnZpZXcuaW5zZXJ0X3NlbGVjdGlvbihmaWxlLmJhc2VuYW1lICsgXCJdXSBcIik7XG4gIH1cbn1cbi8vIEZvbGRlciBTZWxlY3QgRnV6enkgU3VnZ2VzdCBNb2RhbFxuY2xhc3MgU21hcnRDb25uZWN0aW9uc0ZvbGRlclNlbGVjdE1vZGFsIGV4dGVuZHMgT2JzaWRpYW4uRnV6enlTdWdnZXN0TW9kYWwge1xuICBjb25zdHJ1Y3RvcihhcHAsIHZpZXcpIHtcbiAgICBzdXBlcihhcHApO1xuICAgIHRoaXMuYXBwID0gYXBwO1xuICAgIHRoaXMudmlldyA9IHZpZXc7XG4gICAgdGhpcy5zZXRQbGFjZWhvbGRlcihcIlR5cGUgdGhlIG5hbWUgb2YgYSBmb2xkZXIuLi5cIik7XG4gIH1cbiAgZ2V0SXRlbXMoKSB7XG4gICAgcmV0dXJuIHRoaXMudmlldy5wbHVnaW4uZm9sZGVycztcbiAgfVxuICBnZXRJdGVtVGV4dChpdGVtKSB7XG4gICAgcmV0dXJuIGl0ZW07XG4gIH1cbiAgb25DaG9vc2VJdGVtKGZvbGRlcikge1xuICAgIHRoaXMudmlldy5pbnNlcnRfc2VsZWN0aW9uKGZvbGRlciArIFwiLyBcIik7XG4gIH1cbn1cblxuXG4vLyBIYW5kbGUgQVBJIHJlc3BvbnNlIHN0cmVhbWluZ1xuY2xhc3MgU2NTdHJlYW1lciB7XG4gIC8vIGNvbnN0cnVjdG9yXG4gIGNvbnN0cnVjdG9yKHVybCwgb3B0aW9ucykge1xuICAgIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB0aGlzLnVybCA9IHVybDtcbiAgICB0aGlzLm1ldGhvZCA9IG9wdGlvbnMubWV0aG9kIHx8ICdHRVQnO1xuICAgIHRoaXMuaGVhZGVycyA9IG9wdGlvbnMuaGVhZGVycyB8fCB7fTtcbiAgICB0aGlzLnBheWxvYWQgPSBvcHRpb25zLnBheWxvYWQgfHwgbnVsbDtcbiAgICB0aGlzLndpdGhDcmVkZW50aWFscyA9IG9wdGlvbnMud2l0aENyZWRlbnRpYWxzIHx8IGZhbHNlO1xuICAgIHRoaXMubGlzdGVuZXJzID0ge307XG4gICAgdGhpcy5yZWFkeVN0YXRlID0gdGhpcy5DT05ORUNUSU5HO1xuICAgIHRoaXMucHJvZ3Jlc3MgPSAwO1xuICAgIHRoaXMuY2h1bmsgPSAnJztcbiAgICB0aGlzLnhociA9IG51bGw7XG4gICAgdGhpcy5GSUVMRF9TRVBBUkFUT1IgPSAnOic7XG4gICAgdGhpcy5JTklUSUFMSVpJTkcgPSAtMTtcbiAgICB0aGlzLkNPTk5FQ1RJTkcgPSAwO1xuICAgIHRoaXMuT1BFTiA9IDE7XG4gICAgdGhpcy5DTE9TRUQgPSAyO1xuICB9XG4gIC8vIGFkZEV2ZW50TGlzdGVuZXJcbiAgYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcikge1xuICAgIC8vIGNoZWNrIGlmIHRoZSB0eXBlIGlzIGluIHRoZSBsaXN0ZW5lcnNcbiAgICBpZiAoIXRoaXMubGlzdGVuZXJzW3R5cGVdKSB7XG4gICAgICB0aGlzLmxpc3RlbmVyc1t0eXBlXSA9IFtdO1xuICAgIH1cbiAgICAvLyBjaGVjayBpZiB0aGUgbGlzdGVuZXIgaXMgYWxyZWFkeSBpbiB0aGUgbGlzdGVuZXJzXG4gICAgaWYodGhpcy5saXN0ZW5lcnNbdHlwZV0uaW5kZXhPZihsaXN0ZW5lcikgPT09IC0xKSB7XG4gICAgICB0aGlzLmxpc3RlbmVyc1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgICB9XG4gIH1cbiAgLy8gcmVtb3ZlRXZlbnRMaXN0ZW5lclxuICByZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgLy8gY2hlY2sgaWYgbGlzdGVuZXIgdHlwZSBpcyB1bmRlZmluZWRcbiAgICBpZiAoIXRoaXMubGlzdGVuZXJzW3R5cGVdKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxldCBmaWx0ZXJlZCA9IFtdO1xuICAgIC8vIGxvb3AgdGhyb3VnaCB0aGUgbGlzdGVuZXJzXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmxpc3RlbmVyc1t0eXBlXS5sZW5ndGg7IGkrKykge1xuICAgICAgLy8gY2hlY2sgaWYgdGhlIGxpc3RlbmVyIGlzIHRoZSBzYW1lXG4gICAgICBpZiAodGhpcy5saXN0ZW5lcnNbdHlwZV1baV0gIT09IGxpc3RlbmVyKSB7XG4gICAgICAgIGZpbHRlcmVkLnB1c2godGhpcy5saXN0ZW5lcnNbdHlwZV1baV0pO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBjaGVjayBpZiB0aGUgbGlzdGVuZXJzIGFyZSBlbXB0eVxuICAgIGlmICh0aGlzLmxpc3RlbmVyc1t0eXBlXS5sZW5ndGggPT09IDApIHtcbiAgICAgIGRlbGV0ZSB0aGlzLmxpc3RlbmVyc1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5saXN0ZW5lcnNbdHlwZV0gPSBmaWx0ZXJlZDtcbiAgICB9XG4gIH1cbiAgLy8gZGlzcGF0Y2hFdmVudFxuICBkaXNwYXRjaEV2ZW50KGV2ZW50KSB7XG4gICAgLy8gaWYgbm8gZXZlbnQgcmV0dXJuIHRydWVcbiAgICBpZiAoIWV2ZW50KSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgLy8gc2V0IGV2ZW50IHNvdXJjZSB0byB0aGlzXG4gICAgZXZlbnQuc291cmNlID0gdGhpcztcbiAgICAvLyBzZXQgb25IYW5kbGVyIHRvIG9uICsgZXZlbnQgdHlwZVxuICAgIGxldCBvbkhhbmRsZXIgPSAnb24nICsgZXZlbnQudHlwZTtcbiAgICAvLyBjaGVjayBpZiB0aGUgb25IYW5kbGVyIGhhcyBvd24gcHJvcGVydHkgbmFtZWQgc2FtZSBhcyBvbkhhbmRsZXJcbiAgICBpZiAodGhpcy5oYXNPd25Qcm9wZXJ0eShvbkhhbmRsZXIpKSB7XG4gICAgICAvLyBjYWxsIHRoZSBvbkhhbmRsZXJcbiAgICAgIHRoaXNbb25IYW5kbGVyXS5jYWxsKHRoaXMsIGV2ZW50KTtcbiAgICAgIC8vIGNoZWNrIGlmIHRoZSBldmVudCBpcyBkZWZhdWx0IHByZXZlbnRlZFxuICAgICAgaWYgKGV2ZW50LmRlZmF1bHRQcmV2ZW50ZWQpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBjaGVjayBpZiB0aGUgZXZlbnQgdHlwZSBpcyBpbiB0aGUgbGlzdGVuZXJzXG4gICAgaWYgKHRoaXMubGlzdGVuZXJzW2V2ZW50LnR5cGVdKSB7XG4gICAgICByZXR1cm4gdGhpcy5saXN0ZW5lcnNbZXZlbnQudHlwZV0uZXZlcnkoZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2soZXZlbnQpO1xuICAgICAgICByZXR1cm4gIWV2ZW50LmRlZmF1bHRQcmV2ZW50ZWQ7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgLy8gX3NldFJlYWR5U3RhdGVcbiAgX3NldFJlYWR5U3RhdGUoc3RhdGUpIHtcbiAgICAvLyBzZXQgZXZlbnQgdHlwZSB0byByZWFkeVN0YXRlQ2hhbmdlXG4gICAgbGV0IGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KCdyZWFkeVN0YXRlQ2hhbmdlJyk7XG4gICAgLy8gc2V0IGV2ZW50IHJlYWR5U3RhdGUgdG8gc3RhdGVcbiAgICBldmVudC5yZWFkeVN0YXRlID0gc3RhdGU7XG4gICAgLy8gc2V0IHJlYWR5U3RhdGUgdG8gc3RhdGVcbiAgICB0aGlzLnJlYWR5U3RhdGUgPSBzdGF0ZTtcbiAgICAvLyBkaXNwYXRjaCBldmVudFxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gIH1cbiAgLy8gX29uU3RyZWFtRmFpbHVyZVxuICBfb25TdHJlYW1GYWlsdXJlKGUpIHtcbiAgICAvLyBzZXQgZXZlbnQgdHlwZSB0byBlcnJvclxuICAgIGxldCBldmVudCA9IG5ldyBDdXN0b21FdmVudCgnZXJyb3InKTtcbiAgICAvLyBzZXQgZXZlbnQgZGF0YSB0byBlXG4gICAgZXZlbnQuZGF0YSA9IGUuY3VycmVudFRhcmdldC5yZXNwb25zZTtcbiAgICAvLyBkaXNwYXRjaCBldmVudFxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgdGhpcy5jbG9zZSgpO1xuICB9XG4gIC8vIF9vblN0cmVhbUFib3J0XG4gIF9vblN0cmVhbUFib3J0KGUpIHtcbiAgICAvLyBzZXQgdG8gYWJvcnRcbiAgICBsZXQgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoJ2Fib3J0Jyk7XG4gICAgLy8gY2xvc2VcbiAgICB0aGlzLmNsb3NlKCk7XG4gIH1cbiAgLy8gX29uU3RyZWFtUHJvZ3Jlc3NcbiAgX29uU3RyZWFtUHJvZ3Jlc3MoZSkge1xuICAgIC8vIGlmIG5vdCB4aHIgcmV0dXJuXG4gICAgaWYgKCF0aGlzLnhocikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyBpZiB4aHIgc3RhdHVzIGlzIG5vdCAyMDAgcmV0dXJuXG4gICAgaWYgKHRoaXMueGhyLnN0YXR1cyAhPT0gMjAwKSB7XG4gICAgICAvLyBvblN0cmVhbUZhaWx1cmVcbiAgICAgIHRoaXMuX29uU3RyZWFtRmFpbHVyZShlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gaWYgcmVhZHkgc3RhdGUgaXMgQ09OTkVDVElOR1xuICAgIGlmICh0aGlzLnJlYWR5U3RhdGUgPT09IHRoaXMuQ09OTkVDVElORykge1xuICAgICAgLy8gZGlzcGF0Y2ggZXZlbnRcbiAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ29wZW4nKSk7XG4gICAgICAvLyBzZXQgcmVhZHkgc3RhdGUgdG8gT1BFTlxuICAgICAgdGhpcy5fc2V0UmVhZHlTdGF0ZSh0aGlzLk9QRU4pO1xuICAgIH1cbiAgICAvLyBwYXJzZSB0aGUgcmVjZWl2ZWQgZGF0YS5cbiAgICBsZXQgZGF0YSA9IHRoaXMueGhyLnJlc3BvbnNlVGV4dC5zdWJzdHJpbmcodGhpcy5wcm9ncmVzcyk7XG4gICAgLy8gdXBkYXRlIHByb2dyZXNzXG4gICAgdGhpcy5wcm9ncmVzcyArPSBkYXRhLmxlbmd0aDtcbiAgICAvLyBzcGxpdCB0aGUgZGF0YSBieSBuZXcgbGluZSBhbmQgcGFyc2UgZWFjaCBsaW5lXG4gICAgZGF0YS5zcGxpdCgvKFxcclxcbnxcXHJ8XFxuKXsyfS9nKS5mb3JFYWNoKGZ1bmN0aW9uKHBhcnQpe1xuICAgICAgaWYocGFydC50cmltKCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudCh0aGlzLl9wYXJzZUV2ZW50Q2h1bmsodGhpcy5jaHVuay50cmltKCkpKTtcbiAgICAgICAgdGhpcy5jaHVuayA9ICcnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5jaHVuayArPSBwYXJ0O1xuICAgICAgfVxuICAgIH0uYmluZCh0aGlzKSk7XG4gIH1cbiAgLy8gX29uU3RyZWFtTG9hZGVkXG4gIF9vblN0cmVhbUxvYWRlZChlKSB7XG4gICAgdGhpcy5fb25TdHJlYW1Qcm9ncmVzcyhlKTtcbiAgICAvLyBwYXJzZSB0aGUgbGFzdCBjaHVua1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudCh0aGlzLl9wYXJzZUV2ZW50Q2h1bmsodGhpcy5jaHVuaykpO1xuICAgIHRoaXMuY2h1bmsgPSAnJztcbiAgfVxuICAvLyBfcGFyc2VFdmVudENodW5rXG4gIF9wYXJzZUV2ZW50Q2h1bmsoY2h1bmspIHtcbiAgICAvLyBpZiBubyBjaHVuayBvciBjaHVuayBpcyBlbXB0eSByZXR1cm5cbiAgICBpZiAoIWNodW5rIHx8IGNodW5rLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIC8vIGluaXQgZVxuICAgIGxldCBlID0ge2lkOiBudWxsLCByZXRyeTogbnVsbCwgZGF0YTogJycsIGV2ZW50OiAnbWVzc2FnZSd9O1xuICAgIC8vIHNwbGl0IHRoZSBjaHVuayBieSBuZXcgbGluZVxuICAgIGNodW5rLnNwbGl0KC8oXFxyXFxufFxccnxcXG4pLykuZm9yRWFjaChmdW5jdGlvbihsaW5lKSB7XG4gICAgICBsaW5lID0gbGluZS50cmltUmlnaHQoKTtcbiAgICAgIGxldCBpbmRleCA9IGxpbmUuaW5kZXhPZih0aGlzLkZJRUxEX1NFUEFSQVRPUik7XG4gICAgICBpZihpbmRleCA8PSAwKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIC8vIGZpZWxkXG4gICAgICBsZXQgZmllbGQgPSBsaW5lLnN1YnN0cmluZygwLCBpbmRleCk7XG4gICAgICBpZighKGZpZWxkIGluIGUpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIC8vIHZhbHVlXG4gICAgICBsZXQgdmFsdWUgPSBsaW5lLnN1YnN0cmluZyhpbmRleCArIDEpLnRyaW1MZWZ0KCk7XG4gICAgICBpZihmaWVsZCA9PT0gJ2RhdGEnKSB7XG4gICAgICAgIGVbZmllbGRdICs9IHZhbHVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZVtmaWVsZF0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICB9LmJpbmQodGhpcykpO1xuICAgIC8vIHJldHVybiBldmVudFxuICAgIGxldCBldmVudCA9IG5ldyBDdXN0b21FdmVudChlLmV2ZW50KTtcbiAgICBldmVudC5kYXRhID0gZS5kYXRhO1xuICAgIGV2ZW50LmlkID0gZS5pZDtcbiAgICByZXR1cm4gZXZlbnQ7XG4gIH1cbiAgLy8gX2NoZWNrU3RyZWFtQ2xvc2VkXG4gIF9jaGVja1N0cmVhbUNsb3NlZCgpIHtcbiAgICBpZighdGhpcy54aHIpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYodGhpcy54aHIucmVhZHlTdGF0ZSA9PT0gWE1MSHR0cFJlcXVlc3QuRE9ORSkge1xuICAgICAgdGhpcy5fc2V0UmVhZHlTdGF0ZSh0aGlzLkNMT1NFRCk7XG4gICAgfVxuICB9XG4gIC8vIHN0cmVhbVxuICBzdHJlYW0oKSB7XG4gICAgLy8gc2V0IHJlYWR5IHN0YXRlIHRvIGNvbm5lY3RpbmdcbiAgICB0aGlzLl9zZXRSZWFkeVN0YXRlKHRoaXMuQ09OTkVDVElORyk7XG4gICAgLy8gc2V0IHhociB0byBuZXcgWE1MSHR0cFJlcXVlc3RcbiAgICB0aGlzLnhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgIC8vIHNldCB4aHIgcHJvZ3Jlc3MgdG8gX29uU3RyZWFtUHJvZ3Jlc3NcbiAgICB0aGlzLnhoci5hZGRFdmVudExpc3RlbmVyKCdwcm9ncmVzcycsIHRoaXMuX29uU3RyZWFtUHJvZ3Jlc3MuYmluZCh0aGlzKSk7XG4gICAgLy8gc2V0IHhociBsb2FkIHRvIF9vblN0cmVhbUxvYWRlZFxuICAgIHRoaXMueGhyLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCB0aGlzLl9vblN0cmVhbUxvYWRlZC5iaW5kKHRoaXMpKTtcbiAgICAvLyBzZXQgeGhyIHJlYWR5IHN0YXRlIGNoYW5nZSB0byBfY2hlY2tTdHJlYW1DbG9zZWRcbiAgICB0aGlzLnhoci5hZGRFdmVudExpc3RlbmVyKCdyZWFkeXN0YXRlY2hhbmdlJywgdGhpcy5fY2hlY2tTdHJlYW1DbG9zZWQuYmluZCh0aGlzKSk7XG4gICAgLy8gc2V0IHhociBlcnJvciB0byBfb25TdHJlYW1GYWlsdXJlXG4gICAgdGhpcy54aHIuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCB0aGlzLl9vblN0cmVhbUZhaWx1cmUuYmluZCh0aGlzKSk7XG4gICAgLy8gc2V0IHhociBhYm9ydCB0byBfb25TdHJlYW1BYm9ydFxuICAgIHRoaXMueGhyLmFkZEV2ZW50TGlzdGVuZXIoJ2Fib3J0JywgdGhpcy5fb25TdHJlYW1BYm9ydC5iaW5kKHRoaXMpKTtcbiAgICAvLyBvcGVuIHhoclxuICAgIHRoaXMueGhyLm9wZW4odGhpcy5tZXRob2QsIHRoaXMudXJsKTtcbiAgICAvLyBoZWFkZXJzIHRvIHhoclxuICAgIGZvciAobGV0IGhlYWRlciBpbiB0aGlzLmhlYWRlcnMpIHtcbiAgICAgIHRoaXMueGhyLnNldFJlcXVlc3RIZWFkZXIoaGVhZGVyLCB0aGlzLmhlYWRlcnNbaGVhZGVyXSk7XG4gICAgfVxuICAgIC8vIGNyZWRlbnRpYWxzIHRvIHhoclxuICAgIHRoaXMueGhyLndpdGhDcmVkZW50aWFscyA9IHRoaXMud2l0aENyZWRlbnRpYWxzO1xuICAgIC8vIHNlbmQgeGhyXG4gICAgdGhpcy54aHIuc2VuZCh0aGlzLnBheWxvYWQpO1xuICB9XG4gIC8vIGNsb3NlXG4gIGNsb3NlKCkge1xuICAgIGlmKHRoaXMucmVhZHlTdGF0ZSA9PT0gdGhpcy5DTE9TRUQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy54aHIuYWJvcnQoKTtcbiAgICB0aGlzLnhociA9IG51bGw7XG4gICAgdGhpcy5fc2V0UmVhZHlTdGF0ZSh0aGlzLkNMT1NFRCk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTbWFydENvbm5lY3Rpb25zUGx1Z2luOyJdLAogICJtYXBwaW5ncyI6ICI7Ozs7OztBQUFBO0FBQUEsNEJBQUFBLFVBQUFDLFNBQUE7QUFBQSxRQUFNQyxXQUFOLE1BQWM7QUFBQSxNQUNaLFlBQVksUUFBUTtBQUVsQixhQUFLLFNBQVM7QUFBQSxVQUNaLFdBQVc7QUFBQSxVQUNYLGFBQWE7QUFBQSxVQUNiLGdCQUFnQjtBQUFBLFVBQ2hCLGVBQWU7QUFBQSxVQUNmLGNBQWM7QUFBQSxVQUNkLGdCQUFnQjtBQUFBLFVBQ2hCLGNBQWM7QUFBQSxVQUNkLGVBQWU7QUFBQSxVQUNmLEdBQUc7QUFBQSxRQUNMO0FBQ0EsYUFBSyxZQUFZLEtBQUssT0FBTztBQUM3QixhQUFLLGNBQWMsT0FBTztBQUMxQixhQUFLLFlBQVksS0FBSyxjQUFjLE1BQU0sS0FBSztBQUUvQyxhQUFLLGFBQWE7QUFBQSxNQUNwQjtBQUFBLE1BQ0EsTUFBTSxZQUFZLE1BQU07QUFDdEIsWUFBSSxLQUFLLE9BQU8sZ0JBQWdCO0FBQzlCLGlCQUFPLE1BQU0sS0FBSyxPQUFPLGVBQWUsSUFBSTtBQUFBLFFBQzlDLE9BQU87QUFFTCxnQkFBTSxJQUFJLE1BQU0sd0JBQXdCO0FBQUEsUUFDMUM7QUFBQSxNQUNGO0FBQUEsTUFDQSxNQUFNLE1BQU0sTUFBTTtBQUNoQixZQUFJLEtBQUssT0FBTyxlQUFlO0FBQzdCLGlC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QUNkLE9BQU87QUFDTCxVQUFFLEtBQUssSUFBSTtBQUFBLE1BQ2I7QUFBQSxJQUNGLEVBQUUsS0FBSyxJQUFJLENBQUM7QUFFWixRQUFJLFFBQVEsSUFBSSxZQUFZLEVBQUUsS0FBSztBQUNuQyxVQUFNLE9BQU8sRUFBRTtBQUNmLFVBQU0sS0FBSyxFQUFFO0FBQ2IsV0FBTztBQUFBLEVBQ1Q7QUFBQTtBQUFBLEVBRUEscUJBQXFCO0FBQ25CLFFBQUcsQ0FBQyxLQUFLLEtBQUs7QUFDWjtBQUFBLElBQ0Y7QUFDQSxRQUFHLEtBQUssSUFBSSxlQUFlLGVBQWUsTUFBTTtBQUM5QyxXQUFLLGVBQWUsS0FBSyxNQUFNO0FBQUEsSUFDakM7QUFBQSxFQUNGO0FBQUE7QUFBQSxFQUVBLFNBQVM7QUFFUCxTQUFLLGVBQWUsS0FBSyxVQUFVO0FBRW5DLFNBQUssTUFBTSxJQUFJLGVBQWU7QUFFOUIsU0FBSyxJQUFJLGlCQUFpQixZQUFZLEtBQUssa0JBQWtCLEtBQUssSUFBSSxDQUFDO0FBRXZFLFNBQUssSUFBSSxpQkFBaUIsUUFBUSxLQUFLLGdCQUFnQixLQUFLLElBQUksQ0FBQztBQUVqRSxTQUFLLElBQUksaUJBQWlCLG9CQUFvQixLQUFLLG1CQUFtQixLQUFLLElBQUksQ0FBQztBQUVoRixTQUFLLElBQUksaUJBQWlCLFNBQVMsS0FBSyxpQkFBaUIsS0FBSyxJQUFJLENBQUM7QUFFbkUsU0FBSyxJQUFJLGlCQUFpQixTQUFTLEtBQUssZUFBZSxLQUFLLElBQUksQ0FBQztBQUVqRSxTQUFLLElBQUksS0FBSyxLQUFLLFFBQVEsS0FBSyxHQUFHO0FBRW5DLGFBQVMsVUFBVSxLQUFLLFNBQVM7QUFDL0IsV0FBSyxJQUFJLGlCQUFpQixRQUFRLEtBQUssUUFBUSxNQUFNLENBQUM7QUFBQSxJQUN4RDtBQUVBLFNBQUssSUFBSSxrQkFBa0IsS0FBSztBQUVoQyxTQUFLLElBQUksS0FBSyxLQUFLLE9BQU87QUFBQSxFQUM1QjtBQUFBO0FBQUEsRUFFQSxRQUFRO0FBQ04sUUFBRyxLQUFLLGVBQWUsS0FBSyxRQUFRO0FBQ2xDO0FBQUEsSUFDRjtBQUNBLFNBQUssSUFBSSxNQUFNO0FBQ2YsU0FBSyxNQUFNO0FBQ1gsU0FBSyxlQUFlLEtBQUssTUFBTTtBQUFBLEVBQ2pDO0FBQ0Y7QUFFQSxPQUFPLFVBQVU7IiwKICAibmFtZXMiOiBbImV4cG9ydHMiLCAibW9kdWxlIiwgIlZlY0xpdGUiLCAibGluZV9saW1pdCIsICJpdGVtIiwgImxpbmsiLCAiZmlsZV9saW5rIiwgImZpbGVfbGlua19saXN0Il0KfQo=
