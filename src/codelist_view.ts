import RunJSPlugin, { Code, DEFAULT_SETTINGS } from "./main";
import {
    ItemView,
    Menu,
    Notice,
    WorkspaceLeaf,
    setIcon,
    MarkdownView,
    MenuItem,
    Events,
    EventRef,
} from "obsidian";
import { LIST_ICON, RunJS_LISTVIEW_ICON } from "./constants";


export class ListviewEvents extends Events {
    on(name: 'code-menu', callback: (menu: Menu, code: Code) => any, ctx?: any): EventRef;
    on(name: string, callback: (...data: any[]) => any, ctx?: any): EventRef {
        return super.on(name, callback, ctx);
    }

    trigger(name: 'code-menu', menu: Menu, code: Code): void;
    trigger(name: string, ...data: any[]): void {
        super.trigger(name, ...data);
    }
}


export const RunJSCodeListViewType = "runjs-codelist-view";

export class RunJSCodeListView extends ItemView {
    private readonly plugin: RunJSPlugin;
    table: HTMLTableElement;
    menuFilter: Menu;
    menuOther: Menu;
    groups: {[name: string]: HTMLElement};
    treeItems: HTMLElement[];
    listviewEvents: ListviewEvents;

    constructor(leaf: WorkspaceLeaf, plugin: RunJSPlugin) {
        super(leaf);

        this.plugin = plugin;
        this.groups = {};
        this.treeItems = [];
        this.listviewEvents = new ListviewEvents();
        
        const contentEl = this.contentEl;

        contentEl.dataset.name = "/";

        contentEl.createDiv({text: "loading...", cls:"tree-item nav-folder mod-root has-favorite"});
    }

    // public async onOpen(): Promise<void> {
    //     console.log("onOpen");
    //     // this.update();
    // }

    // public async onClose(): Promise<void> {
    //     console.log("onClose");
    // }

    // public onunload() {
    //     console.log("onunload");
    // }

