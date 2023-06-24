import { App, SuggestModal, setIcon } from "obsidian";

export class IconModal extends SuggestModal<string> {
    icons: string[];
    onSubmit: (icon: string) => void;

    constructor(app: App, icons: string[], onSubmit: (icon: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
        this.icons = icons;
        this.containerEl.addClass("runjs-icon-modal");
        this.limit = icons.length;
    }

    // Returns all available suggestions.
    getSuggestions(query: string): string[] {
        return this.icons.filter((icon) =>
        icon.toLowerCase().includes(query.toLowerCase())
        );
    }

    // Renders each suggestion item.
    renderSuggestion(icon: string, el: HTMLElement) {
        el.setAttribute("title", icon);
        let span = el.createSpan({ text: icon });
        setIcon(span, icon);
    }

    // Perform action on the selected suggestion.
    onChooseSuggestion(icon: string, evt: MouseEvent | KeyboardEvent) {
        this.onSubmit(icon);
    }
}
