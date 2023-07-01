import { App, SuggestModal } from "obsidian";

type SuggestCallback = (text: string | null) => void;

export class SuggestListModal extends SuggestModal<string> {
    title: string | null;
    message: string;
    list: Array<string>;
    defaultItem: string;
    onSubmit: SuggestCallback;

    constructor(app: App, title: string | null, message: string, list: Array<string>, placeHolder: string, onSubmit?: SuggestCallback) {
        super(app);
        if (title) this.titleEl.setText(title);
        this.message = message;
        this.list = list;
        if (placeHolder) this.emptyStateText = placeHolder;
        if (onSubmit != undefined) this.onSubmit = onSubmit;

        this.containerEl.addClass("runjs-suggest-modal");

        if (title != null && this.titleEl && this.titleEl.parentElement == null) {
            this.modalEl?.insertBefore(this.titleEl, this.modalEl.firstChild);
        }

        if (this.message) {
            if (this.contentEl && this.contentEl.parentElement == null) {
                if (this.titleEl?.parentElement != null) {
                    this.modalEl?.insertBefore(this.contentEl, this.titleEl.nextSibling);
                } else {
                    this.modalEl?.insertBefore(this.contentEl, this.modalEl.firstChild);
                }
            }

            this.contentEl?.setText(this.message);
        }
    }

    // Returns all available suggestions.
    getSuggestions(query: string): Array<string> {
        return this.list.filter((item) =>
            item.toLowerCase().includes(query.toLowerCase())
        );
    }

    // Renders each suggestion item.
    renderSuggestion(item: string, el: HTMLElement) {
        el.setText(item);
    }

    // Perform action on the selected suggestion.
    onChooseSuggestion(item: string, evt: Event) {
        // new Notice(`Selected ${item}`);
        // console.log(`Selected ${item}`);
        this.onSubmit(item);
    }
}

export async function openSuggestListModal(app: App, title: string, message: string, list: Array<string>, placeHolder: string, callback?: SuggestCallback) {
    return await new Promise((resolve, reject) => {
        new SuggestListModal(
            app,
            title,
            message,
            list,
            placeHolder,
            callback ?? ((item: string) => {
                resolve(item);
            })
        ).open();
    });
}