    public onload() {
        this.containerEl.classList.add("runjs-codelist-view-container");

        const navHeader = createDiv({ cls: "nav-header" });
        this.containerEl.insertBefore(navHeader, this.containerEl.firstChild);

        const collapseBtn = createSpan({ cls: "icon clickable-icon nav-action-button", attr: {"aria-label": "Collapse all"} });
        setIcon(collapseBtn, "lucide-chevrons-down-up");

        collapseBtn.addEventListener("click", async (event: MouseEvent) => {
            // Expand all, Collapse all
            if (collapseBtn.getAttribute("aria-label") == "Collapse all") {
                collapseBtn.setAttribute("aria-label", "Expand all");
                setIcon(collapseBtn, "lucide-chevrons-up-down");
                this.collapseAll(true);
            } else {
                collapseBtn.setAttribute("aria-label", "Collapse all");
                setIcon(collapseBtn, "lucide-chevrons-down-up");
                this.collapseAll(false);
            }
        });
        
        navHeader.appendChild(collapseBtn);

        const sortBtn = createSpan({ cls: "icon clickable-icon nav-action-button", attr: {"aria-label": "Sort: Z to A"} });
        setIcon(sortBtn, "lucide-sort-asc");

        sortBtn.addEventListener("click", async (event: MouseEvent) => {
            if (sortBtn.getAttribute("aria-label") == "Sort: Z to A") {
                sortBtn.setAttribute("aria-label", "Sort: A to Z");
                setIcon(sortBtn, "lucide-sort-asc");
                this.sort("name", true);
            } else {
                sortBtn.setAttribute("aria-label", "Sort: Z to A");
                setIcon(sortBtn, "lucide-sort-desc");
                this.sort("name", false);
            }
        });
        
        navHeader.appendChild(sortBtn);

        const filterBtn = createDiv({
            text: "filter",
            cls: "icon filter is-clickable clickable-icon",
            title: "filter",
        });
        setIcon(filterBtn, "lucide-filter");

        this.menuFilter = new Menu();
        
        // @ts-ignore
        const menuFilterDom = this.menuFilter.dom;
        menuFilterDom.classList.add("runjs-codelist-view-menu");

        const filters = this.plugin.settings.listviewFilters;

        [
            // ["favorite", ["favorite"]],
            ["type", ["script", "module"]],
            ["form", ["codeblock", "file"]],
        ].map((item: [string, []]) => {
            const group: string = item[0];
            const options = item[1];
            if (filters[group] == undefined || filters[group].length == 0) {
                if (options.length > 1) filters[group] = options.slice();
                else filters[group] = [];
            }
            this.containerEl.addClasses(
                filters[group].map((option: string) => "ft-" + option)
            );
            filters[group].forEach((option: string) =>
                menuFilterDom.classList.add("ft-" + option)
            );

            for (let option of options) {
                this.menuFilter.addItem((item) => {
                    item
                        .setTitle(option)
                        .setIcon(LIST_ICON[option])
                        .onClick(() => {
                            if (filters[group]?.contains(option)) {
                                filters[group].remove(option);
                                if (
                                    options.length > 1 &&
                                    filters[group].length == 0
                                ) {
                                    filters[group] = options.slice();
                                }
                            } else {
                                if (!(group in filters)) filters[group] = [];
                                filters[group].push(option);
                            }

                            options.forEach((op) => {
                                const ft_op = "ft-" + op;
                                if (filters[group].contains(op)) {
                                    this.containerEl.classList.add(ft_op);
                                    menuFilterDom.classList.add(ft_op);
                                } else {
                                    this.containerEl.classList.remove(ft_op);
                                    menuFilterDom.classList.remove(
                                        ft_op
                                    );
                                }
                            });

                            this.plugin.saveSettings();
                        });
                    // @ts-ignore
                    item.dom.classList.add("ft-item");
                    // @ts-ignore
                    item.dom.classList.add(option);
                    }
                );
            }

            this.menuFilter.addSeparator();
        });

        filterBtn.addEventListener("click", (event: MouseEvent) => {
            this.menuFilter.showAtMouseEvent(event);
        });
        navHeader.appendChild(filterBtn);


        let favoriteBtn = createDiv({
            text: "favorite",
            cls: "icon ft-item favorite is-clickable clickable-icon",
            title: "favorite",
        });
        setIcon(favoriteBtn, LIST_ICON["favorite"]);
        navHeader.appendChild(favoriteBtn);
        favoriteBtn.addEventListener("click", async (event: MouseEvent) => {
            const group = "favorite";
            const option = "favorite";
            const ft_op = "ft-" + option;

            if (filters[group]?.contains(option)) {
                filters[group].remove(option);
                this.containerEl.classList.remove(ft_op);
                menuFilterDom.classList.remove(ft_op);
            } else {
                if (!(group in filters)) filters[group] = [];
                filters[group].push(option);
                this.containerEl.classList.add(ft_op);
                menuFilterDom.classList.add(ft_op);
            }

            this.plugin.saveSettings();
        });
        navHeader.appendChild(favoriteBtn);
        if (filters.favorite?.contains("favorite")) {
            this.containerEl.addClass("ft-favorite");
        }

        let menuBtn = createDiv({
            text: "refresh",
            cls: "icon right is-clickable clickable-icon",
            title: "other menu",
        });
        setIcon(menuBtn, "lucide-menu");
        navHeader.appendChild(menuBtn);

        this.menuOther = new Menu();
        let menuItemAutoRefresh: MenuItem;
        // @ts-ignore
        this.menuOther.dom.classList.add("runjs-codelist-view-menu");
        this.menuOther.addItem((item) => {
            menuItemAutoRefresh = item;
            item
                .setTitle("Auto refresh")
                .setIcon("lucide-zap")
                .setChecked(this.plugin.settings.autoRefresh ?? false)
                .onClick(() => {
                    this.plugin.settings.autoRefresh = !this.plugin.settings.autoRefresh;
                    item.setChecked(this.plugin.settings.autoRefresh);
                    this.plugin.saveSettings();
                    this.plugin.registerEventsRunJS();
                })
        });

        this.menuOther.addItem((item) => {
            item
                .setTitle("Open " + this.plugin.manifest.name + " Setting")
                .setIcon("lucide-settings")
                .onClick(() => {
                    // @ts-ignore
                    this.app.commands.commands["app:open-settings"].callback();
                    // @ts-ignore
                    this.app.setting.openTabById(this.plugin.manifest.id);
                })
        });

        this.menuOther.addItem((item) => {
            item
                .setTitle("Reload " + this.plugin.manifest.name + " plugin")
                .setIcon("lucide-refresh-cw")
                .onClick(() => {
                    this.plugin.reload();
                })
        });

        menuBtn.addEventListener("click", (event: MouseEvent) => {
            menuItemAutoRefresh.setChecked(this.plugin.settings.autoRefresh ?? false);
            if (this.plugin.settings.autoRefresh) {
                // @ts-ignore
                if (menuItemAutoRefresh.checkIconEl) menuItemAutoRefresh.dom.appendChild(menuItemAutoRefresh.checkIconEl);
            } else {
                // @ts-ignore
                if (menuItemAutoRefresh.checkIconEl && menuItemAutoRefresh.checkIconEl.parentElement) menuItemAutoRefresh.dom.removeChild(menuItemAutoRefresh.checkIconEl);
            }
            this.menuOther.showAtMouseEvent(event);
        });

        let refreshBtn = createDiv({
            text: "refresh",
            cls: "icon refresh right is-clickable clickable-icon",
            title: "refresh codes",
        });
        setIcon(refreshBtn, "lucide-refresh-ccw");
        navHeader.appendChild(refreshBtn);
        refreshBtn.addEventListener("click", async (event: MouseEvent) => {
            await this.plugin.refresh();
        });

        this.update();
    }

