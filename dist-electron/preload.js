//#region electron/preload.ts
window.addEventListener("DOMContentLoaded", () => {
	let e = (e, t) => {
		let n = document.getElementById(e);
		n && (n.innerText = t);
	};
	for (let t of [
		"chrome",
		"node",
		"electron"
	]) e(`${t}-version`, process.versions[t]);
});
var e = window.require?.("electron")?.ipcRenderer;
e && (window.electronAPI = {
	...window.electronAPI,
	agentRespond: (t) => e.invoke("island:interaction-response", t),
	setIslandInteractive: (t) => e.invoke("island:set-interactive", t),
	jumpToTerminal: (t) => e.invoke("island:jump-to-terminal", t)
});
//#endregion
