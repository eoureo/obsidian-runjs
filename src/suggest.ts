import { PopoverSuggest, App, Platform, TFile, TFolder } from "obsidian";
import { Code } from "./main";


/**
 * Represents a text input suggest popover.
 */
export class TextInputPopoverSuggest extends PopoverSuggest<string> {
    app: App;
    textInputEl: HTMLInputElement;
    static MAX_SUGGESTIONS: number = 100;

    /**
     * Constructs a new TextInputPopoverSuggest instance.
     * @param {App} app - The Obsidian App instance.
     * @param {HTMLInputElement} inputEl - The HTMLInputElement to attach the suggestion popover to.
     */
    constructor(app: App, inputEl: HTMLInputElement) {
        super(app);
        this.app = app;

        this.textInputEl = inputEl;
        inputEl.addEventListener("input", this.onInputChange.bind(this));
        inputEl.addEventListener("focus", this.onInputChange.bind(this));
        inputEl.addEventListener("blur", this.close.bind(this));

        // @ts-ignore
        this.suggestEl.on("mousedown", ".suggestion-item", (e: Event) => {
            e.preventDefault();
        });
    }

    /**
     * Event handler for the input change event.
     */
    onInputChange(): void {
        const inputEl = this.textInputEl;
        const value = inputEl.value;
        const suggestions = this.getSuggestions(value);

        if (suggestions.length > 0) {
            // @ts-ignore
            this.suggestions.setSuggestions(suggestions);
            this.open();
            // @ts-ignore
            this.setAutoDestroy(inputEl);
            if (!Platform.isPhone) {
                // @ts-ignore
                this.reposition(calculateBoundingRectangle(inputEl));
            }
        } else {
            this.close();
        }
    }

    /**
     * Retrieves the file suggestions based on the input value.
     * @param {string} input - The input value.
     * @returns {string[]} - The array of file suggestions.
     */
    getSuggestions(input: string): any[] {
        input = input.toLowerCase();
        const suggestions: any[] = [];

        return suggestions;
    }

    renderSuggestion(value: any, el: HTMLElement) {
        el.setText(value);
    }

    /**
     * Selects a suggestion.
     * @param {any} suggestion - The selected suggestion.
     * @param {any} value - The value associated with the selected suggestion.
     */
    selectSuggestion(suggestion: any, value: any): void {
        // if (this.onSelect) {
        //     this.onSelect(suggestion, value);
        // }
    }
}


/**
 * Represents a specialized TextInputPopoverSuggest for folder suggestions.
 */
export class FolderTextInputPopoverSuggest extends TextInputPopoverSuggest {
    allowNullSelection: boolean;

    /**
     * Constructs a new FolderTextInputPopoverSuggest instance.
     * @param {App} app - The Obsidian App instance.
     * @param {HTMLInputElement} inputEl - The HTMLInputElement to attach the suggestion popover to.
     * @param {boolean} allowNullSelection - Whether to allow null selection (no suggestion).
     */
    constructor(
        app: App,
        inputEl: HTMLInputElement,
        allowNullSelection = false
    ) {
        super(app, inputEl);
        this.allowNullSelection = allowNullSelection;
    }

    /**
     * Renders the suggestion item.
     * @param {TFolder | null} suggestion - The suggestion item.
     * @param {HTMLElement} el - The suggestion item element.
     */
    renderSuggestion(suggestion: TFolder | null, el: HTMLElement): void {
        if (suggestion) {
            el.setText(suggestion.path);
        } else {
            el.setText(`+ ${this.textInputEl.value}`);
        }
    }

