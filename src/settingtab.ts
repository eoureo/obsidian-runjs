import {
    App,
    Notice,
    PluginSettingTab,
    Setting,
    TextComponent,
    ToggleComponent,
    setIcon,
} from "obsidian";
import RunJSPlugin, {
    Code,
    CommandSetting,
    CommandsSetting,
    DEFAULT_CODE,
    RibbonIconSetting,
} from "./main";
import {
    FileTextInputPopoverSuggest,
    FolderTextInputPopoverSuggest,
} from "./suggest";
import {
    BUY_ME_A_COFFEE_QR,
    BUY_ME_A_COFFEE_QR_BOX,
    BUY_ME_A_COFFEE_YELLOW,
    COMMAND_DEFAULT_ICON,
    COMMAND_PREFIX,
    LIST_ICON,
    RIBBON_ICON_DEFAULT_ICON,
} from "./constants";
import { RunJSCodeModal } from "./code_modal";
import { openConfirmDeleteModal } from "./confirm_modal";
import { openMessageModal } from "./message_modal";

export class RunJSSettingTab extends PluginSettingTab {
    plugin: RunJSPlugin;
    autostartContainerEl: HTMLDivElement;
    commandsContainerEl: HTMLDivElement;
    ribbonIconsContainerEl: HTMLDivElement;
    eventsContainerEl: HTMLDivElement;
    intervalContainerEl: HTMLDivElement;
    settings_sym: symbol;
    key_sym: symbol;

    constructor(app: App, plugin: RunJSPlugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.settings_sym = Symbol("settings");
        this.key_sym = Symbol("key");
    }

