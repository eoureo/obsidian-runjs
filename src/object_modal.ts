import {
    App,
    Instruction,
    Notice,
    Plugin,
    SuggestModal,
    setIcon,
} from "obsidian";
import { LIST_ICON } from "./constants";

interface Info {
    type: string;
    text: string; 
}

export class ObjectModal extends SuggestModal<string> {
    _object: {[key: string]: {}};
    _objectRoot: {[key: string]: {}};
    members: string[];
    memberInfos: { [member: string]: Info };
    properties: string[];
    prototypes: string[];
    onSubmit: (member: string) => void;
    plugin: Plugin;
    isGrouping: boolean;
    groups: string[];
    isClose: boolean;
    instructions: Instruction[];
    promptInputContainerEl: HTMLElement | null;
    _isPrototypeVisible: boolean;
    _isDetail: boolean;

    constructor(
        app: App,
        plugin: Plugin,
        object: {},
        onSubmit: (member: string) => void
    ) {
        super(app);
        this.onSubmit = onSubmit;
        this.plugin = plugin;
        this._object = object;
        this.isClose = false;
        this._isPrototypeVisible = true;
        this.memberInfos = {};
        this._objectRoot = object;
        this.limit = 100000;
        this.isDetail = true;

        this.promptInputContainerEl = this.inputEl.parentElement;

        this.instructions = [];
        this.instructions.push({
            command: "Cmd|Ctrl + Home | Backspace:",
            purpose: "goto parent.",
        });
        this.instructions.push({
            command: "Cmd|Ctrl + P:",
            purpose: "toggle show Prototypes.",
        });
        this.instructions.push({
            command: "Cmd|Ctrl + D:",
            purpose: "toggle show Details.",
        });
        this.instructions.push({
            command: "Cmd|Ctrl + Enter|Click",
            purpose: "close and return",
        });

        this.setInstructions(this.instructions);

        // this.containerEl.dataset.is_group = "true";
        const instructionEls = this.containerEl.querySelectorAll(
            ".prompt-instruction"
        );
        ["group normal", "group"].forEach((cls, index) =>
            cls
                .split(" ")
                .forEach((cl) => instructionEls[index].classList.add(cl))
        );

        instructionEls[0].addEventListener(
            "click",
            this.gotoUpperGroup.bind(this)
        );
        instructionEls[0].addClass("event_click");
        
        instructionEls[1].addEventListener(
            "click",
            this.togglePrototypeVisible.bind(this)
        );
        instructionEls[1].addClass("event_click");
        
        instructionEls[2].addEventListener(
            "click",
            () => { this.isDetail = !this.isDetail; }
        );
        instructionEls[2].addClass("event_click");

        this.containerEl.addClass("runjs-object-modal");

        // const promptEl = this.containerEl.querySelector(".prompt");
        // promptEl?.insertBefore(this.titleEl, promptEl.firstChild);
        if (this.titleEl && this.titleEl.parentElement == null) {
            this.modalEl?.insertBefore(this.titleEl, this.modalEl.firstChild);
        }

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

        this.addInfos();
    }

    public get object_root() {
        return this._objectRoot;
    }

    public set object_root(val) {
        this._objectRoot = val;
    }

    // Returns all available suggestions.
    getSuggestions(query: string): string[] {
        const splits = query.split(".");
        let queryModified: string = query;
        if (splits.length == 1) {
            this.object = this.object_root;
            queryModified = query;
        } else if (Object.keys(this._objectRoot).contains(splits[0])) {
            let object: {[key: string]: any} = this._objectRoot[splits[0]];
            queryModified = splits.slice(1).join(".");
            for (let i = 1; i < splits.length - 1; i++) {
                if (!object.hasOwnProperty(splits[i])) {
                    break;
                }
                object = object[splits[i]];
                queryModified = splits.slice(i + 1).join(".");
            }
            this.object = object;
        } else if (splits[0] == "this") {
            // If object_root has "this" key, it will be executed and this block will not be executed.
            let object: {[key: string]: any} = this;
            queryModified = splits.slice(1).join(".");
            for (let i = 1; i < splits.length - 1; i++) {
                if (!object.hasOwnProperty(splits[i])) {
                    break;
                }
                object = object[splits[i]];
                queryModified = splits.slice(i + 1).join(".");
            }
            this.object = object;
        } else {
            let object: {[key: string]: any} = window;
            for (let i = 0; i < splits.length - 1; i++) {
                if (!object.hasOwnProperty(splits[i])) {
                    break;
                }
                object = object[splits[i]];
                queryModified = splits.slice(i + 1).join(".");
            }
            this.object = object;
        }

        return this.members.filter((member) => {
            return member.toLowerCase().includes(queryModified.toLowerCase());
        });
    }

    // Renders each suggestion item.
    renderSuggestion(member: string, el: HTMLElement) {
        const div = el.createEl("div", { cls: "suggestion-content" });
        const icon = div.createEl("span", { cls: "icon suggestion-icon" });

        div.createEl("span", { cls: "suggestion-title", text: member });

        const info = this.getInfo(member);

        if (["object", "array"].contains(info.type)) el.addClass("folder");

        try {
            el.createEl("small", { text: info.text });
        } catch (e) { }
    }

    // Perform action on the selected suggestion.
    onChooseSuggestion(member: string, evt: MouseEvent | KeyboardEvent) {
        if (!evt.ctrlKey && this._object[member] != null && typeof this._object[member] == "object") {
            this.inputEl.value = this.inputEl.value.replace(/[^\.]*$/, member + ".");
            this._update();
            return;
        }

        this.isClose = true;
        this.onSubmit(this.inputEl.value.replace(/[^\.]*$/, "") + member);
        this.close();
    }