    /**
     * Retrieves the folder suggestions based on the input value.
     * @param {string} input - The input value.
     * @returns {TFolder[]} - The array of folder suggestions.
     */
    getSuggestions(input: string): TFolder[] {
        input = input.toLowerCase();
        const suggestions: TFolder[] = [];
        const loadedFiles = this.app.vault.getAllLoadedFiles();

        for (let i = 0; i < loadedFiles.length; i++) {
            const file = loadedFiles[i];
            if (suggestions.length >= FolderTextInputPopoverSuggest.MAX_SUGGESTIONS) {
                break;
            }
            if (file instanceof TFolder && this.filePredicate(file, input)) {
                suggestions.push(file);
            }
        }

        // if (this.allowNullSelection && input) {
        //     suggestions.push(null);
        // }

        return suggestions;
    }

    /**
     * Predicate function to filter folder suggestions.
     * @param {TFolder} folder - The folder to test.
     * @param {string} input - The input value.
     * @returns {boolean} - Whether the folder matches the input value.
     */
    filePredicate(folder: TFolder, input: string): boolean {
        return folder.path.toLowerCase().includes(input);
    }

    /**
     * Selects a suggestion and updates the input value.
     * @param {TFolder | null} suggestion - The selected suggestion.
     * @param {any} value - The value associated with the selected suggestion.
     */
    selectSuggestion(suggestion: TFolder | null, value: any): void {
        if (suggestion) {
            const inputEl = this.textInputEl;
            inputEl.value = suggestion.path;
            inputEl.trigger("input");
        }
        this.close();
        super.selectSuggestion(suggestion, value);
    }
}


/**
 * Represents a specialized TextInputPopoverSuggest for file suggestions.
 */
export class FileTextInputPopoverSuggest extends TextInputPopoverSuggest {
    allowNullSelection: boolean;

    /**
     * Constructs a new FileTextInputPopoverSuggest instance.
     * @param {App} app - The Obsidian App instance.
     * @param {HTMLInputElement} inputEl - The HTMLInputElement to attach the suggestion popover to.
     * @param {boolean} allowNullSelection - Whether to allow null selection (no suggestion).
     */
    constructor(
        app: App,
        inputEl: HTMLInputElement,
        allowNullSelection = false
    ) {
        super(app, inputEl);
        this.allowNullSelection = allowNullSelection;
    }

    /**
     * Renders the suggestion item.
     * @param {TFile | null} suggestion - The suggestion item.
     * @param {HTMLElement} el - The suggestion item element.
     */
    renderSuggestion(suggestion: TFile | null, el: HTMLElement): void {
        if (suggestion) {
            el.setText(suggestion.path);
        } else {
            el.setText(`+ ${this.textInputEl.value}`);
        }
    }

    /**
     * Retrieves the file suggestions based on the input value.
     * @param {string} input - The input value.
     * @returns {TFile[]} - The array of file suggestions.
     */
    getSuggestions(input: string): TFile[] {
        input = input.toLowerCase();
        const suggestions: TFile[] = [];
        const loadedFiles = this.app.vault.getAllLoadedFiles();

        for (let i = 0; i < loadedFiles.length; i++) {
            const file = loadedFiles[i];
            if (suggestions.length >= FileTextInputPopoverSuggest.MAX_SUGGESTIONS) {
                break;
            }
            if (file instanceof TFile && this.filePredicate(file, input)) {
                suggestions.push(file);
            }
        }

        // if (this.allowNullSelection && input) {
        //     suggestions.push(null);
        // }

        return suggestions;
    }

    /**
     * Predicate function to filter file suggestions.
     * @param {TFile} file - The file to test.
     * @param {string} input - The input value.
     * @returns {boolean} - Whether the file matches the input value.
     */
    filePredicate(file: TFile, input: string): boolean {
        return file.path.toLowerCase().includes(input);
    }

    /**
     * Selects a suggestion and updates the input value.
     * @param {TFile | null} suggestion - The selected suggestion.
     * @param {any} value - The value associated with the selected suggestion.
     */
    selectSuggestion(suggestion: TFile | null, value: any): void {
        if (suggestion) {
            const inputEl = this.textInputEl;
            inputEl.value = suggestion.path;
            inputEl.trigger("input");
        }
        this.close();
        super.selectSuggestion(suggestion, value);
    }
}