    public getViewType(): string {
        return RunJSCodeListViewType;
    }

    public getDisplayText(): string {
        return "RunJS Codelist";
    }

    public getIcon(): string {
        return RunJS_LISTVIEW_ICON;
    }

    public onPaneMenu(menu: Menu) {
        menu
            .addItem((item) => {
                item.setTitle("Close")
                    .setIcon("lucide-cross")
                    .onClick(() => {
                        this.app.workspace.detachLeavesOfType(
                            RunJSCodeListViewType
                        );
                    });
            });
    }

    update() {
        const contentEl = this.contentEl;

        // while (contentEl.firstChild) {
        //     contentEl.remove();
        // }
        contentEl.empty();

        if (this.plugin.codes.length === 0) return;
        
        const treeItemRoot = contentEl.createDiv({cls:"tree-item nav-folder mod-root has-favorite"});
        const treeItemRootContainer = treeItemRoot.createDiv({cls:"tree-item-children nav-folder-children"});
        this.groups = {"/": treeItemRoot};
        const groups = this.groups;
        const treeItems = this.treeItems;

        for (let code of this.plugin.codes) {
            const match = code.name.match(/^(.*?)([^\/]*)$/);

            if (match == null) continue;

            const groupStr = match[1];
            const name = match[2];
            const groupSplits = groupStr.replace(/\/$/, "").split("/");
            let parentEl: HTMLElement | null = treeItemRootContainer;
            let groupNameFull: string = "";
            
            for (let groupName of groupSplits) {
                if (groupName === "") continue;
                groupNameFull += "/" + groupName;
                if (parentEl && groups[groupNameFull] == undefined) {
                    const folderEl = parentEl.createDiv({cls:"tree-item nav-folder"});
                    folderEl.dataset.group_name = groupNameFull;
                    folderEl.dataset.name = groupName;

                    const folderSelfEl = folderEl.createDiv({cls:"tree-item-self is-clickable mod-collapsible nav-folder-title"});

                    const folderSelfIconEl = folderSelfEl.createDiv({cls:"tree-item-icon collapse-icon nav-folder-collapse-indicator"});
                    setIcon(folderSelfIconEl, "right-triangle");

                    folderSelfEl.createDiv({text: groupName,cls:"tree-item-inner nav-folder-title-content"});

                    folderSelfEl.addEventListener("click", (event: MouseEvent) => {
                        this.toggleCollapse(folderEl);
                    });
                    
                    const childrenEl = folderEl.createDiv({cls:"tree-item-children nav-folder-children"});

                    groups[groupNameFull] = folderEl;
                    
                    this.collapseFolder(folderEl, this.plugin.settings.listviewCollapse[groupNameFull]);

                    parentEl = childrenEl;
                } else {
                    const parentElOrNull = <HTMLElement>groups[groupNameFull].querySelector(":scope > .tree-item-children");
                    if (parentElOrNull != null) parentEl = parentElOrNull;
                }
            }

            const treeItem = parentEl.createDiv({cls:"tree-item"});
            treeItem.dataset.group_name = groupNameFull;
            treeItem.dataset.name = name;
            treeItems.push(treeItem);
            if (this.plugin.settings.favoriteCodes.includes(code.name)) {
                treeItem.classList.add("favorite");
            }
            treeItem.classList.add(code.form);
            treeItem.classList.add(code.type);

            treeItem.addEventListener("contextmenu", (event: MouseEvent) => {
                this.openFileContextMenu(event, code, treeItem)
            });

            const treeItemSelf = treeItem.createDiv({cls:"tree-item-self is-clickable"});

            const form = createSpan({
                text: code.form,
                cls: "icon form is-clickable",
                title:
                    "Open File\n" +
                    code.file +
                    (code.position ? ":" + code.position.start.line : ""),
            });
            if (code.form == "file") {
                setIcon(form, LIST_ICON["file"]);
            } else {
                setIcon(form, LIST_ICON["codeblock"]);
            }

            form.addEventListener("click", (event: MouseEvent) => {
                this.plugin.focusFile(code, event.ctrlKey || event.metaKey);
            });

            const type = createSpan({ text: code.type, cls: "icon type" });
            if (code.type == "module") {
                setIcon(type, LIST_ICON["module"]);
            } else {
                setIcon(type, LIST_ICON["script"]);
            }

            treeItemSelf.appendChild(type);

            treeItemSelf.appendChild(form);

            const nameEl = treeItemSelf.createDiv({cls:"name-node"});
            nameEl.createSpan({text: groupNameFull + "/", cls: "group-name"});
            nameEl.createSpan({text: name, cls: "name"});
            let title_pre = "";
            if (code.type == "script") {
                nameEl.classList.add("is-clickable");

                nameEl.addEventListener("click", (event: MouseEvent) => {
                    this.plugin.runCode(code);
                });

                title_pre = "Run\n";
            }
            nameEl.setAttribute(
                "title",
                title_pre +
                    code.file +
                    (code.position ? ":" + code.position.start.line : "")
            );
        }

        const groupsKeys = Object.keys(this.groups);

        // run only once when the plugin is loaded
        if (this.plugin.state != "loaded") {
            let changed = false;
            Object.keys(this.plugin.settings.listviewCollapse).forEach( name => {
                if (!groupsKeys.contains(name)) {
                    delete this.plugin.settings.listviewCollapse[name];
                    changed = true;
                }
            });

            if (changed) this.plugin.saveSettings();
        }

        groupsKeys.forEach(key => {
            if (key === "/") return;
            const groupEl = this.groups[key];
            
            const groupElSelf = this.groups[key].querySelector(":scope > .tree-item-self");

            // @ts-ignore
            if (groupElSelf != null) groupElSelf.dataset.item_len = groupEl.querySelectorAll(":scope > .tree-item-children > .tree-item").length;

            if (groupEl.querySelectorAll(".tree-item.favorite").length > 0) {
                groupEl.classList.add("has-favorite");
            } else {
                groupEl.classList.remove("has-favorite");
            }
        });

        this.sort();
    }

