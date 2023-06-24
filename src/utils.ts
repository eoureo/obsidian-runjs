import { addIcon } from "obsidian";
import {
    ARROW_DOWN_A_Z_ICON,
    ARROW_DOWN_A_Z_ICON_SVG,
    ARROW_UP_Z_A_ICON,
    ARROW_UP_Z_A_ICON_SVG,
    CODE_TYPE_ALL_ICON,
    CODE_TYPE_ALL_ICON_SVG,
    JS_ICON_SVG,
    JS_ICON,
    JS_DARK_ICON_SVG,
    JS_DARK_ICON,
} from "./constants";

export function getTagInJSDocComments(sourceCode: string, tag: string): string {
    // {n: "name", t: "m"} | "name"

    // const sourceCode = `
    //   /**
    //    * @description 예시 JSDoc 주석입니다.
    //    * @tag_string string
    //    */
    //
    //   function myFunction() {
    //     // ...
    //   }

    // 주어진 소스 코드에서 JSDoc 주석을 추출하는 로직
    const regex = /\/\*\*([\s\S]*?)\*\//g;
    const matches = sourceCode.match(regex);

    // 주석을 파싱하여 객체 형태로 반환
    const match = matches
        ?.join("\n")
        .match(new RegExp("^\\s*\\*\\s*@" + tag + "\\s+(.*)$", "m"));
    return match ? match[1] : "";
}

export function addIcons() {
    addIcon(JS_ICON, JS_ICON_SVG);
    addIcon(JS_DARK_ICON, JS_DARK_ICON_SVG);

    addIcon(ARROW_DOWN_A_Z_ICON, ARROW_DOWN_A_Z_ICON_SVG);
    addIcon(ARROW_UP_Z_A_ICON, ARROW_UP_Z_A_ICON_SVG);

    addIcon(CODE_TYPE_ALL_ICON, CODE_TYPE_ALL_ICON_SVG);

    addIcon(
        "sp",
        `<g stroke="currentColor" style="stroke-width:2" transform="translate(6,6), scale(4), rotate(180)"><rect fill="white" x="0" y="0" width="100%" height="100%" /><polygon stroke="black" fill="black" points="0,0 24,0 0,24" /></g>`
    );
}