export class CodeInputPopoverSuggest extends TextInputPopoverSuggest {
    allowNullSelection: boolean;
    codes: Code[];
    static MAX_SUGGESTIONS: number = 100;

    /**
     * Constructs a new FolderTextInputPopoverSuggest instance.
     * @param {App} app - The Obsidian App instance.
     * @param {HTMLInputElement} inputEl - The HTMLInputElement to attach the suggestion popover to.
     * @param {boolean} allowNullSelection - Whether to allow null selection (no suggestion).
     */
    constructor(
        app: App,
        inputEl: HTMLInputElement,
        codes: Code[],
        allowNullSelection = false
    ) {
        super(app, inputEl);
        this.allowNullSelection = allowNullSelection;
        this.codes = codes;
    }

    /**
     * Renders the suggestion item.
     * @param {Code | null} suggestion - The suggestion item.
     * @param {HTMLElement} el - The suggestion item element.
     */
    renderSuggestion(suggestion: Code | null, el: HTMLElement): void {
        if (suggestion) {
            el.setText(suggestion.name);
        } else {
            el.setText(`+ ${this.textInputEl.value}`);
        }
    }

    /**
     * Retrieves the Code suggestions based on the input value.
     * @param {string} query - The input value.
     * @returns {Code[]} - The array of Code suggestions.
     */
    getSuggestions(query: string): Code[] {
        return this.codes.filter((code) =>
            code.name.toLowerCase().includes(query.toLowerCase())
        );
    }

    /**
     * Selects a suggestion and updates the input value.
     * @param {Code | null} suggestion - The selected suggestion.
     * @param {any} value - The value associated with the selected suggestion.
     */
    selectSuggestion(suggestion: Code | null, value: any): void {
        if (suggestion) {
            const inputEl = this.textInputEl;
            inputEl.value = suggestion.name;
            inputEl.trigger("input");
        }
        this.close();
        super.selectSuggestion(suggestion, value);
    }
}


/**
 * Calculates the absolute position of an element relative to its offset parent or a specified target element.
 * @param {HTMLElement} element - The element to calculate the position for.
 * @param {HTMLElement} target - The target element to calculate the position relative to.
 * @returns {{ top: number, left: number }} - The calculated position object with `top` and `left` properties.
 */
function calculateElementPosition(
    element: HTMLElement,
    target: HTMLElement
): { top: number; left: number } {
    let top = 0;
    let left = 0;
    const offsetParent = target ? target.offsetParent : null;

    while (element && element !== target && element !== offsetParent) {
        top += element.offsetTop;
        left += element.offsetLeft;

        let offsetParentElement = element.offsetParent;
        let parentElement = element.parentElement;

        while (parentElement && parentElement !== offsetParentElement) {
            top -= parentElement.scrollTop;
            left -= parentElement.scrollLeft;
            parentElement = parentElement.parentElement;
        }

        if (
            offsetParentElement &&
            offsetParentElement !== target &&
            offsetParentElement !== offsetParent
        ) {
            top -= offsetParentElement.scrollTop;
            left -= offsetParentElement.scrollLeft;
        }

        element = <HTMLElement>offsetParentElement;
    }

    return {
        top,
        left,
    };
}


/**
 * Calculates the bounding rectangle of an element.
 * @param {HTMLElement} element - The element to calculate the bounding rectangle for.
 * @param {HTMLElement} target - The target element to calculate the position relative to.
 * @returns {{ left: number, right: number, top: number, bottom: number }} - The calculated bounding rectangle object with `left`, `right`, `top`, and `bottom` properties.
 */
function calculateBoundingRectangle(
    element: HTMLElement,
    target: HTMLElement
): { left: number; right: number; top: number; bottom: number } {
    const position = calculateElementPosition(element, target);
    return {
        left: position.left,
        right: position.left + element.offsetWidth,
        top: position.top,
        bottom: position.top + element.offsetHeight,
    };
}
