var i=r=>async(n,o)=>{const e=r.children[0];if(!(!e||!e.hasAttribute("defer-hydration"))){for(let[t,a]of Object.entries(o))t in n.prototype&&(e[t]=a);e.removeAttribute("defer-hydration")}};export{i as default};