    sort(field: string | null = null, asc: boolean | null = null) {
        if (this.plugin.settings?.listviewSortField == field) {
            asc = !this.plugin.settings.listviewSortAsc;
        } else if (field != null) {
            this.plugin.settings.listviewSortField = field;
            asc = this.plugin.settings?.listviewSortAsc ?? DEFAULT_SETTINGS.listviewSortAsc;
        } else {
            field = this.plugin.settings?.listviewSortField ?? DEFAULT_SETTINGS.listviewSortField;
            asc = this.plugin.settings?.listviewSortAsc ?? DEFAULT_SETTINGS.listviewSortAsc;
        }

        this.plugin.settings.listviewSortField = field;
        this.plugin.settings.listviewSortAsc = asc;

        this.plugin.saveSettings();

        const keys = Object.keys(this.groups);
        
        keys.sort((a, b) => {
            let a_value = this.groups[a].dataset.name ?? "";
            let b_value = this.groups[b].dataset.name ?? "";
            let r_value: number = 0;

            if (a_value > b_value) r_value = 1;
            else if (a_value < b_value) r_value = -1;

            return r_value * (asc ? 1 : -1);
        });

        for (let key of keys) {
            this.groups[key].parentElement?.appendChild(this.groups[key]);
        }
        
        this.treeItems.sort((a, b) => {
            const a_value = a.dataset.name ?? "";
            const b_value = b.dataset.name ?? "";

            let r_value: number = 0;
            if (a_value > b_value) r_value = 1;
            else if (a_value < b_value) r_value = -1;

            return r_value * (asc ? 1 : -1);
        });

        for (let treeItem of this.treeItems) {
            treeItem.parentElement?.appendChild(treeItem);
        }
    }

