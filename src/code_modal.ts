import {
    App,
    Instruction,
    Notice,
    Plugin,
    SuggestModal,
    setIcon,
} from "obsidian";
import { Code } from "./main";
import { LIST_ICON } from "./constants";

export class RunJSCodeModal extends SuggestModal<Code> {
    codes: Code[];
    onSubmit: (code: Code) => void;
    plugin: Plugin;
    isGrouping: boolean;
    _groupRoot: string;
    groupParent: string;
    groups: string[];
    isClose: boolean;
    instructions: Instruction[];
    promptInputContainerEl: HTMLElement | null;

    constructor(
        app: App,
        plugin: Plugin,
        codes: Code[],
        onSubmit: (code: Code) => void
    ) {
        super(app);
        this.onSubmit = onSubmit;
        this.plugin = plugin;
        this.codes = codes;
        this.isClose = false;
        this.isGrouping = true;
        this._groupRoot = "";
        this.groupParent = "";
        this.groups = [];

        this.promptInputContainerEl = this.inputEl.parentElement;

        this.instructions = [];
        this.instructions.push({
            command: "Cmd|Ctrl + G:",
            purpose: "toggle Grouping",
        });
        this.instructions.push({
            command: "Cmd|Ctrl + Home | Backspace:",
            purpose: "goto Upper group.",
        });

        this.setInstructions(this.instructions);

        this.containerEl.dataset.is_group = "true";
        let instructionEls = this.containerEl.querySelectorAll(
            ".prompt-instruction"
        );
        ["group normal", "group"].forEach((cls, index) =>
            cls.split(" ").forEach((cl) => instructionEls[index].classList.add(cl))
        );

        instructionEls[0].addEventListener(
            "click",
            this.toggleGrouping.bind(this)
        );
        instructionEls[1].addEventListener(
            "click",
            this.gotoUpperGroup.bind(this)
        );

        this.containerEl.addClass("runjs-code-modal");
        let promptEl = this.containerEl.querySelector(".prompt");
        promptEl?.insertBefore(this.titleEl, promptEl.firstChild);

        this.promptInputContainerEl.dataset.parent = this.groupParent;
        this.promptInputContainerEl?.addEventListener("click", (e) => {
            if (e.target === this.promptInputContainerEl) {
                this.gotoUpperGroup();
            }
        });

        this.setScopes(this.plugin);

        this.inputEl.addEventListener("keydown", ({ key }) => {
            if (key === "Backspace" && this.inputEl.value === "") {
                this.gotoUpperGroup();
            }
        });
    }

    public get groupRoot() {
        return this._groupRoot;
    }

    public set groupRoot(val) {
        this._groupRoot = val;
    }

    onOpen() {
        super.onOpen();
        this.groupParent = "";
        this.groups = [];
    }

    // Returns all available suggestions.
    getSuggestions(query: string): Code[] {
        if (this.isGrouping) {
            this.groups = [];
            return this.codes.filter((code) => {
                if (!code.name.startsWith(this.groupRoot + this.groupParent))
                    return false;

                let codeName = code.name.slice(
                    this.groupRoot.length + this.groupParent.length
                );

                let splits = codeName.split("/");

                if (!splits[0].toLowerCase().includes(query.toLowerCase()))
                    return false;

                if (this.groups.includes(splits[0])) return false;

                this.groups.push(splits[0]);

                return true;
            })
            .sort((a, b) => {
                let a_name = a.name.slice(
                    this.groupRoot.length + this.groupParent.length
                );
                let b_name = b.name.slice(
                    this.groupRoot.length + this.groupParent.length
                );
                if (a_name > b_name) return 1;
                else if (a_name < b_name) return -1;
                else return 0;
            });
        }

        return this.codes.filter((code) => {
            let codeName = code.name.slice(this.groupRoot.length);
            return codeName.toLowerCase().includes(query.toLowerCase());
        })
        .sort((a, b) => {
            if (a.name > b.name) return 1;
            else if (a.name < b.name) return -1;
            else return 0;
        });
    }

    // Renders each suggestion item.
    renderSuggestion(code: Code, el: HTMLElement) {
        if (this.isGrouping) {
            let codeName = code.name.slice(
                this.groupRoot.length + this.groupParent.length
            );
            let splits = codeName.split("/");
            let div = el.createEl("div", { cls: "suggestion-content" });
            let icon = div.createEl("span", { cls: "icon suggestion-icon" });
            div.createEl("span", { cls: "suggestion-title", text: splits[0] });
            if (splits.length > 1) {
                el.classList.add("folder");
                setIcon(icon, LIST_ICON["folder"]);
            } else {
                setIcon(icon, LIST_ICON["script"]);
            }
        } else {
            el.createEl("div", {
                text: code.name.slice(this.groupRoot.length),
            });
            if (code.desc) {
                el.createEl("small", { text: code.desc });
            }
        }
    }

    // Perform action on the selected suggestion.
    onChooseSuggestion(code: Code, evt: MouseEvent | KeyboardEvent) {
        if (this.isGrouping) {
            let codeName = code.name.slice(
                this.groupRoot.length + this.groupParent.length
            );
            let splits = codeName.split("/");
            if (splits.length > 1) {
                this.groupParent += splits[0] + "/";
                this.groups = [];
                this._update();
                return;
            }
        }

        this.isClose = true;
        this.onSubmit(code);
        this.close();
    }

    _update() {
        this.promptInputContainerEl.dataset.parent = this.groupParent;
        this.updateSuggestions();
    }

    setScopes(plugin: Plugin) {
        this.scope.keys.forEach((key) => {
            if (key.modifiers.length == 0 && key.key == "Escape") this.scope.unregister(key);
        });
        
        this.scope.register([], "Escape", (event: KeyboardEvent) => {
            this.isClose = true;
            this.close();
        });

        this.scope.register(["Mod"], "Home", this.gotoUpperGroup.bind(this));
        this.scope.register(["Alt"], "ArrowLeft", this.gotoUpperGroup.bind(this));
        this.scope.register(["Mod"], "G", this.toggleGrouping.bind(this));
    }

    gotoUpperGroup(event?: KeyboardEvent) {
        if (this.groupParent == "") return;

        this.groupParent = this.groupParent
            .replace(/\/$/, "")
            .replace(/[^\/]*?$/, "");
        this.groups = [];
        this._update();
    }

    toggleGrouping() {
        this.isGrouping = !this.isGrouping;

        if (!this.isGrouping) {
            this.groups = [];
            this.containerEl.dataset.is_group = "false";
        } else {
            this.containerEl.dataset.is_group = "true";
        }

        this._update();
    }

    close(evt?: KeyboardEvent) {
        if (this.isClose || evt?.target.classList.contains("modal-bg"))
            super.close();

        if (evt) {
            evt.preventDefault();
        }
    }
}
