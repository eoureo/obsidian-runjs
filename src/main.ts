import {
    App,
    PluginManifest,
    Pos,
    Notice,
    Plugin,
    TFile,
    TFolder,
    TAbstractFile,
    EventRef,
} from "obsidian";
import * as obsidian from "obsidian";
import * as Module from "module";
import { posix as path } from "path";

import {
    RunJSListView,
    RunJSCodeListViewType,
} from "./codelist_view";
import { addIcons, getTagInJSDocComments } from "./utils";
import { RunJSSettingTab } from "./settingtab";
import { RunJSCodeModal } from "./code_modal";
import { IconModal } from "./icon_modal";
import { ObjectModal } from "./object_modal";
import { RunJS_ICON, RunJS_ICONS } from "./constants";
import { MessageModal, openMessageModal } from "./message_modal";
import { openConfirmModal } from "./confirm_modal";
import { openPromptModal } from "./prompt_modal";

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

export interface CommandSetting {
    name: string;
    codeName: string;
    enable: boolean;
    icon: string;
}

export interface CommandsSetting {
    [id: string]: CommandSetting;
}

export interface RibbonIconSetting {
    name: string;
    icon: string;
    codeName: string;
    enable: boolean;
}

interface RunJSPluginSettings {
    autoRefresh: boolean;
    autostarts: [string, boolean][];
    commands: CommandsSetting;
    ribbonIcons: RibbonIconSetting[];
    scriptsFolder: string;
    logFilePath: string;
    logConsole: boolean;
    logNotice: boolean;
    logFile: boolean;
    listviewOpenType: string;
    listviewSortField: string;
    listviewSortAsc: boolean;
    listviewFilters: { [key: string]: string[] };
    listviewCollapse: { [key: string]: boolean };
    favoriteCodes: string[];
}

export const DEFAULT_SETTINGS: RunJSPluginSettings = {
    autoRefresh: true,
    autostarts: [],
    commands: {},
    ribbonIcons: [],
    scriptsFolder: "Scripts_RunJS",
    logFilePath: "",
    logConsole: true,
    logNotice: true,
    logFile: false,
    listviewOpenType: "tab",
    listviewSortField: "name",
    listviewSortAsc: true,
    listviewFilters: {}, // "type": ["script"]
    listviewCollapse: {},
    favoriteCodes: [],
};

export interface Code {
    name: string;
    desc?: string;
    text: string;
    type: string; // script (default) | module
    order?: string;
    file: string;
    form: string; // codeblock(default) | file
    position?: Pos | undefined;
}

export const DEFAULT_CODE: Code = {
    name: "",
    desc: "",
    text: "",
    type: "script",
    order: "",
    file: "",
    form: "codeblock",
    position: undefined,
};

export interface CodesModule {
    [key: string]: Code;
}

interface CodeSetting {
    n?: string;
    t?: string;
    o?: string;
    d?: string;
}

interface ModulesLoaded {
    [name: string]: { codeText: string; module: Module | null };
}

export default class RunJSPlugin extends Plugin {
    settings: RunJSPluginSettings;
    codes: Code[];
    codesScript: Code[];
    codesModule: CodesModule;
    modulesLoaded: ModulesLoaded;
    settingTab: RunJSSettingTab;
    listview: RunJSListView;
    private _iconsObsidian: string[];
    state: string;