    display(): void {
        const { containerEl } = this;

        containerEl.classList.add("runjs-settingtab");

        containerEl.empty();

        new Setting(containerEl)
            .setName(this.plugin.manifest.name)
            .setDesc("(v" + this.plugin.manifest.version + ")")
            .setClass("setting-item-heading") //  setting-head
            .addExtraButton((component) => {
                component
                    .setIcon("refresh-ccw")
                    .setTooltip("Refresh codelist")
                    .onClick(() => {
                        this.plugin.refresh();
                    });
            })
            .addExtraButton((component) => {
                component
                    .setIcon("refresh-cw")
                    .setTooltip("Reload plugin")
                    .onClick(() => {
                        this.plugin.reload();
                    });
                component.extraSettingsEl.classList.add("mod-warning");
            })
            .then(cb => {
                cb.settingEl.classList.add("setting-head");
            });

        new Setting(containerEl)
            .setName("Auto refresh")
            .setDesc(
                "Auto refresh code list on events(modify, rename and delete file)."
            )
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.autoRefresh)
                    .onChange((value) => {
                        this.plugin.settings.autoRefresh = value;
                        this.plugin.saveSettings();

                        this.plugin.registerEventsRunJS();
                    });
            });

        new Setting(containerEl)
            .setName("Scripts folder")
            .setDesc(`Root folder saved script files of ${this.plugin.manifest.name}.`)
            .addText(async (cb) => {
                cb.setPlaceholder("Example: folder1/folder2")
                    .setValue(this.plugin.settings.scriptsFolder)
                    .onChange(async (new_folder) => {
                        this.plugin.settings.scriptsFolder = new_folder;
                        this.plugin.saveSettings();
                        if((await app.vault.adapter.stat(this.plugin.settings.scriptsFolder))?.type == "folder") {
                            cb.inputEl.removeClass("mod-warning");
                        } else {
                            cb.inputEl.addClass("mod-warning");
                        }
                    });

                    if((await app.vault.adapter.stat(this.plugin.settings.scriptsFolder))?.type == "folder") {
                        cb.inputEl.removeClass("mod-warning");
                    } else {
                        cb.inputEl.addClass("mod-warning");
                    }

                new FolderTextInputPopoverSuggest(this.app, cb.inputEl);
            });

        new Setting(containerEl)
            .setName("Log")
            .setDesc("Set where to write logs ( this.log(type, ...messages) ).")
            .addExtraButton((component) => {
                component
                    .setIcon("check-circle-2")
                    .setTooltip("console")
                    .onClick(() => {
                        this.plugin.settings.logConsole = !this.plugin.settings.logConsole;
                        this.plugin.saveSettings();
                        if (this.plugin.settings.logConsole) component.setIcon("check-circle-2");
                        else component.setIcon("circle");
                    })
                    .then(cb => {
                        cb.extraSettingsEl.addClass("setting-log-check")
                        if (this.plugin.settings.logConsole) cb.setIcon("check-circle-2");
                        else cb.setIcon("circle");
                    });
            })
            .addExtraButton((component) => {
                component
                    .setIcon("check-circle-2")
                    .setTooltip("notice")
                    .onClick(() => {
                        this.plugin.settings.logNotice = !this.plugin.settings.logNotice;
                        this.plugin.saveSettings();
                        if (this.plugin.settings.logNotice) component.setIcon("check-circle-2");
                        else component.setIcon("circle");
                    })
                    .then(cb => {
                        cb.extraSettingsEl.addClass("setting-log-check")
                        if (this.plugin.settings.logNotice) cb.setIcon("check-circle-2");
                        else cb.setIcon("circle");
                    });
            })
            .addExtraButton((component) => {
                component
                    .setIcon("circle")
                    .setTooltip("file")
                    .onClick(() => {
                        this.plugin.settings.logFile = !this.plugin.settings.logFile;
                        this.plugin.saveSettings();
                        if (this.plugin.settings.logFile) component.setIcon("check-circle-2");
                        else component.setIcon("circle");
                    })
                    .then(cb => {
                        cb.extraSettingsEl.addClass("setting-log-check")
                        if (this.plugin.settings.logFile) cb.setIcon("check-circle-2");
                        else cb.setIcon("circle");
                    });
            })
            .addText((cb) => {
                cb.setPlaceholder("Example: folder1/file2")
                    .setValue(this.plugin.settings.logFilePath)
                    .onChange((new_file) => {
                        this.plugin.settings.logFilePath = new_file;
                        this.plugin.saveSettings();
                    });
                new FileTextInputPopoverSuggest(this.app, cb.inputEl);
            });

        new Setting(containerEl)
            .setName("Runs")
            .setClass("setting-item-heading");

        new Setting(containerEl)
            .setName("Auto start")
            .setDesc("This adds a code triggered when this plugin is loaded.")
            .addButton((component) =>
                component
                    .setIcon("plus")
                    .setTooltip("Add code")
                    .onClick(async (evt: MouseEvent) => {
                        let app = this.app;

                        let runJSCodeModal = new RunJSCodeModal(
                            app,
                            this.plugin,
                            this.plugin.codesScript,
                            this.addAutostartSetting.bind(this)
                        );
                        runJSCodeModal.open();
                    })
            );

        this.autostartContainerEl = containerEl.createDiv({
            cls: "setting-item-container autostart-container",
        });

        for (let autostart of this.plugin.settings.autostarts) {
            this.renderAutostartSetting(
                autostart,
                this.plugin.settings.autostarts
            );
        }

        new Setting(containerEl)
            .setName("Command")
            .setDesc("This adds a command that can be triggered anywhere.")
            .addButton((component) =>
                component
                    .setIcon("plus")
                    .setTooltip("Add Command")
                    .onClick(async (evt: MouseEvent) => {
                        let app = this.app;
                        let runJSCodeModal = new RunJSCodeModal(
                            app,
                            this.plugin,
                            this.plugin.codesScript,
                            this.addCommandSetting.bind(this)
                        );
                        runJSCodeModal.open();
                    })
            );

        this.commandsContainerEl = containerEl.createDiv({
            cls: "setting-item-container command-container",
        });

        for (let key in this.plugin.settings.commands) {
            this.renderCommandSetting(key, this.plugin.settings.commands);
        }

        new Setting(containerEl)
            .setName("Ribbon icon")
            .setDesc("This creates an icon in the left ribbon.")
            .addButton((component) =>
                component
                    .setIcon("plus")
                    .setTooltip("Add ribbon icon")
                    .onClick(async (evt: MouseEvent) => {
                        let app = this.app;
                        let runJSCodeModal = new RunJSCodeModal(
                            app,
                            this.plugin,
                            this.plugin.codesScript,
                            this.addRibbonIconSetting.bind(this)
                        );
                        runJSCodeModal.open();
                    })
            );

        this.ribbonIconsContainerEl = containerEl.createDiv({
            cls: "setting-item-container ribbonIcon-container",
        });

        for (let RibbonIconSetting of this.plugin.settings.ribbonIcons) {
            this.renderRibbonIconSetting(
                RibbonIconSetting,
                this.plugin.settings.ribbonIcons
            );
        }

        new Setting(containerEl)
            .setName("Event handle - ToDo")
            .setDesc(
                "This adds a code for each event(click, active-leaf-change, file-open, editor-change ......)."
            );

        this.eventsContainerEl = containerEl.createDiv({
            cls: "setting-item-container events-container",
        });

        new Setting(containerEl)
            .setName("Interval - ToDo")
            .setDesc("This adds a code every interval.");

        this.intervalContainerEl = containerEl.createDiv({
            cls: "setting-item-container interval-container",
        });

        
		new Setting(containerEl)
        .setName('Donate')
        .setDesc('If you like this plugin, consider donating to support continued development:')
        .setClass("setting-donate")
        // .addButton((bt) => {
        //     bt.buttonEl.outerHTML = `<a href="https://www.buymeacoffee.com/eoureo" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 40px !important;width: 144px !important;" ></a>`;
        // })
        .addButton((bt) => {
            bt.buttonEl.outerHTML = `<a href="https://www.buymeacoffee.com/eoureo" target="_blank"><img src="${BUY_ME_A_COFFEE_YELLOW}" data-src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 40px !important;width: 144px !important;" ></a>`;
        })
        .addButton((bt) => {
            bt.buttonEl.outerHTML = `<a href="https://www.buymeacoffee.com/eoureo" target="_blank"><img src="${BUY_ME_A_COFFEE_QR_BOX}" alt="Buy Me A Coffee" style="height: 144px !important;width: 144px !important;" ></a>`;
        });
    }

    addAutostartSetting(code: Code) {
        let autostart: [string, boolean] = [code.name, true];
        this.plugin.settings.autostarts.push(autostart);
        this.plugin.saveSettings();
        this.renderAutostartSetting(
            autostart,
            this.plugin.settings.autostarts
        );
    }

    addCommandSetting(code: Code) {
        let keys = Object.keys(this.plugin.settings.commands);
        let index = 0;
        for (; index <= keys.length; index++) {
            if (!keys.includes(COMMAND_PREFIX + index)) {
                break;
            }
        }

        this.plugin.settings.commands[COMMAND_PREFIX + index] = {
            name: code.name,
            codeName: code.name,
            enable: false,
            icon: COMMAND_DEFAULT_ICON,
        };

        this.plugin.saveSettings();
        this.renderCommandSetting(
            COMMAND_PREFIX + index,
            this.plugin.settings.commands
        );
    }

    addRibbonIconSetting(code: Code) {
        let setting_new = {
            name: code.name,
            codeName: code.name,
            enable: false,
            icon: RIBBON_ICON_DEFAULT_ICON,
        };

        this.plugin.settings.ribbonIcons.push(setting_new);

        this.plugin.saveSettings();
        this.renderRibbonIconSetting(
            setting_new,
            this.plugin.settings.ribbonIcons
        );
    }

    renderAutostartSetting(autostart: [string, boolean], settings: [string, boolean][]) {
        let codeName = autostart[0];
        let code = this.plugin.getCodeByName(codeName);
        
        let checkError = false;
        if (code == null) {
            this.plugin.log("error", "renderAutostartSetting", codeName);
            code = Object.assign({}, DEFAULT_CODE, {
                name: "error",
                form: "error",
            });
            checkError = true;
        }
        let setting = new Setting(this.autostartContainerEl)
            .setName(
                createFragment((e) => {
                    let icon = e.createSpan({ text: "icon", cls: "icon" });
                    setIcon(icon, LIST_ICON[code.form]);
                    e.createSpan({ text: autostart[0] });
                })
            )
            .addExtraButton((component) =>
                component
                    .setIcon("arrow-up-circle")
                    .setTooltip("move up")
                    .onClick(() => {
                        this.moveSetting(setting, false);
                    })
            )
            .addExtraButton((component) =>
                component
                    .setIcon("arrow-down-circle")
                    .setTooltip("move down")
                    .onClick(() => {
                        this.moveSetting(setting, true);
                    })
            )
            .addExtraButton((component) =>
                component
                    .setIcon("x-circle")
                    .setTooltip("delete")
                    .onClick(() => {
                        openConfirmDeleteModal(
                            this.app,
                            "Delete auto start item",
                            `Are you sure you want to delete setting of "${autostart[0]}"?`,
                            (confirmed: boolean) => {
                                if (confirmed) {
                                    this.deleteSetting(setting);
                                }
                            }
                        );
                    })
            )
            .addToggle((toggle) => {
                toggle.setValue(autostart[1]).onChange((value) => {
                    autostart[1] = value;
                    this.plugin.saveSettings();
                });
            })
            .then((st: Setting) => {
                Object.defineProperty(st, this.settings_sym, {
                    value: settings,
                    writable: false
                });
            });
        if (checkError) {
            setting.nameEl.classList.add("mod-warning");
            setting.nameEl.setAttribute("title", "error");
        }
        return setting;
    }

    renderCommandSetting(key: string, settings: CommandsSetting) {
        let commandSetting: CommandSetting = settings[key];
        let code = this.plugin.getCodeByName(commandSetting.codeName);
        let checkError = false;
        if (code == null) {
            this.plugin.log("error", "renderCommandSetting", commandSetting);
            code = Object.assign({}, DEFAULT_CODE, {
                name: "error",
                form: "error",
            });
            checkError = true;
        }
        let textComp: TextComponent;
        let toggleComp: ToggleComponent;
        let setting = new Setting(this.commandsContainerEl)
            .setName(
                createFragment((e) => {
                    let icon = e.createSpan({
                        text: "icon",
                        cls: "icon file-icon",
                        title: code.form,
                    });
                    setIcon(icon, LIST_ICON[code.form]);
                    e.createSpan({ text: commandSetting.codeName, cls: "code-name" });
                })
            )
            .addText((cb) => {
                textComp = cb
                    .setPlaceholder("input command name")
                    .setValue(commandSetting.name)
                    .onChange((value) => {
                        toggleComp.setValue(false);
                        if (value.trim() == "") {
                            toggleComp.setDisabled(true);
                        } else {
                            toggleComp.setDisabled(false);
                        }
                        settings[key].name = value;
                        this.plugin.saveSettings();
                    });
            })
            .addExtraButton((component) =>
                component
                    .setIcon("x-circle")
                    .setTooltip("delete")
                    .onClick(() => {
                        openConfirmDeleteModal(
                            this.app,
                            "Delete command item",
                            `Are you sure you want to delete command "${commandSetting.name}"?`,
                            (confirmed: boolean) => {
                                if (confirmed) {
                                    this.plugin.removeCommand(key);
                                    this.deleteSetting(setting);
                                }
                            }
                        );
                    })
            )
            .addToggle((toggle) => {
                toggleComp = toggle
                    .setValue(commandSetting.enable)
                    .onChange((value) => {
                        commandSetting.enable = value;

                        if (value && textComp.getValue().trim() == "") {
                            // this.alert("input command name!");
                            toggle.setValue(false);
                            this.plugin.log("warn", "input command name!");
                            textComp.inputEl.focus();
                            return;
                        }

                        if (value) {
                            this.plugin.runAddCommand(key);
                        } else {
                            this.plugin.removeCommand(key);
                        }

                        this.plugin.saveSettings();
                    });
                if (textComp.getValue().trim() == "") {
                    toggleComp.setValue(false);
                    toggle.setDisabled(true);
                }
            })
            .then((st: Setting) => {
                Object.defineProperty(st, this.settings_sym, {
                    value: settings,
                    writable: false
                });
                Object.defineProperty(st, this.key_sym, {
                    value: key,
                    writable: false
                });
            });

        if (checkError) {
            setting.nameEl.classList.add("mod-warning");
            setting.nameEl.setAttribute("title", "error");
        }

        return setting;
    }

    renderRibbonIconSetting(
        ribbonIconSetting: RibbonIconSetting,
        settings: RibbonIconSetting[]
    ) {
        let code = this.plugin.getCodeByName(ribbonIconSetting.codeName);
        let checkError = false;
        if (code == null) {
            this.plugin.log(
                "error",
                "renderRibbonIconSetting",
                ribbonIconSetting
            );
            code = Object.assign({}, DEFAULT_CODE, {
                name: "error",
                form: "error",
            });
            checkError = true;
        }
        let textComp: TextComponent;
        let toggleComp: ToggleComponent;
        let setting = new Setting(this.ribbonIconsContainerEl)
            .setName(
                createFragment((e) => {
                    let icon = e.createSpan({
                        text: "icon",
                        cls: "icon file-icon",
                        title: code.form,
                    });
                    setIcon(icon, LIST_ICON[code.form]);
                    e.createSpan({
                        text: ribbonIconSetting.codeName,
                        cls: "code-name",
                    });
                })
            )
            .addExtraButton((component) =>
                component
                    .setIcon(ribbonIconSetting.icon)
                    .setTooltip("change icon")
                    .onClick(() => {
                        this.plugin.openIconModal((icon: string) => {
                            component.setIcon(icon);
                            ribbonIconSetting.icon = icon;
                            this.plugin.saveSettings();
                        });
                    })
            )
            .addText((cb) => {
                textComp = cb
                    .setPlaceholder("input command name")
                    .setValue(ribbonIconSetting.name)
                    .onChange((value) => {
                        toggleComp.setValue(false);
                        if (value.trim() == "") {
                            toggleComp.setDisabled(true);
                        } else {
                            toggleComp.setDisabled(false);
                        }
                        ribbonIconSetting.name = value;
                        this.plugin.saveSettings();
                    });
            })
            .addExtraButton((component) =>
                component
                    .setIcon("arrow-up-circle")
                    .setTooltip("move up")
                    .onClick(() => {
                        this.moveSetting(setting, false);
                    })
            )
            // .addExtraButton(component => component
            //     .setIcon("arrow-down-circle")
            //     .setTooltip('move down')
            //     .onClick(() => {
            //           this.moveSetting(setting, true);
            //     })
            // )
            .addExtraButton((component) =>
                component
                    .setIcon("x-circle")
                    .setTooltip("delete")
                    .onClick(() => {
                        openConfirmDeleteModal(
                            this.app,
                            "Delete command item",
                            `Are you sure you want to delete command "${ribbonIconSetting.name}"?`,
                            (confirmed: boolean) => {
                                if (confirmed) {
                                    this.plugin.removeRibbonIcon(
                                        ribbonIconSetting
                                    );
                                    this.deleteSetting(setting);
                                }
                            }
                        );
                    })
            )
            .addToggle((toggle) => {
                toggleComp = toggle
                    .setValue(ribbonIconSetting.enable)
                    .onChange((value) => {
                        if (value && textComp.getValue().trim() == "") {
                            // this.alert("input Ribbon Icon name!");
                            toggle.setValue(false);
                            this.plugin.log("warn", "input Ribbon Icon name!");
                            textComp.inputEl.focus();
                            return;
                        }

                        if (value) {
                            for (let s of settings) {
                                if (
                                    s.enable &&
                                    s != ribbonIconSetting &&
                                    s.name == ribbonIconSetting.name
                                ) {
                                    toggle.setValue(false);
                                    this.plugin.log(
                                        "warn",
                                        "There is a same name of Ribbon Icon."
                                    );
                                    textComp.inputEl.focus();
                                    return;
                                }
                            }
                            this.plugin.runAddRibbonIcon(ribbonIconSetting);
                        } else {
                            if (ribbonIconSetting.enable)
                                this.plugin.removeRibbonIcon(ribbonIconSetting);
                        }

                        if (ribbonIconSetting.enable != value) {
                            ribbonIconSetting.enable = value;
                            this.plugin.saveSettings();
                        }
                    });
                if (textComp.getValue().trim() == "") {
                    toggleComp.setValue(false);
                    toggle.setDisabled(true);
                }
            })
            .then((st: Setting) => {
                Object.defineProperty(st, this.settings_sym, {
                    value: settings,
                    writable: false
                });
            });
        if (checkError) {
            setting.nameEl.classList.add("mod-warning");
            setting.nameEl.setAttribute("title", "error");
        }

        return setting;
    }

    moveSetting(setting: Setting, isMoveDown: boolean) {
        let settings = setting[this.settings_sym];
        let settingEl = setting.settingEl;

        let parentEl = settingEl.parentElement;

        if (parentEl == null) return;

        let index = Array.from(parentEl.children).indexOf(settingEl);

        if (isMoveDown) {
            if (index == settings.length - 1) return;

            parentEl.insertAfter(settingEl, settingEl.nextElementSibling);
            settings.splice(index + 1, 0, settings.splice(index, 1)[0]);
        } else {
            if (index <= 0) return;
            
            parentEl.insertBefore(settingEl, settingEl.previousElementSibling);
            settings.splice(index - 1, 0, settings.splice(index, 1)[0]);
        }

        this.plugin.saveSettings();
    }

    deleteSetting(setting: Setting) {
        let settings = setting[this.settings_sym];
        let settingEl = setting.settingEl;

        if (settings instanceof Array) {
            let index = Array.from(settingEl.parentElement.children).indexOf(
                settingEl
            );
            if (index !== -1) {
                settings.splice(index, 1);
            }
        } else {
            if (setting[this.key_sym]) delete settings[setting[this.key_sym]];
        }
        
        settingEl.remove();
        this.plugin.saveSettings();
    }
}
