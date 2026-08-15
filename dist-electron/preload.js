//#region electron/preload.ts
window.addEventListener("DOMContentLoaded", () => {
	const replaceText = (selector, text) => {
		const element = document.getElementById(selector);
		if (element) element.innerText = text;
	};
	for (const dependency of [
		"chrome",
		"node",
		"electron"
	]) replaceText(`${dependency}-version`, process.versions[dependency]);
});
var ipcRenderer = (window.require?.("electron"))?.ipcRenderer;
if (ipcRenderer) window.electronAPI = {
	...window.electronAPI,
	agentRespond: (response) => ipcRenderer.invoke("island:interaction-response", response),
	setIslandInteractive: (request) => ipcRenderer.invoke("island:set-interactive", request),
	jumpToTerminal: (terminalSessionId) => ipcRenderer.invoke("island:jump-to-terminal", terminalSessionId),
	workflowV2: {
		list: () => ipcRenderer.invoke("workflow-v2:list"),
		get: (workflowId, revision) => ipcRenderer.invoke("workflow-v2:get", workflowId, revision),
		saveRevision: (definition) => ipcRenderer.invoke("workflow-v2:save-revision", definition),
		execute: (request) => ipcRenderer.invoke("workflow-v2:execute", request),
		cancel: (runId) => ipcRenderer.invoke("workflow-v2:cancel", { runId }),
		resumeConfirmation: (confirmationId, approved) => ipcRenderer.invoke("workflow-v2:resume-confirmation", {
			confirmationId,
			approved
		}),
		getRun: (runId) => ipcRenderer.invoke("workflow-v2:get-run", runId),
		listRuns: (workflowId, limit) => ipcRenderer.invoke("workflow-v2:runs", workflowId, limit),
		getPendingConfirmation: (runId) => ipcRenderer.invoke("workflow-v2:get-pending-confirmation", runId),
		listDefinitions: () => ipcRenderer.invoke("workflow-v2:node-definitions:published"),
		shellCommands: {
			list: () => ipcRenderer.invoke("workflow-v2:shell-commands:list"),
			saveDraft: (input) => ipcRenderer.invoke("workflow-v2:shell-commands:save-draft", input),
			test: (input) => ipcRenderer.invoke("workflow-v2:shell-commands:test", input),
			publish: (input) => ipcRenderer.invoke("workflow-v2:shell-commands:publish", input)
		},
		onEvent: (handler) => {
			const listener = (_event, payload) => handler(payload);
			ipcRenderer.on("workflow-v2:event", listener);
			return () => ipcRenderer.removeListener("workflow-v2:event", listener);
		}
	}
};
//#endregion
