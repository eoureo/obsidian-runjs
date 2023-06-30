# 옵시디언 - RunJS

*Obsidian에서 쉽고 간단하게 자바스크립트를 실행합니다.*

RunJS는 [옵시디언](https://obsidian.md/)에서 JavaScript 코드를 실행하기 위한 플러그인입니다. 별도의 플러그인을 생성할 필요 없이 사소한(?) 코드들을 바로 실행할 수 있습니다. 그러나 다른 플러그인과 마찬가지로 Obsidian 및 노트들을 다루는 코드를 실행할 수 있습니다. 실행 코드는 옵시디언 노트들의 코드블록(.md) 또는 별도의 파일(.js, .mjs)로 작성됩니다. 또한 코드를 실행 가능한 코드와 모듈로 나누어 코드 관리를 할 수 있도록 합니다.

![Obsidian-RunJS FrontMatter test](images/Obsidian_RunJS_FrontMatter_test_1600.gif)<p ><small>간단한 사용 방법을 보여 줍니다. Codelist View에서 명령어([Toggle cssclass width-100](https://github.com/eoureo/obsidian-runjs/discussions/10))를 클릭합니다. 그러면 frontmatter의 cssclass에 "width-100" 값을 추가합니다. CSS Snippets에 저장된 스타일이 적용되어 노트 너비가 넓어집니다. 다시 클릭하면 "width-100" 값이 제거되고 노트의 너비가 원래 너비로 돌아갑니다. "코드 파일 열기" 명령을 실행하면 그 코드를 볼 수 있습니다. 그런 다음 필요하면 고칠 수도 있습니다.</small></p>


## 특징

- **실행**: 코드를 실행하는 방법에는 여러 가지가 있습니다.
  - **코드 목록 보기**: 모든 코드 목록을 볼 수 있습니다. 그런 다음 한 번의 클릭으로 코드를 실행하거나 보이게 합니다.
  - **실행 코드 대화상자**: 코드를 그룹으로 묶어 계층 구조로 보여 주며 코드를 선택하여 실행합니다.
  - **자동 시작**: RunJS가 로드될때 자동으로 코드를 실행합니다.
  - **명령  추가**: 실행할 명령을 명령 팔레트에 추가합니다. 그러면 단축키를 설정할 수도 있습니다.
  - **리본 아이콘 추가**: 코드를 바로 실행할 수 있도록 리본에 아이콘을 추가합니다.

- **코드 종류**: 자바스크립트 모듈 시스템이 가능합니다.
  - **스크립트**:
    - 노트의 코드블럭 안에 t:"s"(기본값)로 설정된 코드
    - .js 파일 (RunJS 스크립트 폴더 안에 위치)
  - **모듈**:
    - 노트의 코드블럭 안에 t:"m"로 설정된 코드
    - .mjs 파일 (RunJS 스크립트 폴더 안에 위치)

- **코드 작성**: 다른 플러그인을 개발할 때 코드를 수정없이 바로 사용할 수 있습니다.


## 코드를 얻는 방법

자신 환경에 맞게 코드를 수정하세요. 일반적으로 바꿀 필요가 있는 설정은 코드 맨 위에 있습니다.

- **Codes of RunJS**: [Discussions - Codes](https://github.com/eoureo/obsidian-runjs/discussions)에서 쓸모있는 코드들을 볼 수 있습니다. 여기에 계속 코드들을 올리도록 하겠습니다.
- **Codes Share**: [Discussions - Codes Share](https://github.com/eoureo/obsidian-runjs/discussions/categories/codes-share)에  당신이 만든 코드를 공유하고 소개하여 주세요.


**⚠️ 주의 사항**:  
*코드들은 다른 플러그인들과 동일한 작업을 수행할 수 있습니다. 따라서 잘못된 코드는 옵시디언이나 노트들을 망가뜨릴 수 있습니다. 코드를 실행하기 전에 안전한 코드인지 확인해야 합니다.*


## 시작 - Hello, World!

````markdown
```js RunJS:"Test/Hello, World!"
new Notice("Hello, World!");
```
또는
```js RunJS:{n:"Test/Hello, World!",t:"s"}
new Notice("Hello, World!");
```
````

![Obsidian-RunJS Hello, World!](images/Obsidian_hello_800.gif)

아래 링크에서 더 볼 수 있습니다.

Hello, World! : Discussions - Codes  
[https://github.com/eoureo/obsidian-runjs/discussions/2](https://github.com/eoureo/obsidian-runjs/discussions/2)


## 쓸모있는 코드들

```js
// Using obsidian
import * as obsidian from 'obsidian';

// this plugin
const runJS = app.plugins.plugins["runjs"];

// Using other plugins
const dailyNotes = app.internalPlugins.plugins["daily-notes"];
const dataviewAPI = app.plugins.plugins["dataview"].api;
const templater = app.plugins.plugins["templater-obsidian"].templater;

// Using other module
const url = require('url');
```


## 코드 만들때 도움이 되는 참고사이트

- Home - Developer Documentation  
  https://docs.obsidian.md/Home
- obsidianmd/obsidian-api: Type definitions for the latest Obsidian API.  
  https://github.com/obsidianmd/obsidian-api
- Obsidian Plugin Developer Docs | Obsidian Plugin Developer Docs  
  https://marcus.se.net/obsidian-plugin-docs/


## 사용 예

### 옵시디언 아이콘 대화상자

위의 예("Hello, World!" )에 이어서 다른 코드 블록에 다음과 같은 코드를 작성합니다. 그다음 코드목록을 새로고침 하면 새 코드가 보입니다. 그다음 클릭하여 실행합니다.

````markdown
```js RunJS:{n:"Obsidian/Open icon modal",t:"s"}
// const runJS = app.plugins.plugins["runjs"];
const runJS = this;
runJS.openIconModal();
```
````

![Obsidian-RunJS Icon modal](images/Obsidian_icon_modal.gif)

아래 링크에서 더 보실 수 있습니다.

Open icon modal : Discussions - Codes  
[https://github.com/eoureo/obsidian-runjs/discussions/3](https://github.com/eoureo/obsidian-runjs/discussions/3)


### 스크립트와 모듈

다음에서는 스크립트와 모듈로 코드를 만들어 사용하는 예를 보여 줍니다.
"code 1"과 "code 2"라는 스크립트 항목이 코드목록에 보여집니다. 이 스크립트들에서는 자체 실행 코드 외에도 "module 1"과 "module 2", "module 3"에 있는 함수를 사용하고 있습니다.
그 실행 결과는 log 파일(플러그인 설정에서 설정한 파일)에 적어집니다.

test.md - 스크립트들과 모듈들은 하나의 파일에 같이 또는 여러 파일에 나누어 코드블록 안에 넣을 수 있습니다.

````markdown

```js RunJS:{n:"Test/code 1", t:"s"}
import { Notice } from 'obsidian';
import { myFunc1 } from 'Test/module 1'; // codeblock: pages/test.md
import { myFunc2 } from 'Test/module 2'; // file: ./testFolder/module 2.mjs
import { myFunc3 } from './testFolder/module 3.mjs'; // file

new Notice("[code 1] Hello, World!");
console.log("[code 1] Hello, World!");
this.log("info", "[code 1]", "Hello, World!");

myFunc1(this.app, "[code 1] Run module func1.");
myFunc2("[code 1] Run module func2.");
myFunc3("[code 1] Run module func3.");
```

```js RunJS:{n:"Test/module 1", t:"m"}
export function myFunc1(app, ...args) {
  let runJS = app.plugins.plugins["runjs"];
  runJS.log("info", "module 1:", ...args);
  console.log("module 1:", ...args);
}
```

````


Scripts_RunJS/testFolder/test.js - 스크립트 파일 저장 폴더(플러그인 설정에서 설정)에 저장된 스크립트(.js 파일))

```js
/**
 * js file - script. executable code
 * 
 * @RunJS {n:"Test/code 2"}
 */
import { myFunc1 } from 'Test/module 1'; // codeblock: pages/test.md
import { myFunc2 } from 'Test/module 2'; // file: ./testFolder/module 2.mjs
import { myFunc3 } from './module 3.mjs'; // file: ./testFolder/module 3.mjs

console.log("[code 2] Hello, World!");
this.log("error", "[code 2] Hello, World!");

myFunc1(this.app, "[code 2] Run module func1.");
myFunc2("[code 2] Run module func2.");
myFunc3("[code 2] Run module func3.");
```


Scripts_RunJS/testFolder/module 2.mjs - 모듈 파일(.mjs)

```js
/**
 * mjs file - module
 * 
 * @RunJS {n:"Test/module 2"}
 */
import { Notice } from 'obsidian';

export function myFunc2(...args) {
  new Notice("module 2:" + args.join(", "));
  console.log("module 2:",...args);
}
```


Scripts_RunJS/testFolder/module 3.mjs - 모듈 파일(.mjs)

```js
/**
 * mjs file - module
 * 
 * X@RunJS {n:"group/module 3"} // not use name
 */
import { Notice } from 'obsidian';

export function myFunc3(...args) {
  new Notice("module 3:" + args.join(", "));
  console.log("module 3:",...args);
}
```

아래 이미지는 위의 코드들을 실행하는 모습을 보여 줍니다.

![Obsidian-RunJS test](images/Obsidian_test_1600.gif)


## RunJS 설정

다음은 RunJS 설정 대화상자입니다.

![Obsidian-RunJS setting](images/RunJS_settingtab.png)

## 기부

이 플러그인이 마음에 들면 지속적인 개발을 지원하기 위해 기부 부탁 드립니다.

<a href="https://www.buymeacoffee.com/eoureo" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>  
<a href="https://www.buymeacoffee.com/eoureo" target="_blank"><img src="images/bmc_qr_box.png" alt="Buy Me A Coffee" style="width: 217px !important;" ></a>  