    regexpCodeblockIndicator: RegExp = /^`{3,}(?:javascript|js) RunJS:(.*)/;
    eventRenameFile: EventRef;
    eventDeleteFile: EventRef;
    eventModifyFile: EventRef;
    eventCreateFile: EventRef;

    private _timeZoneOffsetString: string;

    constructor(app: App, manifest: PluginManifest) {
        super(app, manifest);

        this.codes = [];
        this.codesScript = [];
        this.codesModule = {};
        this.modulesLoaded = {};
        this.state = "initial";
    }

    async onload() {
        this.state = "loading";

        await this.loadSettings();

        addIcons();

        // This creates an icon in the left ribbon.
        const ribbonIconEl = this.addRibbonIcon(
            RunJS_ICON,
            this.manifest.name,
            async (evt: MouseEvent) => {
                // Called when the user clicks the icon.
                this.openCodeModal();
            }
        );
        // Perform additional things with the ribbon
        ribbonIconEl.addClass("runjs-ribbon");

        // // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
        // const statusBarItemEl = this.addStatusBarItem();
        // statusBarItemEl.setText('Status Bar Text');

        // This adds a simple command that can be triggered anywhere
        this.addCommand({
            id: "runjs-open-modal",
            name: "Open RunJS Code modal",
            callback: () => {
                this.openCodeModal();
            },
        });

        this.addCommand({
            id: "runjs-open-listview",
            name: "Open RunJS ListView",
            callback: () => {
                this.openListview();
            },
        });

        // This adds a settings tab so the user can configure various aspects of the plugin
        this.settingTab = new RunJSSettingTab(this.app, this);
        this.addSettingTab(this.settingTab);

        this.app.workspace.onLayoutReady(async () => {
            await this.refreshCodes();
            
            let changed = false;

            // remove delete items only once when the plugin is loaded
            const codeNamesSet = new Set(this.codes.map(code => code.name));
            for (let i = this.settings.favoriteCodes.length - 1; i >= 0; i--) {
                if (!codeNamesSet.has(this.settings.favoriteCodes[i])) {
                    this.settings.favoriteCodes.splice(i, 1);
                    changed = true;
                }
            }

            // this.registerView(
            //     RunJSCodeListViewType,
            //     (leaf) => (this.listview = new RunJSListView(leaf, this))
            // );

            this.registerView(
                RunJSCodeListViewType,
                (leaf) => new RunJSListView(leaf, this)
            );

            await this.renderListview();

            for (let autostart of this.settings.autostarts) {
                if (autostart[1] === true) {
                    this.runCodeByName(autostart[0]);
                }
            }

            for (let key in this.settings.commands) {
                let command = this.settings.commands[key];
                if (command.enable) {
                    this.runAddCommand(key);
                }
            }

            for (let ribbon_icon of this.settings.ribbonIcons) {
                if (ribbon_icon.enable) {
                    this.runAddRibbonIcon(ribbon_icon);
                }
            }

            this.registerEventsRunJS();

            if (changed) this.saveSettings();

            this.state = "loaded";
            this.log("info", "loaded.");
        });
    }

    registerEventsRunJS() {
        if (this.settings.autoRefresh) {
            this.eventModifyFile = this.app.vault.on(
                "modify",
                this.handleModifyFile.bind(this)
            );
            this.eventRenameFile = this.app.vault.on(
                "rename",
                this.handleRenameFile.bind(this)
            );
            this.eventDeleteFile = this.app.vault.on(
                "delete",
                this.handleDeleteFile.bind(this)
            );
            this.eventCreateFile = this.app.vault.on(
                "create",
                this.handleCreateFile.bind(this)
            );

            this.registerEvent(this.eventModifyFile);
            this.registerEvent(this.eventRenameFile);
            this.registerEvent(this.eventDeleteFile);
            this.registerEvent(this.eventCreateFile);
        } else {
            this.app.vault.offref(this.eventModifyFile);
            this.app.vault.offref(this.eventRenameFile);
            this.app.vault.offref(this.eventDeleteFile);
            this.app.vault.offref(this.eventCreateFile);
        }
    }

    handleRenameFile(file: TAbstractFile, oldPath: string) {
        let checkChanged = false;

        for (let code of this.codes) {
            if (code.file == oldPath) {
                code.file = file.path;
                checkChanged = true;
            }
        }

        if (checkChanged) {
            new Notice(this.manifest.name + ": codes updated");
            this.listview.update();
        }
    }

    async handleModifyFile(file: TAbstractFile) {
        await this.handleDeleteFile(file, false);
        await sleep(500);
        await this.handleCreateFile(file);
    }

    async handleCreateFile(file: TAbstractFile) {
        let checkChanged = false;

        const fileCache = this.app.metadataCache.fileCache;

        if (file.extension == "md") {
            for (let i = 0; i < 10; i++) {
                // wait - max 100ms x 10
                if (fileCache[file.path].hash != "") break;
                await sleep(100);
            }

            let codes = await this.getCodesInCodeblock(file.path);
            if (codes != null && codes.length > 0) {
                for (let code of codes) this.appendCode(code);
                checkChanged = true;
            }
        } else {
            let code = await this.getCodeInFile(<TFile>file);
            if (code != null) {
                this.appendCode(code);
                checkChanged = true;
            }
        }

        if (checkChanged) {
            new Notice(this.manifest.name + ": codes updated");
            this.listview.update();
        }
    }

    handleDeleteFile(file: TAbstractFile, doUpdate: boolean = true) {
        let codesTarget = [];

        for (let code of this.codes) {
            if (code.file == file.path) {
                codesTarget.push(code);
            }
        }

        for (let code of codesTarget) {
            if (
                code.form == "m" &&
                this.codesModule[code.name].file == file.path
            ) {
                delete this.codesModule[code.name];
            } else {
                this.codesScript.splice(this.codesScript.indexOf(code), 1);
            }
            this.codes.splice(this.codes.indexOf(code), 1);
        }

        if (doUpdate && codesTarget.length > 0) {
            new Notice(this.manifest.name + ": codes updated");
            this.listview.update();
        }
    }

    onunload() {
        // this.app.workspace.detachLeavesOfType(RunJSCodeListViewType);
        this.log("info", "unloaded.");
    }

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData()
        );
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async openCodeModal(groupRoot?: string) {
        if (this.codes.length == 0) {
            await this.refreshCodes();
        }

        let runJSCodeModal = new RunJSCodeModal(
            this.app,
            this,
            this.codesScript,
            this.runCode.bind(this)
        );
        if (groupRoot) runJSCodeModal.groupRoot = groupRoot;
        runJSCodeModal.open();
    }

    async openListview() {
        let leaf = await this.renderListview();
        
        this.app.workspace.revealLeaf(leaf);
    }

    async renderListview(): Promise<obsidian.WorkspaceLeaf> {
        let [leaf] = this.app.workspace.getLeavesOfType(RunJSCodeListViewType);
        
        if (!leaf) {
            leaf = this.app.workspace.getLeftLeaf(false);
            await leaf.setViewState({ type: RunJSCodeListViewType });
        }

        return leaf;
    }

    runCodeByName(name: string) {
        let code = this.getCodeByName(name);

        if (code == null) {
            this.log("error", "runCodeByName", "code is null");
            return;
        }

        this.runCode(code);
    }

    async runCode(code: Code | null) {
        let text: string;
        let folder: string;

        if (code == null) {
            this.log("error", "runCode", "code is null");
            return;
        }

        if (code.form == "codeblock") {
            text = code.text;
            folder = "";
        } else {
            // text = await app.vault.adapter.read(code.file);
            text = await this.app.vault.read(this.app.vault.getAbstractFileByPath(code.file));
            folder = path.dirname(
                code.file.replace(
                    new RegExp("^" + this.settings.scriptsFolder + "\\/"),
                    "./"
                )
            );
        }

        // let F = new AsyncFunction('obsidian', this.modifyImport(text, ""));
        // await F.apply(this, obsidian);

        let m_text = this.modifyImport(text, folder);
        let F = new AsyncFunction(m_text);
        await F.apply(this);
    }
    
    async refresh() {
        await this.refreshCodes();
        new Notice(this.manifest.name + ": codes updated");
        this.listview.update();
    }

    async refreshCodes() {
        // initialize data
        this.codes.splice(0, this.codes.length);
        this.codesScript.splice(0, this.codesScript.length);

        Object.keys(this.codesModule).forEach(
            (key) => delete this.codesModule[key]
        );

        await this.iterateCodeblocks(this.appendCode.bind(this));

        let tFolder: TFolder = <TFolder>(
            this.app.vault.getAbstractFileByPath(this.settings.scriptsFolder)
        );
        
        await this.iterateScriptsFolder(tFolder, this.appendCode.bind(this));
    }

    appendCode(code: Code) {
        this.codes.push(code);

        if (code.type == "module") {
            this.codesModule[code.name] = code;
        } else {
            this.codesScript.push(code);
        }
    }

    async iterateCodeblocks(callback: Function | null = null) {
        let codes: Code[] | undefined;
        if (!callback) {
            codes = [];
            callback = (code: Code) => {
                codes?.push(code);
            };
        }

        const fileCache = this.app.metadataCache.fileCache;

        for (let key in fileCache) {
            let codesFile = await this.getCodesInCodeblock(key);
            if (codesFile == null) continue;
            else {
                for (let code of codesFile) await callback(code);
            }
        }

        if (codes != undefined) {
            return codes;
        }
    }

    async iterateScriptsFolder(tFolder: TFolder, callback: Function) {
        if (tFolder == null) return;

        for (let child of tFolder.children) {
            if (child instanceof TFolder) {
                await this.iterateScriptsFolder(child, callback);
            }

            if (!(child instanceof TFile)) continue;

            let code = await this.getCodeInFile(child);
            if (code != null) {
                await callback(code);
            }
        }
    }

    async getCodesInCodeblock(filePath: string): Promise<Code[] | null> {
        let codes: Code[] = [];

        const metadataCache = this.app.metadataCache.metadataCache;

        const fileCache = this.app.metadataCache.fileCache;

        let hash = fileCache[filePath].hash;
        if (!hash) {
            return null;
        }

        for (let i = 0; i < 10; i++) {
            if (metadataCache[hash] != undefined) break;
            await sleep(100);
        }

        if (metadataCache[hash] == undefined) return null;

        let sections = metadataCache[hash].sections;
        if (!(sections?.length > 0)) {
            return null;
        }
        
        let contents: string[] = [];

        try {
            for (let i = 0; i < sections.length; i++) {
                if (sections[i].type != "code") {
                    continue;
                }

                if (contents.length <= 0) {
                    // contents = (await this.app.vault.adapter.read(filePath)).split("\n");
                    contents = (await this.app.vault.read(this.app.vault.getAbstractFileByPath(filePath))).split("\n");
                }
                
                let position = sections[i].position;

                let match = contents[position.start.line].match(this.regexpCodeblockIndicator);

                if (!match) {
                    continue;
                }

                let codeSetting: CodeSetting = this.findCodeSetting(match[1]);

                if (!codeSetting) {
                    continue;
                }

                let codeText = contents
                    .slice(position.start.line + 1, position.end.line)
                    .join("\n")
                    .trim();

                if (codeText) {
                    let { n: name, t: type, o: order, d: desc } = codeSetting;
                    
                    if (name == undefined) continue;

                    let code: Code = Object.assign({}, DEFAULT_CODE);
                    code.name = name;
                    code.text = codeText;
                    code.file = filePath;
                    code.position = position;
                    code.form = "codeblock";

                    if (type) {
                        code.type =
                            type == "s"
                                ? "script"
                                : type == "m"
                                ? "module"
                                : type;
                    }

                    if (order) {
                        code.order = order;
                    }

                    if (desc) {
                        code.desc = desc;
                    }

                    codes.push(code);
                }
            }
        } catch (e) {
            this.log("error", "getCodesInCodeblock", filePath, e);
        }

        return codes;
    }

    async getCodeInFile(child: TFile): Promise<Code | null> {
        const filePath = child.path;
        
        const content = await this.app.vault.read(child);

        if (content) {
            let matchCodeSetting = getTagInJSDocComments(content, "RunJS");

            let codeSetting: CodeSetting | Object = this.findCodeSetting(matchCodeSetting);

            let code: Code = Object.assign({}, DEFAULT_CODE);
            code.name =
                codeSetting?.n ??
                filePath.replace(
                    new RegExp("^" + this.settings.scriptsFolder + "\\/"),
                    "./"
                );

            code.file = filePath;

            code.form = "file";

            if (child.extension == "mjs") {
                code.type = "module";
            } else if (child.extension == "js") {
                code.type = "script";
            } else {
                code.type = "";
            }

            if (codeSetting?.o) {
                code.order = codeSetting.o ?? "";
            }

            if (codeSetting?.d) {
                code.desc = codeSetting.d;
            }

            if (code.type != "") {
                return code;
            }
        }

        return null;
    }

    findCodeSetting(settingStr: string): CodeSetting {
        settingStr = settingStr.trim();
        if (settingStr == "") return {};

        let match = settingStr.match(/({.*})?(.*)/);
        if (!match) return {};

        if (match[1] != undefined) {
            let setting = match[1]
                .trim()
                .replace(/(['"])(\\.|(?:(?!\1).)*)\1/g, (in_quotes: string) =>
                    in_quotes.replaceAll(":", "\uffff")
                )
                .replace(/(\w+)(?=:)/g, '"$1"')
                .replaceAll("\uffff", ":");

            return JSON.parse(setting);
        } else if (match[2] != undefined) {
            let match2 = match[2]
                .trim()
                .match(/^(['"])((?:\\.|[^\1])*)\1|^([^\s]*)/);
            if (!match2) return {};

            let name = "";
            if (match2[2]) name = match2[2].replaceAll(/\\(.)/g, "$1");
            else if (match2[3]) name = match2[3];

            return name != "" ? { n: name, t: "s" } : {};
        }

        return {};
    }

    async import(codeName: string) {
        if (codeName === "obsidian") {
            return obsidian;
        }

        let code = this.codesModule[codeName];
        if (code) {
            let text = await this.getCodeText(code);
            
            if (text) {
                if (
                    this.modulesLoaded[code.name]?.codeText == text &&
                    this.modulesLoaded[code.name].module
                ) {
                    return this.modulesLoaded[code.name].module;
                }

                let text_modified = this.modifyImport(
                    text,
                    path.dirname(codeName)
                );
                
                // const blob = new Blob([text_modified], { type: "text/javascript" });
                const blob = new File([text_modified], "codeName", {
                    type: "text/javascript"
                  });
                const url = URL.createObjectURL(blob);

                const module = await import(url);

                if (this.modulesLoaded[code.name]?.module) {
                    // delete this.modulesLoaded[code.name].module;
                    this.modulesLoaded[code.name].module = null;
                }

                if (!this.modulesLoaded[code.name]) {
                    this.modulesLoaded[code.name] = { codeText: text, module: module };
                } else {
                    this.modulesLoaded[code.name].codeText = text;
                    this.modulesLoaded[code.name].module = module;
                }

                URL.revokeObjectURL(url); // GC objectURLs

                return module;
            }
        } else {
            // return await import(codeName);
            return await require(codeName);
        }
        // Uncaught (in promise) TypeError: Failed to resolve module specifier 'moment' - import
        // Uncaught (in promise) Error: Cannot find module 'moment' - require
    }

    modifyImport(codeText: string, folder: string): string {
        const runjs_import = `await app.plugins.plugins["${this.manifest.id}"].import`;
        let text = codeText
            .replace(
                /\b(?:await\s)?import\(\s*(['"])((?:\\.|(?:(?!\1)[^\\]))*)\1\s*\)/g,
                (match: string, p1: string, p2: string) => {
                    p2 = this.importPathJoin(folder, p2);
                    return runjs_import + "(" + p1 + p2 + p1 + ")";
                }
            )
            // import defaultExport from "module-name";
            // import * as name from "module-name";
            // import { export1 } from "module-name";
            // import { export1 as alias1 } from "module-name";
            // import { export1 , export2 } from "module-name";
            // import { foo , bar } from "module-name/path/to/specific/un-exported/file";
            // import { export1 , export2 as alias2 , [...] } from "module-name";
            // import defaultExport, { export1 [ , [...] ] } from "module-name";
            // import defaultExport, * as name from "module-name";
            // import "module-name"; // 아직 안됨
            // export * from …; // does not set the default export
            // export * as name1 from …;
            // export { name1, name2, …, nameN } from …;
            // export { import1 as name1, import2 as name2, …, nameN } from …;
            // export { default } from …;
            .replace(
                /\b(import|export)(.*?)from\s+(['"])((?:\\.|(?:(?!\3)[^\\]))*)\3\s*/g,
                (
                    match: string,
                    import_or_export: string,
                    p1: string,
                    p2: string,
                    p3: string
                ) => {
                    if (import_or_export == "import") {
                        import_or_export = "";
                    } else {
                        import_or_export = "export ";
                    }

                    // 중괄호를 먼저 처리
                    let text = p1.replace(
                        /({[^{}]+})/g,
                        function (match: string) {
                            return match.trim().replace(/,/g, "\uffff"); // 쉼표를 \uffff 문자로 대체
                        }
                    );

                    // 쉼표를 기준으로 분할하고 다시 쉼표를 원래의 문자로 대체
                    let mName: string = "";
                    let values: string[] = [];
                    text.split(/\s*,\s*/).forEach(function (item: string) {
                        let match_mName = item
                            .trim()
                            .match(/^\*\s+as\s+(.*)$/); // "* as name"이면
                        
                        if (match_mName) {
                            // 빼버리자.
                            mName = match_mName[1];
                            return;
                        }

                        item = item
                            .replace(/\uffff/g, ",") // \uffff 문자를 쉼표로 대체
                            .replace(
                                /(['"])((?:\\.|(?!\1)[^\\])*)\1/g,
                                function (match: string) {
                                    return match.replace(/\bas\b/g, "\ufffe"); // 따옴표 안의 as를 \uffff 문자로 대체
                                }
                            )
                            .replace(/\bas\b/g, ":") // as를 ":"로 바꿈
                            .replace(/ufffe/g, "as"); // 다시 다른 문자를 as로 돌려 놓음

                        let match_bracket = item.trim().match(/^{(.*)}$/);
                        if (match_bracket) {
                            match_bracket[1]
                                .replace(
                                    /(['"])((?:\\.|(?!\1)[^\\])*)\1/g,
                                    (match: string) => {
                                        return match.replace(/,/g, "\uffff");
                                    }
                                )
                                .split(/\s*,\s*/)
                                .map((item: string) =>
                                    item.replace(/\uffff/g, ",")
                                )
                                .forEach((item: string) => {
                                    values.push(item);
                                });
                        } else {
                            if (item.indexOf(":") >= 0) {
                                values.push(item);
                            } else {
                                values.push("default: " + item);
                            }
                        }
                    });

                    let commands = [];

                    p3 = this.importPathJoin(folder, p3);

                    if (mName) {
                        commands.push(
                            import_or_export +
                                `const ${mName} = ${runjs_import}("${p3}")`
                        );
                    }
                    if (values.length > 0) {
                        if (mName) {
                            commands.push(
                                import_or_export +
                                    `const {${values.join(", ")}} = ${mName}`
                            );
                        } else {
                            commands.push(
                                import_or_export +
                                    `const {${values.join(
                                        ", "
                                    )}} = ${runjs_import}("${p3}")`
                            );
                        }
                    }

                    return commands.join(";\n");
                }
            );

        return text;
    }

    importPathJoin(folder: string, filePath: string): string {
        // filePath: not relative
        if (folder == "" || !filePath.match(/^\.+\//)) {
            return filePath;
        }

        let p3: string = path.join(folder, filePath);
        if (folder.match(/^\./) && p3.match(/^[^\.]/)) {
            p3 = "./" + p3;
        }
        return p3;
    }

    getCodeByName(name: string): Code | null {
        for (let code of this.codes) {
            if (code.name == name) {
                return code;
            }
        }
        return null;
    }

    async getCodeText(code: Code) {
        let text = "";

        if (code.form == "file") {
            text = await this.app.vault.read( <TFile>this.app.vault.getAbstractFileByPath(code.file) );
        } else {
            text = code.text;
        }

        return text;
    }

    runAddCommand(id: string) {
        let command = this.settings.commands[id];

        if (command != null) {
            this.addCommand({
                id: id,
                name: command.name,
                callback: () => {
                    this.runCodeByName(command.codeName);
                },
            });
        }
    }

    runAddRibbonIcon(setting: RibbonIconSetting) {
        if (setting != null) {
            this.addRibbonIcon(
                setting.icon,
                setting.name,
                async (evt: MouseEvent) => {
                    this.runCodeByName(setting.codeName);
                }
            ).addClass("runjs-ribbon");
        }
    }

    removeCommand(id: string) {
        this.app.commands.removeCommand(this.manifest.id + ":" + id);
    }

    removeRibbonIcon(setting: RibbonIconSetting) {
        let ribbonItem;
        let ribbonId = this.manifest.id + ":" + setting.name;
        for (let item of this.app.workspace.leftRibbon.items) {
            if (item.id == ribbonId) {
                ribbonItem = item;
                break;
            }
        }
        if (ribbonItem) {
            ribbonItem.buttonEl.remove();
            this.app.workspace.leftRibbon.removeRibbonAction(ribbonItem.title);
        }
    }

    get iconsObsidian(): string[] {
        if (this._iconsObsidian == undefined) {
            const fs = require("fs");
            const path = require("path");
            let f_path = path.join(__dirname, "../../obsidian.asar/app.js");
            let f = fs.readFileSync(f_path, { encoding: "utf8", flag: "r" });

            // let match = f.match(/const \w+=({.*?accessibility:.*?})/);
            let match = f.match(/const \w+=({accessibility:.*?})/);

            if (match) {
                this._iconsObsidian = match[1]
                    .match(/[\w-"]+\:/g)
                    .map((m: string) => m.replace(/["\:]/g, ""));
            }
        }

        return this._iconsObsidian;
    }

    async openIconModal(callback?: (icon: string) => void) {
        // let icons = RunJS_ICONS.concat(this.iconsObsidian);
        let icons = obsidian.getIconIds();

        if (icons.length <= 0) {
            new Notice("There is no icon data.");
            return;
        }

        let iconModal = new IconModal(
            this.app,
            icons,
            callback ??
                ((icon) => {
                    this.alert(icon);
                })
        );
        iconModal.open();
    }

    async openObjectModal(object?: {}, callback?: (key: string) => void) {
        if (object == undefined) object = {
            obsidian: obsidian,
            app: this.app, 
            RunJS: this,
            dataview: this.app.plugins.plugins["dataview"],
            templater: this.app.plugins.plugins["templater-obsidian"],
            electron: electron,
            window: window
        };

        let objectModal = new ObjectModal(
            this.app,
            this,
            object,
            callback ??
                ((key) => {
                    this.log("info", key);
                    this.alert(key);
                })
        );
        objectModal.open();
    }

    async alert(message: string) {
        await openMessageModal(this.app, this.manifest.name, message);
    }

    async confirm(message: string) {
        return await openConfirmModal(this.app, this.manifest.name, message);
    }

    async prompt(message: string, messagDefault: string = "", placeholder: string = "") {
        return await openPromptModal(this.app, this.manifest.name, message, messagDefault, placeholder);
    }

    toggleFavoriteCode(code: Code) {
        if (this.settings.favoriteCodes.includes(code.name)) {
            this.settings.favoriteCodes.splice(this.settings.favoriteCodes.indexOf(code.name), 1);
        } else {
            this.settings.favoriteCodes.push(code.name);
        }

        this.saveSettings();
    }

    log(...args: any[]) {
        // this.log.caller.name
        const now = Date.now();
        const timezoneOffset = new Date().getTimezoneOffset() * 60000;
        const timezoneDate = new Date(now - timezoneOffset);
        // const timezoneDateISOSting = timezoneDate.toISOString().replace(/\.\d*Z/, this.timeZoneOffsetString);
        const timezoneDateISOSting = timezoneDate.toISOString().slice(0, -1) + this.timeZoneOffsetString;

        let type: string = "log";
        if (Object.keys(console).contains(args[0])) {
            type = args[0];
            args.shift();
        }
        try {
            if (this.settings.logNotice)
                new Notice(this.manifest.name + ":" + " [" + type + "] " + args.join(" "));
            if (this.settings.logConsole)
                console[type](this.manifest.name + ":", ...args);
            if (this.settings.logFile && this.settings.logFilePath != "") {
                // this.app.vault.adapter.append(this.settings.logFilePath, "- " + timezoneDateISOSting + " [" + type + "] " + args.join(" ") + "\n");

                // vault.append(file: TFile, data: string, options?: DataWriteOptions): Promise<void>;
                this.app.vault.append(this.app.vault.getAbstractFileByPath(this.settings.logFilePath), "- " + timezoneDateISOSting + " [" + type + "] " + args.join(" ") + "\n");
            }
        }
        catch (e) {
            console.error(this.manifest.name + ":", "log - error.")
        }
    }

    get timeZoneOffsetString(): string {
        if (this._timeZoneOffsetString == undefined) {
            const timeZoneOffset = new Date().getTimezoneOffset();
            const sign = timeZoneOffset <= 0 ? "+" : "-";
            const absOffset = Math.abs(timeZoneOffset);
            const hours = Math.floor(absOffset / 60).toString().padStart(2, "0");
            const minutes = (absOffset % 60).toString().padStart(2, "0");
            this._timeZoneOffsetString = `${sign}${hours}${minutes}`;
        }
        return this._timeZoneOffsetString;
    }

    async reload() {
        this.log("info", "start reloading.");

        let manifest_id = this.manifest.id;

        if (this.app.plugins.enabledPlugins.has(manifest_id)) {
            this.state = "disable";
            await this.app.plugins.disablePlugin(manifest_id);

            window.setTimeout(async () => {
                this.app.plugins.enablePlugin(manifest_id);

                for (let i = 0; i < 100; i++) {
                    let state = this.app.plugins.plugins[manifest_id]?.state;
                    if (state == "loaded") {
                        window.setTimeout(() => {
                            this.app.setting.openTabById(manifest_id);
                        }, 100);
                        break;
                    }
                    await sleep(100);
                }
            }, 100);
        }
    }
}