    get object() {
        return this._object;
    }

    set object(object_new) {
        if (this.object != object_new) {
            this._object = object_new;
            this.addInfos();
            this._update();
        }
    }

    _update() {
        // @ts-ignore
        this.updateSuggestions();
    }

    setScopes(plugin: Plugin) {
        // @ts-ignore
        this.scope.keys.forEach((k) => {
            if (k.modifiers.length == 0 && k.key == "Escape")
                this.scope.unregister(k);
        });

        this.scope.register([], "Escape", (event: KeyboardEvent) => {
            this.isClose = true;
            this.close();
        });

        this.scope.register(["Mod"], "Home", this.gotoUpperGroup.bind(this));

        this.scope.register(
            ["Alt"],
            "ArrowLeft",
            this.gotoUpperGroup.bind(this)
        );

        this.scope.register(
            ["Mod"],
            "Enter",
            (evt) => {
                // console.log("Ctrl+Enter:", evt);
                // @ts-ignore
                this.onChooseSuggestion(this.chooser.values[this.chooser.selectedItem], evt);
            }
        );

        this.scope.register(
            ["Mod"],
            "P",
            this.togglePrototypeVisible.bind(this)
        );

        this.scope.register(
            ["Mod"],
            "D",
            () => { this.isDetail = !this.isDetail; }
        );
    }

    gotoUpperGroup(event?: KeyboardEvent) {
        const splits = this.inputEl.value.split(".");
        
        if (splits.length <= 1) return;

        this.inputEl.value = this.inputEl.value.replace(/[^\.]+\.[^\.]*$/, "");
        this._update();
    }

    togglePrototypeVisible() {
        this.isPrototypeVisible = !this.isPrototypeVisible;

        this._update();
    }

    get isPrototypeVisible() {
        return this._isPrototypeVisible;
    }

    set isPrototypeVisible(val) {
        this._isPrototypeVisible = val;

        if (this._isPrototypeVisible) {
            this.members = this.properties.concat(this.prototypes);
        } else {
            this.members = this.properties;
        }
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
        // @ts-ignore
        if (this.isClose || (evt && evt?.target.classList?.contains("modal-bg")))
            super.close();

        if (evt) {
            evt.preventDefault();
        }
    }

    addInfos() {
        this.properties = Object.getOwnPropertyNames(this._object);
        this.prototypes = Object.getOwnPropertyNames( Object.getPrototypeOf(this._object) );
        this.members = this.properties.concat(this.prototypes);

        for (let member of this.members) {
            this.memberInfos[member] = this.makeInfo(this._object[member]);
        }
    }

    getInfo(member: string): Info {
        return this.memberInfos[member];
    }

    makeInfo(
        value: any,
        isShortForm: boolean = false
    ): Info {
        if (value === null) {
            return { type: "null", text: "null" };
        } else if (value instanceof Array) {
            if (isShortForm) {
                return { type: "array", text: ` (${value.length}) [...]` };
            }

            const texts = [];

            for (let item of value) {
                texts.push(this.makeInfo(item, true).text);
                if (texts.join(", ").length > 100) {
                    break;
                }
            }

            return {
                type: "array",
                text: ` (${value.length}) [` + texts.join(", ") + "]",
            };
        }

        const typeofValue = typeof value;
        switch (typeofValue) {
            case "object":
                let name = value.constructor?.name ?? "";

                if (name == "Object") {
                    name = new String(value)
                        .toString()
                        .replace("[object", "")
                        .replace("]", "")
                        .trim();
                }

                if (name == "Object") name = "";

                if (isShortForm) {
                    return { type: typeofValue, text: name + "{...}" };
                }

                let text = value?.toString ? value.toString() : "" ?? "";

                const texts = [];

                for (let item of Object.getOwnPropertySymbols(value)) {
                    try {
                        texts.push(
                            item.toString() + ": " + this.makeInfo(value[item], true).text
                        );
                        if (texts.join(", ").length > 100) {
                            break;
                        }
                    } catch (e) { }
                }

                for (let item of Object.getOwnPropertyNames(value)) {
                    try {
                        texts.push(
                            item + ": " + this.makeInfo(value[item], true).text
                        );
                    }
                    catch (e) {
                        texts.push(
                            item + ": #ERROR#"
                        );
                        console.error(value, item, e);
                    }

                    if (texts.join(", ").length > 100) {
                        break;
                    }
                }

                if (texts.length > 0) {
                    text = " {" + texts.join(", ") + "}";
                }

                return { type: typeofValue, text: name + " " + text };
            case "string":
                if (value?.toString)
                    return {
                        type: typeofValue,
                        text: "'" + value.toString() + "'",
                    };
                else
                    return {
                        type: typeofValue,
                        text: "'" + new String(value).toString() + "'",
                    };
            default:
                if (value?.toString)
                    return { type: typeofValue, text: value.toString() };
                else
                    return {
                        type: typeofValue,
                        text: new String(value).toString(),
                    };
        }
    }

    get isDetail() {
        return this._isDetail;
    }

    set isDetail(val: boolean) {
        this._isDetail = val;

        if (val) {
            this.containerEl.removeClass("hide-detail");
        } else {
            this.containerEl.addClass("hide-detail");
        }
    }
}
