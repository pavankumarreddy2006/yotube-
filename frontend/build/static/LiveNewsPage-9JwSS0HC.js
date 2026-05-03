import{c as i,j as e}from"./index-aRXAi5Xv.js";import{N as r}from"./NewsList-CqzROtya.js";import{S as c}from"./SectionCard-DdnCEKxE.js";/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=[["path",{d:"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",key:"v9h5vc"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}],["path",{d:"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",key:"3uifl3"}],["path",{d:"M8 16H3v5",key:"1cv678"}]],h=i("refresh-cw",d);function w({dashboard:n}){const{news:s,loading:a,refreshNews:o,refreshState:t}=n;return e.jsx(c,{title:"Live News",description:"Dynamic sports headlines sourced from the backend `/news` endpoint.",actions:e.jsxs("button",{type:"button",onClick:o,disabled:t.news,className:"ghost-button",children:[e.jsx(h,{className:`h-4 w-4 ${t.news?"animate-spin":""}`}),e.jsx("span",{children:"Refresh news"})]}),children:e.jsx(r,{items:s,loading:a.news&&!s.length})})}export{w as default};
