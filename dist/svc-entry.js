//#region Frontend/src/services/api.js
const API_BASE = "/api";
var ApiError = class extends Error {
	constructor(message, status) {
		super(message);
		this.name = "ApiError";
		this.status = status;
	}
};
async function parseJson(response) {
	try {
		return await response.json();
	} catch {
		return null;
	}
}
async function request(path, options = {}) {
	const { body, ...rest } = options;
	let response;
	try {
		response = await fetch(`${API_BASE}${path}`, {
			headers: body ? { "Content-Type": "application/json" } : void 0,
			body: body ? JSON.stringify(body) : void 0,
			...rest
		});
	} catch {
		throw new ApiError("Unable to reach the server. Is the backend running?", 0);
	}
	const data = await parseJson(response);
	if (!response.ok) throw new ApiError(data && typeof data.message === "string" ? data.message : "Something went wrong.", response.status);
	return data || {};
}
function get(path, params) {
	const query = buildQuery(params);
	return request(query ? `${path}?${query}` : path);
}
function post(path, payload) {
	return request(path, {
		method: "POST",
		body: payload
	});
}
function put(path, payload) {
	return request(path, {
		method: "PUT",
		body: payload
	});
}
function del(path) {
	return request(path, { method: "DELETE" });
}
function buildQuery(params) {
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(params || {})) if (value !== void 0 && value !== null && value !== "") search.set(key, value);
	return search.toString();
}
//#endregion
//#region Frontend/src/services/categoryApi.js
function listCategories() {
	return get("/categories");
}
//#endregion
//#region Frontend/src/services/transactionApi.js
function listTransactions(params) {
	return get("/transactions", params);
}
function createTransaction(payload) {
	return post("/transactions", payload);
}
function updateTransaction(id, payload) {
	return put(`/transactions/${id}`, payload);
}
function deleteTransaction(id) {
	return del(`/transactions/${id}`);
}
//#endregion
export { ApiError, createTransaction, deleteTransaction, listCategories, listTransactions, updateTransaction };