    openFileContextMenu(event: MouseEvent, code: Code, treeItem: HTMLDivElement) {
        const menu = new Menu();
        // @ts-ignore
        menu.dom?.classList.add("runjs-codelist-view-menu");

        if (code.type == "script") {
            menu.addItem((item) =>
                item
                    .setTitle("Run code")
                    .setIcon("lucide-scroll")
                    .setSection("runjs-codelist-view")
                    .onClick(() => {
                        this.plugin.runCode(code);
                    })
            );
        }

        menu.addItem((item) =>
            item
                .setTitle("Toggle Favorite code")
                .setIcon(LIST_ICON["favorite"])
                .setSection("runjs-codelist-view")
                .onClick(() => {
                    treeItem.classList.toggle("favorite");
                    this.plugin.toggleFavoriteCode(code);
                    
                    const groupsKeys = Object.keys(this.groups);
            
                    groupsKeys.forEach(key => {
                        if (key === "/") return;
                        const groupEl = this.groups[key];
                        if (groupEl.querySelectorAll(".tree-item.favorite").length > 0) {
                            groupEl.classList.add("has-favorite");
                        } else {
                            groupEl.classList.remove("has-favorite");
                        }
                    });
                })
        );

        menu.addItem((item) =>
            item
                .setTitle("Open code file")
                .setIcon("lucide-edit")
                .setSection("runjs-codelist-view")
                .onClick(() => {
                    this.plugin.focusFile(
                        code,
                        event.ctrlKey || event.metaKey
                    );
                })
        );

        menu.addSeparator();

        this.listviewEvents.trigger("code-menu", menu, code);

        const file = this.app.vault.getAbstractFileByPath(code.file);
        this.app.workspace.trigger(
            "file-menu",
            menu,
            file,
            "link-context-menu"
        );

        menu.showAtMouseEvent(event);

    }

    toggleCollapse(folderEl: HTMLElement) {
        this.collapseFolder(folderEl, !folderEl.hasClass("is-collapsed"));
    }

    collapseFolder(folderEl: HTMLElement, collapse: boolean) {
        if (folderEl.dataset.group_name && this.plugin.settings.listviewCollapse[folderEl.dataset.group_name] !== collapse) {
            this.plugin.settings.listviewCollapse[folderEl.dataset.group_name] = collapse;
            this.plugin.saveSettings();
        }
        if (collapse) {
            folderEl.addClass("is-collapsed");
            folderEl.querySelector(".collapse-icon")?.addClass("is-collapsed");
        } else {
            folderEl.removeClass("is-collapsed");
            folderEl.querySelector(".collapse-icon")?.removeClass("is-collapsed");
        }
    }

    collapseAll(collapse: boolean) {
        Object.keys(this.groups).forEach(key => {
            if (key === "/") return;
            let groupEl = this.groups[key];
            this.collapseFolder(groupEl, collapse);
        })
    }
}
