import{c as n,j as e}from"./index-aRXAi5Xv.js";import{L as i}from"./LogsPanel-BSazHzsT.js";import{S as r}from"./SectionCard-DdnCEKxE.js";/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c=[["path",{d:"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8",key:"1p45f6"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}]],l=n("rotate-cw",c);function m({dashboard:t}){const{logs:o,refreshLogs:a,refreshState:s}=t;return e.jsx(r,{title:"Logs",description:"Real-time operational logs from the backend pipeline.",actions:e.jsxs("button",{type:"button",onClick:a,disabled:s.logs,className:"ghost-button",children:[e.jsx(l,{className:`h-4 w-4 ${s.logs?"animate-spin":""}`}),e.jsx("span",{children:"Refresh logs"})]}),children:e.jsx(i,{logs:o,heightClass:"max-h-[620px]"})})}export{m as default};
